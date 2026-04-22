import { formatNumber } from '../lib/format.js';

const JOURNEY_COPY = {
  setup: {
    title: 'Set the operating week.',
    detail: 'Enter available founder hours and bring the category split to 100% so the planner can calculate the week.',
    tip: 'A realistic allocation beats an optimistic one. Use the hours you can actually protect.',
    onboarding: 'Start with your available founder hours and a realistic category split. The allocation view opens once the total reaches 100%.'
  },
  priorities: {
    title: 'Add the priorities competing for time.',
    detail: 'Name the growth work, operations, and renewal commitments drawing from the same weekly pool.',
    tip: 'Use 1 as baseline, 2 for important work, and 3 for critical work inside a category.',
    onboarding: 'Add the priorities you want to compare, then weight them with a simple relative scale.'
  },
  results: {
    title: 'Review the weekly allocation.',
    detail: 'Review the category cards and open any one of them to see the split inside that category.',
    tip: 'Use the summary for the decision. Expand a card when you need the detail.',
    onboarding: 'Your week is ready to inspect. Review the summary first, then expand categories for the finer split.'
  }
};

const JOURNEY_ORDER = ['setup', 'priorities', 'results'];

function getJourneyStage(plannerState, model, uiState) {
  if (plannerState.freeHours <= 0 || !model.isPercentageValid) {
    return 'setup';
  }

  if (uiState.editingPriorityId || plannerState.priorities.length === 0) {
    return 'priorities';
  }

  return 'results';
}

export function getUnlockedJourneyStages(plannerState, model) {
  const hasSetup = plannerState.freeHours > 0 && model.isPercentageValid;
  const hasPriorities = hasSetup && plannerState.priorities.length > 0;

  return {
    setup: true,
    priorities: hasSetup,
    results: hasPriorities
  };
}

export function resolveSelectedJourneyStage({ plannerState, model, uiState, recommendedStage }) {
  const unlockedStages = getUnlockedJourneyStages(plannerState, model);
  const selectedStage = uiState.selectedJourneyStage || recommendedStage;

  if (uiState.hasManualJourneySelection && unlockedStages[selectedStage]) {
    return selectedStage;
  }

  return recommendedStage;
}

function getStageProgress(stage) {
  if (stage === 'results') {
    return 1;
  }

  if (stage === 'priorities') {
    return 2 / 3;
  }

  return 1 / 3;
}

export function buildJourneyStatus({ plannerState, model, uiState }) {
  const stage = getJourneyStage(plannerState, model, uiState);
  const progressValue = stage === 'setup' ? '1/3' : stage === 'priorities' ? '2/3' : '3/3';
  const copy = JOURNEY_COPY[stage];

  return {
    stage,
    progressValue,
    progressRatio: getStageProgress(stage),
    title: copy.title,
    detail: copy.detail,
    tip: copy.tip,
    onboarding: copy.onboarding,
    label: stage === 'setup' ? 'Step 1 of 3' : stage === 'priorities' ? 'Step 2 of 3' : 'Step 3 of 3'
  };
}

function updateJourneySteps(elements, activeStage, unlockedStages) {
  const orderedSteps = [
    { element: elements.stepSetup, id: 'setup' },
    { element: elements.stepPriorities, id: 'priorities' },
    { element: elements.stepResults, id: 'results' }
  ];
  const activeIndex = JOURNEY_ORDER.indexOf(activeStage);
  elements.stepsList.dataset.progressStage = activeStage;

  orderedSteps.forEach((step, index) => {
    const isCurrent = step.id === activeStage;
    const isComplete = index < activeIndex;
    const isLocked = !unlockedStages[step.id];
    step.element.classList.toggle('is-current', isCurrent);
    step.element.classList.toggle('is-complete', isComplete);
    step.element.classList.toggle('is-next', !isCurrent && !isComplete && !isLocked);
    step.element.classList.toggle('is-locked', isLocked);
    if (isCurrent) {
      step.element.setAttribute('aria-current', 'step');
    } else {
      step.element.removeAttribute('aria-current');
    }
  });

  elements.stepButtons.forEach((button) => {
    const step = button.dataset.journeyStep;
    const isUnlocked = Boolean(unlockedStages[step]);
    button.disabled = !isUnlocked;
    button.setAttribute('aria-disabled', String(!isUnlocked));
  });
}

