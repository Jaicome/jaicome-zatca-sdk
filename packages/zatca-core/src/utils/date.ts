/**
 * Pure date formatting utilities for ZATCA date/time formats.
 * Uses UTC methods only - never local time methods.
 */

/**
 * Formats a date to YYYY-MM-DD (BT-2 format, no timezone).
 * @param date - Date object to format
 * @returns Formatted date string in YYYY-MM-DD format
 */
export const formatDate = (date: Date): string => {
  const year = String(date.getUTCFullYear()).padStart(4, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Formats a date to HH:mm:ssZ (KSA-25 format, UTC with Z suffix).
 * @param date - Date object to format
 * @returns Formatted time string in HH:mm:ssZ format
 */
export const formatTime = (date: Date): string => {
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}Z`;
};

/**
 * Formats a date to YYYY-MM-DDTHH:mm:ssZ (QR Tag 3 format, UTC mandatory).
 * @param date - Date object to format
 * @returns Formatted ISO timestamp string with Z suffix
 */
export const formatQRTimestamp = (date: Date): string => {
  const dateStr = formatDate(date);
  const timeStr = formatTime(date);
  return `${dateStr}T${timeStr}`;
};
