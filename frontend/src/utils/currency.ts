// src/lib/currency.ts

/**
 * Format a number to Bangladeshi Taka (BDT)
 *
 * @param amount - The numeric amount to format
 * @param options - Optional formatting options
 * @returns Formatted string (e.g., "৳ 1,250.50" or "TK 1,250.50")
 *
 * @example
 * formatBDT(1250.5)   // "৳ 1,250.50"
 * formatBDT(1250.5, { symbol: 'TK' }) // "TK 1,250.50"
 * formatBDT(1250.5, { decimalPlaces: 0 }) // "৳ 1,251"
 * formatBDT(-1250.5)  // "-৳ 1,250.50"
 */
export function formatBDT(
  amount: number,
  options?: {
    symbol?: '৳' | 'TK'; // default: '৳'
    decimalPlaces?: number; // default: 2
    useGrouping?: boolean; // default: true
  }
): string {
  const { symbol = '৳', decimalPlaces = 2, useGrouping = true } = options || {};

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  // Format the absolute value with grouping and decimals
  const formatted = absAmount.toLocaleString('en-US', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
    useGrouping,
  });

  // Build the final string
  const sign = isNegative ? '-' : '';
  return `${sign}${symbol} ${formatted}`;
}

/**
 * Parse a BDT-formatted string back to a number
 *
 * @param formatted - The formatted string (e.g., "৳ 1,250.50" or "TK 1,250.50")
 * @returns The numeric value (e.g., 1250.50)
 *
 * @example
 * parseBDT('৳ 1,250.50') // 1250.5
 * parseBDT('TK 1,250.50') // 1250.5
 * parseBDT('1,250.50')   // 1250.5
 */
export function parseBDT(formatted: string): number {
  // Remove currency symbols, commas, and spaces
  const cleaned = formatted
    .replace(/[৳TK,]/g, '') // Remove ৳, T, K, commas
    .replace(/^\s+|\s+$/g, '') // Trim whitespace
    .trim();

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format a number using a custom currency code (generic helper)
 *
 * @param amount - The numeric amount
 * @param currencyCode - ISO currency code (e.g., 'BDT', 'USD')
 * @param locale - Locale string (default: 'bn-BD' for Bangladesh)
 * @returns Formatted string (e.g., "BDT 1,250.50")
 *
 * @example
 * formatCurrency(1250.5, 'BDT')      // "BDT 1,250.50"
 * formatCurrency(1250.5, 'USD', 'en-US') // "USD 1,250.50"
 */
export function formatCurrency(
  amount: number,
  currencyCode: string = 'BDT',
  locale: string = 'bn-BD'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
  }).format(amount);
}

/**
 * Convert a string input (like from an input field) to a number,
 * handling decimal separators and removing non-numeric characters.
 * Useful for form submissions.
 *
 * @param input - Raw input string (e.g., "1,250.50" or "1250.50")
 * @returns The numeric value
 *
 * @example
 * sanitizeNumericInput('1,250.50') // 1250.5
 * sanitizeNumericInput('1250.50')  // 1250.5
 * sanitizeNumericInput('1,250')    // 1250
 */
export function sanitizeNumericInput(input: string): number {
  const cleaned = input.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Resolve the display symbol for an ISO currency code.
 * (e.g. 'USD' -> '$', 'BDT' -> '৳'). Falls back to the uppercased code.
 */
export function getCurrencySymbol(
  currencyCode: string = 'BDT',
  locale: string = 'en-US'
): string {
  const code = (currencyCode || 'BDT').toUpperCase();
  try {
    const parts = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
    }).formatToParts(0);
    return parts.find((p) => p.type === 'currency')?.value || code;
  } catch {
    return code;
  }
}

/**
 * Format an amount using a currency code from the store settings.
 * (e.g. formatMoney(1250.5, 'USD') -> '$1,250.50')
 */
export function formatMoney(
  amount: number,
  currencyCode: string = 'BDT',
  locale: string = 'en-US'
): string {
  const code = (currencyCode || 'BDT').toUpperCase();
  const value = Number(amount) || 0;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
    }).format(value);
  } catch {
    return `${code} ${value.toFixed(2)}`;
  }
}

/**
 * Shortcut for formatBDT with TK symbol (useful for admin panels or specific contexts)
 */
export const formatBDT_TK = (amount: number) =>
  formatBDT(amount, { symbol: 'TK' });

/**
 * Shortcut for formatBDT with no grouping (for specific UI needs like small widgets)
 */
export const formatBDT_Compact = (amount: number) =>
  formatBDT(amount, { useGrouping: false, decimalPlaces: 0 });
