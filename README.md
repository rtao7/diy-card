# diy card

Rui's daily plan. An assistant writes the next day's blocks through the API each night, and reads them back at check-ins. The screen is the original analog card: a horizontal day carousel, a white card with a punch-hole header, and one line per task. A time range sits in the old minutes slot. Tap the diamond to set pending, done, or slipped, and to read the first step and what done means.

## Design system

The card uses [ray-ui](https://github.com/Rtao7/ray-design-system), the package exported by Rui's design system. It is installed as a git dependency (the repo is set up for that: `exports` point at the TypeScript source and at `ray-ui/tokens.css`). The tokens and components are not copied into this repo.

```json
"ray-ui": "github:Rtao7/ray-design-system#9a6be410d8e8aceaf6a320ffed480a9005706135"
```

`next.config.ts` sets `transpilePackages: ["ray-ui"]` so Next compiles that source. Tokens load once from `src/app/globals.css`:

```css
@import "ray-ui/tokens.css";
```

Color, type, radius, and motion on the card come from those tokens (the stone, gray, and neutral ramps). The card keeps its own layout and the existing outline buttons. `Button`, `Text`, `ReplyBox`, and `ChatComposer` from ray-ui are not on this screen: the first two would change the button shape, and the last two are chat controls.

Components this screen needed and ray-ui does not ship yet are built locally under `src/components/day/`. They are listed under [Missing from ray-design-system](#missing-from-ray-design-system).

## Sheet columns

Row 1 is the header. Data starts on row 2. Add these headers in this order. Names are exact:

| Column | Header |
| --- | --- |
| A | `id` |
| B | `date` |
| C | `text` |
| D | `completed` |
| E | `created_at` |
| F | `start` |
| G | `end` |
| H | `status` |
| I | `first_step` |
| J | `done_means` |

- `date` is `M/D/YYYY`, for example `11/24/2026`.
- `start` and `end` are 24-hour `HH:MM`, for example `20:00` and `20:45`. Format columns F and G as plain text so Sheets does not turn them into time values.
- `status` is `pending`, `done`, or `slipped`.
- `first_step` is a two-minute starting action. `done_means` is the finish line. Both can be empty.
- `completed` stays in column D. It is `true` only when status is `done`, and `false` for `pending` or `slipped`.

Older rows still read. A row with no `status` cell uses `completed`: `true` (also `TRUE`, `1`, or `yes`) becomes `done`, and anything else becomes `pending`. When `status` is present, it wins. An older freeform note left in column F (the previous build sometimes stored `time_spent` there, such as `30`) is ignored unless it is a clock time.

The sheet name defaults to `Sheet1`. Override it with `GOOGLE_SHEETS_SHEET_NAME`.

## API

Production base: `https://diy-card.vercel.app`

`GET` is public. Every write (`POST`, `PATCH`, `DELETE`) needs the server `API_KEY`:

```bash
-H "Authorization: Bearer $API_KEY"
```

`X-API-Key: $API_KEY` works too. The card itself updates a status through a server action, so the browser never sees the key. Assistants should use the routes below.

Times must be `HH:MM`. `end` must be later than `start` on the same day. Dates must be `M/D/YYYY`.

### Read one day

`GET /api/tasks?date=11/24/2026`

```bash
curl "https://diy-card.vercel.app/api/tasks?date=11/24/2026"
```

`200`

```json
{
  "success": true,
  "date": "11/24/2026",
  "count": 1,
  "tasks": [
    {
      "id": "task-1730000000000-0-ab12cd",
      "date": "11/24/2026",
      "text": "Deep work",
      "completed": false,
      "created_at": "2026-11-23T08:00:00.000Z",
      "start": "20:00",
      "end": "20:45",
      "status": "pending",
      "first_step": "Open the doc",
      "done_means": "The next section is sent"
    }
  ]
}
```

Blocks are ordered by `start`. A block with no start comes after the timed ones. `completed` is `true` only when `status` is `done`. An empty day is `200` with `"tasks": []` and `"count": 0`.

### Create one task

`POST /api/tasks`

```bash
curl -X POST "https://diy-card.vercel.app/api/tasks" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "11/24/2026",
    "text": "Deep work",
    "start": "20:00",
    "end": "20:45",
    "first_step": "Open the doc",
    "done_means": "The next section is sent"
  }'
```

`status` is optional (`pending` when omitted). The older `completed` boolean is still accepted: `true` means `done`, `false` means `pending`. If both are sent, `status` wins.

`201`

```json
{ "success": true, "task": { "id": "task-…", "date": "11/24/2026", "text": "Deep work", "completed": false, "created_at": "…", "start": "20:00", "end": "20:45", "status": "pending", "first_step": "Open the doc", "done_means": "The next section is sent" } }
```

### Create several tasks for a date

`POST /api/tasks/batch`

This is the night-before call. Every task uses the batch `date` unless that task sets its own.

```bash
curl -X POST "https://diy-card.vercel.app/api/tasks/batch" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "11/24/2026",
    "tasks": [
      {
        "text": "Deep work",
        "start": "20:00",
        "end": "20:45",
        "first_step": "Open the doc",
        "done_means": "The next section is sent"
      },
      {
        "text": "Walk",
        "start": "21:00",
        "end": "21:30",
        "first_step": "Put shoes on",
        "done_means": "Back at the desk"
      }
    ]
  }'
```

`201`

```json
{
  "success": true,
  "date": "11/24/2026",
  "count": 2,
  "tasks": []
}
```

`tasks` in the response is the created blocks, in the same order as the request, each with the shape shown in the read example. At most 40 tasks per call.

### Update one task's status

`PATCH /api/tasks/{id}/status`

```bash
curl -X PATCH "https://diy-card.vercel.app/api/tasks/task-1730000000000-0-ab12cd/status" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "status": "done" }'
```

`status` is `pending`, `done`, or `slipped`. This also writes column D (`true` for done, `false` otherwise) so an older reader stays in sync.

`200`

```json
{ "success": true, "task": { "id": "task-1730000000000-0-ab12cd", "status": "done", "completed": true } }
```

The `task` object is the full block, not only the two fields abbreviated here.

### Update other fields

`PATCH /api/tasks/{id}`

Send any subset of `text`, `date`, `completed`, `status`, `start`, `end`, `first_step`, `done_means`. Same auth and the same full task in the response.

### Delete

`DELETE /api/tasks/{id}`

```json
{ "success": true, "message": "Task deleted successfully" }
```

### Errors

| Status | When |
| --- | --- |
| 400 | Missing date, bad JSON, bad time, `end` not after `start`, or an unknown status |
| 401 | Write without a matching API key |
| 404 | No row with that id |
| 500 | Sheets credentials, permissions, or the sheet name |

```json
{ "error": "Validation failed", "details": "end must be after start" }
```

```json
{ "error": "Unauthorized", "message": "API key required for write operations. …" }
```

## Local development

```bash
npm install
npm run dev
```

With no Google credentials, development uses an in-memory sheet and seeds today with a few blocks (one current, one done, one slipped). Nothing is sent to Google. Force that with `GOOGLE_SHEETS_MOCK=1`, or set `GOOGLE_SHEETS_MOCK=0` to require the real sheet.

```bash
npm test
npm run lint
npm run build
```

### Environment

Do not commit credentials or `API_KEY`.

| Variable | Role |
| --- | --- |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | Sheet id from the URL |
| `GOOGLE_SHEETS_SHEET_NAME` | Tab name, default `Sheet1` |
| `GOOGLE_SHEETS_CREDENTIALS` | Local path to the service account JSON |
| `GOOGLE_SHEETS_CREDENTIALS_JSON` | Same JSON as one string, for hosted deploys |
| `GOOGLE_SHEETS_CREDENTIALS_BASE64` | Base64 of that JSON |
| `API_KEY` | Secret required on every write |
| `GOOGLE_SHEETS_MOCK` | `1` memory sheet, `0` real sheet |

Share the sheet with the service account email as an editor. On Vercel, set the variables for Production, Preview, and Development, then redeploy. `GET /api/tasks/test` checks the connection. In production that route also requires the API key.

## Missing from ray-design-system

Built in `src/components/day/` until they exist in ray-ui. Each one uses ray tokens only. The analog card uses these two. The timeline, time-block row, and now marker from the earlier pass are not part of this screen.

- **SegmentedControl** — Mutually exclusive options with a sliding thumb and press feedback. `<SegmentedControl value onChange ariaLabel options={[{ value, label }]} />`
- **StatusToggle** — Pending / Done / Slipped control for one task, built on the segmented control. `<StatusToggle value onChange label="Status for Deep work" />`
