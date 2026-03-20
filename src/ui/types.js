/**
 * @typedef {Object} UiState
 * @property {string} editingInterestId
 * @property {string} expandedBucketId
 * @property {string} lastChangedInterestId
 * @property {string} lastDeletedInterestId
 * @property {Map<string, number>} previousAllocations
 * @property {string} summaryText
 * @property {boolean} reducedMotion
 */

/**
 * @typedef {Object} RendererContext
 * @property {Record<string, unknown>} elements
 * @property {import('../domain/types.js').PlannerModel} model
 * @property {UiState} uiState
 */

export function createDefaultUiState() {
  return {
    editingInterestId: '',
    expandedBucketId: '',
    lastChangedInterestId: '',
    lastDeletedInterestId: '',
    previousAllocations: new Map(),
    summaryText: '',
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
  };
}
