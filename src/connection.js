'use strict'

const identify = require('libp2p-identify')
const multistream = require('multistream-select')
const waterfall = require('async/waterfall')
const debug = require('debug')
const log = debug('libp2p:switch:connection')
const once = require('once')
const setImmediate = require('async/setImmediate')

const Circuit = require('libp2p-circuit')

const plaintext = require('./plaintext')

/**
 * Contains methods for binding handlers to the Switch
 * in order to better manage its connections.
 */
class ConnectionManager {
  constructor (_switch) {
    this.switch = _switch
  }

  /**
   * Adds a listener for the given `muxer` and creates a handler for it
   * leveraging the Switch.protocolMuxer handler factory
   *
   * @param {Muxer} muxer
   * @returns {void}
   */
  addStreamMuxer (muxer) {
    // for dialing
    this.switch.muxers[muxer.multicodec] = muxer

    // for listening
    this.switch.handle(muxer.multicodec, (protocol, conn) => {
      const muxedConn = muxer.listener(conn)

      muxedConn.on('stream', this.switch.protocolMuxer(null))

      // If identify is enabled
      //   1. overload getPeerInfo
      //   2. call getPeerInfo
      //   3. add this conn to the pool
      if (this.switch.identify) {
        // Get the peer info from the crypto exchange
        conn.getPeerInfo((err, cryptoPI) => {
          if (err || !cryptoPI) {
            log('crypto peerInfo wasnt found')
          }

          // overload peerInfo to use Identify instead
          conn.getPeerInfo = (callback) => {
            const conn = muxedConn.newStream()
            const ms = new multistream.Dialer()
            callback = once(callback)

            waterfall([
              (cb) => ms.handle(conn, cb),
              (cb) => ms.select(identify.multicodec, cb),
              // run identify and verify the peer has the same info from crypto
              (conn, cb) => identify.dialer(conn, cryptoPI, cb),
              (peerInfo, observedAddrs, cb) => {
                observedAddrs.forEach((oa) => {
                  this.switch._peerInfo.multiaddrs.addSafe(oa)
                })
                cb(null, peerInfo)
              }
            ], (err, peerInfo) => {
              if (err) {
                return muxedConn.end(() => {
                  if (peerInfo) {
                    setImmediate(() => this.switch.emit('peer-mux-closed', peerInfo))
                  }
                  callback(err, null)
                })
              }

              if (peerInfo) {
                conn.setPeerInfo(peerInfo)
              }
              callback(err, peerInfo)
            })
          }

          conn.getPeerInfo((err, peerInfo) => {
            if (err) {
              return log('identify not successful')
            }
            const b58Str = peerInfo.id.toB58String()

            this.switch.muxedConns[b58Str] = { muxer: muxedConn }

            if (peerInfo.multiaddrs.size > 0) {
              // with incomming conn and through identify, going to pick one
              // of the available multiaddrs from the other peer as the one
              // I'm connected to as we really can't be sure at the moment
              // TODO add this consideration to the connection abstraction!
              peerInfo.connect(peerInfo.multiaddrs.toArray()[0])
            } else {
              // for the case of websockets in the browser, where peers have
              // no addr, use just their IPFS id
              peerInfo.connect(`/ipfs/${b58Str}`)
            }
            peerInfo = this.switch._peerBook.put(peerInfo)

            muxedConn.on('close', () => {
              delete this.switch.muxedConns[b58Str]
              peerInfo.disconnect()
              peerInfo = this.switch._peerBook.put(peerInfo)
              log(`closed connection to ${b58Str}`)
              setImmediate(() => this.switch.emit('peer-mux-closed', peerInfo))
            })

            setImmediate(() => this.switch.emit('peer-mux-established', peerInfo))
          })
        })
      }

      return conn
    })
  }

  /**
   * Adds the `encrypt` handler for the given `tag` and also sets the
   * Switch's crypto to past `encrypt` function
   *
   * @param {String} tag
   * @param {function(PeerID, Connection, PeerId, Callback)} encrypt
   * @returns {void}
   */
  crypto (tag, encrypt) {
    if (!tag && !encrypt) {
      tag = plaintext.tag
      encrypt = plaintext.encrypt
    }

    this.switch.unhandle(this.switch.crypto.tag)
    this.switch.handle(tag, (protocol, conn) => {
      const myId = this.switch._peerInfo.id
      const secure = encrypt(myId, conn, undefined, () => {
        this.switch.protocolMuxer(null)(secure)
      })
    })

    this.switch.crypto = {tag, encrypt}
  }

  /**
   * If config.enabled is true, a Circuit relay will be added to the
   * available Switch transports.
   *
   * @param {any} config
   * @returns {void}
   */
  enableCircuitRelay (config) {
    config = config || {}

    if (config.enabled) {
      if (!config.hop) {
        Object.assign(config, { hop: { enabled: false, active: false } })
      }

      this.switch.transport.add(Circuit.tag, new Circuit(this.switch, config))
    }
  }

  /**
   * Sets identify to true on the Switch and performs handshakes
   * for libp2p-identify leveraging the Switch's muxer.
   *
   * @returns {void}
   */
  reuse () {
    this.switch.identify = true
    this.switch.handle(identify.multicodec, (protocol, conn) => {
      identify.listener(conn, this.switch._peerInfo)
    })
  }
}

module.exports = ConnectionManager
