export function formatNumber(value) {
  return Number(value).toFixed(Number.isInteger(value) ? 0 : 2).replace(/\.00$/, '');
}

export function formatHours(value) {
  return `${formatNumber(value)} hours`;
}
