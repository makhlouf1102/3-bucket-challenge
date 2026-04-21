import { formatNumber } from '../lib/format.js';
import { getCategoryName } from '../domain/index.js';
import { syncRows } from './dom-utils.js';
import { settleAnimationClass } from './animation.js';
import { MOTION_MEDIUM_MS } from '../lib/config.js';

function buildPriorityRow(priority, reducedMotion) {
  const row = document.createElement('tr');
  row.className = 'data-row is-entering';
  row.dataset.key = priority.id;
  row.innerHTML = [
    '<td data-label="Priority"></td>',
    '<td data-label="Category"></td>',
    '<td data-label="Weight"></td>',
    '<td data-label="Actions"><div class="row-actions">',
    `<button type="button" class="button" data-action="edit" data-id="${priority.id}">Edit</button>`,
    `<button type="button" class="button button-ghost button-danger" data-action="delete" data-id="${priority.id}">Delete</button>`,
    '</div></td>'
  ].join('');
  settleAnimationClass(row, 'is-entering', reducedMotion);
  return row;
}

function updatePriorityRow(row, priority, reducedMotion) {
  const cells = row.children;
  cells[0].textContent = priority.name;
  cells[1].textContent = getCategoryName(priority.category);
  cells[2].textContent = formatNumber(priority.weight);
  row.classList.add('is-updating');
  settleAnimationClass(row, 'is-updating', reducedMotion);
}

export function renderPriorityTable({ elements, plannerState, uiState }) {
  if (plannerState.priorities.length === 0) {
    elements.priorityList.innerHTML = '<tr class="empty-state"><td colspan="4">No priorities yet. Add the first one to make the plan concrete.</td></tr>';
    return;
  }

  syncRows({
    tbody: elements.priorityList,
    items: plannerState.priorities,
    getKey: (priority) => priority.id,
    buildRow: (priority) => buildPriorityRow(priority, uiState.reducedMotion),
    updateRow: (row, priority) => updatePriorityRow(row, priority, uiState.reducedMotion),
    emptyMarkup: '<tr class="empty-state"><td colspan="4">No priorities yet. Add the first one to make the plan concrete.</td></tr>',
    removeKey: uiState.lastDeletedPriorityId,
    removeDelay: uiState.reducedMotion ? 0 : MOTION_MEDIUM_MS
  });
}
