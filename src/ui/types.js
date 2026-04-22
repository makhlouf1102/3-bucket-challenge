/**
 * @typedef {Object} UiState
 * @property {string} editingPriorityId
 * @property {string} expandedCategoryId
 * @property {string} lastChangedPriorityId
 * @property {string} lastDeletedPriorityId
 * @property {'setup' | 'priorities' | 'results'} selectedJourneyStage
 * @property {boolean} hasManualJourneySelection
 * @property {'setup' | 'priorities' | 'results'} journeyStage
 * @property {string} pendingFocusTarget
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
    editingPriorityId: '',
    expandedCategoryId: '',
    lastChangedPriorityId: '',
    lastDeletedPriorityId: '',
    selectedJourneyStage: 'setup',
    hasManualJourneySelection: false,
    journeyStage: 'setup',
    pendingFocusTarget: '',
    previousAllocations: new Map(),
    summaryText: '',
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
  };
}
