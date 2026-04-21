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
    tip: 'Weight each priority by its importance inside the category, not by habit or urgency alone.',
    onboarding: 'Add the priorities you want to compare, then weight them to see how each category divides.'
  },
  results: {
    title: 'Review the weekly allocation.',
    detail: 'Review the category cards and open any one of them to see the split inside that category.',
    tip: 'Use the summary for the decision. Expand a card when you need the detail.',
    onboarding: 'Your week is ready to inspect. Review the summary first, then expand categories for the finer split.'
  }
};

function getJourneyStage(plannerState, model, uiState) {
  if (plannerState.freeHours <= 0 || !model.isPercentageValid) {
    return 'setup';
  }

  if (uiState.editingPriorityId || plannerState.priorities.length === 0) {
    return 'priorities';
  }

  return 'results';
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

function updateJourneySteps(elements, stage) {
  const orderedSteps = [
    { element: elements.stepSetup, id: 'setup' },
    { element: elements.stepPriorities, id: 'priorities' },
    { element: elements.stepResults, id: 'results' }
  ];

  orderedSteps.forEach((step, index) => {
    const isCurrent = step.id === stage;
    const isComplete = (stage === 'priorities' && index === 0) || (stage === 'results' && index < 2);
    step.element.classList.toggle('is-current', isCurrent);
    step.element.classList.toggle('is-complete', isComplete);
    step.element.classList.toggle('is-next', !isCurrent && !isComplete);
    if (isCurrent) {
      step.element.setAttribute('aria-current', 'step');
    } else {
      step.element.removeAttribute('aria-current');
    }
  });
}

export function renderJourneyStatus({ elements, plannerState, model, uiState }) {
  const status = buildJourneyStatus({ plannerState, model, uiState });

  elements.onboarding.textContent = status.onboarding;
  elements.statusLabel.textContent = status.label;
  elements.title.textContent = status.title;
  elements.detail.textContent = status.detail;
  elements.progressValue.textContent = status.progressValue;
  elements.progressBar.style.transform = `scaleX(${status.progressRatio})`;
  elements.tip.textContent = status.tip;

  updateJourneySteps(elements, status.stage);

  uiState.journeyStage = status.stage;
  return status;
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
