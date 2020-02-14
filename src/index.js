'use strict'

const PeerId = require('peer-id')
const PeerInfo = require('peer-info')
const multiaddr = require('multiaddr')
const mafmt = require('mafmt')
const { EventEmitter } = require('events')
const debug = require('debug')

const log = debug('libp2p:bootstrap')
log.error = debug('libp2p:bootstrap:error')

/**
 * Emits 'peer' events on a regular interval for each peer in the provided list.
 */
class Bootstrap extends EventEmitter {
  /**
   * Constructs a new Bootstrap.
   *
   * @param {Object} options
   * @param {Array<string>} options.list - the list of peer addresses in multi-address format
   * @param {number} [options.interval] - the interval between emitting addresses in milliseconds (default: 10000)
   *
   */
  constructor (options = {}) {
    if (!options.list || !options.list.length) {
      throw new Error('Bootstrap requires a list of peer addresses')
    }
    super()

    this._list = options.list
    this._interval = options.interval || 10000
    this._timer = null
  }

  /**
   * Start emitting events.
   */
  start () {
    if (this._timer) {
      return
    }

    this._timer = setInterval(() => this._discoverBootstrapPeers(), this._interval)

    this._discoverBootstrapPeers()
  }

  /**
   * Emit each address in the list as a PeerInfo.
   */
  _discoverBootstrapPeers () {
    this._list.forEach(async (candidate) => {
      if (!mafmt.P2P.matches(candidate)) {
        return log.error('Invalid multiaddr')
      }

      const ma = multiaddr(candidate)

      const peerId = PeerId.createFromB58String(ma.getPeerId())

      try {
        const peerInfo = await PeerInfo.create(peerId)
        peerInfo.multiaddrs.add(ma)
        this.emit('peer', peerInfo)
      } catch (err) {
        log.error('Invalid bootstrap peer id', err)
      }
    })
  }

  /**
   * Stop emitting events.
   */
  stop () {
    if (this._timer) {
      clearInterval(this._timer)
      this._timer = null
    }
  }
}

exports = module.exports = Bootstrap
exports.tag = 'bootstrap'
