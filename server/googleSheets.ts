import { google } from 'googleapis';
import type { sheets_v4 } from 'googleapis';

/**
 * Grudge Studio Google Sheets Integration
 * 
 * Auth via service account:
 * - GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY env vars
 * - Or GOOGLE_APPLICATION_CREDENTIALS (path to service account JSON)
 */

let cachedAuth: any = null;

function getGoogleAuth() {
  if (cachedAuth) return cachedAuth;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (email && privateKey) {
    cachedAuth = new google.auth.JWT({
      email,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  } else {
    // Fall back to ADC (GOOGLE_APPLICATION_CREDENTIALS)
    cachedAuth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  }

  return cachedAuth;
}

export async function getSheetsClient(): Promise<sheets_v4.Sheets> {
  const auth = getGoogleAuth();
  return google.sheets({ version: 'v4', auth });
}

// Sheet IDs from environment
export const SHEET_IDS = {
  armor: process.env.GOOGLE_SHEET_ARMOR || '',
  weapons: process.env.GOOGLE_SHEET_WEAPONS || '',
  items: process.env.GOOGLE_SHEET_ITEMS || '',
  chef: process.env.GOOGLE_SHEET_CHEF || '',
  crafting: process.env.GOOGLE_SHEET_CRAFTING || '',
};

// Simple in-memory cache for sheet data (5 minute TTL)
const sheetCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function getCachedData(key: string): any | null {
  const cached = sheetCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

export function setCachedData(key: string, data: any): void {
  sheetCache.set(key, { data, timestamp: Date.now() });
}

export function clearCache(key?: string): void {
  if (key) {
    sheetCache.delete(key);
  } else {
    sheetCache.clear();
  }
}

export async function updateSheet(
  spreadsheetId: string,
  range: string,
  values: (string | number)[][]
): Promise<boolean> {
  try {
    const sheets = await getSheetsClient();
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: { values },
    });
    console.log(`Updated ${range} in spreadsheet ${spreadsheetId}`);
    return true;
  } catch (error) {
    console.error('Failed to update sheet:', error);
    return false;
  }
}

export async function appendSheet(
  spreadsheetId: string,
  range: string,
  values: (string | number)[][]
): Promise<boolean> {
  try {
    const sheets = await getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values },
    });
    console.log(`Appended to ${range} in spreadsheet ${spreadsheetId}`);
    return true;
  } catch (error) {
    console.error('Failed to append to sheet:', error);
    return false;
  }
}

export async function clearSheet(
  spreadsheetId: string,
  range: string
): Promise<boolean> {
  try {
    const sheets = await getSheetsClient();
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range,
    });
    return true;
  } catch (error) {
    console.error('Failed to clear sheet:', error);
    return false;
  }
}

export async function readSheet(
  spreadsheetId: string,
  range: string
): Promise<(string | number)[][] | null> {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    return response.data.values as (string | number)[][] || null;
  } catch (error) {
    console.error('Failed to read sheet:', error);
    return null;
  }
}

// Helper to check if sheets are configured
export function isConfigured(): boolean {
  return !!(
    (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS
  );
}
