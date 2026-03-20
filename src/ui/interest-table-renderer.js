import { formatNumber } from '../lib/format.js';
import { getBucketName } from '../domain/index.js';
import { syncRows } from './dom-utils.js';
import { settleAnimationClass } from './animation.js';
import { MOTION_MEDIUM_MS } from '../lib/config.js';

function buildInterestRow(interest, reducedMotion) {
  const row = document.createElement('tr');
  row.className = 'data-row is-entering';
  row.dataset.key = interest.id;
  row.innerHTML = [
    '<td data-label="Interest"></td>',
    '<td data-label="Bucket"></td>',
    '<td data-label="Weight"></td>',
    '<td data-label="Actions"><div class="row-actions">',
    `<button type="button" class="button" data-action="edit" data-id="${interest.id}">Edit</button>`,
    `<button type="button" class="button button-ghost button-danger" data-action="delete" data-id="${interest.id}">Delete</button>`,
    '</div></td>'
  ].join('');
  settleAnimationClass(row, 'is-entering', reducedMotion);
  return row;
}

function updateInterestRow(row, interest, reducedMotion) {
  const cells = row.children;
  cells[0].textContent = interest.name;
  cells[1].textContent = getBucketName(interest.bucket);
  cells[2].textContent = formatNumber(interest.weight);
  row.classList.add('is-updating');
  settleAnimationClass(row, 'is-updating', reducedMotion);
}

export function renderInterestTable({ elements, plannerState, uiState }) {
  if (plannerState.interests.length === 0) {
    elements.interestList.innerHTML = '<tr class="empty-state"><td colspan="4">No interests yet. Add the first one to make the plan tangible.</td></tr>';
    return;
  }

  syncRows({
    tbody: elements.interestList,
    items: plannerState.interests,
    getKey: (interest) => interest.id,
    buildRow: (interest) => buildInterestRow(interest, uiState.reducedMotion),
    updateRow: (row, interest) => updateInterestRow(row, interest, uiState.reducedMotion),
    emptyMarkup: '<tr class="empty-state"><td colspan="4">No interests yet. Add the first one to make the plan tangible.</td></tr>',
    removeKey: uiState.lastDeletedInterestId,
    removeDelay: uiState.reducedMotion ? 0 : MOTION_MEDIUM_MS
  });
}
