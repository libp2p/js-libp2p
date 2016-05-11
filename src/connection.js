'use strict'

const connHandler = require('./default-handler')
const identify = require('./identify')

module.exports = function connection (swarm) {
  return {
    addUpgrade () {},

    addStreamMuxer (muxer) {
      // for dialing
      swarm.muxers[muxer.multicodec] = muxer

      // for listening
      swarm.handle(muxer.multicodec, (conn) => {
        const muxedConn = muxer(conn, true)

        var peerIdForConn

        muxedConn.on('stream', (conn) => {
          function gotId () {
            if (peerIdForConn) {
              conn.peerId = peerIdForConn
              connHandler(swarm.protocols, conn)
            } else {
              setTimeout(gotId, 100)
            }
          }

          if (swarm.identify) {
            return gotId()
          }

          connHandler(swarm.protocols, conn)
        })

        // if identify is enabled, attempt to do it for muxer reuse
        if (swarm.identify) {
          identify.exec(conn, muxedConn, swarm._peerInfo, (err, pi) => {
            if (err) {
              return console.log('Identify exec failed', err)
            }

            peerIdForConn = pi.id
            swarm.muxedConns[pi.id.toB58String()] = {}
            swarm.muxedConns[pi.id.toB58String()].muxer = muxedConn
            swarm.muxedConns[pi.id.toB58String()].conn = conn // to be able to extract addrs

            swarm.emit('peer-mux-established', pi)

            muxedConn.on('close', () => {
              delete swarm.muxedConns[pi.id.toB58String()]
              swarm.emit('peer-mux-closed', pi)
            })
          })
        }
      })
    },

    reuse () {
      swarm.identify = true
      swarm.handle(identify.multicodec, identify.handler(swarm._peerInfo, swarm))
    }
  }
}
