// PreToolUse (Bash|PowerShell): не даёт Claude выполнить разрушительные git-команды.
// deny — force-push, reset --hard, clean -f, branch -D, сброс рабочих изменений, stash drop/clear;
// ask  — push в main/master: CI сразу деплоит main в прод (CLAUDE.md §12).
import { execFileSync } from "node:child_process";

const PROTECTED = /^(?:refs\/heads\/)?(?:main|master)$/;
const PREFIX_TOKENS = ["&", "sudo", "command", "exec", "time"];

let raw = "";
for await (const chunk of process.stdin) raw += chunk;

let input;
try {
  input = JSON.parse(raw);
} catch {
  process.exit(0);
}
const command = String(input.tool_input?.command ?? "");

function currentBranch() {
  try {
    return execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: input.cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

// Разбирает «git [глобальные опции] <подкоманда> <аргументы>» в каждом звене цепочки команд.
// git должен стоять в позиции команды, чтобы `echo "git reset --hard"` не срабатывал.
function* gitInvocations(cmd) {
  for (const segment of cmd.split(/&&|\|\||[;|\n]/)) {
    const tokens = segment
      .trim()
      .split(/\s+/)
      .map((t) => t.replace(/^[({'"]+|[)}'"]+$/g, ""))
      .filter((t) => t && !/^\d*[<>]/.test(t));

    let i = 0;
    while (i < tokens.length && (/^[A-Za-z_]\w*=/.test(tokens[i]) || PREFIX_TOKENS.includes(tokens[i]))) i++;
    if (!/^(?:.*[\\/])?git(?:\.exe)?$/i.test(tokens[i] ?? "")) continue;

    i++;
    while (i < tokens.length && tokens[i].startsWith("-")) {
      if (tokens[i] === "-C" || tokens[i] === "-c") i++;
      i++;
    }
    if (i < tokens.length) yield { sub: tokens[i], args: tokens.slice(i + 1) };
  }
}

const has = (args, ...flags) => args.some((a) => flags.some((f) => a === f || a.startsWith(f + "=")));
// Короткие флаги бывают склеены: -fd, -xdf
const hasShort = (args, letter) => args.some((a) => /^-[a-zA-Z]+$/.test(a) && a.includes(letter));

function check({ sub, args }) {
  const positional = args.filter((a) => !a.startsWith("-"));
  switch (sub) {
    case "push": {
      if (
        has(args, "--force", "--force-with-lease", "--force-if-includes", "--mirror", "--delete", "--prune") ||
        hasShort(args, "f") ||
        hasShort(args, "d") ||
        positional.some((r) => r.startsWith("+") || r.startsWith(":"))
      ) {
        return ["deny", "push с перезаписью истории или удалением веток на удалённом репозитории"];
      }
      // первый позиционный аргумент — remote, остальные — refspec'и
      const refspecs = positional.slice(1).map((r) => r.split(":").pop());
      const targets = (refspecs.length ? refspecs : ["HEAD"]).map((t) => (t === "HEAD" ? currentBranch() : t));
      if (has(args, "--all") || targets.some((t) => PROTECTED.test(t))) {
        return ["ask", "push в main — CI сразу задеплоит его в прод (CLAUDE.md §12)"];
      }
      return null;
    }
    case "reset":
      return has(args, "--hard", "--merge") ? ["deny", "уничтожает незакоммиченные изменения"] : null;
    case "clean":
      return has(args, "--force") || hasShort(args, "f") ? ["deny", "безвозвратно удаляет неотслеживаемые файлы"] : null;
    case "branch": {
      const forceDelete =
        hasShort(args, "D") || ((has(args, "--delete") || hasShort(args, "d")) && (has(args, "--force") || hasShort(args, "f")));
      return forceDelete ? ["deny", "удаляет ветку без проверки, что она слита"] : null;
    }
    case "checkout":
      return has(args, "--", ".", "--force") || hasShort(args, "f") ? ["deny", "затирает изменения в рабочей копии"] : null;
    case "restore": {
      const staged = has(args, "--staged") || hasShort(args, "S");
      const worktree = has(args, "--worktree") || hasShort(args, "W");
      return !staged || worktree ? ["deny", "без --staged затирает изменения в рабочей копии"] : null;
    }
    case "switch":
      return has(args, "--discard-changes", "--force") || hasShort(args, "f") ? ["deny", "затирает изменения в рабочей копии"] : null;
    case "stash":
      return ["drop", "clear"].includes(positional[0]) ? ["deny", "безвозвратно удаляет отложенные изменения"] : null;
    default:
      return null;
  }
}

let decision = null;
for (const inv of gitInvocations(command)) {
  const result = check(inv);
  if (result && decision?.[0] !== "deny") decision = [...result, `git ${inv.sub} ${inv.args.join(" ")}`.trim()];
}

if (decision) {
  const [kind, why, shown] = decision;
  const reason =
    kind === "deny"
      ? `git-guard: «${shown}» заблокирована — ${why}. Если это действительно нужно, пользователь может выполнить её сам: ! ${shown}`
      : `git-guard: ${why}. Подтверди, если это задумано.`;
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: kind, permissionDecisionReason: reason },
    }),
  );
}
