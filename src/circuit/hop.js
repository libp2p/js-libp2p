'use strict'

const pull = require('pull-stream')
const debug = require('debug')
const PeerInfo = require('peer-info')
const PeerId = require('peer-id')
const EE = require('events').EventEmitter
const once = require('once')
const utilsFactory = require('./utils')
const StreamHandler = require('./stream-handler')
const proto = require('../protocol').CircuitRelay
const multiaddr = require('multiaddr')
const series = require('async/series')
const waterfall = require('async/waterfall')

const multicodec = require('./../multicodec')

const log = debug('libp2p:swarm:circuit:relay')
log.err = debug('libp2p:swarm:circuit:error:relay')

class Hop extends EE {
  /**
   * Construct a Circuit object
   *
   * This class will handle incoming circuit connections and
   * either start a relay or hand the relayed connection to
   * the swarm
   *
   * @param {Swarm} swarm
   * @param {Object} options
   */
  constructor (swarm, options) {
    super()
    this.swarm = swarm
    this.peerInfo = this.swarm._peerInfo
    this.utils = utilsFactory(swarm)
    this.config = options || { active: false, enabled: false }
    this.active = this.config.active
  }

  /**
   * Handle the relay message
   *
   * @param {CircuitRelay} message
   * @param {StreamHandler} sh
   * @returns {*}
   */
  handle (message, sh) {
    if (!this.config.enabled) {
      this.utils.writeResponse(
        sh,
        proto.Status.HOP_CANT_SPEAK_RELAY)
      return sh.close()
    }

    // check if message is `CAN_HOP`
    if (message.type === proto.Type.CAN_HOP) {
      this.utils.writeResponse(
        sh,
        proto.Status.SUCCESS)
      return sh.close()
    }

    // This is a relay request - validate and create a circuit
    const srcPeerId = PeerId.createFromBytes(message.dstPeer.id)
    if (srcPeerId.toB58String() === this.peerInfo.id.toB58String()) {
      this.utils.writeResponse(
        sh,
        proto.Status.HOP_CANT_RELAY_TO_SELF)
      return sh.close()
    }

    const dstPeerId = PeerId.createFromBytes(message.dstPeer.id).toB58String()
    if (!message.dstPeer.addrs.length) {
      // TODO: use encapsulate here
      const addr = multiaddr(`/p2p-circuit/ipfs/${dstPeerId}`).buffer
      message.dstPeer.addrs.push(addr)
    }

    const noPeer = (err) => {
      log.err(err)
      this.utils.writeResponse(
        sh,
        proto.Status.HOP_NO_CONN_TO_DST)
      return sh.close()
    }

    const isConnected = (cb) => {
      let dstPeer
      try {
        dstPeer = this.swarm._peerBook.get(dstPeerId)
        if (!dstPeer.isConnected() && !this.active) {
          const err = new Error('No Connection to peer')
          noPeer(err)
          return cb(err)
        }
      } catch (err) {
        if (!this.active) {
          noPeer(err)
          return cb(err)
        }
      }
      cb()
    }

    series([
      (cb) => this.utils.validateAddrs(message, sh, proto.Type.HOP, cb),
      (cb) => isConnected(cb),
      (cb) => this._circuit(sh.rest(), message, cb)
    ], (err) => {
      if (err) {
        log.err(err)
        setImmediate(() => this.emit('circuit:error', err))
      }
      setImmediate(() => this.emit('circuit:success'))
    })
  }

  /**
   * Connect to STOP
   *
   * @param {PeerInfo} peer
   * @param {StreamHandler} srcSh
   * @param {function} callback
   * @returns {function}
   */
  _connectToStop (peer, srcSh, callback) {
    this._dialPeer(peer, (err, dstConn) => {
      if (err) {
        this.utils.writeResponse(
          srcSh,
          proto.Status.HOP_CANT_DIAL_DST)
        log.err(err)
        return callback(err)
      }

      return this.utils.writeResponse(
        srcSh,
        proto.Status.SUCCESS,
        (err) => {
          if (err) {
            log.err(err)
            return callback(err)
          }
          return callback(null, dstConn)
        })
    })
  }

  /**
   * Negotiate STOP
   *
   * @param {StreamHandler} dstSh
   * @param {StreamHandler} srcSh
   * @param {CircuitRelay} message
   * @param {function} callback
   * @returns {function}
   */
  _negotiateStop (dstSh, srcSh, message, callback) {
    const stopMsg = Object.assign({}, message, {
      type: proto.Type.STOP // change the message type
    })
    dstSh.write(proto.encode(stopMsg),
      (err) => {
        if (err) {
          this.utils.writeResponse(
            srcSh,
            proto.Status.HOP_CANT_OPEN_DST_STREAM)

          log.err(err)
          return callback(err)
        }

        // read response from STOP
        dstSh.read((err, msg) => {
          if (err) {
            log.err(err)
            return callback(err)
          }

          const message = proto.decode(msg)
          if (message.code !== proto.Status.SUCCESS) {
            return callback(new Error(`Unable to create circuit!`))
          }

          return callback(null, msg)
        })
      })
  }

  /**
   * Attempt to make a circuit from A <-> R <-> B where R is this relay
   *
   * @param {Connection} srcConn - the source connection
   * @param {CircuitRelay} message - the message with the src and dst entries
   * @param {Function} callback - callback to signal success or failure
   * @returns {void}
   * @private
   */
  _circuit (srcConn, message, callback) {
    let dstSh = null
    const srcSh = new StreamHandler(srcConn)
    waterfall([
      (cb) => this._connectToStop(message.dstPeer, srcSh, cb),
      (_dstConn, cb) => {
        dstSh = new StreamHandler(_dstConn)
        this._negotiateStop(dstSh, srcConn, message, cb)
      }
    ], (err) => {
      if (err) {
        // close/end the source stream if there was an error
        if (srcSh) {
          srcSh.close()
        }

        if (dstSh) {
          dstSh.close()
        }
        return callback(err)
      }

      const src = srcSh.rest()
      const dst = dstSh.rest()
      // circuit the src and dst streams
      pull(src, dst, src)
      callback()
    })
  }

  /**
   * Dial the dest peer and create a circuit
   *
   * @param {Multiaddr} dstPeer
   * @param {Function} callback
   * @returns {Function|void}
   * @private
   */
  _dialPeer (dstPeer, callback) {
    const peerInfo = new PeerInfo(PeerId.createFromBytes(dstPeer.id))
    dstPeer.addrs.forEach((a) => peerInfo.multiaddrs.add(a))
    this.swarm.dial(peerInfo, multicodec.relay, once((err, conn) => {
      if (err) {
        log.err(err)
        return callback(err)
      }

      callback(null, conn)
    }))
  }
}

module.exports = Hop
