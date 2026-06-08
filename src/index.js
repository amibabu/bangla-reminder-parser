const BANGLA_DIGITS = new Map([
  ["০", "0"],
  ["১", "1"],
  ["২", "2"],
  ["৩", "3"],
  ["৪", "4"],
  ["৫", "5"],
  ["৬", "6"],
  ["৭", "7"],
  ["৮", "8"],
  ["৯", "9"]
]);

const RELATIVE_DAYS = [
  { pattern: /\b(today|aj|aaj)\b|(^|\s)আজ(?=\s|$)/i, offset: 0, label: "today" },
  { pattern: /\b(tomorrow|kal|agamikal|agami kal)\b|(^|\s)(আগামীকাল|কাল)(?=\s|$)/i, offset: 1, label: "tomorrow" },
  { pattern: /\b(day after tomorrow|porshu|poroshu)\b|(^|\s)পরশু(?=\s|$)/i, offset: 2, label: "day-after-tomorrow" }
];

const TIME_MARKERS = [
  { pattern: /\b(morning|sokal|shokal)\b|সকাল/i, hour: 9 },
  { pattern: /\b(noon|dupur)\b|দুপুর/i, hour: 12 },
  { pattern: /\b(afternoon|bikel|bikal)\b|বিকেল/i, hour: 16 },
  { pattern: /\b(evening|shondha|sondha|sandhya)\b|সন্ধ্যা/i, hour: 18 },
  { pattern: /\b(night|raat|rat)\b|রাত/i, hour: 21 }
];

const WEEKDAYS = [
  { pattern: /\b(sunday|sun|robi|robibar)\b|রবিবার|রবি/i, day: 0, label: "weekday-sunday" },
  { pattern: /\b(monday|mon|shom|sombar|shombar)\b|সোমবার|সোম/i, day: 1, label: "weekday-monday" },
  { pattern: /\b(tuesday|tue|mongol|mongolbar)\b|মঙ্গলবার|মঙ্গল/i, day: 2, label: "weekday-tuesday" },
  { pattern: /\b(wednesday|wed|budh|budhbar)\b|বুধবার|বুধ/i, day: 3, label: "weekday-wednesday" },
  { pattern: /\b(thursday|thu|brihospoti|brihoshpotibar)\b|বৃহস্পতিবার|বৃহস্পতি/i, day: 4, label: "weekday-thursday" },
  { pattern: /\b(friday|fri|shukro|shukrabar)\b|শুক্রবার|শুক্র/i, day: 5, label: "weekday-friday" },
  { pattern: /\b(saturday|sat|shoni|shonibar)\b|শনিবার|শনি/i, day: 6, label: "weekday-saturday" }
];

const MONTHS = [
  { pattern: /\b(january|jan)\b|জানুয়ারি|জানুয়ারি/i, month: 1 },
  { pattern: /\b(february|feb)\b|ফেব্রুয়ারি|ফেব্রুয়ারি/i, month: 2 },
  { pattern: /\b(march|mar)\b|মার্চ/i, month: 3 },
  { pattern: /\b(april|apr)\b|এপ্রিল/i, month: 4 },
  { pattern: /\b(may)\b|মে/i, month: 5 },
  { pattern: /\b(june|jun)\b|জুন/i, month: 6 },
  { pattern: /\b(july|jul)\b|জুলাই/i, month: 7 },
  { pattern: /\b(august|aug)\b|আগস্ট/i, month: 8 },
  { pattern: /\b(september|sep|sept)\b|সেপ্টেম্বর/i, month: 9 },
  { pattern: /\b(october|oct)\b|অক্টোবর/i, month: 10 },
  { pattern: /\b(november|nov)\b|নভেম্বর/i, month: 11 },
  { pattern: /\b(december|dec)\b|ডিসেম্বর/i, month: 12 }
];

const COMMAND_WORDS = [
  "remind me to",
  "remind me",
  "remember to",
  "call me to",
  "আমাকে মনে করিয়ে দিও",
  "আমাকে মনে করিয়ে দিও",
  "মনে করিয়ে দিও",
  "মনে করিয়ে দিও",
  "রিমাইন্ডার",
  "রিমাইন্ড",
  "korbo",
  "korte"
];

export function parseReminder(input, options = {}) {
  if (!input || typeof input !== "string") {
    throw new TypeError("parseReminder expects a non-empty string");
  }

  const referenceDate = startOfDay(options.referenceDate ?? new Date());
  const normalized = normalizeDigits(input).trim();
  const dateInfo = parseDate(normalized, referenceDate);
  const timeInfo = parseTime(normalized, dateInfo?.matchedText);
  const title = cleanTitle(normalized, dateInfo?.matchedText, timeInfo?.matchedText);

  return {
    title,
    date: dateInfo?.date ?? null,
    time: timeInfo?.time ?? null,
    datetime: buildDateTime(dateInfo?.date, timeInfo?.time),
    confidence: score({ title, dateInfo, timeInfo }),
    localeHints: {
      banglaDigits: input !== normalized,
      matchedDate: dateInfo?.label ?? null,
      matchedTime: timeInfo?.label ?? null
    }
  };
}

export function normalizeDigits(value) {
  return [...value].map((char) => BANGLA_DIGITS.get(char) ?? char).join("");
}