export function renderJourneyStatus({ elements, plannerState, model, uiState }) {
  const status = buildJourneyStatus({ plannerState, model, uiState });
  const selectedStage = resolveSelectedJourneyStage({
    plannerState,
    model,
    uiState,
    recommendedStage: status.stage
  });
  const unlockedStages = getUnlockedJourneyStages(plannerState, model);
  const selectedCopy = JOURNEY_COPY[selectedStage];
  const selectedLabel = selectedStage === 'setup' ? 'Step 1 of 3' : selectedStage === 'priorities' ? 'Step 2 of 3' : 'Step 3 of 3';
  const selectedProgressValue = selectedStage === 'setup' ? '1/3' : selectedStage === 'priorities' ? '2/3' : '3/3';

  elements.statusLabel.textContent = selectedLabel;
  elements.title.textContent = selectedCopy.title;
  elements.detail.textContent = selectedCopy.detail;
  elements.progressValue.textContent = selectedProgressValue;
  elements.progressBar.style.transform = `scaleX(${getStageProgress(selectedStage)})`;
  elements.tip.textContent = selectedCopy.tip;

  updateJourneySteps(elements, selectedStage, unlockedStages);

  uiState.journeyStage = status.stage;
  uiState.selectedJourneyStage = selectedStage;
  return { ...status, selectedStage, unlockedStages };
}

export function renderStepPanels(stepPanels, activeStage, reducedMotion) {
  const previousStage = Object.entries(stepPanels).find(([, panel]) => (
    panel.dataset.activeStepPanel === 'true'
  ))?.[0];
  const previousIndex = JOURNEY_ORDER.indexOf(previousStage);
  const activeIndex = JOURNEY_ORDER.indexOf(activeStage);
  const direction = previousIndex >= 0 && activeIndex < previousIndex ? 'back' : 'forward';

  Object.entries(stepPanels).forEach(([stage, panel]) => {
    const isActive = stage === activeStage;
    const wasActive = panel.dataset.activeStepPanel === 'true';
    panel.hidden = !isActive;
    panel.dataset.activeStepPanel = String(isActive);

    if (reducedMotion || !isActive || wasActive) {
      panel.classList.remove('is-step-entering', 'is-step-forward', 'is-step-back');
      return;
    }

    panel.classList.remove('is-step-entering', 'is-step-forward', 'is-step-back');
    panel.classList.add(direction === 'back' ? 'is-step-back' : 'is-step-forward');
    window.requestAnimationFrame(() => panel.classList.add('is-step-entering'));
  });
}

function getStepNavMessage(stage, plannerState, model) {
  if (stage === 'setup') {
    if (plannerState.freeHours <= 0) {
      return 'Enter your available founder hours to continue.';
    }

    if (!model.isPercentageValid) {
      return 'Bring the category total to 100% to continue.';
    }

    return 'Ready for priorities.';
  }

  if (stage === 'priorities') {
    if (plannerState.priorities.length === 0) {
      return 'Save at least one priority to review the allocation.';
    }

    return 'Ready to review the weekly allocation.';
  }

  return 'Use Back to adjust priorities.';
}

export function renderStepNavigation({ buttons, notes }, plannerState, model) {
  const unlockedStages = getUnlockedJourneyStages(plannerState, model);

  buttons.forEach((button) => {
    const targetStage = button.dataset.stepNav;
    const isUnlocked = Boolean(unlockedStages[targetStage]);
    button.disabled = !isUnlocked;
    button.setAttribute('aria-disabled', String(!isUnlocked));
  });

  notes.forEach((note) => {
    note.textContent = getStepNavMessage(note.dataset.stepNavNote, plannerState, model);
  });
}

export function setMessage(element, text, isError, reducedMotion) {
  const previousText = element.dataset.messageText ?? '';
  const previousErrorState = element.dataset.messageIsError === 'true';
  const hasChanged = previousText !== text || previousErrorState !== isError;

  element.textContent = text;
  element.classList.toggle('error', isError);
  element.dataset.messageText = text;
  element.dataset.messageIsError = String(isError);

  if (reducedMotion || !text) {
    element.classList.remove('message-pop');
    return;
  }

  if (hasChanged) {
    element.classList.remove('message-pop');
    window.requestAnimationFrame(() => element.classList.add('message-pop'));
  }
}

export function renderSetup({ elements, plannerState, model, uiState }) {
  renderJourneyStatus({ elements: elements.journey, plannerState, model, uiState });

  elements.freeHours.value = String(plannerState.freeHours);
  Object.entries(elements.categoryInputs).forEach(([categoryId, input]) => {
    const value = String(plannerState.categoryPercentages[categoryId]);
    input.value = value;
    elements.categoryRanges[categoryId].value = value;
    elements.categoryRanges[categoryId].setAttribute('aria-valuenow', value);
  });

  const progressRatio = Math.min(model.percentageTotal, 100) / 100;
  elements.allocationTotal.textContent = `${formatNumber(model.percentageTotal)}%`;
  elements.allocationProgress.style.transform = `scaleX(${progressRatio})`;
  elements.categoryControls.querySelector('.allocation-progress').classList.toggle('is-invalid', !model.isPercentageValid);

  Object.values(elements.categoryInputs).forEach((input) => {
    input.closest('.category-field').classList.toggle('is-invalid', !model.isPercentageValid);
  });

  setMessage(elements.percentageMessage, model.percentageMessage, !model.isPercentageValid, uiState.reducedMotion);
}
