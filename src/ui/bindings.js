function requireElement(root, id) {
  const element = root.getElementById(id);
  if (!element) {
    throw new Error(`Missing required element: ${id}`);
  }
  return element;
}

function bindJourneyElements(root = document) {
  return {
    onboarding: requireElement(root, 'hero-onboarding'),
    statusLabel: requireElement(root, 'journey-status-label'),
    title: requireElement(root, 'journey-title'),
    detail: requireElement(root, 'journey-status-detail'),
    progressValue: requireElement(root, 'journey-progress-value'),
    progressBar: requireElement(root, 'journey-progress-bar'),
    tip: requireElement(root, 'journey-status-tip'),
    stepsList: requireElement(root, 'journey-steps'),
    stepSetup: requireElement(root, 'step-setup'),
    stepPriorities: requireElement(root, 'step-priorities'),
    stepResults: requireElement(root, 'step-results'),
    stepButtons: Array.from(root.querySelectorAll('[data-journey-step]'))
  };
}

export function bindSetupElements(root = document) {
  return {
    freeHours: requireElement(root, 'free-hours'),
    categoryControls: requireElement(root, 'category-controls'),
    categoryInputs: {
      '1': requireElement(root, 'category-1'),
      '2': requireElement(root, 'category-2'),
      '3': requireElement(root, 'category-3')
    },
    categoryRanges: {
      '1': requireElement(root, 'category-1-range'),
      '2': requireElement(root, 'category-2-range'),
      '3': requireElement(root, 'category-3-range')
    },
    allocationTotal: requireElement(root, 'allocation-total'),
    allocationProgress: requireElement(root, 'allocation-progress-bar'),
    percentageMessage: requireElement(root, 'percentage-message')
  };
}

export function bindPriorityFormElements(root = document) {
  return {
    priorityForm: requireElement(root, 'priority-form'),
    priorityId: requireElement(root, 'priority-id'),
    priorityName: requireElement(root, 'priority-name'),
    priorityCategory: requireElement(root, 'priority-category'),
    priorityWeight: requireElement(root, 'priority-weight'),
    priorityMessage: requireElement(root, 'priority-message'),
    priorityPreview: requireElement(root, 'priority-preview'),
    cancelEdit: requireElement(root, 'cancel-edit'),
    savePriority: requireElement(root, 'save-priority'),
    resetButton: requireElement(root, 'reset-button')
  };
}

export function bindPriorityTableElements(root = document) {
  return {
    priorityList: requireElement(root, 'priority-list')
  };
}

export function bindResultsElements(root = document) {
  return {
    allocationSummary: requireElement(root, 'allocation-summary'),
    allocationList: requireElement(root, 'allocation-list'),
    categoryResults: requireElement(root, 'category-results')
  };
}

export function bindAppElements(root = document) {
  return {
    journey: bindJourneyElements(root),
    setup: bindSetupElements(root),
    priorityForm: bindPriorityFormElements(root),
    priorityTable: bindPriorityTableElements(root),
    results: bindResultsElements(root),
    stepPanels: {
      setup: requireElement(root, 'setup-panel'),
      priorities: requireElement(root, 'priorities-panel'),
      results: requireElement(root, 'results-panel')
    },
    stepNavButtons: Array.from(root.querySelectorAll('[data-step-nav]')),
    stepNavNotes: Array.from(root.querySelectorAll('[data-step-nav-note]'))
  };
}
