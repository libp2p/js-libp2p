'use strict'

require('setimmediate')
require('safe-buffer')

const pull = require('pull-stream')
const debug = require('debug')
const PeerInfo = require('peer-info')
const PeerId = require('peer-id')
const EE = require('events').EventEmitter
const once = require('once')
const utilsFactory = require('./utils')
const StreamHandler = require('./stream-handler')
const assignInWith = require('lodash/assignInWith')
const proto = require('../protocol')
const multiaddr = require('multiaddr')

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
    this.config = assignInWith(
      {
        active: false,
        enabled: false
      },
      options,
      (orig, src) => typeof src === 'undefined' ? false : src)

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
      return this.utils.writeResponse(
        sh,
        proto.CircuitRelay.Status.HOP_CANT_SPEAK_RELAY)
    }

    // check if message is `CAN_HOP`
    if (message.type === proto.CircuitRelay.Type.CAN_HOP) {
      return this.utils.writeResponse(
        sh,
        proto.CircuitRelay.Status.SUCCESS)
    }

    // This is a relay request - validate and create a circuit
    const srcPeerId = PeerId.createFromBytes(message.dstPeer.id)
    if (srcPeerId.toB58String() === this.peerInfo.id.toB58String()) {
      return this.utils.writeResponse(
        sh,
        proto.CircuitRelay.Status.HOP_CANT_RELAY_TO_SELF)
    }

    const dstPeerId = PeerId.createFromBytes(message.dstPeer.id).toB58String()
    if (!message.dstPeer.addrs.length) {
      // TODO: use encapsulate here
      const addr = multiaddr(`/p2p-circuit/ipfs/${dstPeerId}`).buffer
      message.dstPeer.addrs.push(addr)
    }

    this.utils.validateAddrs(
      message,
      sh,
      proto.CircuitRelay.Type.HOP,
      (err) => {
        if (err) {
          return log(err)
        }

        const noPeer = (err) => {
          log.err(err)
          setImmediate(() => this.emit('circuit:error', err))
          return this.utils.writeResponse(
            sh,
            proto.CircuitRelay.Status.HOP_NO_CONN_TO_DST)
        }

        let dstPeer
        try {
          dstPeer = this.swarm._peerBook.get(dstPeerId)
          if (!dstPeer.isConnected() && !this.active) {
            return noPeer(Error('No Connection to peer'))
          }
        } catch (err) {
          if (!this.active) {
            return noPeer(err)
          }
        }

        return this._circuit(
          sh.rest(),
          message,
          (err) => {
            if (err) {
              log.err(err)
              setImmediate(() => this.emit('circuit:error', err))
            }
            setImmediate(() => this.emit('circuit:success'))
          })
      })
  }

  /**
   * Attempt to make a circuit from A <-> R <-> B where R is this relay
   *
   * @param {Connection} conn - the source connection
   * @param {CircuitRelay} message - the message with the src and dst entries
   * @param {Function} cb - callback to signal success or failure
   * @returns {void}
   * @private
   */
  _circuit (conn, message, cb) {
    this._dialPeer(message.dstPeer, (err, dstConn) => {
      const srcSH = new StreamHandler(conn)
      if (err) {
        this.utils.writeResponse(
          srcSH,
          proto.CircuitRelay.Status.HOP_CANT_DIAL_DST)
        srcSH.close()
        log.err(err)
        return cb(err)
      }

      // 1) write the SUCCESS to the src node
      return this.utils.writeResponse(
        srcSH,
        proto.CircuitRelay.Status.SUCCESS,
        (err) => {
          if (err) {
            log.err(err)
            return cb(err)
          }

          const dstSH = new StreamHandler(dstConn)
          const stopMsg = Object.assign({}, message, {
            type: proto.CircuitRelay.Type.STOP // change the message type
          })
          // 2) write circuit request to the STOP node
          dstSH.write(proto.CircuitRelay.encode(stopMsg),
            (err) => {
              if (err) {
                const errSH = new StreamHandler(conn)
                this.utils.writeResponse(
                  errSH,
                  proto.CircuitRelay.Status.HOP_CANT_OPEN_DST_STREAM)

                // close stream
                errSH.close()

                log.err(err)
                return cb(err)
              }

              // read response from STOP
              dstSH.read((err, msg) => {
                if (err) {
                  log.err(err)
                  return cb(err)
                }

                const message = proto.CircuitRelay.decode(msg)
                const srcConn = srcSH.rest()
                if (message.code !== proto.CircuitRelay.Status.SUCCESS) {
                  // close/end the source stream if there was an error
                  pull(
                    pull.empty(),
                    srcConn
                  )

                  return cb(new Error(`Unable to create circuit!`))
                }

                // circuit the src and dst streams
                pull(
                  srcConn,
                  dstSH.rest(),
                  srcConn
                )

                cb()
              })
            })
        })
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
    this.swarm.dial(
      peerInfo,
      multicodec.relay,
      once((err, conn) => {
        if (err) {
          log.err(err)
          return callback(err)
        }

        callback(null, conn)
      }))
  }
}

module.exports = Hop
