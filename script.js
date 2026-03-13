const STORAGE_KEY = 'threeBucketPlannerState';
const MOTION_MEDIUM_MS = 240;
const BUCKETS = [
  { id: '1', name: 'Bucket 1: Wealth', accentClass: 'bucket-1-card', label: 'Wealth' },
  { id: '2', name: 'Bucket 2: Necessary', accentClass: 'bucket-2-card', label: 'Necessary' },
  { id: '3', name: 'Bucket 3: Pure interest', accentClass: 'bucket-3-card', label: 'Pure interest' }
];

const state = loadState();
const uiState = {
  editingInterestId: '',
  expandedBucketId: '',
  lastChangedInterestId: '',
  lastDeletedInterestId: '',
  previousAllocations: new Map(),
  summaryText: '',
  reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
};

const elements = {
  freeHours: document.getElementById('free-hours'),
  bucketControls: document.getElementById('bucket-controls'),
  bucketInputs: {
    '1': document.getElementById('bucket-1'),
    '2': document.getElementById('bucket-2'),
    '3': document.getElementById('bucket-3')
  },
  bucketRanges: {
    '1': document.getElementById('bucket-1-range'),
    '2': document.getElementById('bucket-2-range'),
    '3': document.getElementById('bucket-3-range')
  },
  allocationTotal: document.getElementById('allocation-total'),
  allocationProgress: document.getElementById('allocation-progress-bar'),
  percentageMessage: document.getElementById('percentage-message'),
  interestForm: document.getElementById('interest-form'),
  interestId: document.getElementById('interest-id'),
  interestName: document.getElementById('interest-name'),
  interestBucket: document.getElementById('interest-bucket'),
  interestWeight: document.getElementById('interest-weight'),
  interestMessage: document.getElementById('interest-message'),
  interestPreview: document.getElementById('interest-preview'),
  interestList: document.getElementById('interest-list'),
  allocationSummary: document.getElementById('allocation-summary'),
  allocationList: document.getElementById('allocation-list'),
  bucketResults: document.getElementById('bucket-results'),
  cancelEdit: document.getElementById('cancel-edit'),
  saveInterest: document.getElementById('save-interest'),
  resetButton: document.getElementById('reset-button')
};

initialize();

function initialize() {
  syncInputsFromState();
  bindEvents();
  render();
}

function loadState() {
  const defaults = {
    freeHours: 0,
    bucketPercentages: { '1': 80, '2': 15, '3': 5 },
    interests: []
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaults;
    }

    const parsed = JSON.parse(raw);
    return {
      freeHours: parseNonNegativeNumber(parsed.freeHours, defaults.freeHours),
      bucketPercentages: {
        '1': parseBucketPercentage(parsed.bucketPercentages?.['1'], defaults.bucketPercentages['1']),
        '2': parseBucketPercentage(parsed.bucketPercentages?.['2'], defaults.bucketPercentages['2']),
        '3': parseBucketPercentage(parsed.bucketPercentages?.['3'], defaults.bucketPercentages['3'])
      },
      interests: Array.isArray(parsed.interests)
        ? parsed.interests.map((interest) => sanitizeInterest(interest)).filter(Boolean)
        : []
    };
  } catch (error) {
    return defaults;
  }
}

function sanitizeInterest(interest) {
  if (!interest || typeof interest.name !== 'string') {
    return null;
  }

  const trimmedName = interest.name.trim();
  const bucket = String(interest.bucket);
  const weight = parsePositiveNumber(interest.weight, null);

  if (!trimmedName || !BUCKETS.some((item) => item.id === bucket) || weight === null) {
    return null;
  }

  return {
    id: typeof interest.id === 'string' && interest.id ? interest.id : createId(),
    name: trimmedName,
    bucket,
    weight
  };
}

