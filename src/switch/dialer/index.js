'use strict'

const DialQueueManager = require('./queueManager')
const { getPeerInfo } = require('../../get-peer-info')
const {
  DENY_ATTEMPTS,
  DENY_TTL,
  MAX_COLD_CALLS,
  MAX_PARALLEL_DIALS,
  PRIORITY_HIGH,
  PRIORITY_LOW
} = require('../constants')

module.exports = function (_switch) {
  const dialQueueManager = new DialQueueManager(_switch)

  _switch.state.on('STARTED:enter', start)
  _switch.state.on('STOPPING:enter', stop)

  /**
   * @param {DialRequest} dialRequest
   * @returns {void}
   */
  function _dial ({ peerInfo, protocol, options, callback }) {
    if (typeof protocol === 'function') {
      callback = protocol
      protocol = null
    }

    try {
      peerInfo = getPeerInfo(peerInfo, _switch._peerBook)
    } catch (err) {
      return callback(err)
    }

    // Add it to the queue, it will automatically get executed
    dialQueueManager.add({ peerInfo, protocol, options, callback })
  }

  /**
   * Starts the `DialQueueManager`
   *
   * @param {function} callback
   */
  function start (callback) {
    dialQueueManager.start()
    callback()
  }

  /**
   * Aborts all dials that are queued. This should
   * only be used when the Switch is being stopped
   *
   * @param {function} callback
   */
  function stop (callback) {
    dialQueueManager.stop()
    callback()
  }

  /**
   * Clears the denylist for a given peer
   * @param {PeerInfo} peerInfo
   */
  function clearDenylist (peerInfo) {
    dialQueueManager.clearDenylist(peerInfo)
  }

  /**
   * Attempts to establish a connection to the given `peerInfo` at
   * a lower priority than a standard dial.
   * @param {PeerInfo} peerInfo
   * @param {object} options
   * @param {boolean} options.useFSM Whether or not to return a `ConnectionFSM`. Defaults to false.
   * @param {number} options.priority Lowest priority goes first. Defaults to 20.
   * @param {function(Error, Connection)} callback
   */
  function connect (peerInfo, options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = null
    }
    options = { useFSM: false, priority: PRIORITY_LOW, ...options }
    _dial({ peerInfo, protocol: null, options, callback })
  }

  /**
   * Adds the dial request to the queue for the given `peerInfo`
   * The request will be added with a high priority (10).
   * @param {PeerInfo} peerInfo
   * @param {string} protocol
   * @param {function(Error, Connection)} callback
   */
  function dial (peerInfo, protocol, callback) {
    _dial({ peerInfo, protocol, options: { useFSM: false, priority: PRIORITY_HIGH }, callback })
  }

  /**
   * Behaves like dial, except it calls back with a ConnectionFSM
   *
   * @param {PeerInfo} peerInfo
   * @param {string} protocol
   * @param {function(Error, ConnectionFSM)} callback
   */
  function dialFSM (peerInfo, protocol, callback) {
    _dial({ peerInfo, protocol, options: { useFSM: true, priority: PRIORITY_HIGH }, callback })
  }

  return {
    connect,
    dial,
    dialFSM,
    clearDenylist,
    DENY_ATTEMPTS: isNaN(_switch._options.denyAttempts) ? DENY_ATTEMPTS : _switch._options.denyAttempts,
    DENY_TTL: isNaN(_switch._options.denyTTL) ? DENY_TTL : _switch._options.denyTTL,
    MAX_COLD_CALLS: isNaN(_switch._options.maxColdCalls) ? MAX_COLD_CALLS : _switch._options.maxColdCalls,
    MAX_PARALLEL_DIALS: isNaN(_switch._options.maxParallelDials) ? MAX_PARALLEL_DIALS : _switch._options.maxParallelDials
  }
}
