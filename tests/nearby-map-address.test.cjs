const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "..", "work24-nearby-map.html"), "utf8");
const start = html.indexOf("function precise(");
const end = html.indexOf("function clearPins()", start);
assert.ok(start > 0 && end > start, "address validation and candidates functions exist");
const clean = (v, n=200) => String(v ?? "").trim().slice(0, n);
const functions = new Function("clean", html.slice(start, end) + "\nreturn {precise, addressesFor};")(clean);

for (const [address, expected] of [
  ["울산광역시 북구 호계로 309-20", true],
  ["울산광역시 북구 호계동 123-45", true],
  ["울산광역시 남구 삼산로 100", true],
  ["울산광역시 북구 화봉동", false],
  ["울산광역시 북구", false],
  ["울산광역시 북구 30920", false],
]) {
  assert.equal(functions.precise(address), expected, address);
}
assert.deepEqual(
  functions.addressesFor({basicAddr: "울산광역시 북구 호계로", detailAddr: "309-20"}),
  ["울산광역시 북구 호계로 309-20"],
  "separated road-name / building number should be combined"
);
assert.equal(
  functions.addressesFor({basicAddr: "울산광역시 북구", detailAddr: "2층"}).length,
  0,
  "do not place a false marker for an imprecise address"
);
assert.ok(html.includes("function unverifiedCard(j)"), "jobs without coordinates remain available in the list");
assert.ok(html.includes("for(const j of unknown)box.append(unverifiedCard(j));"), "unknown-coordinate jobs are rendered");
assert.ok(html.includes('lastPageSize=raw.length'), "next-page gating uses actual server batch size");
console.log("PASS: nearby Work24 map address recognition and unlocated job fallback");
