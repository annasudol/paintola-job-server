/**
 * Extracts a user-friendly error message from an Axios error or generic error.
 * Falls back to a generic message if nothing specific is found.
 *
 * @param {any} error - The error object thrown by Axios or other code.
 * @returns {string} - Extracted error message.
 */

export function getApiErrorMessage(error: any): string {
  return (
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    "Something went wrong"
  )
}
