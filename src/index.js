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
  { pattern: /\b(today|aj|aaj)\b|আজ/i, offset: 0, label: "today" },
  { pattern: /\b(tomorrow|kal|agamikal|agami kal)\b|আগামীকাল|কাল/i, offset: 1, label: "tomorrow" },
  { pattern: /\b(day after tomorrow|porshu|poroshu)\b|পরশু/i, offset: 2, label: "day-after-tomorrow" }
];

const TIME_MARKERS = [
  { pattern: /\b(morning|sokal|shokal)\b|সকাল/i, hour: 9 },
  { pattern: /\b(noon|dupur)\b|দুপুর/i, hour: 12 },
  { pattern: /\b(afternoon|bikel|bikal)\b|বিকেল/i, hour: 16 },
  { pattern: /\b(evening|shondha|sondha|sandhya)\b|সন্ধ্যা/i, hour: 18 },
  { pattern: /\b(night|raat|rat)\b|রাত/i, hour: 21 }
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
        matchedText: match[0]
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
