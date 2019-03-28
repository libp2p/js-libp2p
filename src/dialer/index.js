'use strict'

const DialQueueManager = require('./queueManager')
const getPeerInfo = require('../get-peer-info')
const { MAX_PARALLEL_DIALS, BLACK_LIST_TTL } = require('../constants')

module.exports = function (_switch) {
  const dialQueueManager = new DialQueueManager(_switch)

  _switch.state.on('STOPPING:enter', abort)

  /**
   * @param {DialRequest} dialRequest
   * @returns {void}
   */
  function _dial ({ peerInfo, protocol, useFSM, callback }) {
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
    dialQueueManager.add({ peerInfo, protocol, useFSM, callback })
  }

  /**
   * Aborts all dials that are queued. This should
   * only be used when the Switch is being stopped
   *
   * @param {function} callback
   */
  function abort (callback) {
    dialQueueManager.abort()
    callback()
  }

  /**
   * Clears the blacklist for a given peer
   * @param {PeerInfo} peerInfo
   */
  function clearBlacklist (peerInfo) {
    dialQueueManager.clearBlacklist(peerInfo)
  }

  /**
   * Adds the dial request to the queue for the given `peerInfo`
   * @param {PeerInfo} peerInfo
   * @param {string} protocol
   * @param {function(Error, Connection)} callback
   */
  function dial (peerInfo, protocol, callback) {
    _dial({ peerInfo, protocol, useFSM: false, callback })
  }

  /**
   * Behaves like dial, except it calls back with a ConnectionFSM
   *
   * @param {PeerInfo} peerInfo
   * @param {string} protocol
   * @param {function(Error, ConnectionFSM)} callback
   */
  function dialFSM (peerInfo, protocol, callback) {
    _dial({ peerInfo, protocol, useFSM: true, callback })
  }

  return {
    dial,
    dialFSM,
    abort,
    clearBlacklist,
    BLACK_LIST_TTL: isNaN(_switch._options.blacklistTTL) ? BLACK_LIST_TTL : _switch._options.blacklistTTL,
    MAX_PARALLEL_DIALS: isNaN(_switch._options.maxParallelDials) ? MAX_PARALLEL_DIALS : _switch._options.maxParallelDials
  }
}
