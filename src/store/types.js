/**
 * @typedef {Object} Priority
 * @property {string} id
 * @property {string} name
 * @property {string} category
 * @property {number} weight
 */

/**
 * @typedef {Object} PlannerState
 * @property {number} freeHours
 * @property {{'1': number, '2': number, '3': number}} categoryPercentages
 * @property {Priority[]} priorities
 */

export {};
