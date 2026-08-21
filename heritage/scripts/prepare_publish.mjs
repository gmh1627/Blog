import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const recordsPath = resolve(appRoot, "data", "visits.private.json");

let records = {};
try {
  const payload = JSON.parse(await readFile(recordsPath, "utf8"));
  records = payload && typeof payload.records === "object" ? payload.records : payload;
} catch (error) {
  if (error.code !== "ENOENT") throw new Error(`国保足迹记录文件无效：${error.message}`);
}

if (!records || typeof records !== "object" || Array.isArray(records)) {
  throw new Error("国保足迹记录必须是 JSON 对象");
}

const values = Object.values(records).filter((record) => record && typeof record === "object");
const visited = values.filter((record) => record.visited);
const withTime = visited.filter((record) => String(record.time || "").trim());
console.log(`[国保足迹] 发布前检查：已到访 ${visited.length}，填写时间 ${withTime.length}；个人备注不会公开。`);
