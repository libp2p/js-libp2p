'use strict'

module.exports = {
  DIAL_TIMEOUT: 30e3, // How long in ms a dial attempt is allowed to take
  MAX_PARALLEL_DIALS: 100, // Maximum allowed concurrent dials
  MAX_PER_PEER_DIALS: 4, // Allowed parallel dials per DialRequest
  MAX_ADDRS_TO_DIAL: 25, // Maximum number of allowed addresses to attempt to dial
  METRICS: {
    computeThrottleMaxQueueSize: 1000,
    computeThrottleTimeout: 2000,
    movingAverageIntervals: [
      60 * 1000, // 1 minute
      5 * 60 * 1000, // 5 minutes
      15 * 60 * 1000 // 15 minutes
    ],
    maxOldPeersRetention: 50
  }
}