function bindEvents() {
  elements.freeHours.addEventListener('input', handleFreeHoursChange);

  Object.entries(elements.bucketInputs).forEach(([bucketId, input]) => {
    input.addEventListener('input', () => handleBucketPercentageChange(bucketId, input.value));
  });

  Object.entries(elements.bucketRanges).forEach(([bucketId, input]) => {
    input.addEventListener('input', () => handleBucketPercentageChange(bucketId, input.value));
  });

  [elements.interestName, elements.interestBucket, elements.interestWeight].forEach((element) => {
    element.addEventListener('input', renderInterestPreview);
    element.addEventListener('change', renderInterestPreview);
  });

  elements.interestForm.addEventListener('submit', handleInterestSubmit);
  elements.cancelEdit.addEventListener('click', resetInterestForm);
  elements.resetButton.addEventListener('click', handleReset);
  elements.interestList.addEventListener('click', handleInterestListClick);
  elements.bucketResults.addEventListener('click', handleBucketResultsClick);
}

function handleFreeHoursChange() {
  state.freeHours = parseNonNegativeNumber(elements.freeHours.value, state.freeHours);
  saveState();
  render();
}

function handleBucketPercentageChange(bucketId, rawValue) {
  state.bucketPercentages[bucketId] = parseBucketPercentage(rawValue, state.bucketPercentages[bucketId]);
  syncBucketInputs(bucketId);
  saveState();
  render();
}

function handleInterestSubmit(event) {
  event.preventDefault();

  const name = elements.interestName.value.trim();
  const bucket = elements.interestBucket.value;
  const weight = parsePositiveNumber(elements.interestWeight.value, null);

  if (!name) {
    setMessage(elements.interestMessage, 'Interest name is required.', true);
    return;
  }

  if (!BUCKETS.some((item) => item.id === bucket)) {
    setMessage(elements.interestMessage, 'Select a valid bucket.', true);
    return;
  }

  if (weight === null) {
    setMessage(elements.interestMessage, 'Weight must be greater than 0.', true);
    return;
  }

  const existingId = elements.interestId.value;

  if (existingId) {
    state.interests = state.interests.map((interest) => (
      interest.id === existingId ? { ...interest, name, bucket, weight } : interest
    ));
    uiState.lastChangedInterestId = existingId;
    setMessage(elements.interestMessage, 'Interest updated.', false);
  } else {
    const newId = createId();
    state.interests.push({ id: newId, name, bucket, weight });
    uiState.lastChangedInterestId = newId;
    setMessage(elements.interestMessage, 'Interest added.', false);
  }

  saveState();
  resetInterestForm();
  render();
}

function handleInterestListClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) {
    return;
  }

  const interestId = button.dataset.id;
  const action = button.dataset.action;

  if (action === 'edit') {
    handleEditInterest(interestId);
  }

  if (action === 'delete') {
    handleDeleteInterest(interestId);
  }
}

function handleBucketResultsClick(event) {
  const toggle = event.target.closest('button[data-bucket-toggle]');
  if (!toggle) {
    return;
  }

  const bucketId = toggle.dataset.bucketToggle;
  uiState.expandedBucketId = uiState.expandedBucketId === bucketId ? '' : bucketId;
  render();
}

function handleEditInterest(interestId) {
  const interest = state.interests.find((item) => item.id === interestId);
  if (!interest) {
    return;
  }

  uiState.editingInterestId = interest.id;
  elements.interestId.value = interest.id;
  elements.interestName.value = interest.name;
  elements.interestBucket.value = interest.bucket;
  elements.interestWeight.value = interest.weight;
  elements.saveInterest.textContent = 'Update interest';
  elements.cancelEdit.hidden = false;
  setMessage(elements.interestMessage, 'Editing interest.', false);
  focusInterestForm();
  renderInterestPreview();
}

function handleDeleteInterest(interestId) {
  uiState.lastDeletedInterestId = interestId;
  state.interests = state.interests.filter((interest) => interest.id !== interestId);
  saveState();

  if (elements.interestId.value === interestId) {
    resetInterestForm();
  }

  setMessage(elements.interestMessage, 'Interest deleted.', false);
  render();
}

