
/**
 * How long in ms a dial attempt is allowed to take
 */
export const DIAL_TIMEOUT = 30e3

/**
 * Maximum allowed concurrent dials
 */
export const MAX_PARALLEL_DIALS = 100

/**
 * Allowed parallel dials per DialRequest
 */
export const MAX_PER_PEER_DIALS = 4

/**
 * Maximum number of allowed addresses to attempt to dial
 */
export const MAX_ADDRS_TO_DIAL = 25

export const METRICS = {
  computeThrottleMaxQueueSize: 1000,
  computeThrottleTimeout: 2000,
  movingAverageIntervals: [
    60 * 1000, // 1 minute
    5 * 60 * 1000, // 5 minutes
    15 * 60 * 1000 // 15 minutes
  ],
  maxOldPeersRetention: 50
}
