import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createDefaultPlannerState,
  loadPlannerState,
  sanitizePlannerState
} from '../src/store/index.js';

test('createDefaultPlannerState returns the current defaults', () => {
  assert.deepEqual(createDefaultPlannerState(), {
    freeHours: 0,
    bucketPercentages: { '1': 80, '2': 15, '3': 5 },
    interests: []
  });
});

test('sanitizePlannerState drops malformed interests and clamps bucket percentages', () => {
  const state = sanitizePlannerState({
    freeHours: -5,
    bucketPercentages: { '1': 200, '2': '15', '3': 5 },
    interests: [
      { id: 'a', name: ' Writing ', bucket: '1', weight: 2 },
      { id: 'b', name: '', bucket: '2', weight: 1 },
      { id: 'c', name: 'Bad', bucket: '9', weight: 1 }
    ]
  });

  assert.equal(state.freeHours, 0);
  assert.deepEqual(state.bucketPercentages, { '1': 100, '2': 15, '3': 5 });
  assert.equal(state.interests.length, 1);
  assert.equal(state.interests[0].name, 'Writing');
});

test('loadPlannerState falls back to defaults on invalid JSON', () => {
  const fakeStorage = {
    getItem() {
      return '{bad json';
    }
  };

  assert.deepEqual(loadPlannerState(fakeStorage), createDefaultPlannerState());
});
