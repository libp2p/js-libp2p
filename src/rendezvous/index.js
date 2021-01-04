'use strict'

const debug = require('debug')
const log = Object.assign(debug('libp2p:rendezvous'), {
  error: debug('libp2p:rendezvous:err')
})

const errCode = require('err-code')
const { pipe } = require('it-pipe')
const lp = require('it-length-prefixed')
const { collect } = require('streaming-iterables')
const { toBuffer } = require('it-buffer')
const fromString = require('uint8arrays/from-string')
const toString = require('uint8arrays/to-string')

const { codes: errCodes } = require('./errors')
const {
  MAX_DISCOVER_LIMIT,
  PROTOCOL_MULTICODEC
} = require('./constants')
// @ts-ignore TODO: needs release for types
const { Message } = require('libp2p-rendezvous/src/proto')
const MESSAGE_TYPE = Message.MessageType

/**
 * @typedef {import('..')} Libp2p
 * @typedef {import('multiaddr')} Multiaddr
 */

/**
 * @typedef {Object} RendezvousProperties
 * @property {Libp2p} libp2p
 *
 * @typedef {Object} RendezvousOptions
 * @property {Multiaddr[]} rendezvousPoints
 */

class Rendezvous {
  /**
   * Libp2p Rendezvous. A lightweight mechanism for generalized peer discovery.
   *
   * @class
   * @param {RendezvousProperties & RendezvousOptions} params
   */
  constructor ({ libp2p, rendezvousPoints }) {
    this._libp2p = libp2p
    this._peerId = libp2p.peerId
    this._peerStore = libp2p.peerStore
    this._connectionManager = libp2p.connectionManager
    this._rendezvousPoints = rendezvousPoints

    this._isStarted = false

    /**
     * Map namespaces to a map of rendezvous point identifier to cookie.
     *
     * @type {Map<string, Map<string, string>>}
     */
    this._cookies = new Map()
  }

  /**
   * Start the rendezvous client in the libp2p node.
   *
   * @returns {void}
   */
  start () {
    if (this._isStarted) {
      return
    }

    this._isStarted = true
    log('started')
  }

  /**
   * Clear the rendezvous state and unregister from namespaces.
   *
   * @returns {void}
   */
  stop () {
    if (!this._isStarted) {
      return
    }

    this._isStarted = false
    this._cookies.clear()
    log('stopped')
  }

  /**
   * Register the peer in a given namespace
   *
   * @param {string} ns
   * @param {object} [options]
   * @param {number} [options.ttl = 7.2e6] - registration ttl in ms
   * @returns {Promise<number>} rendezvous register ttl.
   */
  async register (ns, { ttl = 7.2e6 } = {}) {
    if (!ns) {
      throw errCode(new Error('a namespace must be provided'), errCodes.INVALID_NAMESPACE)
    }

    // Are there available rendezvous servers?
    if (!this._rendezvousPoints || !this._rendezvousPoints.length) {
      throw errCode(new Error('no rendezvous servers connected'), errCodes.NO_CONNECTED_RENDEZVOUS_SERVERS)
    }

    const message = Message.encode({
      type: MESSAGE_TYPE.REGISTER,
      register: {
        signedPeerRecord: this._libp2p.peerStore.addressBook.getRawEnvelope(this._peerId),
        ns,
        ttl: ttl * 1e-3 // Convert to seconds
      }
    })

    const registerTasks = []

    /**
     * @param {Multiaddr} m
     * @returns {Promise<number>}
     */
    const taskFn = async (m) => {
      const connection = await this._libp2p.dial(m)
      const { stream } = await connection.newStream(PROTOCOL_MULTICODEC)

      const [response] = await pipe(
        [message],
        lp.encode(),
        stream,
        lp.decode(),
        toBuffer,
        collect
      )

      // Close connection if not any other open streams
      if (!connection.streams.length) {
        await connection.close()
      }

      const recMessage = Message.decode(response)

      if (!recMessage.type === MESSAGE_TYPE.REGISTER_RESPONSE) {
        throw new Error('unexpected message received')
      }

      if (recMessage.registerResponse.status !== Message.ResponseStatus.OK) {
        throw errCode(new Error(recMessage.registerResponse.statusText), recMessage.registerResponse.status)
      }

      return recMessage.registerResponse.ttl * 1e3 // convert to ms
    }

    for (const m of this._rendezvousPoints) {
      registerTasks.push(taskFn(m))
    }

    // Return first ttl
    // TODO: consider pAny instead of Promise.all?
    const [returnTtl] = await Promise.all(registerTasks)

    return returnTtl
  }

