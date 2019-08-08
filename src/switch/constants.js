'use strict'

module.exports = {
  DENY_TTL: 5 * 60 * 1e3, // How long before an errored peer can be dialed again
  DENY_ATTEMPTS: 5, // Num of unsuccessful dials before a peer is permanently denied
  DIAL_TIMEOUT: 30e3, // How long in ms a dial attempt is allowed to take
  MAX_COLD_CALLS: 50, // How many dials w/o protocols that can be queued
  MAX_PARALLEL_DIALS: 100, // Maximum allowed concurrent dials
  QUARTER_HOUR: 15 * 60e3,
  PRIORITY_HIGH: 10,
  PRIORITY_LOW: 20
}
