import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const recordsPath = resolve(appRoot, "data", "visits.private.json");
const port = Number(process.env.HERITAGE_PORT || 4173);
const host = "127.0.0.1";
const maximumBodySize = 10 * 1024 * 1024;
const historyLimit = 50;
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
};

const unitsSource = await readFile(resolve(appRoot, "data", "units.js"), "utf8");
const unitsPrefix = "window.HERITAGE_UNITS=";
const trimmedUnits = unitsSource.trim();
if (!trimmedUnits.startsWith(unitsPrefix) || !trimmedUnits.endsWith(";")) {
  throw new Error("data/units.js 格式无效");
}
const units = JSON.parse(trimmedUnits.slice(unitsPrefix.length, -1));
const knownIds = new Set(units.flatMap((unit) => unit.record_ids || [unit.id]));

function sanitizeRecords(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const records = {};
  for (const [id, record] of Object.entries(value)) {
    if (!knownIds.has(id) || !record || typeof record !== "object") continue;
    records[id] = {
      visited: Boolean(record.visited),
      time: String(record.time || "").trim().slice(0, 100),
      notes: String(record.notes || "").trim().slice(0, 10000),
    };
  }
  return records;
}

function sanitizeHistory(value) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || !knownIds.has(entry.id)) return [];
    if (!["added", "updated", "removed"].includes(entry.action)) return [];
    const record = sanitizeRecords({ [entry.id]: entry.record })[entry.id];
    if (!record) return [];
    return [{
      savedAt: String(entry.savedAt || ""),
      id: entry.id,
      action: entry.action,
      record,
    }];
  }).slice(0, historyLimit);
}

async function loadPayload() {
  try {
    const payload = JSON.parse(await readFile(recordsPath, "utf8"));
    return {
      updatedAt: String(payload.updatedAt || ""),
      records: sanitizeRecords(payload.records || payload),
      history: sanitizeHistory(payload.history),
    };
  } catch (error) {
    if (error.code !== "ENOENT") console.warn(`无法读取记录文件：${error.message}`);
    return { updatedAt: "", records: {}, history: [] };
  }
}

function recordsEqual(left, right) {
  return Boolean(left) === Boolean(right)
    && (!left || (
      left.visited === right.visited
      && left.time === right.time
      && left.notes === right.notes
    ));
}

async function saveRecords(value) {
  await mkdir(dirname(recordsPath), { recursive: true });
  const previous = await loadPayload();
  const records = sanitizeRecords(value);
  const savedAt = new Date().toISOString();
  const changes = [];
  const ids = new Set([...Object.keys(previous.records), ...Object.keys(records)]);
  for (const id of ids) {
    const before = previous.records[id];
    const after = records[id];
    if (recordsEqual(before, after)) continue;
    changes.push({
      savedAt,
      id,
      action: !before ? "added" : !after ? "removed" : "updated",
      record: after || before,
    });
  }

  if (!changes.length) {
    return { count: Object.keys(records).length, history: previous.history, changed: 0 };
  }

  const history = [...changes, ...previous.history].slice(0, historyLimit);
  const payload = {
    version: 2,
    updatedAt: savedAt,
    records,
    history,
  };
  await writeFile(recordsPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return { count: Object.keys(records).length, history, changed: changes.length };
}

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maximumBodySize) throw new Error("请求数据过大");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function sendJson(response, status, value) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(value));
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${host}:${port}`);
    if (url.pathname === "/api/records") {
      if (request.method === "GET") {
        const payload = await loadPayload();
        sendJson(response, 200, { version: 2, ...payload });
        return;
      }
      if (request.method === "POST") {
        const payload = JSON.parse(await readBody(request));
        const result = await saveRecords(payload.records || payload);
        sendJson(response, 200, { ok: true, ...result });
        return;
      }
      sendJson(response, 405, { error: "Method not allowed" });
      return;
    }

    const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
    const target = resolve(appRoot, `.${pathname}`);
    const rootPrefix = `${appRoot}${sep}`;
    if (!target.startsWith(rootPrefix) || target === recordsPath || pathname.startsWith("/scripts/")) {
      sendJson(response, 403, { error: "Forbidden" });
      return;
    }
    const content = await readFile(target);
    response.writeHead(200, {
      "Content-Type": mimeTypes[extname(target).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(content);
  } catch (error) {
    const status = error.code === "ENOENT" ? 404 : 400;
    sendJson(response, status, { error: error.message });
  }
});

server.listen(port, host, () => {
  console.log(`国保足迹本地编辑页：http://${host}:${port}/`);
  console.log(`记录自动保存到：${recordsPath}`);
  console.log("按 Ctrl+C 停止服务。");
});
