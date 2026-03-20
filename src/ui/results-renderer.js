import { formatHours, formatNumber } from '../lib/format.js';
import { getBucketName } from '../domain/index.js';
import { syncKeyedChildren, syncRows } from './dom-utils.js';
import { animateNumber, highlightChangedTargets, settleAnimationClass } from './animation.js';

function buildAllocationRow(item, reducedMotion) {
  const row = document.createElement('tr');
  row.className = 'data-row is-entering';
  row.dataset.key = item.id;
  row.innerHTML = [
    '<td data-label="Interest"></td>',
    '<td data-label="Bucket"></td>',
    '<td data-label="Weight"></td>',
    '<td data-label="Hours per week" data-role="hours"></td>'
  ].join('');
  settleAnimationClass(row, 'is-entering', reducedMotion);
  return row;
}

function updateAllocationRow(row, item, reducedMotion) {
  const cells = row.children;
  cells[0].textContent = item.name;
  cells[1].textContent = getBucketName(item.bucket);
  cells[2].textContent = formatNumber(item.weight);
  animateNumber(cells[3], item.hours, formatHours, reducedMotion);
  row.classList.add('is-updating');
  settleAnimationClass(row, 'is-updating', reducedMotion);
}

function renderBucketDetails(container, bucket, percentageTotal) {
  if (percentageTotal !== 100) {
    container.innerHTML = '<p class="bucket-detail-empty">Finish the 100% split to inspect bucket details.</p>';
    return;
  }

  if (!bucket.allocations.length) {
    container.innerHTML = '<p class="bucket-detail-empty">No interests assigned to this bucket yet.</p>';
    return;
  }

  const totalHours = bucket.hours || 1;
  container.replaceChildren(...bucket.allocations.map((item) => {
    const row = document.createElement('div');
    const share = bucket.hours === 0 ? 0 : (item.hours / totalHours) * 100;
    row.className = 'bucket-detail-item';

    const head = document.createElement('div');
    head.className = 'bucket-detail-head';

    const name = document.createElement('span');
    name.className = 'bucket-detail-name';
    name.textContent = item.name;

    const meta = document.createElement('span');
    meta.className = 'bucket-detail-meta';
    meta.textContent = `${formatHours(item.hours)} · ${formatNumber(share)}%`;

    head.append(name, meta);

    const bar = document.createElement('div');
    bar.className = 'bucket-detail-bar';

    const fill = document.createElement('div');
    fill.className = 'bucket-detail-fill';
    fill.style.transform = `scaleX(${Math.max(share, 0) / 100})`;
    bar.appendChild(fill);

    row.append(head, bar);
    return row;
  }));
}

function buildBucketCard(bucket, uiState) {
  const article = document.createElement('article');
  article.className = `bucket-card ${bucket.accentClass} is-entering`;
  article.dataset.key = bucket.id;
  article.innerHTML = [
    '<div class="kicker"></div>',
    '<h3></h3>',
    '<div class="bucket-hours"><strong data-role="hours"></strong></div>',
    '<div class="bucket-meta">',
    '<div class="bucket-meta-item"><span class="bucket-meta-label">Share</span><strong data-role="share"></strong></div>',
    '<div class="bucket-meta-item"><span class="bucket-meta-label">Interests</span><strong data-role="count"></strong></div>',
    '</div>',
    '<p class="bucket-status"></p>',
    `<button type="button" class="bucket-toggle button-ghost" data-bucket-toggle="${bucket.id}" aria-expanded="false" aria-controls="bucket-details-${bucket.id}">Show bucket split</button>`,
    `<div id="bucket-details-${bucket.id}" class="bucket-detail-list"></div>`
  ].join('');
  settleAnimationClass(article, 'is-entering', uiState.reducedMotion);
  return article;
}

function updateBucketCard(article, bucket, percentageTotal, uiState) {
  const isExpanded = uiState.expandedBucketId === bucket.id;
  article.querySelector('.kicker').textContent = bucket.label;
  article.querySelector('h3').textContent = bucket.name;
  animateNumber(article.querySelector('[data-role="hours"]'), bucket.hours, formatHours, uiState.reducedMotion);
  article.querySelector('[data-role="share"]').textContent = `${formatNumber(bucket.percentage)}%`;
  article.querySelector('[data-role="count"]').textContent = String(bucket.interests.length);
  article.querySelector('.bucket-status').textContent = bucket.status;
  const toggle = article.querySelector('[data-bucket-toggle]');
  toggle.setAttribute('aria-expanded', String(isExpanded));
  toggle.textContent = isExpanded ? 'Hide bucket split' : 'Show bucket split';
  article.classList.toggle('is-expanded', isExpanded);
  renderBucketDetails(article.querySelector('.bucket-detail-list'), bucket, percentageTotal);
  article.classList.add('is-updating');
  settleAnimationClass(article, 'is-updating', uiState.reducedMotion);
}

export function renderResults({ elements, plannerState, model, uiState, root = document }) {
  if (!model.summaryText) {
    elements.allocationSummary.hidden = true;
    elements.allocationSummary.textContent = '';
  } else {
    elements.allocationSummary.hidden = false;
    elements.allocationSummary.textContent = model.summaryText;
  }

  syncKeyedChildren({
    container: elements.bucketResults,
    items: model.bucketAllocations,
    getKey: (bucket) => bucket.id,
    buildNode: (bucket) => buildBucketCard(bucket, uiState),
    updateNode: (node, bucket) => updateBucketCard(node, bucket, model.percentageTotal, uiState),
    removeKey: null
  });

  if (plannerState.interests.length === 0) {
    elements.allocationList.innerHTML = '<tr class="empty-state"><td colspan="4">Add interests to see per-interest hours.</td></tr>';
  } else if (!model.isPercentageValid) {
    elements.allocationList.innerHTML = '<tr class="empty-state"><td colspan="4">Fix the bucket percentages so they total 100% to see allocations.</td></tr>';
  } else {
    syncRows({
      tbody: elements.allocationList,
      items: model.allocations,
      getKey: (allocation) => allocation.id,
      buildRow: (item) => buildAllocationRow(item, uiState.reducedMotion),
      updateRow: (row, item) => updateAllocationRow(row, item, uiState.reducedMotion),
      emptyMarkup: '<tr class="empty-state"><td colspan="4">Add interests to see per-interest hours.</td></tr>',
      removeKey: null
    });
  }

  if (uiState.lastChangedInterestId) {
    const targets = root.querySelectorAll(`[data-key="${uiState.lastChangedInterestId}"]`);
    if (targets.length) {
      highlightChangedTargets(Array.from(targets), uiState.reducedMotion);
    }
  }
}
