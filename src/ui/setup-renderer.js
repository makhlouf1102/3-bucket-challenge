import { formatNumber } from '../lib/format.js';

const JOURNEY_COPY = {
  setup: {
    title: 'Set your weekly rhythm.',
    detail: 'Enter free hours and bring the bucket split to 100% so the planner can calculate the week.',
    tip: 'A realistic split beats an optimistic one. Use the hours you can actually direct.',
    onboarding: 'Start with your available hours and a realistic bucket split. The rest of the planner unlocks once the total reaches 100%.'
  },
  interests: {
    title: 'Add the interests competing for time.',
    detail: 'Name the work, obligations, and curiosities that are drawing from the same weekly pool.',
    tip: 'Weight each interest by importance inside its bucket, not by how often you want to see it.',
    onboarding: 'Add the interests you want to compare, then weight them to see how the bucket divides.'
  },
  results: {
    title: 'Read the weekly allocation.',
    detail: 'Review the bucket cards and open any one of them to see the split inside that bucket.',
    tip: 'The overview is the summary. Expand a card when you want the details.',
    onboarding: 'Your week is ready to inspect. Review the summary first, then expand buckets for the finer split.'
  }
};

function getJourneyStage(plannerState, model, uiState) {
  if (plannerState.freeHours <= 0 || !model.isPercentageValid) {
    return 'setup';
  }

  if (uiState.editingInterestId || plannerState.interests.length === 0) {
    return 'interests';
  }

  return 'results';
}

function getStageProgress(stage) {
  if (stage === 'results') {
    return 1;
  }

  if (stage === 'interests') {
    return 2 / 3;
  }

  return 1 / 3;
}

export function buildJourneyStatus({ plannerState, model, uiState }) {
  const stage = getJourneyStage(plannerState, model, uiState);
  const progressValue = stage === 'setup' ? '1/3' : stage === 'interests' ? '2/3' : '3/3';
  const copy = JOURNEY_COPY[stage];

  return {
    stage,
    progressValue,
    progressRatio: getStageProgress(stage),
    title: copy.title,
    detail: copy.detail,
    tip: copy.tip,
    onboarding: copy.onboarding,
    label: stage === 'setup' ? 'Step 1 of 3' : stage === 'interests' ? 'Step 2 of 3' : 'Step 3 of 3'
  };
}

function updateJourneySteps(elements, stage) {
  const orderedSteps = [
    { element: elements.stepSetup, id: 'setup' },
    { element: elements.stepInterests, id: 'interests' },
    { element: elements.stepResults, id: 'results' }
  ];

  orderedSteps.forEach((step, index) => {
    const isCurrent = step.id === stage;
    const isComplete = (stage === 'interests' && index === 0) || (stage === 'results' && index < 2);
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
  Object.entries(elements.bucketInputs).forEach(([bucketId, input]) => {
    const value = String(plannerState.bucketPercentages[bucketId]);
    input.value = value;
    elements.bucketRanges[bucketId].value = value;
    elements.bucketRanges[bucketId].setAttribute('aria-valuenow', value);
  });

  const progressRatio = Math.min(model.percentageTotal, 100) / 100;
  elements.allocationTotal.textContent = `${formatNumber(model.percentageTotal)}%`;
  elements.allocationProgress.style.transform = `scaleX(${progressRatio})`;
  elements.bucketControls.querySelector('.allocation-progress').classList.toggle('is-invalid', !model.isPercentageValid);

  Object.values(elements.bucketInputs).forEach((input) => {
    input.closest('.bucket-field').classList.toggle('is-invalid', !model.isPercentageValid);
  });

  setMessage(elements.percentageMessage, model.percentageMessage, !model.isPercentageValid, uiState.reducedMotion);
}
