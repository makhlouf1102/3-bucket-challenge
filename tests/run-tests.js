import assert from 'node:assert/strict';

import {
  createDefaultPlannerState,
  loadPlannerState,
  sanitizePlannerState
} from '../src/store/index.js';
import { derivePlannerModel, getInterestPreview, validatePlannerState } from '../src/domain/index.js';
import { ACTIONS, createPlannerDispatcher } from '../src/actions/index.js';
import { registerUiTests } from './ui.test.js';

const results = [];

function run(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, error });
  }
}

run('store defaults', () => {
  assert.deepEqual(createDefaultPlannerState(), {
    freeHours: 0,
    bucketPercentages: { '1': 80, '2': 15, '3': 5 },
    interests: []
  });
});

run('store sanitization', () => {
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

run('store load fallback', () => {
  const fakeStorage = {
    getItem() {
      return '{bad json';
    }
  };

  assert.deepEqual(loadPlannerState(fakeStorage), createDefaultPlannerState());
});

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

run('domain validation', () => {
  assert.deepEqual(validatePlannerState(plannerState), {
    percentageTotal: 100,
    isPercentageValid: true
  });
});

run('domain weighted allocations', () => {
  const model = derivePlannerModel(plannerState, uiState, null);
  const sales = model.allocations.find((item) => item.id === 'a');
  const coding = model.allocations.find((item) => item.id === 'b');

  assert.equal(model.isPercentageValid, true);
  assert.equal(sales.hours, 7.5);
  assert.equal(coding.hours, 2.5);
});

run('domain preview delta', () => {
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

run('actions persist on save', () => {
  const state = {
    plannerState: createDefaultPlannerState(),
    uiState: { ...uiState, previousAllocations: new Map() }
  };
  let renderCount = 0;
  const persisted = [];
  const dispatch = createPlannerDispatcher({
    getState: () => state,
    setState: ({ plannerState: nextPlannerState, uiState: nextUiState }) => {
      state.plannerState = nextPlannerState;
      state.uiState = nextUiState;
    },
    render: () => {
      renderCount += 1;
    },
    store: {
      savePlannerState(nextPlannerState) {
        persisted.push({ type: 'save', nextPlannerState });
      },
      clearPlannerState() {
        persisted.push({ type: 'clear' });
      }
    }
  });

  const result = dispatch({
    type: ACTIONS.SAVE_INTEREST,
    payload: { id: '', name: 'Reading', bucket: '3', weight: '2' }
  });

  assert.equal(result.ok, true);
  assert.equal(state.plannerState.interests.length, 1);
  assert.equal(persisted[0].type, 'save');
  assert.equal(renderCount, 1);
});

run('actions clear on reset', () => {
  const state = {
    plannerState: {
      freeHours: 2,
      bucketPercentages: { '1': 80, '2': 15, '3': 5 },
      interests: [{ id: 'a', name: 'Reading', bucket: '3', weight: 2 }]
    },
    uiState: { ...uiState, previousAllocations: new Map() }
  };
  const persisted = [];
  const dispatch = createPlannerDispatcher({
    getState: () => state,
    setState: ({ plannerState: nextPlannerState, uiState: nextUiState }) => {
      state.plannerState = nextPlannerState;
      state.uiState = nextUiState;
    },
    render: () => {},
    store: {
      savePlannerState(nextPlannerState) {
        persisted.push({ type: 'save', nextPlannerState });
      },
      clearPlannerState() {
        persisted.push({ type: 'clear' });
      }
    }
  });

  dispatch({ type: ACTIONS.RESET_PLANNER });
  assert.deepEqual(state.plannerState.interests, []);
  assert.equal(persisted[0].type, 'clear');
});

registerUiTests(run);

const failed = results.filter((result) => !result.ok);
results.forEach((result) => {
  const status = result.ok ? 'PASS' : 'FAIL';
  console.log(`${status} ${result.name}`);
  if (!result.ok) {
    console.error(result.error);
  }
});

if (failed.length) {
  process.exitCode = 1;
} else {
  console.log(`Passed ${results.length} tests.`);
}
