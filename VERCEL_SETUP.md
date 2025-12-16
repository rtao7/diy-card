# Vercel Environment Variables Setup Guide

## Quick Setup Steps

### 1. Get Your Spreadsheet ID

From your Google Sheet URL:

```
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit
```

Copy the `SPREADSHEET_ID_HERE` part.

### 2. Encode Your Credentials

**Option A: Using the script (recommended)**

```bash
./scripts/encode-credentials.sh /path/to/your/credentials.json
```

**Option B: Manual encoding**

```bash
cat /path/to/your/credentials.json | base64
```

Copy the entire output (it's a long string).

### 3. Set Environment Variables in Vercel

1. Go to your Vercel project: https://vercel.com/dashboard
2. Click on your project
3. Go to **Settings** → **Environment Variables**
4. Add the following variables:

#### Variable 1: `GOOGLE_SHEETS_SPREADSHEET_ID`

- **Value**: Your spreadsheet ID (from step 1)
- **Environment**: Production, Preview, Development (select all)

#### Variable 2: `GOOGLE_SHEETS_CREDENTIALS_BASE64`

- **Value**: The base64-encoded string (from step 2)
- **Environment**: Production, Preview, Development (select all)

### 4. Share Your Google Sheet

1. Open your Google Sheet
2. Click the **Share** button
3. Find the service account email in your credentials JSON (field: `client_email`)
   - It looks like: `your-service-account@your-project.iam.gserviceaccount.com`
4. Add that email with **Editor** access
5. Click **Send**

### 5. Redeploy

After setting environment variables:

1. Go to **Deployments** tab
2. Click the **⋯** menu on the latest deployment
3. Click **Redeploy**

Or push a new commit to trigger a new deployment.

### 6. Verify It Works

Visit: `https://your-site.com/api/tasks/test`

You should see:

```json
{
  "summary": {
    "status": "success",
    "message": "All checks passed! Google Sheets connection is working."
  }
}
```

## Troubleshooting

### Still seeing "NOT SET" errors?

1. **Make sure you selected all environments** (Production, Preview, Development)
2. **Redeploy after adding variables** - Vercel doesn't automatically update running deployments
3. **Check for typos** in variable names (case-sensitive!)

### Getting permission errors?

- Make sure you shared the spreadsheet with the service account email
- The email is in your credentials JSON as `client_email`
- Give it **Editor** access (not just Viewer)

### Still not working?

1. Check Vercel logs: Deployments → Click deployment → Logs
2. Visit the test endpoint: `/api/tasks/test`
3. Look for specific error messages in the response
