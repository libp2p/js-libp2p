'use strict'

const identify = require('libp2p-identify')
const multistream = require('multistream-select')
const waterfall = require('async/waterfall')
const debug = require('debug')
const log = debug('libp2p:swarm:connection')
const setImmediate = require('async/setImmediate')

const Circuit = require('libp2p-circuit')

const protocolMuxer = require('./protocol-muxer')
const plaintext = require('./plaintext')

module.exports = function connection (swarm) {
  return {
    addUpgrade () {},

    addStreamMuxer (muxer) {
      // for dialing
      swarm.muxers[muxer.multicodec] = muxer

      // for listening
      swarm.handle(muxer.multicodec, (protocol, conn) => {
        const muxedConn = muxer.listener(conn)

        muxedConn.on('stream', (conn) => {
          protocolMuxer(swarm.protocols, conn)
        })

        // If identify is enabled
        //   1. overload getPeerInfo
        //   2. call getPeerInfo
        //   3. add this conn to the pool
        if (swarm.identify) {
          // overload peerInfo to use Identify instead
          conn.getPeerInfo = (cb) => {
            const conn = muxedConn.newStream()
            const ms = new multistream.Dialer()

            waterfall([
              (cb) => ms.handle(conn, cb),
              (cb) => ms.select(identify.multicodec, cb),
              (conn, cb) => identify.dialer(conn, cb),
              (peerInfo, observedAddrs, cb) => {
                observedAddrs.forEach((oa) => {
                  swarm._peerInfo.multiaddrs.addSafe(oa)
                })
                cb(null, peerInfo)
              }
            ], cb)
          }

          conn.getPeerInfo((err, peerInfo) => {
            if (err) {
              return log('Identify not successful')
            }
            const b58Str = peerInfo.id.toB58String()

            swarm.muxedConns[b58Str] = { muxer: muxedConn }

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
            peerInfo = swarm._peerBook.put(peerInfo)

            muxedConn.on('close', () => {
              delete swarm.muxedConns[b58Str]
              peerInfo.disconnect()
              peerInfo = swarm._peerBook.put(peerInfo)
              setImmediate(() => swarm.emit('peer-mux-closed', peerInfo))
            })

            setImmediate(() => swarm.emit('peer-mux-established', peerInfo))
          })
        }

        return conn
      })
    },

    reuse () {
      swarm.identify = true
      swarm.handle(identify.multicodec, (protocol, conn) => {
        identify.listener(conn, swarm._peerInfo)
      })
    },

    enableCircuitRelay (config) {
      config = config || {}

      if (config.enabled) {
        if (!config.hop) {
          Object.assign(config, { hop: { enabled: false, active: false } })
        }

        // TODO: should we enable circuit listener and dialer by default?
        swarm.transport.add(Circuit.tag, new Circuit(swarm, config))
      }
    },

    crypto (tag, encrypt) {
      if (!tag && !encrypt) {
        tag = plaintext.tag
        encrypt = plaintext.encrypt
      }

      swarm.unhandle(swarm.crypto.tag)
      swarm.handle(tag, (protocol, conn) => {
        const myId = swarm._peerInfo.id
        const secure = encrypt(myId, conn, undefined, () => {
          protocolMuxer(swarm.protocols, secure)
        })
      })

      swarm.crypto = {tag, encrypt}
    }
  }
}
