import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";

const source = readFileSync(new URL("../pb_hooks/lib/air.js", import.meta.url), "utf8");

function airAt(now) {
  const module = { exports: {} };
  class FixedDate extends Date {
    static now() {
      return Date.parse(now);
    }
  }
  runInNewContext(source, { module, Date: FixedDate, $os: { getenv: () => "" } });
  return module.exports;
}

test("air backfill retains the whole current year and the rolling 90 days across New Year", () => {
  assert.equal(airAt("2026-11-22T12:00:00Z").historyStartDay(), "2026-01-01");
  assert.equal(airAt("2026-12-31T20:59:59Z").historyStartDay(), "2026-01-01");
  assert.equal(airAt("2026-12-31T21:00:00Z").historyStartDay(), "2026-10-03");
});
