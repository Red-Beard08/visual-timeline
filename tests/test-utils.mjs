import assert from "node:assert/strict";
const dateValue = (value) => { const m = /(-?\d{1,6})/.exec(value); let n = m ? Number(m[1]) : 0; if (/\bBC\b/i.test(value) && n > 0) n = -n; return n; };
assert.equal(dateValue("930 BC"), -930);
assert.equal(dateValue("0049-01-01"), 49);
assert.ok(dateValue("930 BC") < dateValue("AD 49"));
console.log("Validated Visual Timeline date ordering and BC handling.");
