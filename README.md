Daily card for Rui. The page is one day, ordered by start time, with the block that is happening now marked on the timeline. Tap a block to mark it pending, done, or slipped.

An assistant writes the next day's blocks through the API at night, then reads them back at check-ins. Reading is public. Every write needs `API_KEY`.

## Sheet columns to add

Leave the existing columns where they are:

| Column | Header | Notes |
| --- | --- | --- |
| A | `id` | |
| B | `date` | `M/D/YYYY`, for example `11/24/2026` |
| C | `text` | |
| D | `completed` | `true` or `false`. Kept in sync: `true` only when status is `done` |
| E | `created_at` | ISO timestamp |

Append these headers in the next empty columns, in this order:

| Header | Example | Notes |
| --- | --- | --- |
| `start` | `20:00` | 24-hour `HH:MM`. Blank if the block has no time |
| `end` | `20:45` | Must be after `start` |
| `status` | `pending` | `pending`, `done`, or `slipped` |
| `first_step` | `Open yesterday's notes` | Optional two-minute start |
| `done_means` | `Outline is in the doc` | Optional definition of done |

On the current sheet, which ends at `created_at`, that is:

- F `start`
- G `end`
- H `status`
- I `first_step`
- J `done_means`

If a `time_spent` column is already present, leave it and put the five new headers after it. Do not rename or reorder `id`, `date`, `text`, `completed`, or `created_at`.

Old rows that only have `completed` still read: `true` becomes `done`, `false` or blank becomes `pending`. A blank `status` cell is filled in from `completed`. `slipped` is stored as `status=slipped` and `completed=false`.

The first authenticated write fills any blank header cells with these names. It does not overwrite a header that already has text.

## API

Base URL in production: `https://diy-card.vercel.app`

Send the key on every write, either header works:

```bash
Authorization: Bearer $API_KEY
X-API-Key: $API_KEY
```

Dates are `M/D/YYYY` without leading zeros (`11/24/2026`). Leading zeros are accepted and normalized. Times are 24-hour `HH:MM`. `8:00 PM` is accepted and stored as `20:00`.

Every task in a response has this shape:

```json
{
  "id": "task-m1abc-0-k3p9qx",
  "date": "11/24/2026",
  "text": "Write the outline",
  "completed": false,
  "status": "pending",
  "created_at": "2026-11-23T06:00:00.000Z",
  "start": "20:00",
  "end": "20:45",
  "first_step": "Open yesterday's notes",
  "done_means": "Outline is in the doc",
  "timeSpent": ""
}
```

`completed` is `true` only when `status` is `done`. `status` is `pending`, `done`, or `slipped`. Lists are ordered by `start` (blocks with no start come last).

### Read a day

Public. No API key.

```bash
curl "https://diy-card.vercel.app/api/tasks?date=11/24/2026"
```

`200`

```json
{
  "success": true,
  "date": "11/24/2026",
  "count": 0,
  "tasks": []
}
```

`tasks` is the array of task objects above. An empty day also includes `"message": "No tasks found for this date"`.

### Write a day's blocks

Use this at night to create tomorrow's plan. Up to 50 blocks. Requires `API_KEY`.

```bash
curl -X POST "https://diy-card.vercel.app/api/tasks/batch" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "11/24/2026",
    "tasks": [
      {
        "text": "Write the outline",
        "start": "20:00",
        "end": "20:45",
        "first_step": "Open the notes from yesterday",
        "done_means": "Outline is in the doc"
      },
      {
        "text": "Read",
        "start": "21:00",
        "end": "21:30",
        "status": "pending"
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

Each item in `tasks` accepts:

| Field | Required | Notes |
| --- | --- | --- |
| `text` | yes | 1–500 characters |
| `start` | no | `HH:MM` |
| `end` | no | `HH:MM`, after `start` |
| `status` | no | `pending` (default), `done`, or `slipped` |
| `completed` | no | Legacy. `true` maps to `done`, `false` maps to `pending`. Do not send it in conflict with `status` |
| `first_step` | no | Up to 200 characters. `firstStep` is also accepted |
| `done_means` | no | Up to 200 characters. `doneMeans` is also accepted |

### Update a block's status

Use this at a check-in. Requires `API_KEY`.

```bash
curl -X PATCH "https://diy-card.vercel.app/api/tasks/TASK_ID/status" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"status":"done"}'
```

`status` is `pending`, `done`, or `slipped` (case-insensitive). `200`

```json
{
  "success": true,
  "task": {
    "id": "TASK_ID",
    "date": "11/24/2026",
    "text": "Write the outline",
    "completed": true,
    "status": "done",
    "created_at": "2026-11-23T06:00:00.000Z",
    "start": "20:00",
    "end": "20:45",
    "first_step": "Open yesterday's notes",
    "done_means": "Outline is in the doc",
    "timeSpent": ""
  }
}
```

`completed` becomes `true` for `done`, and `false` for `pending` or `slipped`.

### Create or edit a single block

`POST /api/tasks` creates one block. Same fields as a batch item, plus required `date`. `201` with `{ "success": true, "task": { ... } }`.

`PATCH /api/tasks/TASK_ID` changes any of `text`, `date`, `start`, `end`, `status`, `completed`, `first_step`, `done_means`, `timeSpent`. Send only the fields that change. `200` with `{ "success": true, "task": { ... } }`.

`DELETE /api/tasks/TASK_ID` removes a row. `200` with `{ "success": true, "message": "Task deleted successfully" }`.

### Errors

| Status | Body | When |
| --- | --- | --- |
| `400` | `{ "error": "Validation failed", "details": "end must be after start" }` | Bad JSON, bad date or time, `end` not after `start`, `status` not one of the three values, `status` and `completed` disagree |
| `401` | `{ "error": "Unauthorized", "message": "...", "hint": "..." }` | Write without `API_KEY` |
| `404` | `{ "error": "Task not found" }` | Unknown id |
| `500` | `{ "error": "...", "details": "...", "hint": "..." }` | Sheet credentials, permissions, or the tab name |

The page itself writes through server actions, so the browser does not need the key. Do not put `API_KEY` in `NEXT_PUBLIC_API_KEY`.

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Environment Variables

This project requires Google Sheets API credentials to function. You need to set up the following environment variables:

### Required Environment Variables

1. **`GOOGLE_SHEETS_CREDENTIALS_JSON`** (for production/cloud platforms) - The entire service account JSON as a string
2. **`GOOGLE_SHEETS_CREDENTIALS`** (for local development) - Path to your credentials JSON file
3. **`GOOGLE_SHEETS_SPREADSHEET_ID`** - Your Google Spreadsheet ID
4. **`API_KEY`** (server-side) - Secret API key for write operations (create, edit, delete). Required in production. The browser does not use it.
5. **`MOCK_SHEETS`** (optional, local only) - Set to `true` to use an in-memory day instead of Google Sheets. Local dev does this automatically when sheet credentials are missing.

### Local Development Setup

1. Download your Google Service Account credentials JSON file
2. Store it outside the repository (e.g., `~/credentials/my-credentials.json`)
3. Create a `.env.local` file in the project root:

```bash
GOOGLE_SHEETS_CREDENTIALS=/path/to/your/credentials.json
GOOGLE_SHEETS_SPREADSHEET_ID=your-spreadsheet-id-here
API_KEY=your-secret-api-key-here
```

**Note:** Generate a secure random API key. You can use:

```bash
# Generate a random API key
openssl rand -hex 32
# or
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Security Note:**

