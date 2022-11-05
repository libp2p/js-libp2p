/**
 * Prometheus metric names are global and can only contain
 * a limited set of, at least /a-z_0-9/i
 */
export function randomMetricName (key = '') {
  return `my_metric_${key}${Math.random().toString().split('.').pop() ?? ''}`
}
