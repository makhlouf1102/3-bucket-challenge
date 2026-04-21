/**
 * @typedef {Object} DraftPriority
 * @property {string} id
 * @property {string} existingId
 * @property {string} name
 * @property {string} category
 * @property {string} categoryLabel
 * @property {number | null} weight
 */

/**
 * @typedef {Object} PriorityAllocation
 * @property {string} id
 * @property {string} name
 * @property {string} category
 * @property {number} weight
 * @property {number} hours
 */

/**
 * @typedef {Object} CategoryAllocation
 * @property {string} id
 * @property {string} name
 * @property {string} accentClass
 * @property {string} label
 * @property {number} percentage
 * @property {number} hours
 * @property {import('../store/types.js').Priority[]} priorities
 * @property {PriorityAllocation[]} allocations
 * @property {string} status
 */

/**
 * @typedef {Object} PlannerModel
 * @property {number} percentageTotal
 * @property {boolean} isPercentageValid
 * @property {CategoryAllocation[]} categoryAllocations
 * @property {PriorityAllocation[]} allocations
 * @property {string} percentageMessage
 * @property {string} summaryText
 * @property {{hours: number, delta: number | null} | null} preview
 */

export {};
