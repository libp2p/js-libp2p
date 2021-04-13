'use strict'

const PeerId = require('peer-id')
const { Multiaddr } = require('multiaddr')
const mafmt = require('mafmt')
const { EventEmitter } = require('events')
const debug = require('debug')

const log = Object.assign(debug('libp2p:bootstrap'), {
  error: debug('libp2p:bootstrap:error')
})

/**
 * Emits 'peer' events on a regular interval for each peer in the provided list.
 */
class Bootstrap extends EventEmitter {
  /**
   * Constructs a new Bootstrap.
   *
   * @param {Object} options
   * @param {Array<string>} options.list - the list of peer addresses in multi-address format
   * @param {number} [options.interval = 10000] - the interval between emitting addresses in milliseconds
   *
   */
  constructor (options = { list: [] }) {
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
    log('Starting bootstrap node discovery')
    this._discoverBootstrapPeers()
  }

  /**
   * Emit each address in the list as a PeerInfo.
   */
  _discoverBootstrapPeers () {
    if (!this._timer) {
      return
    }

    this._list.forEach((candidate) => {
      if (!mafmt.P2P.matches(candidate)) {
        return log.error('Invalid multiaddr')
      }

      const ma = new Multiaddr(candidate)
      const peerIdStr = ma.getPeerId()

      if (!peerIdStr) {
        log.error('Invalid bootstrap multiaddr without peer id')
        return
      }

      const peerId = PeerId.createFromB58String(peerIdStr)

      try {
        this.emit('peer', {
          id: peerId,
          multiaddrs: [ma]
        })
      } catch (err) {
        log.error('Invalid bootstrap peer id', err)
      }
    })
  }

  /**
   * Stop emitting events.
   */
  stop () {
    if (this._timer) clearInterval(this._timer)
    this._timer = null
  }
}

exports = module.exports = Bootstrap
exports.tag = 'bootstrap'
