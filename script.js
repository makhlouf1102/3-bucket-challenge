const STORAGE_KEY = 'threeBucketPlannerState';
const BUCKETS = [
  { id: '1', name: 'Bucket 1: Wealth' },
  { id: '2', name: 'Bucket 2: Necessary' },
  { id: '3', name: 'Bucket 3: Pure interest' }
];

const state = loadState();

const elements = {
  freeHours: document.getElementById('free-hours'),
  bucketInputs: {
    '1': document.getElementById('bucket-1'),
    '2': document.getElementById('bucket-2'),
    '3': document.getElementById('bucket-3')
  },
  percentageMessage: document.getElementById('percentage-message'),
  interestForm: document.getElementById('interest-form'),
  interestId: document.getElementById('interest-id'),
  interestName: document.getElementById('interest-name'),
  interestBucket: document.getElementById('interest-bucket'),
  interestWeight: document.getElementById('interest-weight'),
  interestMessage: document.getElementById('interest-message'),
  interestList: document.getElementById('interest-list'),
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
        '1': parseNonNegativeNumber(parsed.bucketPercentages?.['1'], defaults.bucketPercentages['1']),
        '2': parseNonNegativeNumber(parsed.bucketPercentages?.['2'], defaults.bucketPercentages['2']),
        '3': parseNonNegativeNumber(parsed.bucketPercentages?.['3'], defaults.bucketPercentages['3'])
      },
      interests: Array.isArray(parsed.interests)
        ? parsed.interests
            .map((interest) => sanitizeInterest(interest))
            .filter(Boolean)
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
    input.addEventListener('input', () => handleBucketPercentageChange(bucketId));
  });

  elements.interestForm.addEventListener('submit', handleInterestSubmit);
  elements.cancelEdit.addEventListener('click', resetInterestForm);
  elements.resetButton.addEventListener('click', handleReset);
}

function handleFreeHoursChange() {
  state.freeHours = parseNonNegativeNumber(elements.freeHours.value, state.freeHours);
  saveState();
  render();
}

function handleBucketPercentageChange(bucketId) {
  const parsed = parseNonNegativeNumber(elements.bucketInputs[bucketId].value, state.bucketPercentages[bucketId]);
  state.bucketPercentages[bucketId] = parsed;
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
      interest.id === existingId
        ? { ...interest, name, bucket, weight }
        : interest
    ));
    setMessage(elements.interestMessage, 'Interest updated.', false);
  } else {
    state.interests.push({ id: createId(), name, bucket, weight });
    setMessage(elements.interestMessage, 'Interest added.', false);
  }

  saveState();
  resetInterestForm();
  render();
}

function handleEditInterest(interestId) {
  const interest = state.interests.find((item) => item.id === interestId);
  if (!interest) {
    return;
  }

  elements.interestId.value = interest.id;
  elements.interestName.value = interest.name;
  elements.interestBucket.value = interest.bucket;
  elements.interestWeight.value = interest.weight;
  elements.saveInterest.textContent = 'Update interest';
  elements.cancelEdit.hidden = false;
  setMessage(elements.interestMessage, 'Editing interest.', false);
}

function handleDeleteInterest(interestId) {
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
  localStorage.removeItem(STORAGE_KEY);
  resetInterestForm();
  syncInputsFromState();
  setMessage(elements.interestMessage, '', false);
  render();
}

function resetInterestForm() {
  elements.interestForm.reset();
  elements.interestId.value = '';
  elements.interestBucket.value = '1';
  elements.interestWeight.value = '1';
  elements.saveInterest.textContent = 'Save interest';
  elements.cancelEdit.hidden = true;
}

function syncInputsFromState() {
  elements.freeHours.value = String(state.freeHours);
  Object.entries(elements.bucketInputs).forEach(([bucketId, input]) => {
    input.value = String(state.bucketPercentages[bucketId]);
  });
  resetInterestForm();
}

function render() {
  renderPercentageMessage();
  renderInterestList();
  renderResults();
}

function renderPercentageMessage() {
  const total = getPercentageTotal();
  if (total === 100) {
    setMessage(elements.percentageMessage, 'Bucket percentages are valid.', false);
    return;
  }

  setMessage(elements.percentageMessage, `Bucket percentages must total 100%. Current total: ${formatNumber(total)}%.`, true);
}

function renderInterestList() {
  if (state.interests.length === 0) {
    elements.interestList.innerHTML = '<tr><td colspan="4">No interests added yet.</td></tr>';
    return;
  }

  elements.interestList.innerHTML = state.interests
    .map((interest) => `
      <tr>
        <td>${escapeHtml(interest.name)}</td>
        <td>${escapeHtml(getBucketName(interest.bucket))}</td>
        <td>${formatNumber(interest.weight)}</td>
        <td class="row-actions">
          <button type="button" data-action="edit" data-id="${interest.id}">Edit</button>
          <button type="button" class="secondary" data-action="delete" data-id="${interest.id}">Delete</button>
        </td>
      </tr>
    `)
    .join('');

  elements.interestList.querySelectorAll('button').forEach((button) => {
    const interestId = button.dataset.id;
    const action = button.dataset.action;

    button.addEventListener('click', () => {
      if (action === 'edit') {
        handleEditInterest(interestId);
      }
      if (action === 'delete') {
        handleDeleteInterest(interestId);
      }
    });
  });
}

function renderResults() {
  const percentageTotal = getPercentageTotal();
  const bucketAllocations = BUCKETS.map((bucket) => buildBucketAllocation(bucket));

  elements.bucketResults.innerHTML = bucketAllocations
    .map((bucket) => `
      <article class="bucket-card">
        <h3>${escapeHtml(bucket.name)}</h3>
        <p>${formatNumber(bucket.percentage)}% of free time</p>
        <p><strong>${formatHours(bucket.hours)}</strong> per week</p>
        <p>${bucket.interests.length} interest${bucket.interests.length === 1 ? '' : 's'}</p>
        <p>${bucket.interests.length === 0 ? 'Currently unassigned.' : 'Assigned and split by weight.'}</p>
      </article>
    `)
    .join('');

  if (state.interests.length === 0) {
    elements.allocationList.innerHTML = '<tr><td colspan="4">Add interests to see per-interest hours.</td></tr>';
    return;
  }

  if (percentageTotal !== 100) {
    elements.allocationList.innerHTML = '<tr><td colspan="4">Fix the bucket percentages so they total 100% to see allocations.</td></tr>';
    return;
  }

  const allocations = bucketAllocations.flatMap((bucket) => bucket.allocations);

  elements.allocationList.innerHTML = allocations
    .map((item) => `
      <tr>
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(getBucketName(item.bucket))}</td>
        <td>${formatNumber(item.weight)}</td>
        <td>${formatHours(item.hours)}</td>
      </tr>
    `)
    .join('');
}

function buildBucketAllocation(bucket) {
  const percentage = state.bucketPercentages[bucket.id];
  const interests = state.interests.filter((item) => item.bucket === bucket.id);
  const hours = getPercentageTotal() === 100 ? (state.freeHours * percentage) / 100 : 0;

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