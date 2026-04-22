import * as store from './store/index.js';
import { derivePlannerModel } from './domain/index.js';
import { ACTIONS, createPlannerDispatcher } from './actions/index.js';
import {
  bindAppElements,
  buildDraftPriority,
  createDefaultUiState,
  populatePriorityForm,
  renderPriorityForm,
  renderPriorityTable,
  renderResults,
  renderSetup,
  renderStepNavigation,
  renderStepPanels,
  resetPriorityForm,
  setMessage
} from './ui/index.js';

const elements = bindAppElements(document);

const appState = {
  plannerState: store.loadPlannerState(),
  uiState: createDefaultUiState(),
  formMessage: '',
  formMessageIsError: false
};

const dispatch = createPlannerDispatcher({
  getState: () => ({ plannerState: appState.plannerState, uiState: appState.uiState }),
  setState: ({ plannerState, uiState }) => {
    appState.plannerState = plannerState;
    appState.uiState = uiState;
  },
  render,
  store
});

initialize();

function initialize() {
  bindEvents();
  resetPriorityForm(elements.priorityForm);
  render();
}

function render() {
  const draftPriority = buildDraftPriority(elements.priorityForm);
  const model = derivePlannerModel(appState.plannerState, appState.uiState, draftPriority);

  renderSetup({
    elements: { ...elements.setup, journey: elements.journey },
    plannerState: appState.plannerState,
    model,
    uiState: appState.uiState
  });

  renderPriorityForm({
    elements: elements.priorityForm,
    plannerState: appState.plannerState,
    model,
    uiState: appState.uiState,
    message: appState.formMessage,
    messageIsError: appState.formMessageIsError
  });

  renderPriorityTable({
    elements: elements.priorityTable,
    plannerState: appState.plannerState,
    uiState: appState.uiState
  });

  renderResults({
    elements: elements.results,
    plannerState: appState.plannerState,
    model,
    uiState: appState.uiState
  });

  renderStepNavigation({
    buttons: elements.stepNavButtons,
    notes: elements.stepNavNotes
  }, appState.plannerState, model);
  renderStepPanels(elements.stepPanels, appState.uiState.selectedJourneyStage, appState.uiState.reducedMotion);
  applyPendingFocus(appState.uiState, model);
  appState.uiState.previousAllocations = new Map(model.allocations.map((item) => [item.id, item.hours]));
  appState.uiState.lastChangedPriorityId = '';
  appState.uiState.lastDeletedPriorityId = '';
}

function resolveFocusTarget(target, plannerState, model) {
  switch (target) {
    case 'after-save':
      if (plannerState.freeHours > 0 && model.isPercentageValid && model.allocations.length > 0) {
        return 'allocation-summary';
      }
      return 'priority-name';
    case 'after-delete':
      return plannerState.priorities.length > 0 ? 'priority-name' : 'free-hours';
    case 'priority-name':
      return 'priority-name';
    case 'free-hours':
      return 'free-hours';
    default:
      return '';
  }
}

function applyPendingFocus(uiState, model) {
  if (!uiState.pendingFocusTarget) {
    return;
  }

  const target = resolveFocusTarget(uiState.pendingFocusTarget, appState.plannerState, model);
  uiState.pendingFocusTarget = '';

  if (!target) {
    return;
  }

  const targetMap = {
    'allocation-summary': elements.results.allocationSummary,
    'free-hours': elements.setup.freeHours,
    'priority-name': elements.priorityForm.priorityName
  };

  const element = targetMap[target];
  if (!element || typeof element.focus !== 'function') {
    return;
  }

  element.focus({ preventScroll: true });
}

