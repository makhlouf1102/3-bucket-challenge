import { parseBucketPercentage, parseNonNegativeNumber, parsePositiveNumber } from '../lib/parsing.js';
import { createId } from '../lib/ids.js';

export const ACTIONS = {
  SET_FREE_HOURS: 'setFreeHours',
  SET_BUCKET_PERCENTAGE: 'setBucketPercentage',
  SAVE_INTEREST: 'saveInterest',
  EDIT_INTEREST: 'editInterest',
  CANCEL_EDIT: 'cancelEdit',
  DELETE_INTEREST: 'deleteInterest',
  RESET_PLANNER: 'resetPlanner',
  TOGGLE_BUCKET_EXPANDED: 'toggleBucketExpanded'
};

export function createPlannerDispatcher({ getState, setState, render, store }) {
  return function dispatch(action) {
    const current = getState();
    const nextPlannerState = {
      ...current.plannerState,
      bucketPercentages: { ...current.plannerState.bucketPercentages },
      interests: [...current.plannerState.interests]
    };
    const nextUiState = {
      ...current.uiState,
      previousAllocations: current.uiState.previousAllocations
    };

    let shouldPersist = false;
    let shouldClearPersistence = false;
    let result = { ok: true };

    switch (action.type) {
      case ACTIONS.SET_FREE_HOURS:
        nextPlannerState.freeHours = parseNonNegativeNumber(action.payload?.value, current.plannerState.freeHours);
        shouldPersist = true;
        break;
      case ACTIONS.SET_BUCKET_PERCENTAGE:
        nextPlannerState.bucketPercentages[action.payload.bucketId] = parseBucketPercentage(
          action.payload.value,
          current.plannerState.bucketPercentages[action.payload.bucketId]
        );
        shouldPersist = true;
        break;
      case ACTIONS.SAVE_INTEREST: {
        const name = String(action.payload?.name ?? '').trim();
        const bucket = String(action.payload?.bucket ?? '');
        const weight = parsePositiveNumber(action.payload?.weight, null);
        const existingId = String(action.payload?.id ?? '');

        if (!name) {
          result = { ok: false, message: 'Interest name is required.', isError: true };
          break;
        }

        if (!['1', '2', '3'].includes(bucket)) {
          result = { ok: false, message: 'Select a valid bucket.', isError: true };
          break;
        }

        if (weight === null) {
          result = { ok: false, message: 'Weight must be greater than 0.', isError: true };
          break;
        }

        if (existingId) {
          nextPlannerState.interests = nextPlannerState.interests.map((interest) => (
            interest.id === existingId ? { ...interest, name, bucket, weight } : interest
          ));
          nextUiState.lastChangedInterestId = existingId;
          nextUiState.editingInterestId = '';
          nextUiState.pendingFocusTarget = 'after-save';
          result = { ok: true, message: 'Interest updated. Review the allocation preview or add another interest.', isError: false };
        } else {
          const newId = createId();
          nextPlannerState.interests.push({ id: newId, name, bucket, weight });
          nextUiState.lastChangedInterestId = newId;
          nextUiState.pendingFocusTarget = 'after-save';
          result = { ok: true, message: 'Interest added. Review the allocation preview or add another interest.', isError: false };
        }

        shouldPersist = true;
        break;
      }
      case ACTIONS.EDIT_INTEREST:
        nextUiState.editingInterestId = String(action.payload?.id ?? '');
        nextUiState.pendingFocusTarget = 'interest-name';
        result = { ok: true, message: 'Editing interest. Update the details and keep the flow moving.', isError: false };
        break;
      case ACTIONS.CANCEL_EDIT:
        nextUiState.editingInterestId = '';
        nextUiState.pendingFocusTarget = 'interest-name';
        break;
      case ACTIONS.DELETE_INTEREST: {
        const interestId = String(action.payload?.id ?? '');
        nextUiState.lastDeletedInterestId = interestId;
        nextPlannerState.interests = nextPlannerState.interests.filter((interest) => interest.id !== interestId);
        if (nextUiState.editingInterestId === interestId) {
          nextUiState.editingInterestId = '';
        }
        nextUiState.pendingFocusTarget = 'after-delete';
        result = { ok: true, message: 'Interest deleted. Continue shaping the week.', isError: false };
        shouldPersist = true;
        break;
      }
      case ACTIONS.RESET_PLANNER:
        nextPlannerState.freeHours = 0;
        nextPlannerState.bucketPercentages = { '1': 80, '2': 15, '3': 5 };
        nextPlannerState.interests = [];
        nextUiState.editingInterestId = '';
        nextUiState.expandedBucketId = '';
        nextUiState.lastChangedInterestId = '';
        nextUiState.lastDeletedInterestId = '';
        nextUiState.summaryText = '';
        nextUiState.pendingFocusTarget = 'free-hours';
        shouldClearPersistence = true;
        result = { ok: true, message: 'All planner data cleared. Start with free hours again.', isError: false };
        break;
      case ACTIONS.TOGGLE_BUCKET_EXPANDED: {
        const bucketId = String(action.payload?.bucketId ?? '');
        nextUiState.expandedBucketId = nextUiState.expandedBucketId === bucketId ? '' : bucketId;
        break;
      }
      default:
        result = { ok: false, message: `Unknown action: ${action.type}`, isError: true };
        break;
    }

    setState({
      plannerState: nextPlannerState,
      uiState: nextUiState
    });

    if (shouldPersist) {
      store.savePlannerState(nextPlannerState);
    }

    if (shouldClearPersistence) {
      store.clearPlannerState();
    }

    render();
    return result;
  };
}
