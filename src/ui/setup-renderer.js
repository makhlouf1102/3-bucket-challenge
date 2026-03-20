import { formatNumber } from '../lib/format.js';

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
