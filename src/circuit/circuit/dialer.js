'use strict'

const once = require('once')
const PeerId = require('peer-id')
const waterfall = require('async/waterfall')
const setImmediate = require('async/setImmediate')
const multiaddr = require('multiaddr')

const Connection = require('interface-connection').Connection

const utilsFactory = require('./utils')
const StreamHandler = require('./stream-handler')

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
    this.relayConns = new Map()
    this.options = options
    this.utils = utilsFactory(swarm)
  }

  /**
   * Helper that returns a relay connection
   *
   * @param {*} relay
   * @param {*} callback
   * @returns {Function} - callback
   */
  _dialRelayHelper (relay, callback) {
    if (this.relayConns.has(relay.id.toB58String())) {
      return callback(null, this.relayConns.get(relay.id.toB58String()))
    }

    return this._dialRelay(relay, callback)
  }

  /**
   * Dial a peer over a relay
   *
   * @param {multiaddr} ma - the multiaddr of the peer to dial
   * @param {Function} cb - a callback called once dialed
   * @returns {Connection} - the connection
   *
   */
  dial (ma, cb) {
    cb = cb || (() => { })
    const strMa = ma.toString()
    if (!strMa.includes('/p2p-circuit')) {
      log.err('invalid circuit address')
      return cb(new Error('invalid circuit address'))
    }

    const addr = strMa.split('p2p-circuit') // extract relay address if any
    const relay = addr[0] === '/' ? null : multiaddr(addr[0])
    const peer = multiaddr(addr[1] || addr[0])

    const dstConn = new Connection()
    setImmediate(
      this._dialPeer.bind(this),
      peer,
      relay,
      (err, conn) => {
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
   * @param {Function} callback
   * @returns {void}
   */
  canHop (peer, callback) {
    callback = once(callback || (() => { }))

    this._dialRelayHelper(peer, (err, conn) => {
      if (err) {
        return callback(err)
      }

      const sh = new StreamHandler(conn)
      waterfall([
        (cb) => sh.write(proto.CircuitRelay.encode({
          type: proto.CircuitRelay.Type.CAN_HOP
        }), cb),
        (cb) => sh.read(cb)
      ], (err, msg) => {
        if (err) {
          return callback(err)
        }
        const response = proto.CircuitRelay.decode(msg)

        if (response.code !== proto.CircuitRelay.Status.SUCCESS) {
          const err = new Error(`HOP not supported, skipping - ${this.utils.getB58String(peer)}`)
          log(err)
          return callback(err)
        }

        log('HOP supported adding as relay - %s', this.utils.getB58String(peer))
        this.relayPeers.set(this.utils.getB58String(peer), peer)
        sh.close()
        callback()
      })
    })
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
    if (typeof relay === 'function') {
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
      const next = (nextRelay) => {
        if (!nextRelay) {
          const err = 'no relay peers were found or all relays failed to dial'
          log.err(err)
          return cb(err)
        }

        return this._negotiateRelay(
          nextRelay,
          dstMa,
          (err, conn) => {
            if (err) {
              log.err(err)
              return next(relays.shift())
            }
            cb(null, conn)
          })
      }
      next(relays.shift())
    } else {
      return this._negotiateRelay(
        relay,
        dstMa,
        (err, conn) => {
          if (err) {
            log.err('An error has occurred negotiating the relay connection', err)
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
    relay = this.utils.peerInfoFromMa(relay)
    const srcMas = this.swarm._peerInfo.multiaddrs.toArray()
    this._dialRelayHelper(relay, (err, conn) => {
      if (err) {
        log.err(err)
        return callback(err)
      }
      const sh = new StreamHandler(conn)
      waterfall([
        (cb) => {
          log('negotiating relay for peer %s', dstMa.getPeerId())
          let dstPeerId
          try {
            dstPeerId = PeerId.createFromB58String(dstMa.getPeerId()).id
          } catch (err) {
            return cb(err)
          }
          sh.write(
            proto.CircuitRelay.encode({
              type: proto.CircuitRelay.Type.HOP,
              srcPeer: {
                id: this.swarm._peerInfo.id.id,
                addrs: srcMas.map((addr) => addr.buffer)
              },
              dstPeer: {
                id: dstPeerId,
                addrs: [dstMa.buffer]
              }
            }), cb)
        },
        (cb) => sh.read(cb)
      ], (err, msg) => {
        if (err) {
          return callback(err)
        }
        const message = proto.CircuitRelay.decode(msg)
        if (message.type !== proto.CircuitRelay.Type.STATUS) {
          return callback(new Error('Got invalid message type - ' +
            `expected ${proto.CircuitRelay.Type.STATUS} got ${message.type}`))
        }

        if (message.code !== proto.CircuitRelay.Status.SUCCESS) {
          return callback(new Error(`Got ${message.code} error code trying to dial over relay`))
        }

        callback(null, new Connection(sh.rest()))
      })
    })
  }

  /**
   * Dial a relay peer by its PeerInfo
   *
   * @param {PeerInfo} peer - the PeerInfo of the relay peer
   * @param {Function} cb - a callback with the connection to the relay peer
   * @returns {void}
   * @private
   */
  _dialRelay (peer, cb) {
    cb = once(cb || (() => { }))

    this.swarm.dial(
      peer,
      multicodec.relay,
      once((err, conn) => {
        if (err) {
          log.err(err)
          return cb(err)
        }
        cb(null, conn)
      }))
  }
}

module.exports = Dialer
