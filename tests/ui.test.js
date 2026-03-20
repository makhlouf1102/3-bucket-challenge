import assert from 'node:assert/strict';

import { bindAppElements, buildJourneyStatus, setMessage } from '../src/ui/index.js';

function createFakeElement() {
  const classes = new Set();

  return {
    textContent: '',
    dataset: {},
    classList: {
      add(token) {
        classes.add(token);
      },
      remove(token) {
        classes.delete(token);
      },
      toggle(token, force) {
        if (force === undefined) {
          if (classes.has(token)) {
            classes.delete(token);
            return false;
          }

          classes.add(token);
          return true;
        }

        if (force) {
          classes.add(token);
        } else {
          classes.delete(token);
        }

        return force;
      },
      contains(token) {
        return classes.has(token);
      }
    }
  };
}

function withFakeWindow(callback) {
  const previousWindow = globalThis.window;
  const frameQueue = [];

  globalThis.window = {
    requestAnimationFrame(fn) {
      frameQueue.push(fn);
      return frameQueue.length;
    }
  };

  try {
    callback({
      flushFrames() {
        while (frameQueue.length) {
          const frame = frameQueue.shift();
          frame();
        }
      }
    });
  } finally {
    globalThis.window = previousWindow;
  }
}

function createPlannerState(overrides = {}) {
  return {
    freeHours: 0,
    bucketPercentages: { '1': 80, '2': 15, '3': 5 },
    interests: [],
    ...overrides
  };
}

export function registerUiTests(run) {
  run('ui binding failure', () => {
    const fakeRoot = {
      getElementById() {
        return null;
      }
    };

    assert.throws(() => bindAppElements(fakeRoot), /Missing required element/);
  });

  run('ui message animates on first non-empty render', () => {
    withFakeWindow(({ flushFrames }) => {
      const element = createFakeElement();

      setMessage(element, '100% allocated across all three buckets.', false, false);
      flushFrames();

      assert.equal(element.textContent, '100% allocated across all three buckets.');
      assert.equal(element.classList.contains('error'), false);
      assert.equal(element.classList.contains('message-pop'), true);
    });
  });

  run('ui message does not replay animation for unchanged state', () => {
    withFakeWindow(({ flushFrames }) => {
      const element = createFakeElement();

      setMessage(element, '100% allocated across all three buckets.', false, false);
      flushFrames();
      element.classList.remove('message-pop');

      setMessage(element, '100% allocated across all three buckets.', false, false);
      flushFrames();

      assert.equal(element.classList.contains('message-pop'), false);
    });
  });

  run('ui message replays animation when text changes', () => {
    withFakeWindow(({ flushFrames }) => {
      const element = createFakeElement();

      setMessage(element, '100% allocated across all three buckets.', false, false);
      flushFrames();
      element.classList.remove('message-pop');

      setMessage(element, 'Add 10% to reach 100%. Current total: 90%.', true, false);
      flushFrames();

      assert.equal(element.classList.contains('message-pop'), true);
      assert.equal(element.classList.contains('error'), true);
    });
  });

  run('ui message replays animation when error state changes', () => {
    withFakeWindow(({ flushFrames }) => {
      const element = createFakeElement();

      setMessage(element, 'Status message', false, false);
      flushFrames();
      element.classList.remove('message-pop');

      setMessage(element, 'Status message', true, false);
      flushFrames();

      assert.equal(element.classList.contains('message-pop'), true);
      assert.equal(element.classList.contains('error'), true);
    });
  });

  run('ui message never animates in reduced motion mode', () => {
    withFakeWindow(({ flushFrames }) => {
      const element = createFakeElement();

      setMessage(element, 'Status message', false, true);
      flushFrames();
      setMessage(element, 'Updated status message', true, true);
      flushFrames();

      assert.equal(element.classList.contains('message-pop'), false);
      assert.equal(element.classList.contains('error'), true);
      assert.equal(element.textContent, 'Updated status message');
    });
  });

  run('ui journey status tracks the current planning stage', () => {
    const setupStatus = buildJourneyStatus({
      plannerState: createPlannerState(),
      model: { isPercentageValid: false, allocations: [] },
      uiState: { editingInterestId: '', journeyStage: 'setup' }
    });
    const interestStatus = buildJourneyStatus({
      plannerState: createPlannerState({ freeHours: 12, bucketPercentages: { '1': 50, '2': 30, '3': 20 } }),
      model: { isPercentageValid: true, allocations: [] },
      uiState: { editingInterestId: '', journeyStage: 'setup' }
    });
    const resultStatus = buildJourneyStatus({
      plannerState: createPlannerState({
        freeHours: 12,
        bucketPercentages: { '1': 50, '2': 30, '3': 20 },
        interests: [{ id: 'a', name: 'Reading', bucket: '3', weight: 1 }]
      }),
      model: { isPercentageValid: true, allocations: [{ id: 'a' }] },
      uiState: { editingInterestId: '', journeyStage: 'setup' }
    });

    assert.equal(setupStatus.stage, 'setup');
    assert.equal(interestStatus.stage, 'interests');
    assert.equal(resultStatus.stage, 'results');
    assert.equal(resultStatus.progressValue, '3/3');
  });
}
