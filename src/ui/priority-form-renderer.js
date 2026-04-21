import { formatHours, formatNumber } from '../lib/format.js';
import { getCategoryName } from '../domain/index.js';
import { setMessage } from './setup-renderer.js';

export function resetPriorityForm(elements) {
  elements.priorityForm.reset();
  elements.priorityId.value = '';
  elements.priorityCategory.value = '1';
  elements.priorityWeight.value = '1';
  elements.savePriority.textContent = 'Save priority';
  elements.cancelEdit.hidden = true;
  elements.priorityForm.classList.remove('is-editing');
  elements.priorityPreview.hidden = true;
  elements.priorityPreview.classList.remove('error');
  elements.priorityPreview.textContent = '';
}

export function populatePriorityForm(elements, priority, reducedMotion) {
  elements.priorityId.value = priority.id;
  elements.priorityName.value = priority.name;
  elements.priorityCategory.value = priority.category;
  elements.priorityWeight.value = String(priority.weight);
  elements.savePriority.textContent = 'Update priority';
  elements.cancelEdit.hidden = false;
  elements.priorityForm.classList.add('is-editing');
  const behavior = reducedMotion ? 'auto' : 'smooth';
  elements.priorityForm.scrollIntoView({ behavior, block: 'nearest' });
  elements.priorityName.focus({ preventScroll: true });
}

export function buildDraftPriority(elements) {
  const weight = Number(elements.priorityWeight.value);
  return {
    id: elements.priorityId.value || 'draft-priority',
    existingId: elements.priorityId.value,
    name: elements.priorityName.value.trim(),
    category: elements.priorityCategory.value,
    categoryLabel: getCategoryName(elements.priorityCategory.value),
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

export function renderPriorityForm({ elements, plannerState, model, uiState, message, messageIsError }) {
  elements.priorityForm.classList.toggle('is-editing', Boolean(uiState.editingPriorityId));
  elements.savePriority.textContent = uiState.editingPriorityId ? 'Update priority' : 'Save priority';
  elements.cancelEdit.hidden = !uiState.editingPriorityId;

  const draft = buildDraftPriority(elements);
  const helperMessage = message || (uiState.editingPriorityId
    ? 'You are editing a saved priority. Update the details, then review the allocation.'
    : 'Add a priority, choose a category, and set a weight to preview the allocation.');
  setMessage(elements.priorityMessage, helperMessage, Boolean(messageIsError), uiState.reducedMotion);

  if (!draft.name && !uiState.editingPriorityId) {
    showPreviewMessage(elements.priorityPreview, 'Name a priority to see the live allocation preview.', false);
    return;
  }

  if (!model.isPercentageValid) {
    showPreviewMessage(elements.priorityPreview, 'Set the categories to 100% before previewing this priority.', true);
    return;
  }

  if (plannerState.freeHours <= 0) {
    showPreviewMessage(elements.priorityPreview, 'Enter available founder hours to preview this priority.', true);
    return;
  }

  if (draft.weight === null || !draft.name) {
    showPreviewMessage(elements.priorityPreview, 'Give the priority a name and a weight greater than 0 to calculate its share.', true);
    return;
  }

  if (!model.preview) {
    showPreviewMessage(elements.priorityPreview, 'Preview unavailable for the selected category. Try another category or adjust the split.', true);
    return;
  }

  const deltaText = model.preview.delta === null
    ? 'This will create a new allocation.'
    : model.preview.delta === 0
      ? 'This keeps the current allocation unchanged.'
      : `${model.preview.delta > 0 ? 'Gain' : 'Lose'} ${formatNumber(Math.abs(model.preview.delta))} hours compared with the saved value.`;

  elements.priorityPreview.hidden = false;
  elements.priorityPreview.classList.toggle('error', false);
  elements.priorityPreview.innerHTML = [
    '<span class="preview-label">Live preview</span>',
    `<strong class="preview-hours">${formatHours(model.preview.hours)}</strong>`,
    `<span class="preview-meta">${draft.categoryLabel} at weight ${formatNumber(draft.weight)}. ${deltaText}</span>`
  ].join('');
}
