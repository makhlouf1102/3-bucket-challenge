import test from 'node:test';
import assert from 'node:assert/strict';

import { ACTIONS, createPlannerDispatcher } from '../src/actions/index.js';

function createHarness() {
  const state = {
    plannerState: {
      freeHours: 0,
      bucketPercentages: { '1': 80, '2': 15, '3': 5 },
      interests: []
    },
    uiState: {
      editingInterestId: '',
      expandedBucketId: '',
      lastChangedInterestId: '',
      lastDeletedInterestId: '',
      previousAllocations: new Map(),
      summaryText: '',
      reducedMotion: true
    }
  };

  let renderCount = 0;
  const persisted = [];
  const dispatcher = createPlannerDispatcher({
    getState: () => state,
    setState: ({ plannerState, uiState }) => {
      state.plannerState = plannerState;
      state.uiState = uiState;
    },
    render: () => {
      renderCount += 1;
    },
    store: {
      savePlannerState(nextState) {
        persisted.push({ type: 'save', nextState });
      },
      clearPlannerState() {
        persisted.push({ type: 'clear' });
      }
    }
  });

  return { state, dispatcher, persisted, get renderCount() { return renderCount; } };
}

test('saveInterest adds a new interest and persists state', () => {
  const harness = createHarness();
  const result = harness.dispatcher({
    type: ACTIONS.SAVE_INTEREST,
    payload: { id: '', name: 'Reading', bucket: '3', weight: '2' }
  });

  assert.equal(result.ok, true);
  assert.equal(harness.state.plannerState.interests.length, 1);
  assert.equal(harness.persisted[0].type, 'save');
  assert.equal(harness.renderCount, 1);
});

test('resetPlanner clears the planner and clears persistence', () => {
  const harness = createHarness();
  harness.state.plannerState.interests.push({ id: 'a', name: 'Reading', bucket: '3', weight: 2 });
  harness.dispatcher({ type: ACTIONS.RESET_PLANNER });

  assert.deepEqual(harness.state.plannerState.interests, []);
  assert.equal(harness.persisted[0].type, 'clear');
});
