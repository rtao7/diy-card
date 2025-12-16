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

### Local Development Setup

1. Download your Google Service Account credentials JSON file
2. Store it outside the repository (e.g., `~/credentials/my-credentials.json`)
3. Create a `.env.local` file in the project root:

```bash
GOOGLE_SHEETS_CREDENTIALS=/path/to/your/credentials.json
GOOGLE_SHEETS_SPREADSHEET_ID=your-spreadsheet-id-here
```

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
   - Make sure row 1 is a header row (it will be skipped)
   - Data should start from row 2

3. **Check Vercel logs:**
   - Go to your Vercel project → Deployments → Click on a deployment → Logs
   - Look for error messages or the diagnostic logs (they start with emojis like 📊, ✅, ❌)

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
