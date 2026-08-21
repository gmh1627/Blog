import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const recordsPath = resolve(appRoot, "data", "visits.private.json");
const port = Number(process.env.HERITAGE_PORT || 4173);
const host = "127.0.0.1";
const maximumBodySize = 10 * 1024 * 1024;
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
};

const unitsSource = await readFile(resolve(appRoot, "data", "units.js"), "utf8");
const knownIds = new Set([...unitsSource.matchAll(/"id":"([^"]+)"/g)].map((match) => match[1]));

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

async function loadRecords() {
  try {
    const payload = JSON.parse(await readFile(recordsPath, "utf8"));
    return sanitizeRecords(payload.records || payload);
  } catch (error) {
    if (error.code !== "ENOENT") console.warn(`无法读取记录文件：${error.message}`);
    return {};
  }
}

async function saveRecords(records) {
  await mkdir(dirname(recordsPath), { recursive: true });
  const payload = {
    version: 1,
    updatedAt: new Date().toISOString(),
    records: sanitizeRecords(records),
  };
  await writeFile(recordsPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return Object.keys(payload.records).length;
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
        sendJson(response, 200, { version: 1, records: await loadRecords() });
        return;
      }
      if (request.method === "POST") {
        const payload = JSON.parse(await readBody(request));
        const count = await saveRecords(payload.records || payload);
        sendJson(response, 200, { ok: true, count });
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