function handleReset() {
  const confirmed = window.confirm('Clear all saved data for the three-bucket planner?');
  if (!confirmed) {
    return;
  }

  state.freeHours = 0;
  state.bucketPercentages = { '1': 80, '2': 15, '3': 5 };
  state.interests = [];
  uiState.lastChangedInterestId = '';
  uiState.lastDeletedInterestId = '';
  uiState.expandedBucketId = '';
  uiState.summaryText = '';
  localStorage.removeItem(STORAGE_KEY);
  resetInterestForm();
  syncInputsFromState();
  setMessage(elements.interestMessage, 'All planner data cleared.', false);
  render();
}

function resetInterestForm() {
  uiState.editingInterestId = '';
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

function focusInterestForm() {
  elements.interestForm.classList.add('is-editing');
  const behavior = uiState.reducedMotion ? 'auto' : 'smooth';
  elements.interestForm.scrollIntoView({ behavior, block: 'nearest' });
  elements.interestName.focus({ preventScroll: true });
}

function syncInputsFromState() {
  elements.freeHours.value = String(state.freeHours);
  Object.keys(elements.bucketInputs).forEach(syncBucketInputs);
  resetInterestForm();
}

function syncBucketInputs(bucketId) {
  const value = String(state.bucketPercentages[bucketId]);
  elements.bucketInputs[bucketId].value = value;
  elements.bucketRanges[bucketId].value = value;
}

function render() {
  const previousAllocations = uiState.previousAllocations;
  const allocationModel = buildAllocationModel();
  renderBucketControls(allocationModel.percentageTotal);
  renderPercentageMessage(allocationModel.percentageTotal);
  renderInterestPreview();
  renderInterestList();
  renderBucketResults(allocationModel);
  renderAllocationList(allocationModel);
  updateSummary(previousAllocations, allocationModel.allocations, allocationModel.percentageTotal);
  renderSummaryLine();
  highlightChangedRows();
  uiState.previousAllocations = new Map(allocationModel.allocations.map((item) => [item.id, item.hours]));
}

function buildAllocationModel() {
  const percentageTotal = getPercentageTotal();
  const bucketAllocations = BUCKETS.map((bucket) => buildBucketAllocation(bucket, percentageTotal));
  const allocations = bucketAllocations.flatMap((bucket) => bucket.allocations);
  return { percentageTotal, bucketAllocations, allocations };
}

function renderBucketControls(total) {
  const progressRatio = Math.min(total, 100) / 100;
  elements.allocationTotal.textContent = `${formatNumber(total)}%`;
  elements.allocationProgress.style.transform = `scaleX(${progressRatio})`;
  elements.bucketControls.querySelector('.allocation-progress').classList.toggle('is-invalid', total !== 100);

  Object.entries(elements.bucketInputs).forEach(([bucketId, input]) => {
    const wrapper = input.closest('.bucket-field');
    wrapper.classList.toggle('is-invalid', total !== 100);
    elements.bucketRanges[bucketId].setAttribute('aria-valuenow', input.value);
  });
}

function renderPercentageMessage(total) {
  if (total === 100) {
    setMessage(elements.percentageMessage, '100% allocated across all three buckets.', false);
    return;
  }

  const difference = Math.abs(100 - total);
  const direction = total < 100 ? 'Add' : 'Remove';
  setMessage(elements.percentageMessage, `${direction} ${formatNumber(difference)}% to reach 100%. Current total: ${formatNumber(total)}%.`, true);
}

function renderInterestPreview() {
  const draft = getDraftInterest();

  elements.interestForm.classList.toggle('is-editing', Boolean(uiState.editingInterestId));

  if (!draft.name && !uiState.editingInterestId) {
    elements.interestPreview.hidden = true;
    return;
  }

  if (getPercentageTotal() !== 100) {
    showPreviewMessage('Preview unavailable until bucket percentages total 100%.', true);
    return;
  }

  if (state.freeHours <= 0) {
    showPreviewMessage('Enter weekly free hours to preview this interest allocation.', true);
    return;
  }

  if (draft.weight === null || !draft.name) {
    showPreviewMessage('Enter a name and a weight greater than 0 to preview the allocation.', true);
    return;
  }

  const preview = buildPreviewAllocation(draft);
  if (!preview) {
    showPreviewMessage('Preview unavailable for the current bucket selection.', true);
    return;
  }

  const deltaText = preview.delta === null
    ? 'This will be a new allocation.'
    : preview.delta === 0
      ? 'No change from the current saved allocation.'
      : `${preview.delta > 0 ? 'Gain' : 'Lose'} ${formatNumber(Math.abs(preview.delta))} hours compared with the current saved value.`;

  elements.interestPreview.hidden = false;
  elements.interestPreview.classList.toggle('error', false);
  elements.interestPreview.innerHTML = [
    '<span class="preview-label">Live preview</span>',
    `<strong class="preview-hours">${formatHours(preview.hours)}</strong>`,
    `<span class="preview-meta">${draft.bucketLabel} at weight ${formatNumber(draft.weight)}. ${deltaText}</span>`
  ].join('');
}

function getDraftInterest() {
  const bucket = elements.interestBucket.value;
  const weight = parsePositiveNumber(elements.interestWeight.value, null);
  return {
    id: elements.interestId.value || createId(),
    existingId: elements.interestId.value,
    name: elements.interestName.value.trim(),
    bucket,
    bucketLabel: getBucketName(bucket),
    weight
  };
}

function buildPreviewAllocation(draft) {
  const draftInterest = {
    id: draft.existingId || draft.id,
    name: draft.name,
    bucket: draft.bucket,
    weight: draft.weight
  };

  const draftInterests = draft.existingId
    ? state.interests.map((interest) => (interest.id === draft.existingId ? draftInterest : interest))
    : state.interests.concat(draftInterest);

  const targetBucketInterests = draftInterests.filter((interest) => interest.bucket === draft.bucket);
  const bucketPercentage = state.bucketPercentages[draft.bucket];
  const bucketHours = (state.freeHours * bucketPercentage) / 100;
  const totalWeight = targetBucketInterests.reduce((sum, interest) => sum + interest.weight, 0);
  const currentAllocation = state.interests.find((interest) => interest.id === draft.existingId);
  const currentHours = currentAllocation ? getInterestHours(currentAllocation, state.interests) : null;

  if (!totalWeight) {
    return null;
  }

  const matchingInterest = targetBucketInterests.find((interest) => interest.id === draftInterest.id);
  if (!matchingInterest) {
    return null;
  }

  const hours = bucketHours * (matchingInterest.weight / totalWeight);
  return {
    hours,
    delta: currentHours === null ? null : hours - currentHours
  };
}

function getInterestHours(targetInterest, interests) {
  const bucketPercentage = state.bucketPercentages[targetInterest.bucket];
  const bucketHours = (state.freeHours * bucketPercentage) / 100;
  const targetBucketInterests = interests.filter((interest) => interest.bucket === targetInterest.bucket);
  const totalWeight = targetBucketInterests.reduce((sum, interest) => sum + interest.weight, 0);
  if (!totalWeight) {
    return 0;
  }
  return bucketHours * (targetInterest.weight / totalWeight);
}

function showPreviewMessage(text, isError) {
  elements.interestPreview.hidden = false;
  elements.interestPreview.classList.toggle('error', isError);
  elements.interestPreview.innerHTML = [
    '<span class="preview-label">Live preview</span>',
    `<span class="preview-meta">${text}</span>`
  ].join('');
}

function renderInterestList() {
  if (state.interests.length === 0) {
    elements.interestList.innerHTML = '<tr class="empty-state"><td colspan="4">No interests added yet.</td></tr>';
    return;
  }

  syncRows({
    tbody: elements.interestList,
    items: state.interests,
    getKey: (interest) => interest.id,
    buildRow: buildInterestRow,
    updateRow: updateInterestRow,
    emptyMarkup: '<tr class="empty-state"><td colspan="4">No interests added yet.</td></tr>',
    removeKey: uiState.lastDeletedInterestId
  });

  uiState.lastDeletedInterestId = '';
}

function buildInterestRow(interest) {
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
  updateInterestRow(row, interest);
  settleAnimationClass(row, 'is-entering');
  return row;
}

function updateInterestRow(row, interest) {
  const cells = row.children;
  cells[0].textContent = interest.name;
  cells[1].textContent = getBucketName(interest.bucket);
  cells[2].textContent = formatNumber(interest.weight);
  row.classList.add('is-updating');
  settleAnimationClass(row, 'is-updating');
}

function renderBucketResults(model) {
  syncKeyedChildren({
    container: elements.bucketResults,
    items: model.bucketAllocations,
    getKey: (bucket) => bucket.id,
    buildNode: buildBucketCard,
    updateNode: (node, bucket) => updateBucketCard(node, bucket, model.percentageTotal),
    removeKey: null
  });
}

function buildBucketCard(bucket) {
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
  updateBucketCard(article, bucket, getPercentageTotal());
  settleAnimationClass(article, 'is-entering');
  return article;
}

function updateBucketCard(article, bucket, percentageTotal) {
  const isExpanded = uiState.expandedBucketId === bucket.id;
  article.querySelector('.kicker').textContent = bucket.label;
  article.querySelector('h3').textContent = bucket.name;
  animateNumber(article.querySelector('[data-role="hours"]'), bucket.hours, formatHours);
  article.querySelector('[data-role="share"]').textContent = `${formatNumber(bucket.percentage)}%`;
  article.querySelector('[data-role="count"]').textContent = String(bucket.interests.length);
  article.querySelector('.bucket-status').textContent = getBucketStatus(bucket, percentageTotal);
  const toggle = article.querySelector('[data-bucket-toggle]');
  toggle.setAttribute('aria-expanded', String(isExpanded));
  toggle.textContent = isExpanded ? 'Hide bucket split' : 'Show bucket split';
  article.classList.toggle('is-expanded', isExpanded);
  renderBucketDetails(article.querySelector('.bucket-detail-list'), bucket, percentageTotal);
  article.classList.add('is-updating');
  settleAnimationClass(article, 'is-updating');
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
    row.innerHTML = [
      '<div class="bucket-detail-head">',
      `<span class="bucket-detail-name">${escapeHtml(item.name)}</span>`,
      `<span class="bucket-detail-meta">${formatHours(item.hours)} · ${formatNumber(share)}%</span>`,
      '</div>',
      '<div class="bucket-detail-bar"><div class="bucket-detail-fill"></div></div>'
    ].join('');
    row.querySelector('.bucket-detail-fill').style.transform = `scaleX(${Math.max(share, 0) / 100})`;
    return row;
  }));
}

