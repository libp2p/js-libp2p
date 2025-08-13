import type { Counter, Metrics } from '@libp2p/interface'

export type MetricsRegistry = Record<string, Counter>

export function registerMetrics (metrics: Metrics): MetricsRegistry {
  return {
    xxHandshakeSuccesses: metrics.registerCounter(
      'libp2p_noise_xxhandshake_successes_total', {
        help: 'Total count of noise xxHandshakes successes_'
      }),

    xxHandshakeErrors: metrics.registerCounter(
      'libp2p_noise_xxhandshake_error_total', {
        help: 'Total count of noise xxHandshakes errors'
      }),

    encryptedPackets: metrics.registerCounter(
      'libp2p_noise_encrypted_packets_total', {
        help: 'Total count of noise encrypted packets successfully'
      }),

    decryptedPackets: metrics.registerCounter(
      'libp2p_noise_decrypted_packets_total', {
        help: 'Total count of noise decrypted packets'
      }),

    decryptErrors: metrics.registerCounter(
      'libp2p_noise_decrypt_errors_total', {
        help: 'Total count of noise decrypt errors'
      })
  }
}
