import test from 'node:test';
import assert from 'node:assert/strict';

import { derivePlannerModel, getPriorityPreview, validatePlannerState } from '../src/domain/index.js';
import {
  buildCategoryStatus,
  buildPercentageMessage,
  buildSummaryText
} from '../src/domain/planner-domain.js';

const plannerState = {
  freeHours: 20,
  categoryPercentages: { '1': 50, '2': 30, '3': 20 },
  priorities: [
    { id: 'a', name: 'Sales', category: '1', weight: 3 },
    { id: 'b', name: 'Coding', category: '1', weight: 1 },
    { id: 'c', name: 'Fitness', category: '2', weight: 2 }
  ]
};

const uiState = {
  editingPriorityId: '',
  expandedCategoryId: '',
  lastChangedPriorityId: '',
  lastDeletedPriorityId: '',
  previousAllocations: new Map(),
  summaryText: '',
  reducedMotion: true
};

test('validatePlannerState returns the current percentage status', () => {
  assert.deepEqual(validatePlannerState(plannerState), {
    percentageTotal: 100,
    isPercentageValid: true
  });
});

test('derivePlannerModel allocates weighted hours correctly', () => {
  const model = derivePlannerModel(plannerState, uiState, null);
  const sales = model.allocations.find((item) => item.id === 'a');
  const coding = model.allocations.find((item) => item.id === 'b');

  assert.equal(model.isPercentageValid, true);
  assert.equal(sales.hours, 7.5);
  assert.equal(coding.hours, 2.5);
});

test('getPriorityPreview compares a draft edit against the saved allocation', () => {
  const preview = getPriorityPreview(plannerState, {
    id: 'a',
    existingId: 'a',
    name: 'Sales',
    category: '1',
    categoryLabel: 'Growth engine',
    weight: 2
  });

  assert.equal(Number(preview.hours.toFixed(2)), 6.67);
  assert.equal(Number(preview.delta.toFixed(2)), -0.83);
});

test('copy helpers describe the guided weekly flow', () => {
  assert.equal(buildCategoryStatus({ priorities: [] }, 90), 'Bring the category split to 100% to unlock this breakdown.');
  assert.equal(buildPercentageMessage(100), 'Your category portfolio totals 100%.');
  assert.equal(
    buildSummaryText([{ id: 'a', name: 'Sales', hours: 8 }], new Map(), 100),
    'Sales currently leads your week at 8 hours.'
  );
});