function bindEvents() {
  elements.setup.freeHours.addEventListener('input', () => {
    dispatch({
      type: ACTIONS.SET_FREE_HOURS,
      payload: { value: elements.setup.freeHours.value }
    });
  });

  Object.entries(elements.setup.categoryInputs).forEach(([categoryId, input]) => {
    input.addEventListener('input', () => {
      dispatch({
        type: ACTIONS.SET_CATEGORY_PERCENTAGE,
        payload: { categoryId, value: input.value }
      });
    });
  });

  Object.entries(elements.setup.categoryRanges).forEach(([categoryId, input]) => {
    input.addEventListener('input', () => {
      dispatch({
        type: ACTIONS.SET_CATEGORY_PERCENTAGE,
        payload: { categoryId, value: input.value }
      });
    });
  });

  [
    elements.priorityForm.priorityName,
    elements.priorityForm.priorityCategory,
    elements.priorityForm.priorityWeight
  ].forEach((element) => {
    element.addEventListener('input', render);
    element.addEventListener('change', render);
  });

  elements.priorityForm.priorityForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const result = dispatch({
      type: ACTIONS.SAVE_PRIORITY,
      payload: {
        id: elements.priorityForm.priorityId.value,
        name: elements.priorityForm.priorityName.value,
        category: elements.priorityForm.priorityCategory.value,
        weight: elements.priorityForm.priorityWeight.value
      }
    });

    appState.formMessage = result.message || '';
    appState.formMessageIsError = Boolean(result.isError);
    if (result.ok) {
      resetPriorityForm(elements.priorityForm);
      render();
    } else {
      setMessage(elements.priorityForm.priorityMessage, appState.formMessage, true, appState.uiState.reducedMotion);
    }
  });

  elements.priorityForm.cancelEdit.addEventListener('click', () => {
    dispatch({ type: ACTIONS.CANCEL_EDIT });
    resetPriorityForm(elements.priorityForm);
    appState.formMessage = '';
    appState.formMessageIsError = false;
    render();
  });

  elements.priorityForm.resetButton.addEventListener('click', () => {
    const confirmed = window.confirm('Clear all saved data for this weekly planner?');
    if (!confirmed) {
      return;
    }

    const result = dispatch({ type: ACTIONS.RESET_PLANNER });
    appState.formMessage = result.message || '';
    appState.formMessageIsError = Boolean(result.isError);
    resetPriorityForm(elements.priorityForm);
    render();
  });

  elements.priorityTable.priorityList.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) {
      return;
    }

    const priorityId = button.dataset.id;
    const action = button.dataset.action;

    if (action === 'edit') {
      const priority = appState.plannerState.priorities.find((item) => item.id === priorityId);
      if (!priority) {
        return;
      }

      const result = dispatch({
        type: ACTIONS.EDIT_PRIORITY,
        payload: { id: priorityId }
      });
      appState.formMessage = result.message || '';
      appState.formMessageIsError = Boolean(result.isError);
      populatePriorityForm(elements.priorityForm, priority, appState.uiState.reducedMotion);
      render();
    }

    if (action === 'delete') {
      const result = dispatch({
        type: ACTIONS.DELETE_PRIORITY,
        payload: { id: priorityId }
      });
      appState.formMessage = result.message || '';
      appState.formMessageIsError = Boolean(result.isError);
      if (elements.priorityForm.priorityId.value === priorityId) {
        resetPriorityForm(elements.priorityForm);
      }
      render();
    }
  });

  elements.results.categoryResults.addEventListener('click', (event) => {
    const toggle = event.target.closest('button[data-category-toggle]');
    if (!toggle) {
      return;
    }

    dispatch({
      type: ACTIONS.TOGGLE_CATEGORY_EXPANDED,
      payload: { categoryId: toggle.dataset.categoryToggle }
    });
  });

  elements.journey.stepButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (button.disabled) {
        return;
      }

      selectJourneyStage(button.dataset.journeyStep, false);
    });
  });

  elements.stepNavButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (button.disabled) {
        return;
      }

      selectJourneyStage(button.dataset.stepNav, true);
    });
  });
}

function selectJourneyStage(stage, shouldScroll) {
  appState.uiState.selectedJourneyStage = stage;
  appState.uiState.hasManualJourneySelection = true;
  render();

  if (!shouldScroll) {
    return;
  }

  const panel = elements.stepPanels[stage];
  if (!panel) {
    return;
  }

  const behavior = appState.uiState.reducedMotion ? 'auto' : 'smooth';
  panel.scrollIntoView({ behavior, block: 'start' });
}