function renderAllocationList(model) {
  if (state.interests.length === 0) {
    elements.allocationList.innerHTML = '<tr class="empty-state"><td colspan="4">Add interests to see per-interest hours.</td></tr>';
    return;
  }

  if (model.percentageTotal !== 100) {
    elements.allocationList.innerHTML = '<tr class="empty-state"><td colspan="4">Fix the bucket percentages so they total 100% to see allocations.</td></tr>';
    return;
  }

  syncRows({
    tbody: elements.allocationList,
    items: model.allocations,
    getKey: (allocation) => allocation.id,
    buildRow: buildAllocationRow,
    updateRow: updateAllocationRow,
    emptyMarkup: '<tr class="empty-state"><td colspan="4">Add interests to see per-interest hours.</td></tr>',
    removeKey: null
  });
}

function buildAllocationRow(item) {
  const row = document.createElement('tr');
  row.className = 'data-row is-entering';
  row.dataset.key = item.id;
  row.innerHTML = [
    '<td data-label="Interest"></td>',
    '<td data-label="Bucket"></td>',
    '<td data-label="Weight"></td>',
    '<td data-label="Hours per week" data-role="hours"></td>'
  ].join('');
  updateAllocationRow(row, item);
  settleAnimationClass(row, 'is-entering');
  return row;
}