- **GET** `/api/tasks` is public
- **POST**, **PATCH**, and **DELETE** require `API_KEY`
- Keep `API_KEY` secret and never commit it. Do not expose it as `NEXT_PUBLIC_API_KEY`

### Production Deployment

For production (Vercel, Netlify, etc.), use the `GOOGLE_SHEETS_CREDENTIALS_JSON` variable:

1. **Get your credentials JSON content:**

   ```bash
   cat /path/to/your/credentials.json
   ```

2. **Set environment variables in your hosting platform:**

   **For Vercel:**

   - Go to your project settings → Environment Variables
   - Add `GOOGLE_SHEETS_CREDENTIALS_JSON` with the entire JSON content as the value
   - Add `GOOGLE_SHEETS_SPREADSHEET_ID` with your spreadsheet ID
   - Make sure to set these for "Production", "Preview", and "Development" environments

   **For Netlify:**

   - Go to Site settings → Environment variables
   - Add the same variables as above

   **For other platforms:**

   - Add the environment variables in your platform's settings/dashboard

3. **Important:** The JSON must be a single-line string. If your platform has issues with special characters, you may need to:
   - Escape quotes: `\"` instead of `"`
   - Or use base64 encoding (advanced)

### Getting Your Google Sheets Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable the Google Sheets API
4. Create a Service Account
5. Download the JSON key file
6. Share your Google Sheet with the service account email (found in the JSON file)

### Getting Your Spreadsheet ID

The Spreadsheet ID is in the URL of your Google Sheet:

```
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

**Before deploying, make sure to:**

1. Set the environment variables in Vercel (see above)
2. Share your Google Sheet with the service account email
3. Redeploy after setting environment variables

### Troubleshooting

If data is not showing in production, use the test endpoint to diagnose issues:

1. **Visit the test endpoint:** `https://your-site.com/api/tasks/test`

   - This will show detailed diagnostics about your Google Sheets connection
   - Check for errors about permissions, spreadsheet ID, or credentials

2. **Common issues and solutions:**

   **Issue: "Permission denied" or "Access denied"**

   - Solution: Share your Google Sheet with the service account email
   - Find the service account email in your credentials JSON (field: `client_email`)
   - In Google Sheets, click "Share" and add that email with "Editor" access

   **Issue: "Spreadsheet not found"**

   - Solution: Verify `GOOGLE_SHEETS_SPREADSHEET_ID` is correct
   - Get the ID from the URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
   - Make sure there are no extra spaces or characters

   **Issue: "Sheet not found"**

   - Solution: Check the sheet name (default is "Sheet1")
   - Set `GOOGLE_SHEETS_SHEET_NAME` environment variable if your sheet has a different name
   - The test endpoint will show all available sheet names

   **Issue: "Invalid credentials"**

   - Solution: Verify your credentials JSON is correctly formatted
   - For production, use `GOOGLE_SHEETS_CREDENTIALS_BASE64` (most reliable)
   - Encode your JSON: `cat credentials.json | base64` (then paste the result)
   - Or use `GOOGLE_SHEETS_CREDENTIALS_JSON` with the entire JSON as a single-line string

   **Issue: No data showing but no errors**

   - Check that your spreadsheet has data in the correct format:
     - Column A: id
     - Column B: date (format: M/D/YYYY, e.g., "12/25/2024")
     - Column C: text
     - Column D: completed ("true" or "false")
     - Column E: created_at
     - Then `start`, `end`, `status`, `first_step`, `done_means` (see "Sheet columns to add")
   - Make sure row 1 is a header row (it will be skipped)
   - Data should start from row 2

3. **Check Vercel logs:**
   - Go to your Vercel project → Deployments → Click on a deployment → Logs
   - Look for error messages or the diagnostic logs (they start with emojis like 📊, ✅, ❌)

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
