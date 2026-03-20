function requireElement(root, id) {
  const element = root.getElementById(id);
  if (!element) {
    throw new Error(`Missing required element: ${id}`);
  }
  return element;
}

export function bindSetupElements(root = document) {
  return {
    freeHours: requireElement(root, 'free-hours'),
    bucketControls: requireElement(root, 'bucket-controls'),
    bucketInputs: {
      '1': requireElement(root, 'bucket-1'),
      '2': requireElement(root, 'bucket-2'),
      '3': requireElement(root, 'bucket-3')
    },
    bucketRanges: {
      '1': requireElement(root, 'bucket-1-range'),
      '2': requireElement(root, 'bucket-2-range'),
      '3': requireElement(root, 'bucket-3-range')
    },
    allocationTotal: requireElement(root, 'allocation-total'),
    allocationProgress: requireElement(root, 'allocation-progress-bar'),
    percentageMessage: requireElement(root, 'percentage-message')
  };
}

export function bindInterestFormElements(root = document) {
  return {
    interestForm: requireElement(root, 'interest-form'),
    interestId: requireElement(root, 'interest-id'),
    interestName: requireElement(root, 'interest-name'),
    interestBucket: requireElement(root, 'interest-bucket'),
    interestWeight: requireElement(root, 'interest-weight'),
    interestMessage: requireElement(root, 'interest-message'),
    interestPreview: requireElement(root, 'interest-preview'),
    cancelEdit: requireElement(root, 'cancel-edit'),
    saveInterest: requireElement(root, 'save-interest'),
    resetButton: requireElement(root, 'reset-button')
  };
}

export function bindInterestTableElements(root = document) {
  return {
    interestList: requireElement(root, 'interest-list')
  };
}

export function bindResultsElements(root = document) {
  return {
    allocationSummary: requireElement(root, 'allocation-summary'),
    allocationList: requireElement(root, 'allocation-list'),
    bucketResults: requireElement(root, 'bucket-results')
  };
}

export function bindAppElements(root = document) {
  return {
    setup: bindSetupElements(root),
    interestForm: bindInterestFormElements(root),
    interestTable: bindInterestTableElements(root),
    results: bindResultsElements(root)
  };
}
