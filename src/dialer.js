'use strict'

const nextTick = require('async/nextTick')
const multiaddr = require('multiaddr')
const errCode = require('err-code')
const { default: PQueue } = require('p-queue')
const AbortController = require('abort-controller')
const debug = require('debug')
const log = debug('libp2p:dialer')
log.error = debug('libp2p:dialer:error')
const PeerId = require('peer-id')

const { codes } = require('./errors')
const {
  MAX_PARALLEL_DIALS,
  DIAL_TIMEOUT
} = require('./constants')

class Dialer {
  /**
   * @constructor
   * @param {object} options
   * @param {TransportManager} options.transportManager
   * @param {Peerstore} peerStore
   * @param {number} options.concurrency Number of max concurrent dials. Defaults to `MAX_PARALLEL_DIALS`
   * @param {number} options.timeout How long a dial attempt is allowed to take. Defaults to `DIAL_TIMEOUT`
   */
  constructor ({
    transportManager,
    peerStore,
    concurrency = MAX_PARALLEL_DIALS,
    timeout = DIAL_TIMEOUT
  }) {
    this.transportManager = transportManager
    this.peerStore = peerStore
    this.concurrency = concurrency
    this.timeout = timeout
    this.queue = new PQueue({ concurrency, timeout, throwOnTimeout: true })

    /**
     * @property {IdentifyService}
     */
    this._identifyService = null
  }

  set identifyService (service) {
    this._identifyService = service
  }

  /**
   * @type {IdentifyService}
   */
  get identifyService () {
    return this._identifyService
  }

  /**
   * Connects to a given `Multiaddr`. `addr` should include the id of the peer being
   * dialed, it will be used for encryption verification.
   *
   * @async
   * @param {Multiaddr} addr The address to dial
   * @param {object} [options]
   * @param {AbortSignal} [options.signal] An AbortController signal
   * @returns {Promise<Connection>}
   */
  async connectToMultiaddr (addr, options = {}) {
    addr = multiaddr(addr)
    let conn
    let controller

    if (!options.signal) {
      controller = new AbortController()
      options.signal = controller.signal
    }

    try {
      conn = await this.queue.add(() => this.transportManager.dial(addr, options))
    } catch (err) {
      if (err.name === 'TimeoutError') {
        controller.abort()
        err.code = codes.ERR_TIMEOUT
      }
      log.error('Error dialing address %s,', addr, err)
      throw err
    }

    // Perform a delayed Identify handshake
    if (this.identifyService) {
      nextTick(async () => {
        try {
          await this.identifyService.identify(conn, conn.remotePeer)
        } catch (err) {
          log.error(err)
        }
      })
    }

    return conn
  }

  /**
   * Connects to a given `PeerInfo` or `PeerId` by dialing all of its known addresses.
   * The dial to the first address that is successfully able to upgrade a connection
   * will be used.
   *
   * @async
   * @param {PeerInfo|PeerId} peer The remote peer to dial
   * @param {object} [options]
   * @param {AbortSignal} [options.signal] An AbortController signal
   * @returns {Promise<Connection>}
   */
  async connectToPeer (peer, options = {}) {
    if (PeerId.isPeerId(peer)) {
      peer = this.peerStore.get(peer.toB58String())
    }

    const addrs = peer.multiaddrs.toArray()
    for (const addr of addrs) {
      try {
        return await this.connectToMultiaddr(addr, options)
      } catch (_) {
        // The error is already logged, just move to the next addr
        continue
      }
    }

    const err = errCode(new Error('Could not dial peer, all addresses failed'), codes.ERR_CONNECTION_FAILED)
    log.error(err)
    throw err
  }
}

module.exports = Dialer
