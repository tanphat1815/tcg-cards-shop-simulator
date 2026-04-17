/**
 * Utilities for Expansion/Set information
 */

/**
 * Returns the TCGdex Symbol URL for a given set
 * Pattern: https://assets.tcgdex.net/en/{seriesId}/{setId}/symbol.png
 */
export function getSetSymbolUrl(seriesId: string, setId: string): string {
  if (!seriesId || !setId) return '';
  
  // TCGdex uses lowercase IDs for assets
  const sId = seriesId.toLowerCase();
  const stId = setId.toLowerCase();
  
  return `https://assets.tcgdex.net/en/${sId}/${stId}/symbol.png`;
}
