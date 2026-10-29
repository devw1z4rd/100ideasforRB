// PostToolUse (Write|Edit): прогоняет изменённый файл через Prettier из front/node_modules.
// Область — front/ и back/pb_hooks/ (миграции генерирует PocketBase, их не трогаем).
// Пока Prettier не установлен в front/ — ничего не делает.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const FORMATTABLE = /\.(?:tsx?|jsx?|mjs|cjs|css|json|html|md)$/i;

let raw = "";
for await (const chunk of process.stdin) raw += chunk;

let input;
try {
  input = JSON.parse(raw);
} catch {
  process.exit(0);
}

const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
const frontDir = path.join(projectDir, "front");
const prettier = path.join(frontDir, "node_modules", "prettier", "bin", "prettier.cjs");
const file = input.tool_input?.file_path ?? input.tool_response?.filePath;

if (!file || !FORMATTABLE.test(file) || !existsSync(prettier)) process.exit(0);

const rel = path.relative(projectDir, path.resolve(file)).split(path.sep).join("/");
const inScope = (rel.startsWith("front/") && !rel.includes("/node_modules/")) || rel.startsWith("back/pb_hooks/");
if (!inScope) process.exit(0);

try {
  execFileSync(process.execPath, [prettier, "--write", "--log-level", "warn", path.resolve(file)], {
    cwd: frontDir,
    stdio: ["ignore", "ignore", "pipe"],
  });
} catch (err) {
  // Синтаксическая ошибка и т.п. — не блокируем, только пишем в лог хука
  process.stderr.write(`prettier: ${String(err.stderr ?? err.message).trim()}\n`);
}
