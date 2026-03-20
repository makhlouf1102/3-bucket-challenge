import { STORAGE_KEY, BUCKETS } from '../lib/config.js';
import { parseBucketPercentage, parseNonNegativeNumber, parsePositiveNumber } from '../lib/parsing.js';
import { createId } from '../lib/ids.js';

export function createDefaultPlannerState() {
  return {
    freeHours: 0,
    bucketPercentages: { '1': 80, '2': 15, '3': 5 },
    interests: []
  };
}

export function sanitizeInterest(interest) {
  if (!interest || typeof interest.name !== 'string') {
    return null;
  }

  const trimmedName = interest.name.trim();
  const bucket = String(interest.bucket);
  const weight = parsePositiveNumber(interest.weight, null);

  if (!trimmedName || !BUCKETS.some((item) => item.id === bucket) || weight === null) {
    return null;
  }

  return {
    id: typeof interest.id === 'string' && interest.id ? interest.id : createId(),
    name: trimmedName,
    bucket,
    weight
  };
}

export function sanitizePlannerState(raw) {
  const defaults = createDefaultPlannerState();
  const parsed = raw && typeof raw === 'object' ? raw : {};
  return {
    freeHours: parseNonNegativeNumber(parsed.freeHours, defaults.freeHours),
    bucketPercentages: {
      '1': parseBucketPercentage(parsed.bucketPercentages?.['1'], defaults.bucketPercentages['1']),
      '2': parseBucketPercentage(parsed.bucketPercentages?.['2'], defaults.bucketPercentages['2']),
      '3': parseBucketPercentage(parsed.bucketPercentages?.['3'], defaults.bucketPercentages['3'])
    },
    interests: Array.isArray(parsed.interests)
      ? parsed.interests.map((interest) => sanitizeInterest(interest)).filter(Boolean)
      : []
  };
}

export function loadPlannerState(storage = window.localStorage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
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
}
