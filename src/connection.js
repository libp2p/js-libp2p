'use strict'

const identify = require('libp2p-identify')
const multistream = require('multistream-select')
const waterfall = require('run-waterfall')
const debug = require('debug')
const log = debug('libp2p:swarm:connection')

const protocolMuxer = require('./protocol-muxer')
const plaintext = require('./plaintext')

module.exports = function connection (swarm) {
  return {
    addUpgrade () {},

    addStreamMuxer (muxer) {
      // for dialing
      swarm.muxers[muxer.multicodec] = muxer

      // for listening
      swarm.handle(muxer.multicodec, (conn) => {
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
                  swarm._peerInfo.multiaddr.addSafe(oa)
                })
                cb(null, peerInfo)
              }
            ], cb)
          }

          conn.getPeerInfo((err, peerInfo) => {
            if (err) {
              return log('Identify not successful')
            }
            swarm.muxedConns[peerInfo.id.toB58String()] = {
              muxer: muxedConn
            }

            swarm.emit('peer-mux-established', peerInfo)
            muxedConn.on('close', () => {
              delete swarm.muxedConns[peerInfo.id.toB58String()]
              swarm.emit('peer-mux-closed', peerInfo)
            })
          })
        }

        return conn
      })
    },

    reuse () {
      swarm.identify = true
      swarm.handle(identify.multicodec, (conn) => {
        identify.listener(conn, swarm._peerInfo)
      })
    },

    crypto (tag, encrypt) {
      if (!tag && !encrypt) {
        tag = plaintext.tag
        encrypt = plaintext.encrypt
      }

      swarm.unhandle(swarm.crypto.tag)
      swarm.handle(tag, (conn) => {
        const id = swarm._peerInfo.id
        const secure = encrypt(id, id.privKey, conn)

        protocolMuxer(swarm.protocols, secure)
      })

      swarm.crypto = {tag, encrypt}
    }
  }
}
