import { parseCategoryPercentage, parseNonNegativeNumber, parsePositiveNumber } from '../lib/parsing.js';
import { createId } from '../lib/ids.js';

export const ACTIONS = {
  SET_FREE_HOURS: 'setFreeHours',
  SET_CATEGORY_PERCENTAGE: 'setCategoryPercentage',
  SAVE_PRIORITY: 'savePriority',
  EDIT_PRIORITY: 'editPriority',
  CANCEL_EDIT: 'cancelEdit',
  DELETE_PRIORITY: 'deletePriority',
  RESET_PLANNER: 'resetPlanner',
  TOGGLE_CATEGORY_EXPANDED: 'toggleCategoryExpanded'
};

export function createPlannerDispatcher({ getState, setState, render, store }) {
  return function dispatch(action) {
    const current = getState();
    const nextPlannerState = {
      ...current.plannerState,
      categoryPercentages: { ...current.plannerState.categoryPercentages },
      priorities: [...current.plannerState.priorities]
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
      case ACTIONS.SET_CATEGORY_PERCENTAGE:
        nextPlannerState.categoryPercentages[action.payload.categoryId] = parseCategoryPercentage(
          action.payload.value,
          current.plannerState.categoryPercentages[action.payload.categoryId]
        );
        shouldPersist = true;
        break;
      case ACTIONS.SAVE_PRIORITY: {
        const name = String(action.payload?.name ?? '').trim();
        const category = String(action.payload?.category ?? '');
        const weight = parsePositiveNumber(action.payload?.weight, null);
        const existingId = String(action.payload?.id ?? '');

        if (!name) {
          result = { ok: false, message: 'Enter a priority name.', isError: true };
          break;
        }

        if (!['1', '2', '3'].includes(category)) {
          result = { ok: false, message: 'Select a valid category.', isError: true };
          break;
        }

        if (weight === null) {
          result = { ok: false, message: 'Weight must be greater than 0.', isError: true };
          break;
        }

        if (existingId) {
          nextPlannerState.priorities = nextPlannerState.priorities.map((priority) => (
            priority.id === existingId ? { ...priority, name, category, weight } : priority
          ));
          nextUiState.lastChangedPriorityId = existingId;
          nextUiState.editingPriorityId = '';
          nextUiState.pendingFocusTarget = 'after-save';
          result = { ok: true, message: 'Priority updated. Review the allocation or add another priority.', isError: false };
        } else {
          const newId = createId();
          nextPlannerState.priorities.push({ id: newId, name, category, weight });
          nextUiState.lastChangedPriorityId = newId;
          nextUiState.pendingFocusTarget = 'after-save';
          result = { ok: true, message: 'Priority added. Review the allocation or add another priority.', isError: false };
        }

        shouldPersist = true;
        break;
      }
      case ACTIONS.EDIT_PRIORITY:
        nextUiState.editingPriorityId = String(action.payload?.id ?? '');
        nextUiState.pendingFocusTarget = 'priority-name';
        result = { ok: true, message: 'Editing priority. Update the details, then save the change.', isError: false };
        break;
      case ACTIONS.CANCEL_EDIT:
        nextUiState.editingPriorityId = '';
        nextUiState.pendingFocusTarget = 'priority-name';
        break;
      case ACTIONS.DELETE_PRIORITY: {
        const priorityId = String(action.payload?.id ?? '');
        nextUiState.lastDeletedPriorityId = priorityId;
        nextPlannerState.priorities = nextPlannerState.priorities.filter((priority) => priority.id !== priorityId);
        if (nextUiState.editingPriorityId === priorityId) {
          nextUiState.editingPriorityId = '';
        }
        nextUiState.pendingFocusTarget = 'after-delete';
        result = { ok: true, message: 'Priority removed. Review the remaining allocation.', isError: false };
        shouldPersist = true;
        break;
      }
      case ACTIONS.RESET_PLANNER:
        nextPlannerState.freeHours = 0;
        nextPlannerState.categoryPercentages = { '1': 80, '2': 15, '3': 5 };
        nextPlannerState.priorities = [];
        nextUiState.editingPriorityId = '';
        nextUiState.expandedCategoryId = '';
        nextUiState.lastChangedPriorityId = '';
        nextUiState.lastDeletedPriorityId = '';
        nextUiState.summaryText = '';
        nextUiState.pendingFocusTarget = 'free-hours';
        shouldClearPersistence = true;
        result = { ok: true, message: 'Planner cleared. Start again with available founder hours.', isError: false };
        break;
      case ACTIONS.TOGGLE_CATEGORY_EXPANDED: {
        const categoryId = String(action.payload?.categoryId ?? '');
        nextUiState.expandedCategoryId = nextUiState.expandedCategoryId === categoryId ? '' : categoryId;
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
