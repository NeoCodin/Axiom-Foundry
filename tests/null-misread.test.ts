import assert from "node:assert/strict";
import test from "node:test";
import { corruptReading } from "../app/null-misread.ts";

function sequence(...values: number[]) {
  let index = 0;
  return () => values[index++ % values.length];
}

test("a misread changes the number but keeps its shape", () => {
  for (const reading of ["2.50K", "100.01M", "25/48", "16", "4%"]) {
    for (let run = 0; run < 25; run += 1) {
      const misread = corruptReading(reading);
      assert.notEqual(misread, reading, `${reading} must visibly change`);
      assert.equal([...misread].length, [...reading].length, `${reading} keeps its length`);
    }
  }
});

test("only digits are disturbed; units and separators stay readable", () => {
  const misread = corruptReading("100.01M", sequence(0.9, 0.5, 0.9, 0.2));
  assert.equal(misread.at(-1), "M");
  assert.equal(misread[3], ".");
});

test("text without digits still reads as noise", () => {
  assert.equal(corruptReading("ON"), "O▒");
  assert.equal(corruptReading(""), "▒");
});
