/**
 * Utility functions for currency and funding calculations
 */

/**
 * Parse funding string into numeric value
 * Supports formats like: "$250K", "1M", "500000", "$1.5M", etc.
 */
export function parseFundingNeeded(fundingString: string): number {
  if (!fundingString) return 0;
  
  // Remove currency symbols and spaces
  const cleaned = fundingString.replace(/[$,\s]/g, '').toUpperCase();
  
  // Extract number and suffix
  const match = cleaned.match(/^(\d+(?:\.\d+)?)([KMB]?)$/);
  if (!match) return 0;
  
  const [, numberStr, suffix] = match;
  const number = parseFloat(numberStr);
  
  switch (suffix) {
    case 'K':
      return number * 1000;
    case 'M':
      return number * 1000000;
    case 'B':
      return number * 1000000000;
    default:
      return number;
  }
}

/**
 * Format number as currency with appropriate suffix
 */
export function formatCurrency(amount: number): string {
  if (amount >= 1000000000) {
    return `$${(amount / 1000000000).toFixed(1)}B`;
  } else if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  } else {
    return `$${amount.toFixed(0)}`;
  }
}

/**
 * Calculate company valuation based on funding needed and equity percentage
 */
export function calculateCompanyValuation(fundingNeeded: number, equityPercentage: number): number {
  if (equityPercentage === 0) return 0;
  return (fundingNeeded / equityPercentage) * 100;
}

/**
 * Calculate dollar value of equity stake
 */
export function calculateEquityValue(equityPercentage: number, companyValuation: number): number {
  return (equityPercentage / 100) * companyValuation;
}