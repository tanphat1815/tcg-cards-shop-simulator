/**
 * Mapping of TCGdex Set IDs to short Badge Codes (Abbreviation)
 * Based on user-provided reference images.
 */
export const SET_CODE_MAPPINGS: Record<string, string> = {
  // SV Series
  'sv01': 'SVI',
  'sv02': 'PAL',
  'sv03': 'OBF',
  'sv03.5': 'MEW', // 151
  'sv04': 'PAR',
  'sv04.5': 'PAF',
  'sv05': 'TEF',
  'sv06': 'TWM',
  'sv06.5': 'SFA',
  'sv07': 'SCR',
  'sv08': 'SSP',
  'sv08.5': 'PRE',
  'sv09': 'JTG',
  'sv10': 'DRI',
  'sv10.5w': 'WHT',
  'sv10.5b': 'BLK',
  
  // Special / Custom Sets
  'me01': 'MEG',  // Mega Evolution
  'me02': 'PFL',  // Phantasmal Flames
  'me02.5': 'ASC', // Ascended Heroes
  'me03': 'POR',  // Perfect Order
  'mep': 'MEP',   // Mega Evolution Promos
  
  // SWSH Series (Examples)
  'swsh12.5': 'CRZ',
  'swsh12': 'SIT',
  'swsh11': 'LOR',
  'swsh10': 'ASR'
};

export function getSetCode(setId: string): string | null {
  return SET_CODE_MAPPINGS[setId] || null;
}
