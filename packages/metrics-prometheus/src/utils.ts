import type { CalculateMetric } from '@libp2p/interface-metrics'

export interface CalculatedMetric <T = number> {
  addCalculator: (calculator: CalculateMetric<T>) => void
}

export const ONE_SECOND = 1000
export const ONE_MINUTE = 60 * ONE_SECOND

/**
 * See https://prometheus.io/docs/concepts/data_model/#metric-names-and-labels
 * for rules on valid naming
 */
export function normaliseString (str: string): string {
  return str
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
}
