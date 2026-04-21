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
    categoryPercentages: { '1': 80, '2': 15, '3': 5 },
    priorities: []
  });
});

test('sanitizePlannerState drops malformed priorities and clamps category percentages', () => {
  const state = sanitizePlannerState({
    freeHours: -5,
    categoryPercentages: { '1': 200, '2': '15', '3': 5 },
    priorities: [
      { id: 'a', name: ' Writing ', category: '1', weight: 2 },
      { id: 'b', name: '', category: '2', weight: 1 },
      { id: 'c', name: 'Bad', category: '9', weight: 1 }
    ]
  });

  assert.equal(state.freeHours, 0);
  assert.deepEqual(state.categoryPercentages, { '1': 100, '2': 15, '3': 5 });
  assert.equal(state.priorities.length, 1);
  assert.equal(state.priorities[0].name, 'Writing');
});

test('loadPlannerState falls back to defaults on invalid JSON', () => {
  const fakeStorage = {
    getItem() {
      return '{bad json';
    }
  };

  assert.deepEqual(loadPlannerState(fakeStorage), createDefaultPlannerState());
});
