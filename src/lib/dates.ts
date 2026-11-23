/**
 * Sheet dates are calendar days written M/D/YYYY, without leading zeros.
 * Example: 11/24/2026.
 */

const SHEET_DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

export function formatSheetDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

export function normalizeSheetDate(value: string): string {
  const trimmed = value.trim();
  const mdY = SHEET_DATE.exec(trimmed);
  if (mdY) {
    return `${Number(mdY[1])}/${Number(mdY[2])}/${mdY[3]}`;
  }

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (iso) {
    return `${Number(iso[2])}/${Number(iso[3])}/${iso[1]}`;
  }

  // Google Sheets serial date (days since 1899-12-30), date only.
  if (/^\d{5,6}(\.\d+)?$/.test(trimmed)) {
    const serial = Math.floor(Number(trimmed));
    if (serial > 20000 && serial < 80000) {
      const utc = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
      if (!Number.isNaN(utc.getTime())) {
        return `${utc.getUTCMonth() + 1}/${utc.getUTCDate()}/${utc.getUTCFullYear()}`;
      }
    }
  }

  return trimmed;
}

export function isRealSheetDate(value: string): boolean {
  const match = SHEET_DATE.exec(value);
  if (!match) return false;
  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}
