'use strict'

const identify = require('libp2p-identify')
const multistream = require('multistream-select')
const debug = require('debug')
const log = debug('libp2p:swarm:connection')

const protocolMuxer = require('./protocol-muxer')

module.exports = function connection (swarm) {
  return {
    addUpgrade () {},

    addStreamMuxer (muxer) {
      // for dialing
      swarm.muxers[muxer.multicodec] = muxer

      // for listening
      swarm.handle(muxer.multicodec, (conn) => {
        const muxedConn = muxer.listen(conn)

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
            ms.handle(conn, (err) => {
              if (err) { return cb(err) }

              ms.select(identify.multicodec, (err, conn) => {
                if (err) { return cb(err) }

                identify.listen(conn, (err, peerInfo, observedAddrs) => {
                  if (err) { return cb(err) }

                  observedAddrs.forEach((oa) => {
                    swarm._peerInfo.multiaddr.addSafe(oa)
                  })

                  cb(null, peerInfo)
                })
              })
            })
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
        identify.dial(conn, swarm._peerInfo)
      })
    }
  }
}
