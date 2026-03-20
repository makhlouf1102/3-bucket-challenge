/**
 * @typedef {Object} Interest
 * @property {string} id
 * @property {string} name
 * @property {string} bucket
 * @property {number} weight
 */

/**
 * @typedef {Object} PlannerState
 * @property {number} freeHours
 * @property {{'1': number, '2': number, '3': number}} bucketPercentages
 * @property {Interest[]} interests
 */

export {};
