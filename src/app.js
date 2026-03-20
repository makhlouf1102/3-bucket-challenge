import * as store from './store/index.js';
import { derivePlannerModel } from './domain/index.js';
import { ACTIONS, createPlannerDispatcher } from './actions/index.js';
import {
  bindAppElements,
  buildDraftInterest,
  buildJourneyStatus,
  createDefaultUiState,
  populateInterestForm,
  renderInterestForm,
  renderInterestTable,
  renderResults,
  renderSetup,
  resetInterestForm,
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
  resetInterestForm(elements.interestForm);
  render();
}

function render() {
  const draftInterest = buildDraftInterest(elements.interestForm);
  const model = derivePlannerModel(appState.plannerState, appState.uiState, draftInterest);
  const journeyStatus = buildJourneyStatus({
    plannerState: appState.plannerState,
    model,
    uiState: appState.uiState
  });
  appState.uiState.journeyStage = journeyStatus.stage;

  renderSetup({
    elements: { ...elements.setup, journey: elements.journey },
    plannerState: appState.plannerState,
    model,
    uiState: appState.uiState
  });

  renderInterestForm({
    elements: elements.interestForm,
    plannerState: appState.plannerState,
    model,
    uiState: appState.uiState,
    message: appState.formMessage,
    messageIsError: appState.formMessageIsError
  });

  renderInterestTable({
    elements: elements.interestTable,
    plannerState: appState.plannerState,
    uiState: appState.uiState
  });

  renderResults({
    elements: elements.results,
    plannerState: appState.plannerState,
    model,
    uiState: appState.uiState
  });

  applyPendingFocus(appState.uiState, model);
  appState.uiState.previousAllocations = new Map(model.allocations.map((item) => [item.id, item.hours]));
  appState.uiState.lastChangedInterestId = '';
  appState.uiState.lastDeletedInterestId = '';
}

function resolveFocusTarget(target, plannerState, model) {
  switch (target) {
    case 'after-save':
      if (plannerState.freeHours > 0 && model.isPercentageValid && model.allocations.length > 0) {
        return 'allocation-summary';
      }
      return 'interest-name';
    case 'after-delete':
      return plannerState.interests.length > 0 ? 'interest-name' : 'free-hours';
    case 'interest-name':
      return 'interest-name';
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
    'interest-name': elements.interestForm.interestName
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

  Object.entries(elements.setup.bucketInputs).forEach(([bucketId, input]) => {
    input.addEventListener('input', () => {
      dispatch({
        type: ACTIONS.SET_BUCKET_PERCENTAGE,
        payload: { bucketId, value: input.value }
      });
    });
  });

  Object.entries(elements.setup.bucketRanges).forEach(([bucketId, input]) => {
    input.addEventListener('input', () => {
      dispatch({
        type: ACTIONS.SET_BUCKET_PERCENTAGE,
        payload: { bucketId, value: input.value }
      });
    });
  });

  [
    elements.interestForm.interestName,
    elements.interestForm.interestBucket,
    elements.interestForm.interestWeight
  ].forEach((element) => {
    element.addEventListener('input', render);
    element.addEventListener('change', render);
  });

  elements.interestForm.interestForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const result = dispatch({
      type: ACTIONS.SAVE_INTEREST,
      payload: {
        id: elements.interestForm.interestId.value,
        name: elements.interestForm.interestName.value,
        bucket: elements.interestForm.interestBucket.value,
        weight: elements.interestForm.interestWeight.value
      }
    });

    appState.formMessage = result.message || '';
    appState.formMessageIsError = Boolean(result.isError);
    if (result.ok) {
      resetInterestForm(elements.interestForm);
      render();
    } else {
      setMessage(elements.interestForm.interestMessage, appState.formMessage, true, appState.uiState.reducedMotion);
    }
  });

  elements.interestForm.cancelEdit.addEventListener('click', () => {
    dispatch({ type: ACTIONS.CANCEL_EDIT });
    resetInterestForm(elements.interestForm);
    appState.formMessage = '';
    appState.formMessageIsError = false;
    render();
  });

  elements.interestForm.resetButton.addEventListener('click', () => {
    const confirmed = window.confirm('Clear all saved data for the three-bucket planner?');
    if (!confirmed) {
      return;
    }

    const result = dispatch({ type: ACTIONS.RESET_PLANNER });
    appState.formMessage = result.message || '';
    appState.formMessageIsError = Boolean(result.isError);
    resetInterestForm(elements.interestForm);
    render();
  });

  elements.interestTable.interestList.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) {
      return;
    }

    const interestId = button.dataset.id;
    const action = button.dataset.action;

    if (action === 'edit') {
      const interest = appState.plannerState.interests.find((item) => item.id === interestId);
      if (!interest) {
        return;
      }

      const result = dispatch({
        type: ACTIONS.EDIT_INTEREST,
        payload: { id: interestId }
      });
      appState.formMessage = result.message || '';
      appState.formMessageIsError = Boolean(result.isError);
      populateInterestForm(elements.interestForm, interest, appState.uiState.reducedMotion);
      render();
    }

    if (action === 'delete') {
      const result = dispatch({
        type: ACTIONS.DELETE_INTEREST,
        payload: { id: interestId }
      });
      appState.formMessage = result.message || '';
      appState.formMessageIsError = Boolean(result.isError);
      if (elements.interestForm.interestId.value === interestId) {
        resetInterestForm(elements.interestForm);
      }
      render();
    }
  });

  elements.results.bucketResults.addEventListener('click', (event) => {
    const toggle = event.target.closest('button[data-bucket-toggle]');
    if (!toggle) {
      return;
    }

    dispatch({
      type: ACTIONS.TOGGLE_BUCKET_EXPANDED,
      payload: { bucketId: toggle.dataset.bucketToggle }
    });
  });
}