function updateAllocationRow(row, item) {
  const cells = row.children;
  cells[0].textContent = item.name;
  cells[1].textContent = getBucketName(item.bucket);
  cells[2].textContent = formatNumber(item.weight);
  animateNumber(cells[3], item.hours, formatHours);
  row.classList.add('is-updating');
  settleAnimationClass(row, 'is-updating');
}

function updateSummary(previousAllocations, allocations, percentageTotal) {
  if (percentageTotal !== 100) {
    uiState.summaryText = 'Complete the 100% bucket split to unlock the weekly narrative summary.';
    return;
  }

  if (!allocations.length) {
    uiState.summaryText = 'Add an interest to see how your weekly time is distributed.';
    return;
  }

  if (!previousAllocations.size) {
    const top = allocations.reduce((best, current) => (current.hours > best.hours ? current : best), allocations[0]);
    uiState.summaryText = `${top.name} currently leads your plan at ${formatHours(top.hours)}.`;
    return;
  }

  let strongest = null;
  allocations.forEach((item) => {
    const previous = previousAllocations.get(item.id) ?? 0;
    const delta = item.hours - previous;
    if (!strongest || Math.abs(delta) > Math.abs(strongest.delta)) {
      strongest = { item, delta };
    }
  });

  if (!strongest || Math.abs(strongest.delta) < 0.01) {
    const top = allocations.reduce((best, current) => (current.hours > best.hours ? current : best), allocations[0]);
    uiState.summaryText = `${top.name} currently leads your plan at ${formatHours(top.hours)}.`;
    return;
  }

  const direction = strongest.delta > 0 ? 'gained' : 'lost';
  uiState.summaryText = `${strongest.item.name} ${direction} ${formatNumber(Math.abs(strongest.delta))} hours this week.`;
}