  /**
   * Unregister peer from the nampesapce.
   *
   * @param {string} ns
   * @returns {Promise<void>}
   */
  async unregister (ns) {
    if (!ns) {
      throw errCode(new Error('a namespace must be provided'), errCodes.INVALID_NAMESPACE)
    }

    // Are there available rendezvous servers?
    if (!this._rendezvousPoints || !this._rendezvousPoints.length) {
      throw errCode(new Error('no rendezvous servers connected'), errCodes.NO_CONNECTED_RENDEZVOUS_SERVERS)
    }

    const message = Message.encode({
      type: MESSAGE_TYPE.UNREGISTER,
      unregister: {
        id: this._peerId.toBytes(),
        ns
      }
    })

    const unregisterTasks = []
    /**
     * @param {Multiaddr} m
     * @returns {Promise<void>}
     */
    const taskFn = async (m) => {
      const connection = await this._libp2p.dial(m)
      const { stream } = await connection.newStream(PROTOCOL_MULTICODEC)

      await pipe(
        [message],
        lp.encode(),
        stream,
        async (source) => {
          for await (const _ of source) { } // eslint-disable-line
        }
      )

      // Close connection if not any other open streams
      if (!connection.streams.length) {
        await connection.close()
      }
    }

    for (const m of this._rendezvousPoints) {
      unregisterTasks.push(taskFn(m))
    }

    await Promise.all(unregisterTasks)
  }

  /**
   * Discover peers registered under a given namespace
   *
   * @param {string} ns
   * @param {number} [limit = MAX_DISCOVER_LIMIT]
   * @returns {AsyncIterable<{ signedPeerRecord: Uint8Array, ns: string, ttl: number }>}
   */
  async * discover (ns, limit = MAX_DISCOVER_LIMIT) {
    // TODO: consider opening the envelope in the dicover
    // This would store the addresses in the AddressBook

    // Are there available rendezvous servers?
    if (!this._rendezvousPoints || !this._rendezvousPoints.length) {
      throw errCode(new Error('no rendezvous servers connected'), errCodes.NO_CONNECTED_RENDEZVOUS_SERVERS)
    }

    const registrationTransformer = (r) => ({
      signedPeerRecord: r.signedPeerRecord,
      ns: r.ns,
      ttl: r.ttl * 1e3 // convert to ms
    })

    // Iterate over all rendezvous points
    for (const m of this._rendezvousPoints) {
      const namespaseCookies = this._cookies.get(ns) || new Map()

      // Check if we have a cookie and encode discover message
      const cookie = namespaseCookies.get(m.toString())
      const message = Message.encode({
        type: MESSAGE_TYPE.DISCOVER,
        discover: {
          ns,
          limit,
          cookie: cookie ? fromString(cookie) : undefined
        }
      })

      // Send discover message and wait for response
      const connection = await this._libp2p.dial(m)
      const { stream } = await connection.newStream(PROTOCOL_MULTICODEC)
      const [response] = await pipe(
        [message],
        lp.encode(),
        stream,
        lp.decode(),
        toBuffer,
        collect
      )

      if (!connection.streams.length) {
        await connection.close()
      }

      const recMessage = Message.decode(response)

      if (!recMessage.type === MESSAGE_TYPE.DISCOVER_RESPONSE) {
        throw new Error('unexpected message received')
      } else if (recMessage.discoverResponse.status !== Message.ResponseStatus.OK) {
        throw errCode(new Error(recMessage.discoverResponse.statusText), recMessage.discoverResponse.status)
      }

      // Iterate over registrations response
      for (const r of recMessage.discoverResponse.registrations) {
        // track registrations
        yield registrationTransformer(r)

        limit--
        if (limit === 0) {
          break
        }
      }

      // Store cookie
      const c = recMessage.discoverResponse.cookie
      if (c && c.length) {
        const nsCookies = this._cookies.get(ns) || new Map()
        nsCookies.set(m.toString(), toString(c))
        this._cookies.set(ns, nsCookies)
      }
    }
  }
}

module.exports = Rendezvous
