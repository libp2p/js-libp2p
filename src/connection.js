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

module.exports = function connection (swtch) {
  return {
    addUpgrade () {},

    addStreamMuxer (muxer) {
      // for dialing
      swtch.muxers[muxer.multicodec] = muxer

      // for listening
      swtch.handle(muxer.multicodec, (protocol, conn) => {
        const muxedConn = muxer.listener(conn)

        muxedConn.on('stream', swtch.protocolMuxer(null))

        // If identify is enabled
        //   1. overload getPeerInfo
        //   2. call getPeerInfo
        //   3. add this conn to the pool
        if (swtch.identify) {
          // overload peerInfo to use Identify instead
          conn.getPeerInfo = (cb) => {
            const conn = muxedConn.newStream()
            const ms = new multistream.Dialer()
            cb = once(cb)

            waterfall([
              (cb) => ms.handle(conn, cb),
              (cb) => ms.select(identify.multicodec, cb),
              (conn, cb) => identify.dialer(conn, cb),
              (peerInfo, observedAddrs, cb) => {
                observedAddrs.forEach((oa) => {
                  swtch._peerInfo.multiaddrs.addSafe(oa)
                })
                cb(null, peerInfo)
              }
            ], (err, pi) => {
              if (pi) {
                conn.setPeerInfo(pi)
              }
              cb(err, pi)
            })
          }

          conn.getPeerInfo((err, peerInfo) => {
            if (err) {
              return log('Identify not successful')
            }
            const b58Str = peerInfo.id.toB58String()

            swtch.muxedConns[b58Str] = { muxer: muxedConn }

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
            peerInfo = swtch._peerBook.put(peerInfo)

            muxedConn.on('close', () => {
              delete swtch.muxedConns[b58Str]
              peerInfo.disconnect()
              peerInfo = swtch._peerBook.put(peerInfo)
              setImmediate(() => swtch.emit('peer-mux-closed', peerInfo))
            })

            setImmediate(() => swtch.emit('peer-mux-established', peerInfo))
          })
        }

        return conn
      })
    },

    reuse () {
      swtch.identify = true
      swtch.handle(identify.multicodec, (protocol, conn) => {
        identify.listener(conn, swtch._peerInfo)
      })
    },

    enableCircuitRelay (config) {
      config = config || {}

      if (config.enabled) {
        if (!config.hop) {
          Object.assign(config, { hop: { enabled: false, active: false } })
        }

        // TODO: (dryajov) should we enable circuit listener and
        // dialer by default?
        swtch.transport.add(Circuit.tag, new Circuit(swtch, config))
      }
    },

    crypto (tag, encrypt) {
      if (!tag && !encrypt) {
        tag = plaintext.tag
        encrypt = plaintext.encrypt
      }

      swtch.unhandle(swtch.crypto.tag)
      swtch.handle(tag, (protocol, conn) => {
        const myId = swtch._peerInfo.id
        const secure = encrypt(myId, conn, undefined, () => {
          swtch.protocolMuxer(null)(secure)
        })
      })

      swtch.crypto = {tag, encrypt}
    }
  }
}