function renderSummaryLine() {
  if (!uiState.summaryText) {
    elements.allocationSummary.hidden = true;
    elements.allocationSummary.textContent = '';
    return;
  }

  elements.allocationSummary.hidden = false;
  elements.allocationSummary.textContent = uiState.summaryText;
}

function highlightChangedRows() {
  if (!uiState.lastChangedInterestId) {
    return;
  }

  const targets = document.querySelectorAll(`[data-key="${uiState.lastChangedInterestId}"]`);
  if (!targets.length) {
    uiState.lastChangedInterestId = '';
    return;
  }

  targets.forEach((target) => {
    target.classList.add('is-highlighted');
    window.setTimeout(() => target.classList.remove('is-highlighted'), uiState.reducedMotion ? 0 : 1200);
  });

  const behavior = uiState.reducedMotion ? 'auto' : 'smooth';
  targets[0].scrollIntoView({ behavior, block: 'nearest' });
  uiState.lastChangedInterestId = '';
}

function buildBucketAllocation(bucket, percentageTotal) {
  const percentage = state.bucketPercentages[bucket.id];
  const interests = state.interests.filter((item) => item.bucket === bucket.id);
  const hours = percentageTotal === 100 ? (state.freeHours * percentage) / 100 : 0;

  if (interests.length === 0) {
    return { ...bucket, percentage, hours, interests, allocations: [] };
  }

  if (interests.length === 1) {
    return {
      ...bucket,
      percentage,
      hours,
      interests,
      allocations: [{
        id: interests[0].id,
        name: interests[0].name,
        bucket: interests[0].bucket,
        weight: interests[0].weight,
        hours
      }]
    };
  }

  const totalWeight = interests.reduce((sum, interest) => sum + interest.weight, 0);
  const allocations = interests.map((interest) => ({
    id: interest.id,
    name: interest.name,
    bucket: interest.bucket,
    weight: interest.weight,
    hours: totalWeight === 0 ? 0 : hours * (interest.weight / totalWeight)
  }));

  return { ...bucket, percentage, hours, interests, allocations };
}

