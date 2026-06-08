import test from "node:test";
import assert from "node:assert/strict";
import { normalizeDigits, parseReminder } from "../src/index.js";

const referenceDate = new Date("2026-06-08T00:00:00");

test("normalizes Bangla digits", () => {
  assert.equal(normalizeDigits("রাত ৮:৩০"), "রাত 8:30");
});

test("parses Bangla relative date and evening time", () => {
  const result = parseReminder("আগামীকাল রাত ৮টায় Rafi কে call", { referenceDate });

  assert.equal(result.date, "2026-06-09");
  assert.equal(result.time, "20:00");
  assert.equal(result.datetime, "2026-06-09T20:00:00");
  assert.equal(result.title, "Rafi call");
});

test("parses English mixed reminder", () => {
  const result = parseReminder("Remind me to submit invoice tomorrow at 10:30 am", { referenceDate });

  assert.equal(result.title, "submit invoice");
  assert.equal(result.date, "2026-06-09");
  assert.equal(result.time, "10:30");
});

test("parses explicit date", () => {
  const result = parseReminder("doctor appointment 12/06 5 pm", { referenceDate });

  assert.equal(result.date, "2026-06-12");
  assert.equal(result.time, "17:00");
});
