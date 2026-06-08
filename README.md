# Bangla Reminder Parser

Parse Bangla, Banglish, and English reminder text into structured task data.

This is a tiny dependency-free JavaScript utility for reminder apps, chatbots, personal automations, and productivity tools that need to understand simple Bengali reminder phrases.

## Example

```js
import { parseReminder } from "bangla-reminder-parser";

parseReminder("আগামীকাল রাত ৮টায় Rafi কে call");
```

Returns:

```json
{
  "title": "Rafi কে call",
  "date": "2026-06-09",
  "time": "20:00",
  "datetime": "2026-06-09T20:00:00",
  "confidence": 1,
  "localeHints": {
    "banglaDigits": true,
    "matchedDate": "tomorrow",
    "matchedTime": "period+explicit"
  }
}
```

## Why this exists

Many reminder and productivity apps handle English phrases well, but Bangla and Banglish inputs often need custom parsing. This project focuses on practical, predictable parsing for common reminder phrases such as:

- `আগামীকাল রাত ৮টায় Rafi কে call`
- `kal shokal 9 meeting`
- `Remind me to submit invoice tomorrow at 10:30 am`
- `পরশু বিকেল ৫টায় medicine কিনতে হবে`

## Install

```sh
npm install bangla-reminder-parser
```

For local development:

```sh
npm install
npm test
```

## CLI

```sh
npx bangla-reminder-parser "আগামীকাল রাত ৮টায় Rafi কে call"
```

Local checkout:

```sh
npm run parse -- "আগামীকাল রাত ৮টায় Rafi কে call"
```

## API

### `parseReminder(text, options)`

Options:

- `referenceDate`: optional `Date`, used to resolve `today`, `tomorrow`, `আজ`, `আগামীকাল`, and `পরশু`.

Output fields:

- `title`: cleaned reminder title.
- `date`: ISO date, or `null`.
- `time`: 24-hour `HH:mm`, or `null`.
- `datetime`: ISO-like local datetime when both date and time are available.
- `confidence`: simple score from `0` to `1`.
- `localeHints`: parser signals useful for debugging.

## Current coverage

- Bangla digits: `০১২৩৪৫৬৭৮৯`
- Relative days: `আজ`, `আগামীকাল`, `কাল`, `পরশু`, `today`, `tomorrow`, `kal`, `porshu`
- Time periods: `সকাল`, `দুপুর`, `বিকেল`, `সন্ধ্যা`, `রাত`, and common Banglish variants
- Explicit dates like `12/06` and `12/06/2026`
- Explicit times like `8`, `8:30`, `10:30 am`, `5 pm`

## Roadmap

- Weekday parsing: `রবিবার`, `Monday`
- Bengali month names
- Better task-title cleanup for postpositions
- TypeScript type definitions
- More examples from real reminder apps

## Contributing

Issues and pull requests are welcome. Please include input text, expected output, and locale context when reporting parser misses.

## License

MIT
