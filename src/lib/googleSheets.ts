import { google } from "googleapis";
import path from "path";
import fs from "fs";

/**
 * Creates and returns a Google Sheets client
 * This function connects to Google Sheets using your service account credentials
 */
export async function getGoogleSheetsClient() {
  try {
    // Get the path to your credentials file
    const credentialsPath = process.env.GOOGLE_SHEETS_CREDENTIALS;

    if (!credentialsPath) {
      throw new Error(
        "GOOGLE_SHEETS_CREDENTIALS environment variable is not set"
      );
    }

    // Read the credentials file
    const credentials = JSON.parse(
      fs.readFileSync(path.resolve(credentialsPath), "utf8")
    );

    // Create an auth client using the service account
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    // Create the Sheets API client
    const sheets = google.sheets({ version: "v4", auth });

    return sheets;
  } catch (error) {
    console.error("Error creating Google Sheets client:", error);
    throw error;
  }
}
