'use strict'

const Connection = require('interface-connection').Connection
const isFunction = require('lodash.isfunction')
const multiaddr = require('multiaddr')
const once = require('once')
const waterfall = require('async/waterfall')
const utilsFactory = require('./utils')
const StreamHandler = require('./stream-handler')
const PeerId = require('peer-id')

const debug = require('debug')
const log = debug('libp2p:circuit:dialer')
log.err = debug('libp2p:circuit:error:dialer')

const multicodec = require('../multicodec')
const proto = require('../protocol')

class Dialer {
  /**
   * Creates an instance of Dialer.
   * @param {Swarm} swarm - the swarm
   * @param {any} options - config options
   *
   * @memberOf Dialer
   */
  constructor (swarm, options) {
    this.swarm = swarm
    this.relayPeers = new Map()
    this.options = options
    this.utils = utilsFactory(swarm)
  }

  /**
   * Dial a peer over a relay
   *
   * @param {multiaddr} ma - the multiaddr of the peer to dial
   * @param {Function} cb - a callback called once dialed
   * @returns {Connection} - the connection
   *
   * @memberOf Dialer
   */
  dial (ma, cb) {
    cb = cb || (() => {})
    const strMa = ma.toString()
    if (!strMa.includes('/p2p-circuit')) {
      log.err('invalid circuit address')
      return cb(new Error('invalid circuit address'))
    }

    const addr = strMa.split('p2p-circuit') // extract relay address if any
    const relay = addr[0] === '/' ? null : multiaddr(addr[0])
    const peer = multiaddr(addr[1] || addr[0])

    const dstConn = new Connection()
    setImmediate(this._dialPeer.bind(this), peer, relay, (err, conn) => {
      if (err) {
        log.err(err)
        return cb(err)
      }

      dstConn.setInnerConn(conn)
      cb(null, dstConn)
    })

    return dstConn
  }

  /**
   * Does the peer support the HOP protocol
   *
   * @param {PeerInfo} peer
   * @param {Function} cb
   * @returns {*}
   */
  canHop (peer, cb) {
    cb = once(cb || (() => {}))

    if (!this.relayPeers.get(this.utils.getB58String(peer))) {
      let streamHandler
      waterfall([
        (wCb) => this._dialRelay(peer, wCb),
        (sh, wCb) => {
          streamHandler = sh
          wCb()
        },
        (wCb) => streamHandler.write(proto.CircuitRelay.encode({
          type: proto.CircuitRelay.Type.CAN_HOP
        }), wCb),
        (wCb) => streamHandler.read(wCb),
        (msg, wCb) => {
          const response = proto.CircuitRelay.decode(msg)

          if (response.code !== proto.CircuitRelay.Status.SUCCESS) {
            return log(`HOP not supported, skipping - ${this.utils.getB58String(peer)}`)
          }

          log(`HOP supported adding as relay - ${this.utils.getB58String(peer)}`)
          this.relayPeers.set(this.utils.getB58String(peer), peer)
          wCb(null)
        }
      ], cb)
    }

    return cb(null)
  }

  /**
   * Dial the destination peer over a relay
   *
   * @param {multiaddr} dstMa
   * @param {Connection|PeerInfo} relay
   * @param {Function} cb
   * @return {Function|void}
   * @private
   */
  _dialPeer (dstMa, relay, cb) {
    if (isFunction(relay)) {
      cb = relay
      relay = null
    }

    if (!cb) {
      cb = () => {}
    }

    dstMa = multiaddr(dstMa)
    // if no relay provided, dial on all available relays until one succeeds
    if (!relay) {
      const relays = Array.from(this.relayPeers.values())
      let next = (nextRelay) => {
        if (!nextRelay) {
          let err = `no relay peers were found or all relays failed to dial`
          log.err(err)
          return cb(err)
        }

        return this._negotiateRelay(nextRelay, dstMa, (err, conn) => {
          if (err) {
            log.err(err)
            return next(relays.shift())
          }
          cb(null, conn)
        })
      }
      next(relays.shift())
    } else {
      return this._negotiateRelay(relay, dstMa, (err, conn) => {
        if (err) {
          log.err(`An error has occurred negotiating the relay connection`, err)
          return cb(err)
        }

        return cb(null, conn)
      })
    }
  }

  /**
   * Negotiate the relay connection
   *
   * @param {Multiaddr|PeerInfo|Connection} relay - the Connection or PeerInfo of the relay
   * @param {multiaddr} dstMa - the multiaddr of the peer to relay the connection for
   * @param {Function} callback - a callback which gets the negotiated relay connection
   * @returns {void}
   * @private
   *
   * @memberOf Dialer
   */
  _negotiateRelay (relay, dstMa, callback) {
    dstMa = multiaddr(dstMa)

    const srcMas = this.swarm._peerInfo.multiaddrs.toArray()
    let streamHandler
    waterfall([
      (cb) => {
        if (relay instanceof Connection) {
          return cb(null, new StreamHandler(relay))
        }
        return this._dialRelay(this.utils.peerInfoFromMa(relay), cb)
      },
      (sh, cb) => {
        streamHandler = sh
        cb(null)
      },
      (cb) => {
        log(`negotiating relay for peer ${dstMa.getPeerId()}`)
        streamHandler.write(
          proto.CircuitRelay.encode({
            type: proto.CircuitRelay.Type.HOP,
            srcPeer: {
              id: this.swarm._peerInfo.id.id,
              addrs: srcMas.map((addr) => addr.buffer)
            },
            dstPeer: {
              id: PeerId.createFromB58String(dstMa.getPeerId()).id,
              addrs: [dstMa.buffer]
            }
          }), cb)
      },
      (cb) => streamHandler.read(cb),
      (msg, cb) => {
        const message = proto.CircuitRelay.decode(msg)
        if (message.type !== proto.CircuitRelay.Type.STATUS) {
          return cb(new Error(`Got invalid message type - ` +
            `expected ${proto.CircuitRelay.Type.STATUS} got ${message.type}`))
        }

        if (message.code !== proto.CircuitRelay.Status.SUCCESS) {
          return cb(new Error(`Got ${message.code} error code trying to dial over relay`))
        }

        cb(null, new Connection(streamHandler.rest()))
      }
    ], callback)
  }

  /**
   * Dial a relay peer by its PeerInfo
   *
   * @param {PeerInfo} peer - the PeerInfo of the relay peer
   * @param {Function} cb - a callback with the connection to the relay peer
   * @returns {Function|void}
   * @private
   */
  _dialRelay (peer, cb) {
    cb = once(cb || (() => {}))

    this.swarm.dial(peer, multicodec.relay, once((err, conn) => {
      if (err) {
        log.err(err)
        return cb(err)
      }
      cb(null, new StreamHandler(conn))
    }))
  }
}

module.exports = Dialer
