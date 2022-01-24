'use strict'

const debug = require('debug')
const mergeOptions = require('merge-options')
// @ts-ignore retimer does not have types
const retimer = require('retimer')
const all = require('it-all')
const { pipe } = require('it-pipe')
const filter = require('it-filter')
const sort = require('it-sort')

const log = Object.assign(debug('libp2p:connection-manager:auto-dialler'), {
  error: debug('libp2p:connection-manager:auto-dialler:err')
})

const defaultOptions = {
  enabled: true,
  minConnections: 0,
  autoDialInterval: 10000
}

/**
 * @typedef {import('../index')} Libp2p
 * @typedef {import('libp2p-interfaces/src/connection').Connection} Connection
 */

/**
 * @typedef {Object} AutoDiallerOptions
 * @property {boolean} [enabled = true] - Should preemptively guarantee connections are above the low watermark
 * @property {number} [minConnections = 0] - The minimum number of connections to avoid pruning
 * @property {number} [autoDialInterval = 10000] - How often, in milliseconds, it should preemptively guarantee connections are above the low watermark
 */

class AutoDialler {
  /**
   * Proactively tries to connect to known peers stored in the PeerStore.
   * It will keep the number of connections below the upper limit and sort
   * the peers to connect based on wether we know their keys and protocols.
   *
   * @class
   * @param {Libp2p} libp2p
   * @param {AutoDiallerOptions} options
   */
  constructor (libp2p, options = {}) {
    this._options = mergeOptions.call({ ignoreUndefined: true }, defaultOptions, options)
    this._libp2p = libp2p
    this._running = false
    this._autoDialTimeout = null
    this._autoDial = this._autoDial.bind(this)

    log('options: %j', this._options)
  }

  /**
   * Starts the auto dialer
   */
  async start () {
    if (!this._options.enabled) {
      log('not enabled')
      return
    }

    this._running = true
    this._autoDial().catch(err => {
      log.error('could start autodial', err)
    })
    log('started')
  }

  /**
   * Stops the auto dialler
   */
  async stop () {
    if (!this._options.enabled) {
      log('not enabled')
      return
    }

    this._running = false
    this._autoDialTimeout && this._autoDialTimeout.clear()
    log('stopped')
  }

  async _autoDial () {
    const minConnections = this._options.minConnections

    // Already has enough connections
    if (this._libp2p.connections.size >= minConnections) {
      this._autoDialTimeout = retimer(this._autoDial, this._options.autoDialInterval)
      return
    }

    // Sort peers on whether we know protocols of public keys for them
    // TODO: assuming the `peerStore.getPeers()` order is stable this will mean
    // we keep trying to connect to the same peers?
    const peers = await pipe(
      this._libp2p.peerStore.getPeers(),
      (source) => filter(source, (peer) => !peer.id.equals(this._libp2p.peerId)),
      (source) => sort(source, (a, b) => {
        if (b.protocols && b.protocols.length && (!a.protocols || !a.protocols.length)) {
          return 1
        } else if (b.id.pubKey && !a.id.pubKey) {
          return 1
        }
        return -1
      }),
      (source) => all(source)
    )

    for (let i = 0; this._running && i < peers.length && this._libp2p.connections.size < minConnections; i++) {
      const peer = peers[i]

      if (!this._libp2p.connectionManager.get(peer.id)) {
        log('connecting to a peerStore stored peer %s', peer.id.toB58String())
        try {
          await this._libp2p.dialer.connectToPeer(peer.id)
        } catch (/** @type {any} */ err) {
          log.error('could not connect to peerStore stored peer', err)
        }
      }
    }

    // Connection Manager was stopped
    if (!this._running) {
      return
    }

    this._autoDialTimeout = retimer(this._autoDial, this._options.autoDialInterval)
  }
}

module.exports = AutoDialler
