import { formatHours, formatNumber } from '../lib/format.js';
import { getBucketName } from '../domain/index.js';
import { setMessage } from './setup-renderer.js';

export function resetInterestForm(elements) {
  elements.interestForm.reset();
  elements.interestId.value = '';
  elements.interestBucket.value = '1';
  elements.interestWeight.value = '1';
  elements.saveInterest.textContent = 'Save interest';
  elements.cancelEdit.hidden = true;
  elements.interestForm.classList.remove('is-editing');
  elements.interestPreview.hidden = true;
  elements.interestPreview.classList.remove('error');
  elements.interestPreview.textContent = '';
}

export function populateInterestForm(elements, interest, reducedMotion) {
  elements.interestId.value = interest.id;
  elements.interestName.value = interest.name;
  elements.interestBucket.value = interest.bucket;
  elements.interestWeight.value = String(interest.weight);
  elements.saveInterest.textContent = 'Update interest';
  elements.cancelEdit.hidden = false;
  elements.interestForm.classList.add('is-editing');
  const behavior = reducedMotion ? 'auto' : 'smooth';
  elements.interestForm.scrollIntoView({ behavior, block: 'nearest' });
  elements.interestName.focus({ preventScroll: true });
}

export function buildDraftInterest(elements) {
  const weight = Number(elements.interestWeight.value);
  return {
    id: elements.interestId.value || 'draft-interest',
    existingId: elements.interestId.value,
    name: elements.interestName.value.trim(),
    bucket: elements.interestBucket.value,
    bucketLabel: getBucketName(elements.interestBucket.value),
    weight: Number.isFinite(weight) && weight > 0 ? weight : null
  };
}

function showPreviewMessage(previewElement, text, isError) {
  previewElement.hidden = false;
  previewElement.classList.toggle('error', isError);
  previewElement.innerHTML = [
    '<span class="preview-label">Live preview</span>',
    `<span class="preview-meta">${text}</span>`
  ].join('');
}

export function renderInterestForm({ elements, plannerState, model, uiState, message, messageIsError }) {
  elements.interestForm.classList.toggle('is-editing', Boolean(uiState.editingInterestId));
  elements.saveInterest.textContent = uiState.editingInterestId ? 'Update interest' : 'Save interest';
  elements.cancelEdit.hidden = !uiState.editingInterestId;

  const draft = buildDraftInterest(elements);
  const helperMessage = message || (uiState.editingInterestId
    ? 'You are editing a saved interest. Update the details, then review the allocation preview.'
    : 'Add a name, choose a bucket, and set a weight to preview the allocation.');
  setMessage(elements.interestMessage, helperMessage, Boolean(messageIsError), uiState.reducedMotion);

  if (!draft.name && !uiState.editingInterestId) {
    showPreviewMessage(elements.interestPreview, 'Name an interest to see the live allocation preview.', false);
    return;
  }

  if (!model.isPercentageValid) {
    showPreviewMessage(elements.interestPreview, 'Set the buckets to 100% before previewing this interest.', true);
    return;
  }

  if (plannerState.freeHours <= 0) {
    showPreviewMessage(elements.interestPreview, 'Enter weekly free hours to preview how this interest will land.', true);
    return;
  }

  if (draft.weight === null || !draft.name) {
    showPreviewMessage(elements.interestPreview, 'Give the interest a name and a weight greater than 0 to calculate its share.', true);
    return;
  }

  if (!model.preview) {
    showPreviewMessage(elements.interestPreview, 'Preview unavailable for the selected bucket. Try another bucket or adjust the split.', true);
    return;
  }

  const deltaText = model.preview.delta === null
    ? 'This will create a new allocation.'
    : model.preview.delta === 0
      ? 'This keeps the current allocation unchanged.'
      : `${model.preview.delta > 0 ? 'Gain' : 'Lose'} ${formatNumber(Math.abs(model.preview.delta))} hours compared with the saved value.`;

  elements.interestPreview.hidden = false;
  elements.interestPreview.classList.toggle('error', false);
  elements.interestPreview.innerHTML = [
    '<span class="preview-label">Live preview</span>',
    `<strong class="preview-hours">${formatHours(model.preview.hours)}</strong>`,
    `<span class="preview-meta">${draft.bucketLabel} at weight ${formatNumber(draft.weight)}. ${deltaText}</span>`
  ].join('');
}
