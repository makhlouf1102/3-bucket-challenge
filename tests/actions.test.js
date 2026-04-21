import test from 'node:test';
import assert from 'node:assert/strict';

import { ACTIONS, createPlannerDispatcher } from '../src/actions/index.js';

function createHarness() {
  const state = {
    plannerState: {
      freeHours: 0,
      categoryPercentages: { '1': 80, '2': 15, '3': 5 },
      priorities: []
    },
    uiState: {
      editingPriorityId: '',
      expandedCategoryId: '',
      lastChangedPriorityId: '',
      lastDeletedPriorityId: '',
      journeyStage: 'setup',
      pendingFocusTarget: '',
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

test('savePriority adds a new priority and persists state', () => {
  const harness = createHarness();
  const result = harness.dispatcher({
    type: ACTIONS.SAVE_PRIORITY,
    payload: { id: '', name: 'Reading', category: '3', weight: '2' }
  });

  assert.equal(result.ok, true);
  assert.equal(harness.state.plannerState.priorities.length, 1);
  assert.equal(harness.persisted[0].type, 'save');
  assert.equal(harness.renderCount, 1);
  assert.equal(harness.state.uiState.pendingFocusTarget, 'after-save');
});

test('resetPlanner clears the planner and clears persistence', () => {
  const harness = createHarness();
  harness.state.plannerState.priorities.push({ id: 'a', name: 'Reading', category: '3', weight: 2 });
  harness.dispatcher({ type: ACTIONS.RESET_PLANNER });

  assert.deepEqual(harness.state.plannerState.priorities, []);
  assert.equal(harness.persisted[0].type, 'clear');
  assert.equal(harness.state.uiState.pendingFocusTarget, 'free-hours');
});
