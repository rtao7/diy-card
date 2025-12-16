import { google } from "googleapis";
import path from "path";
import fs from "fs";

/**
 * Creates and returns a Google Sheets client
 * This function connects to Google Sheets using your service account credentials
 *
 * Supports three methods (in order of preference):
 * 1. GOOGLE_SHEETS_CREDENTIALS_BASE64: Base64-encoded JSON string (most reliable for production)
 * 2. GOOGLE_SHEETS_CREDENTIALS_JSON: Direct JSON string (for production/cloud platforms)
 * 3. GOOGLE_SHEETS_CREDENTIALS: File path to credentials JSON (for local development)
 */
export async function getGoogleSheetsClient() {
  try {
    let credentials: any;
    let methodUsed = "";

    // Method 1: Check for base64-encoded JSON (most reliable for production)
    const credentialsBase64 = process.env.GOOGLE_SHEETS_CREDENTIALS_BASE64;
    if (credentialsBase64) {
      try {
        const decoded = Buffer.from(credentialsBase64, "base64").toString("utf8");
        credentials = JSON.parse(decoded);
        methodUsed = "GOOGLE_SHEETS_CREDENTIALS_BASE64";
      } catch (parseError) {
        console.error("Failed to decode base64 credentials:", parseError);
        throw new Error(
          "GOOGLE_SHEETS_CREDENTIALS_BASE64 is not valid base64-encoded JSON. Please check your environment variable."
        );
      }
    }
    // Method 2: Check for JSON string directly
    else if (process.env.GOOGLE_SHEETS_CREDENTIALS_JSON) {
      const credentialsJson = process.env.GOOGLE_SHEETS_CREDENTIALS_JSON;
      try {
        // Try to parse as-is first
        credentials = JSON.parse(credentialsJson);
        methodUsed = "GOOGLE_SHEETS_CREDENTIALS_JSON";
      } catch (parseError) {
        // If that fails, try removing newlines and extra whitespace
        try {
          const cleaned = credentialsJson.replace(/\n/g, "").replace(/\s+/g, " ").trim();
          credentials = JSON.parse(cleaned);
          methodUsed = "GOOGLE_SHEETS_CREDENTIALS_JSON (cleaned)";
        } catch (secondParseError) {
          console.error("Failed to parse JSON credentials:", parseError);
          throw new Error(
            "GOOGLE_SHEETS_CREDENTIALS_JSON is not valid JSON. Please check your environment variable. Error: " +
              (parseError instanceof Error ? parseError.message : "Unknown error")
          );
        }
      }
    }
    // Method 3: Check for file path (for local development)
    else if (process.env.GOOGLE_SHEETS_CREDENTIALS) {
      const credentialsPath = process.env.GOOGLE_SHEETS_CREDENTIALS;
      try {
        credentials = JSON.parse(
          fs.readFileSync(path.resolve(credentialsPath), "utf8")
        );
        methodUsed = "GOOGLE_SHEETS_CREDENTIALS (file path)";
      } catch (fileError) {
        console.error("Failed to read credentials file:", fileError);
        throw new Error(
          `Failed to read credentials file at ${credentialsPath}: ${
            fileError instanceof Error ? fileError.message : "Unknown error"
          }`
        );
      }
    } else {
      throw new Error(
        "No credentials found. Set one of: GOOGLE_SHEETS_CREDENTIALS_BASE64, GOOGLE_SHEETS_CREDENTIALS_JSON, or GOOGLE_SHEETS_CREDENTIALS"
      );
    }

    // Validate credentials structure
    if (!credentials.type || credentials.type !== "service_account") {
      throw new Error("Invalid credentials: must be a service account JSON");
    }

    if (!credentials.client_email) {
      throw new Error("Invalid credentials: missing client_email");
    }

    if (!credentials.private_key) {
      throw new Error("Invalid credentials: missing private_key");
    }

    console.log(`✅ Google Sheets client initialized using: ${methodUsed}`);
    console.log(`   Service account: ${credentials.client_email}`);

    // Create an auth client using the service account
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    // Create the Sheets API client
    const sheets = google.sheets({ version: "v4", auth });

    return sheets;
  } catch (error) {
    console.error("❌ Error creating Google Sheets client:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("   Error details:", errorMessage);
    throw new Error(`Failed to initialize Google Sheets client: ${errorMessage}`);
  }
}
