import { parseReminder } from "../src/index.js";

const examples = [
  "আগামীকাল রাত ৮টায় Rafi কে call",
  "Remind me to submit invoice tomorrow at 10:30 am",
  "পরশু বিকেল ৫টায় medicine কিনতে হবে"
];

for (const text of examples) {
  console.log(text);
  console.log(parseReminder(text, { referenceDate: new Date("2026-06-08") }));
}
