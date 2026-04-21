import { CATEGORIES } from '../lib/config.js';
import { formatHours, formatNumber } from '../lib/format.js';

export function getCategoryName(categoryId) {
  const category = CATEGORIES.find((item) => item.id === categoryId);
  return category ? category.name : 'Unknown category';
}

export function getPercentageTotal(plannerState) {
  return Object.values(plannerState.categoryPercentages).reduce((sum, value) => sum + value, 0);
}

export function validatePlannerState(plannerState) {
  const percentageTotal = getPercentageTotal(plannerState);
  return {
    percentageTotal,
    isPercentageValid: percentageTotal === 100
  };
}

export function getPriorityHours(plannerState, targetPriority, priorities = plannerState.priorities) {
  const categoryPercentage = plannerState.categoryPercentages[targetPriority.category];
  const categoryHours = (plannerState.freeHours * categoryPercentage) / 100;
  const targetCategoryPriorities = priorities.filter((priority) => priority.category === targetPriority.category);
  const totalWeight = targetCategoryPriorities.reduce((sum, priority) => sum + priority.weight, 0);
  if (!totalWeight) {
    return 0;
  }

  return categoryHours * (targetPriority.weight / totalWeight);
}

export function getPriorityPreview(plannerState, draftPriority) {
  if (!draftPriority || draftPriority.weight === null || !draftPriority.name) {
    return null;
  }

  const draft = {
    id: draftPriority.existingId || draftPriority.id,
    name: draftPriority.name,
    category: draftPriority.category,
    weight: draftPriority.weight
  };

  const draftPriorities = draftPriority.existingId
    ? plannerState.priorities.map((priority) => (priority.id === draftPriority.existingId ? draft : priority))
    : plannerState.priorities.concat(draft);

  const targetCategoryPriorities = draftPriorities.filter((priority) => priority.category === draft.category);
  const categoryPercentage = plannerState.categoryPercentages[draft.category];
  const categoryHours = (plannerState.freeHours * categoryPercentage) / 100;
  const totalWeight = targetCategoryPriorities.reduce((sum, priority) => sum + priority.weight, 0);
  const currentAllocation = plannerState.priorities.find((priority) => priority.id === draftPriority.existingId);
  const currentHours = currentAllocation ? getPriorityHours(plannerState, currentAllocation) : null;

  if (!totalWeight) {
    return null;
  }

  const matchingPriority = targetCategoryPriorities.find((priority) => priority.id === draft.id);
  if (!matchingPriority) {
    return null;
  }

  const hours = categoryHours * (matchingPriority.weight / totalWeight);
  return {
    hours,
    delta: currentHours === null ? null : hours - currentHours
  };
}

export function buildCategoryStatus(category, percentageTotal) {
  if (percentageTotal !== 100) {
    return 'Bring the category split to 100% to unlock this breakdown.';
  }

  if (category.priorities.length === 0) {
    return 'No priorities assigned yet. Add one to make this category active.';
  }

  if (category.priorities.length === 1) {
    return 'This category is currently concentrated in one priority.';
  }

  return 'This category is split by weight across your saved priorities.';
}

export function buildCategoryAllocation(plannerState, category, percentageTotal) {
  const percentage = plannerState.categoryPercentages[category.id];
  const priorities = plannerState.priorities.filter((item) => item.category === category.id);
  const hours = percentageTotal === 100 ? (plannerState.freeHours * percentage) / 100 : 0;
  const totalWeight = priorities.reduce((sum, priority) => sum + priority.weight, 0);

  const allocations = priorities.map((priority) => ({
    id: priority.id,
    name: priority.name,
    category: priority.category,
    weight: priority.weight,
    hours: totalWeight === 0 ? 0 : hours * (priority.weight / totalWeight)
  }));

  const result = { ...category, percentage, hours, priorities, allocations };
  return {
    ...result,
    status: buildCategoryStatus(result, percentageTotal)
  };
}

export function buildSummaryText(allocations, previousAllocations, percentageTotal) {
  if (percentageTotal !== 100) {
    return 'Bring the category split to 100% to unlock the weekly summary.';
  }

  if (!allocations.length) {
    return 'Add a priority to see how your weekly time is distributed.';
  }

  if (!previousAllocations.size) {
    const top = allocations.reduce((best, current) => (current.hours > best.hours ? current : best), allocations[0]);
    return `${top.name} currently leads your week at ${formatHours(top.hours)}.`;
  }

  let strongest = null;
  allocations.forEach((item) => {
    const previous = previousAllocations.get(item.id) ?? 0;
    const delta = item.hours - previous;
    if (!strongest || Math.abs(delta) > Math.abs(strongest.delta)) {
      strongest = { item, delta };
    }
  });

  if (!strongest || Math.abs(strongest.delta) < 0.01) {
    const top = allocations.reduce((best, current) => (current.hours > best.hours ? current : best), allocations[0]);
    return `${top.name} continues to lead your week at ${formatHours(top.hours)}.`;
  }

  const direction = strongest.delta > 0 ? 'gained' : 'lost';
  return `${strongest.item.name} ${direction} ${formatNumber(Math.abs(strongest.delta))} hours in the current plan.`;
}

export function buildPercentageMessage(percentageTotal) {
  if (percentageTotal === 100) {
    return 'Your category portfolio totals 100%.';
  }

  const difference = Math.abs(100 - percentageTotal);
  const direction = percentageTotal < 100 ? 'Add' : 'Remove';
  return `${direction} ${formatNumber(difference)}% to reach 100%. Current total: ${formatNumber(percentageTotal)}%.`;
}

export function derivePlannerModel(plannerState, uiState, draftPriority = null) {
  const { percentageTotal, isPercentageValid } = validatePlannerState(plannerState);
  const categoryAllocations = CATEGORIES.map((category) => buildCategoryAllocation(plannerState, category, percentageTotal));
  const allocations = categoryAllocations.flatMap((category) => category.allocations);
  return {
    percentageTotal,
    isPercentageValid,
    categoryAllocations,
    allocations,
    percentageMessage: buildPercentageMessage(percentageTotal),
    summaryText: buildSummaryText(allocations, uiState.previousAllocations, percentageTotal),
    preview: getPriorityPreview(plannerState, draftPriority)
  };
}