function getBucketStatus(bucket, percentageTotal) {
  if (percentageTotal !== 100) {
    return 'Waiting for a valid 100% split before hours can be calculated.';
  }

  if (bucket.interests.length === 0) {
    return 'No interests assigned yet for this bucket.';
  }

  if (bucket.interests.length === 1) {
    return 'All of this bucket goes to a single interest.';
  }

  return 'Assigned and split by weight across your interests.';
}

function syncRows({ tbody, items, getKey, buildRow, updateRow, emptyMarkup, removeKey }) {
  if (!items.length) {
    tbody.innerHTML = emptyMarkup;
    return;
  }

  syncKeyedChildren({
    container: tbody,
    items,
    getKey,
    buildNode: buildRow,
    updateNode: updateRow,
    removeKey
  });
}

function syncKeyedChildren({ container, items, getKey, buildNode, updateNode, removeKey }) {
  const existing = new Map(Array.from(container.children).map((child) => [child.dataset.key, child]));
  const fragment = document.createDocumentFragment();
  const activeKeys = new Set();

  items.forEach((item) => {
    const key = getKey(item);
    activeKeys.add(key);
    const node = existing.get(key) || buildNode(item);
    updateNode(node, item);
    fragment.appendChild(node);
  });

  Array.from(existing.entries()).forEach(([key, node]) => {
    if (activeKeys.has(key)) {
      return;
    }

    if (removeKey && key === removeKey) {
      node.classList.add('is-exiting');
      fragment.appendChild(node);
      window.setTimeout(() => node.remove(), uiState.reducedMotion ? 0 : MOTION_MEDIUM_MS);
      return;
    }

    node.remove();
  });

  container.replaceChildren(fragment);
}

function animateNumber(element, nextValue, formatter) {
  const previousValue = Number(element.dataset.value || 0);
  element.dataset.value = String(nextValue);

  if (uiState.reducedMotion) {
    element.textContent = formatter(nextValue);
    return;
  }

  const start = performance.now();
  const duration = 500;
  const delta = nextValue - previousValue;

  function frame(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = formatter(previousValue + delta * eased);
    if (progress < 1) {
      window.requestAnimationFrame(frame);
    }
  }

  window.requestAnimationFrame(frame);
}

function settleAnimationClass(node, className) {
  if (uiState.reducedMotion) {
    node.classList.remove(className);
    return;
  }

  window.setTimeout(() => node.classList.remove(className), MOTION_MEDIUM_MS);
}

function getPercentageTotal() {
  return Object.values(state.bucketPercentages).reduce((sum, value) => sum + value, 0);
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function parseNonNegativeNumber(value, fallback) {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed;
  }
  return fallback;
}

function parseBucketPercentage(value, fallback) {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed >= 0) {
    return Math.min(parsed, 100);
  }
  return fallback;
}

function parsePositiveNumber(value, fallback) {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
}

function setMessage(element, text, isError) {
  element.textContent = text;
  element.classList.toggle('error', isError);
  element.classList.remove('message-pop');
  if (!uiState.reducedMotion && text) {
    window.requestAnimationFrame(() => element.classList.add('message-pop'));
  }
}

function formatNumber(value) {
  return Number(value).toFixed(Number.isInteger(value) ? 0 : 2).replace(/\.00$/, '');
}

function formatHours(value) {
  return `${formatNumber(value)} hours`;
}

function getBucketName(bucketId) {
  const bucket = BUCKETS.find((item) => item.id === bucketId);
  return bucket ? bucket.name : 'Unknown bucket';
}

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
