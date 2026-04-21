import { LEGACY_STORAGE_KEY, STORAGE_KEY, CATEGORIES } from '../lib/config.js';
import { parseCategoryPercentage, parseNonNegativeNumber, parsePositiveNumber } from '../lib/parsing.js';
import { createId } from '../lib/ids.js';

export function createDefaultPlannerState() {
  return {
    freeHours: 0,
    categoryPercentages: { '1': 80, '2': 15, '3': 5 },
    priorities: []
  };
}

export function sanitizePriority(priority) {
  if (!priority || typeof priority.name !== 'string') {
    return null;
  }

  const trimmedName = priority.name.trim();
  const category = String(priority.category ?? priority.bucket);
  const weight = parsePositiveNumber(priority.weight, null);

  if (!trimmedName || !CATEGORIES.some((item) => item.id === category) || weight === null) {
    return null;
  }

  return {
    id: typeof priority.id === 'string' && priority.id ? priority.id : createId(),
    name: trimmedName,
    category,
    weight
  };
}

export function sanitizePlannerState(raw) {
  const defaults = createDefaultPlannerState();
  const parsed = raw && typeof raw === 'object' ? raw : {};
  const rawCategoryPercentages = parsed.categoryPercentages ?? parsed.bucketPercentages ?? {};
  const rawPriorities = parsed.priorities ?? parsed.interests ?? [];
  return {
    freeHours: parseNonNegativeNumber(parsed.freeHours, defaults.freeHours),
    categoryPercentages: {
      '1': parseCategoryPercentage(rawCategoryPercentages?.['1'], defaults.categoryPercentages['1']),
      '2': parseCategoryPercentage(rawCategoryPercentages?.['2'], defaults.categoryPercentages['2']),
      '3': parseCategoryPercentage(rawCategoryPercentages?.['3'], defaults.categoryPercentages['3'])
    },
    priorities: Array.isArray(rawPriorities)
      ? rawPriorities.map((priority) => sanitizePriority(priority)).filter(Boolean)
      : []
  };
}

export function loadPlannerState(storage = window.localStorage) {
  try {
    const raw = storage.getItem(STORAGE_KEY) ?? storage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) {
      return createDefaultPlannerState();
    }

    return sanitizePlannerState(JSON.parse(raw));
  } catch {
    return createDefaultPlannerState();
  }
}

export function savePlannerState(state, storage = window.localStorage) {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearPlannerState(storage = window.localStorage) {
  storage.removeItem(STORAGE_KEY);
  storage.removeItem(LEGACY_STORAGE_KEY);
}
