import { formatHours, formatNumber } from '../lib/format.js';
import { getCategoryName } from '../domain/index.js';
import { syncKeyedChildren, syncRows } from './dom-utils.js';
import { animateNumber, highlightChangedTargets, settleAnimationClass } from './animation.js';

function buildAllocationRow(item, reducedMotion) {
  const row = document.createElement('tr');
  row.className = 'data-row is-entering';
  row.dataset.key = item.id;
  row.innerHTML = [
    '<td data-label="Priority"></td>',
    '<td data-label="Category"></td>',
    '<td data-label="Weight"></td>',
    '<td data-label="Hours per week" data-role="hours"></td>'
  ].join('');
  settleAnimationClass(row, 'is-entering', reducedMotion);
  return row;
}

function updateAllocationRow(row, item, reducedMotion) {
  const cells = row.children;
  cells[0].textContent = item.name;
  cells[1].textContent = getCategoryName(item.category);
  cells[2].textContent = formatNumber(item.weight);
  animateNumber(cells[3], item.hours, formatHours, reducedMotion);
  row.classList.add('is-updating');
  settleAnimationClass(row, 'is-updating', reducedMotion);
}

function renderCategoryDetails(container, category, percentageTotal) {
  if (percentageTotal !== 100) {
    container.innerHTML = '<p class="category-detail-empty">Bring the category split to 100% to unlock the breakdown.</p>';
    return;
  }

  if (!category.allocations.length) {
    container.innerHTML = '<p class="category-detail-empty">This category is empty. Add a priority to see the split.</p>';
    return;
  }

  const totalHours = category.hours || 1;
  container.replaceChildren(...category.allocations.map((item) => {
    const row = document.createElement('div');
    const share = category.hours === 0 ? 0 : (item.hours / totalHours) * 100;
    row.className = 'category-detail-item';

    const head = document.createElement('div');
    head.className = 'category-detail-head';

    const name = document.createElement('span');
    name.className = 'category-detail-name';
    name.textContent = item.name;

    const meta = document.createElement('span');
    meta.className = 'category-detail-meta';
    meta.textContent = `${formatHours(item.hours)} · ${formatNumber(share)}%`;

    head.append(name, meta);

    const bar = document.createElement('div');
    bar.className = 'category-detail-bar';

    const fill = document.createElement('div');
    fill.className = 'category-detail-fill';
    fill.style.transform = `scaleX(${Math.max(share, 0) / 100})`;
    bar.appendChild(fill);

    row.append(head, bar);
    return row;
  }));
}

function buildCategoryCard(category, uiState) {
  const article = document.createElement('article');
  article.className = `category-card ${category.accentClass} is-entering`;
  article.dataset.key = category.id;
  article.innerHTML = [
    '<div class="kicker"></div>',
    '<h3></h3>',
    '<div class="category-hours"><strong data-role="hours"></strong></div>',
    '<div class="category-meta">',
    '<div class="category-meta-item"><span class="category-meta-label">Share</span><strong data-role="share"></strong></div>',
    '<div class="category-meta-item"><span class="category-meta-label">Priorities</span><strong data-role="count"></strong></div>',
    '</div>',
    '<p class="category-status"></p>',
    `<button type="button" class="category-toggle button-ghost" data-category-toggle="${category.id}" aria-expanded="false" aria-controls="category-details-${category.id}">Show category split</button>`,
    `<div id="category-details-${category.id}" class="category-detail-list"></div>`
  ].join('');
  settleAnimationClass(article, 'is-entering', uiState.reducedMotion);
  return article;
}

function updateCategoryCard(article, category, percentageTotal, uiState) {
  const isExpanded = uiState.expandedCategoryId === category.id;
  article.querySelector('.kicker').textContent = category.label;
  article.querySelector('h3').textContent = category.name;
  animateNumber(article.querySelector('[data-role="hours"]'), category.hours, formatHours, uiState.reducedMotion);
  article.querySelector('[data-role="share"]').textContent = `${formatNumber(category.percentage)}%`;
  article.querySelector('[data-role="count"]').textContent = String(category.priorities.length);
  article.querySelector('.category-status').textContent = category.status;
  const toggle = article.querySelector('[data-category-toggle]');
  toggle.setAttribute('aria-expanded', String(isExpanded));
  toggle.textContent = isExpanded ? 'Hide category split' : 'Show category split';
  article.classList.toggle('is-expanded', isExpanded);
  renderCategoryDetails(article.querySelector('.category-detail-list'), category, percentageTotal);
  article.classList.add('is-updating');
  settleAnimationClass(article, 'is-updating', uiState.reducedMotion);
}

export function renderResults({ elements, plannerState, model, uiState, root = document }) {
  elements.allocationSummary.hidden = false;
  elements.allocationSummary.textContent = model.summaryText;

  syncKeyedChildren({
    container: elements.categoryResults,
    items: model.categoryAllocations,
    getKey: (category) => category.id,
    buildNode: (category) => buildCategoryCard(category, uiState),
    updateNode: (node, category) => updateCategoryCard(node, category, model.percentageTotal, uiState),
    removeKey: null
  });

  if (plannerState.priorities.length === 0) {
    elements.allocationList.innerHTML = '<tr class="empty-state"><td colspan="4">Add priorities above to see each one\'s weekly hours here.</td></tr>';
  } else if (!model.isPercentageValid) {
    elements.allocationList.innerHTML = '<tr class="empty-state"><td colspan="4">Bring the category percentages back to 100% to reveal the allocation rows.</td></tr>';
  } else if (model.allocations.length === 0) {
    elements.allocationList.innerHTML = '<tr class="empty-state"><td colspan="4">Add priorities to unlock the weekly allocation table.</td></tr>';
  } else {
    syncRows({
      tbody: elements.allocationList,
      items: model.allocations,
      getKey: (allocation) => allocation.id,
      buildRow: (item) => buildAllocationRow(item, uiState.reducedMotion),
      updateRow: (row, item) => updateAllocationRow(row, item, uiState.reducedMotion),
      emptyMarkup: '<tr class="empty-state"><td colspan="4">Add priorities above to see each one\'s weekly hours here.</td></tr>',
      removeKey: null
    });
  }

  if (uiState.lastChangedPriorityId) {
    const targets = root.querySelectorAll(`[data-key="${uiState.lastChangedPriorityId}"]`);
    if (targets.length) {
      highlightChangedTargets(Array.from(targets), uiState.reducedMotion);
    }
  }
}
