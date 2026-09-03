import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { satisfiesRange, maxSatisfying, isValidRange, compareSemver } from "../cli/src/core/semver.js";

// Faz 10: semver tam (^ ~ >= > <= < * exact)
describe("forge semver — Faz 10", () => {
  it("^1.2.3 = >=1.2.3 <2.0.0", () => {
    assert.ok(satisfiesRange("1.2.3", "^1.2.3"));
    assert.ok(satisfiesRange("1.9.0", "^1.2.3"));
    assert.ok(!satisfiesRange("2.0.0", "^1.2.3"));
    assert.ok(!satisfiesRange("1.2.2", "^1.2.3"));
  });
  it("^0.2.3 => >=0.2.3 <0.3.0", () => {
    assert.ok(satisfiesRange("0.2.5", "^0.2.3"));
    assert.ok(!satisfiesRange("0.3.0", "^0.2.3"));
  });
  it("~1.2.3 => >=1.2.3 <1.3.0", () => {
    assert.ok(satisfiesRange("1.2.9", "~1.2.3"));
    assert.ok(!satisfiesRange("1.3.0", "~1.2.3"));
  });
  it(">=, >, <=, <, *, exact", () => {
    assert.ok(satisfiesRange("1.5.0", ">=1.0.0"));
    assert.ok(!satisfiesRange("0.9.0", ">=1.0.0"));
    assert.ok(satisfiesRange("1.0.1", ">1.0.0"));
    assert.ok(!satisfiesRange("1.0.0", ">1.0.0"));
    assert.ok(satisfiesRange("1.0.0", "<=1.0.0"));
    assert.ok(satisfiesRange("0.9.9", "<1.0.0"));
    assert.ok(satisfiesRange("9.9.9", "*"));
    assert.ok(satisfiesRange("1.2.3", "1.2.3"));
    assert.ok(!satisfiesRange("1.2.4", "1.2.3"));
  });
  it("maxSatisfying picks highest", () => {
    assert.equal(maxSatisfying(["1.0.0", "1.2.0", "2.0.0"], "^1.0.0"), "1.2.0");
    assert.equal(maxSatisfying(["1.0.0"], "^2.0.0"), null);
  });
  it("isValidRange accepts ^ ~ >= > <= < * exact, rejects bad", () => {
    for (const r of ["^1.2.0", "~0.1.0", ">=1.0.0", ">1.0.0", "<=2.0.0", "<2.0.0", "*", "1.2.3", "latest"]) {
      assert.ok(isValidRange(r), r);
    }
    assert.ok(!isValidRange("bad"));
    assert.ok(!isValidRange("^bad"));
  });
  it("compareSemver orders correctly", () => {
    assert.ok(compareSemver("2.0.0", "1.9.9") > 0);
    assert.ok(compareSemver("1.2.3", "1.2.3") === 0);
    assert.ok(compareSemver("1.2.2", "1.2.3") < 0);
  });
});
