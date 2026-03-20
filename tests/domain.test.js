import test from 'node:test';
import assert from 'node:assert/strict';

import { derivePlannerModel, getInterestPreview, validatePlannerState } from '../src/domain/index.js';

const plannerState = {
  freeHours: 20,
  bucketPercentages: { '1': 50, '2': 30, '3': 20 },
  interests: [
    { id: 'a', name: 'Sales', bucket: '1', weight: 3 },
    { id: 'b', name: 'Coding', bucket: '1', weight: 1 },
    { id: 'c', name: 'Fitness', bucket: '2', weight: 2 }
  ]
};

const uiState = {
  editingInterestId: '',
  expandedBucketId: '',
  lastChangedInterestId: '',
  lastDeletedInterestId: '',
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

test('getInterestPreview compares a draft edit against the saved allocation', () => {
  const preview = getInterestPreview(plannerState, {
    id: 'a',
    existingId: 'a',
    name: 'Sales',
    bucket: '1',
    bucketLabel: 'Bucket 1: Wealth',
    weight: 2
  });

  assert.equal(Number(preview.hours.toFixed(2)), 6.67);
  assert.equal(Number(preview.delta.toFixed(2)), -0.83);
});