function parseDate(value, referenceDate) {
  for (const item of RELATIVE_DAYS) {
    const match = value.match(item.pattern);
    if (match) {
      const date = addDays(referenceDate, item.offset);
      return {
        date: toIsoDate(date),
        label: item.label,
        matchedText: match[0].trim()
      };
    }
  }

  const slashDate = value.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (slashDate) {
    const day = Number(slashDate[1]);
    const month = Number(slashDate[2]);
    const year = slashDate[3] ? normalizeYear(Number(slashDate[3])) : referenceDate.getFullYear();
    return {
      date: toIsoDate(new Date(year, month - 1, day)),
      label: "explicit-date",
      matchedText: slashDate[0]
    };
  }

  const monthDate = parseMonthDate(value, referenceDate);
  if (monthDate) return monthDate;

  const weekdayDate = parseWeekday(value, referenceDate);
  if (weekdayDate) return weekdayDate;

  return null;
}

function parseMonthDate(value, referenceDate) {
  for (const item of MONTHS) {
    const monthMatch = value.match(item.pattern);
    if (!monthMatch) continue;

    const monthIndex = monthMatch.index ?? 0;
    const beforeMonth = value.slice(0, monthIndex);
    const afterMonth = value.slice(monthIndex + monthMatch[0].length);
    const beforeDay = beforeMonth.match(/(\d{1,2})\s*$/);
    const afterDay = afterMonth.match(/^\s*(\d{1,2})/);
    const dayMatch = beforeDay ?? afterDay;
    if (!dayMatch) continue;

    const yearMatch = afterMonth.match(/\b(20\d{2})\b/);
    const day = Number(dayMatch[1]);
    let year = yearMatch ? normalizeYear(Number(yearMatch[1])) : referenceDate.getFullYear();
    let date = new Date(year, item.month - 1, day);
    if (!yearMatch && date < referenceDate) {
      date = new Date(year + 1, item.month - 1, day);
      year = year + 1;
    }

    return {
      date: toIsoDate(date),
      label: "month-name-date",
      matchedText: buildMonthDateMatchedText({ beforeDay, dayMatch, monthMatch, yearMatch })
    };
  }

  return null;
}

function buildMonthDateMatchedText({ beforeDay, dayMatch, monthMatch, yearMatch }) {
  const day = dayMatch[1];
  const month = monthMatch[0];
  const year = yearMatch?.[0];
  return beforeDay
    ? [day, month, year].filter(Boolean).join(" ")
    : [month, day, year].filter(Boolean).join(" ");
}

function parseWeekday(value, referenceDate) {
  for (const item of WEEKDAYS) {
    const match = value.match(item.pattern);
    if (!match) continue;

    let daysAhead = item.day - referenceDate.getDay();
    if (daysAhead <= 0) daysAhead += 7;

    return {
      date: toIsoDate(addDays(referenceDate, daysAhead)),
      label: item.label,
      matchedText: match[0]
    };
  }

  return null;
}

function parseTime(value, dateText) {
  const searchable = dateText ? value.replace(dateText, " ") : value;
  const explicit = searchable.match(/(?:^|\s)(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?\s*(?:টা|টায়|টায়|te|e)?(?=\s|$)/i);
  const marker = TIME_MARKERS.find((item) => item.pattern.test(searchable));

  if (explicit) {
    let hour = Number(explicit[1]);
    const minute = explicit[2] ? Number(explicit[2]) : 0;
    const meridiem = explicit[3]?.toLowerCase().replaceAll(".", "");

    if (meridiem === "pm" && hour < 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;
    if (!meridiem && marker && hour <= 12) {
      hour = inferHourFromMarker(hour, marker.hour);
    }

    return {
      time: `${pad(hour)}:${pad(minute)}`,
      label: marker ? `${marker.hour < 12 ? "morning" : "period"}+explicit` : "explicit-time",
      matchedText: marker ? `${firstMatchedText(searchable, marker.pattern)} ${explicit[0].trim()}` : explicit[0].trim()
    };
  }

  if (marker) {
    return {
      time: `${pad(marker.hour)}:00`,
      label: "period-default",
      matchedText: firstMatchedText(searchable, marker.pattern)
    };
  }

  return null;
}

function cleanTitle(value, dateText, timeText) {
  let title = value;
  for (const command of COMMAND_WORDS) {
    title = title.replace(new RegExp(escapeRegExp(command), "ig"), " ");
  }
  for (const text of [dateText, timeText]) {
    if (text && !text.includes("\\")) {
      title = title.replace(new RegExp(escapeRegExp(text), "ig"), " ");
    }
  }
  title = title
    .replace(/\b(at|on|by|in|theke|e|te)\b/gi, " ")
    .replace(/(^|\s)(কে|k)(?=\s|$)/gi, " ")
    .replace(/(?:টা|টায়|টায়)\b/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[,.;:\-\s]+|[,.;:\-\s]+$/g, "")
    .trim();

  return title || value.trim();
}

function score({ title, dateInfo, timeInfo }) {
  let confidence = title ? 0.45 : 0.2;
  if (dateInfo) confidence += 0.3;
  if (timeInfo) confidence += 0.25;
  return Number(Math.min(confidence, 0.98).toFixed(2));
}

function buildDateTime(date, time) {
  if (!date || !time) return null;
  return `${date}T${time}:00`;
}

function inferHourFromMarker(hour, markerHour) {
  if (markerHour >= 12 && hour < 12) return hour + 12;
  return hour;
}

function firstMatchedText(value, pattern) {
  return value.match(pattern)?.[0] ?? "";
}

function startOfDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toIsoDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function normalizeYear(year) {
  return year < 100 ? 2000 + year : year;
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
