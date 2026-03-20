/**
 * @typedef {Object} DraftInterest
 * @property {string} id
 * @property {string} existingId
 * @property {string} name
 * @property {string} bucket
 * @property {string} bucketLabel
 * @property {number | null} weight
 */

/**
 * @typedef {Object} InterestAllocation
 * @property {string} id
 * @property {string} name
 * @property {string} bucket
 * @property {number} weight
 * @property {number} hours
 */

/**
 * @typedef {Object} BucketAllocation
 * @property {string} id
 * @property {string} name
 * @property {string} accentClass
 * @property {string} label
 * @property {number} percentage
 * @property {number} hours
 * @property {import('../store/types.js').Interest[]} interests
 * @property {InterestAllocation[]} allocations
 * @property {string} status
 */

/**
 * @typedef {Object} PlannerModel
 * @property {number} percentageTotal
 * @property {boolean} isPercentageValid
 * @property {BucketAllocation[]} bucketAllocations
 * @property {InterestAllocation[]} allocations
 * @property {string} percentageMessage
 * @property {string} summaryText
 * @property {{hours: number, delta: number | null} | null} preview
 */

export {};
