#!/usr/bin/env node
import { parseReminder } from "./index.js";

const input = process.argv.slice(2).join(" ");

if (!input) {
  console.error("Usage: bn-reminder \"আগামীকাল রাত ৮টায় Rafi কে call\"");
  process.exit(1);
}

console.log(JSON.stringify(parseReminder(input), null, 2));
