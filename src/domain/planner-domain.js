import { BUCKETS } from '../lib/config.js';
import { formatHours, formatNumber } from '../lib/format.js';

export function getBucketName(bucketId) {
  const bucket = BUCKETS.find((item) => item.id === bucketId);
  return bucket ? bucket.name : 'Unknown bucket';
}

export function getPercentageTotal(plannerState) {
  return Object.values(plannerState.bucketPercentages).reduce((sum, value) => sum + value, 0);
}

export function validatePlannerState(plannerState) {
  const percentageTotal = getPercentageTotal(plannerState);
  return {
    percentageTotal,
    isPercentageValid: percentageTotal === 100
  };
}

export function getInterestHours(plannerState, targetInterest, interests = plannerState.interests) {
  const bucketPercentage = plannerState.bucketPercentages[targetInterest.bucket];
  const bucketHours = (plannerState.freeHours * bucketPercentage) / 100;
  const targetBucketInterests = interests.filter((interest) => interest.bucket === targetInterest.bucket);
  const totalWeight = targetBucketInterests.reduce((sum, interest) => sum + interest.weight, 0);
  if (!totalWeight) {
    return 0;
  }

  return bucketHours * (targetInterest.weight / totalWeight);
}

export function getInterestPreview(plannerState, draftInterest) {
  if (!draftInterest || draftInterest.weight === null || !draftInterest.name) {
    return null;
  }

  const draft = {
    id: draftInterest.existingId || draftInterest.id,
    name: draftInterest.name,
    bucket: draftInterest.bucket,
    weight: draftInterest.weight
  };

  const draftInterests = draftInterest.existingId
    ? plannerState.interests.map((interest) => (interest.id === draftInterest.existingId ? draft : interest))
    : plannerState.interests.concat(draft);

  const targetBucketInterests = draftInterests.filter((interest) => interest.bucket === draft.bucket);
  const bucketPercentage = plannerState.bucketPercentages[draft.bucket];
  const bucketHours = (plannerState.freeHours * bucketPercentage) / 100;
  const totalWeight = targetBucketInterests.reduce((sum, interest) => sum + interest.weight, 0);
  const currentAllocation = plannerState.interests.find((interest) => interest.id === draftInterest.existingId);
  const currentHours = currentAllocation ? getInterestHours(plannerState, currentAllocation) : null;

  if (!totalWeight) {
    return null;
  }

  const matchingInterest = targetBucketInterests.find((interest) => interest.id === draft.id);
  if (!matchingInterest) {
    return null;
  }

  const hours = bucketHours * (matchingInterest.weight / totalWeight);
  return {
    hours,
    delta: currentHours === null ? null : hours - currentHours
  };
}

export function buildBucketStatus(bucket, percentageTotal) {
  if (percentageTotal !== 100) {
    return 'Complete the 100% split to unlock this bucket breakdown.';
  }

  if (bucket.interests.length === 0) {
    return 'No interests assigned yet. Add one to make this bucket active.';
  }

  if (bucket.interests.length === 1) {
    return 'This bucket is currently concentrated in a single interest.';
  }

  return 'This bucket is split by weight across your saved interests.';
}

export function buildBucketAllocation(plannerState, bucket, percentageTotal) {
  const percentage = plannerState.bucketPercentages[bucket.id];
  const interests = plannerState.interests.filter((item) => item.bucket === bucket.id);
  const hours = percentageTotal === 100 ? (plannerState.freeHours * percentage) / 100 : 0;
  const totalWeight = interests.reduce((sum, interest) => sum + interest.weight, 0);

  const allocations = interests.map((interest) => ({
    id: interest.id,
    name: interest.name,
    bucket: interest.bucket,
    weight: interest.weight,
    hours: totalWeight === 0 ? 0 : hours * (interest.weight / totalWeight)
  }));

  const result = { ...bucket, percentage, hours, interests, allocations };
  return {
    ...result,
    status: buildBucketStatus(result, percentageTotal)
  };
}

export function buildSummaryText(allocations, previousAllocations, percentageTotal) {
  if (percentageTotal !== 100) {
    return 'Bring the bucket split to 100% to unlock the weekly narrative summary.';
  }

  if (!allocations.length) {
    return 'Add an interest to see how your weekly time is distributed.';
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
    return 'All three buckets total 100%.';
  }

  const difference = Math.abs(100 - percentageTotal);
  const direction = percentageTotal < 100 ? 'Add' : 'Remove';
  return `${direction} ${formatNumber(difference)}% to reach 100%. Current total: ${formatNumber(percentageTotal)}%.`;
}

export function derivePlannerModel(plannerState, uiState, draftInterest = null) {
  const { percentageTotal, isPercentageValid } = validatePlannerState(plannerState);
  const bucketAllocations = BUCKETS.map((bucket) => buildBucketAllocation(plannerState, bucket, percentageTotal));
  const allocations = bucketAllocations.flatMap((bucket) => bucket.allocations);
  return {
    percentageTotal,
    isPercentageValid,
    bucketAllocations,
    allocations,
    percentageMessage: buildPercentageMessage(percentageTotal),
    summaryText: buildSummaryText(allocations, uiState.previousAllocations, percentageTotal),
    preview: getInterestPreview(plannerState, draftInterest)
  };
}
