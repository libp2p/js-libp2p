'use strict'

const multistream = require('multistream-select')
const Connection = require('interface-connection').Connection
const setImmediate = require('async/setImmediate')
const getPeerInfo = require('./get-peer-info')
const Circuit = require('libp2p-circuit')

const debug = require('debug')
const log = debug('libp2p:swarm:dial')

const protocolMuxer = require('./protocol-muxer')

function dial (swarm) {
  return (peer, protocol, callback) => {
    if (typeof protocol === 'function') {
      callback = protocol
      protocol = null
    }

    callback = callback || function noop () {}
    const pi = getPeerInfo(peer, swarm._peerBook)

    const proxyConn = new Connection()

    const b58Id = pi.id.toB58String()
    log('dialing %s', b58Id)

    if (!swarm.muxedConns[b58Id]) {
      if (!swarm.conns[b58Id]) {
        attemptDial(pi, (err, conn) => {
          if (err) {
            return callback(err)
          }
          gotWarmedUpConn(conn)
        })
      } else {
        const conn = swarm.conns[b58Id]
        swarm.conns[b58Id] = undefined
        gotWarmedUpConn(conn)
      }
    } else {
      if (!protocol) {
        return callback()
      }
      gotMuxer(swarm.muxedConns[b58Id].muxer)
    }

    return proxyConn

    function gotWarmedUpConn (conn) {
      conn.setPeerInfo(pi)

      attemptMuxerUpgrade(conn, (err, muxer) => {
        if (!protocol) {
          if (err) {
            swarm.conns[b58Id] = conn
          }
          return callback()
        }

        if (err) {
          // couldn't upgrade to Muxer, it is ok
          protocolHandshake(conn, protocol, callback)
        } else {
          gotMuxer(muxer)
        }
      })
    }

    function gotMuxer (muxer) {
      if (swarm.identify) {
        // TODO: Consider:
        // 1. overload getPeerInfo
        // 2. exec identify (through getPeerInfo)
        // 3. update the peerInfo that is already stored in the conn
      }

      openConnInMuxedConn(muxer, (conn) => {
        protocolHandshake(conn, protocol, callback)
      })
    }

    function attemptDial (pi, cb) {
      if (!swarm.hasTransports()) {
        return cb(new Error('No transports registered, dial not possible'))
      }

      const tKeys = swarm.availableTransports(pi)

      let circuitTried = false
      nextTransport(tKeys.shift())

      function nextTransport (key) {
        let transport = key
        if (!transport) {
          if (circuitTried) {
            return cb(new Error(`Circuit already tried!`))
          }

          if (!swarm.transports[Circuit.tag]) {
            return cb(new Error(`Circuit not enabled!`))
          }

          log(`Falling back to dialing over circuit`)
          pi.multiaddrs.add(`/p2p-circuit/ipfs/${pi.id.toB58String()}`)
          circuitTried = true
          transport = Circuit.tag
        }

        log(`dialing transport ${transport}`)
        swarm.transport.dial(transport, pi, (err, conn) => {
          if (err) {
            log(err)
            return nextTransport(tKeys.shift())
          }

          cryptoDial()

          function cryptoDial () {
            const ms = new multistream.Dialer()
            ms.handle(conn, (err) => {
              if (err) {
                return cb(err)
              }

              const myId = swarm._peerInfo.id
              log('selecting crypto: %s', swarm.crypto.tag)
              ms.select(swarm.crypto.tag, (err, conn) => {
                if (err) { return cb(err) }

                const wrapped = swarm.crypto.encrypt(myId, conn, pi.id, (err) => {
                  if (err) {
                    return cb(err)
                  }
                  cb(null, wrapped)
                })
              })
            })
          }
        })
      }
    }

    function attemptMuxerUpgrade (conn, cb) {
      const muxers = Object.keys(swarm.muxers)
      if (muxers.length === 0) {
        return cb(new Error('no muxers available'))
      }

      // 1. try to handshake in one of the muxers available
      // 2. if succeeds
      //  - add the muxedConn to the list of muxedConns
      //  - add incomming new streams to connHandler

      const ms = new multistream.Dialer()
      ms.handle(conn, (err) => {
        if (err) {
          return cb(new Error('multistream not supported'))
        }

        nextMuxer(muxers.shift())
      })

      function nextMuxer (key) {
        log('selecting %s', key)
        ms.select(key, (err, conn) => {
          if (err) {
            if (muxers.length === 0) {
              cb(new Error('could not upgrade to stream muxing'))
            } else {
              nextMuxer(muxers.shift())
            }
            return
          }

          const muxedConn = swarm.muxers[key].dialer(conn)
          swarm.muxedConns[b58Id] = {}
          swarm.muxedConns[b58Id].muxer = muxedConn
          // should not be needed anymore - swarm.muxedConns[b58Id].conn = conn

          muxedConn.once('close', () => {
            const b58Str = pi.id.toB58String()
            delete swarm.muxedConns[b58Str]
            pi.disconnect()
            swarm._peerBook.get(b58Str).disconnect()
            setImmediate(() => swarm.emit('peer-mux-closed', pi))
          })

          // For incoming streams, in case identify is on
          muxedConn.on('stream', (conn) => {
            protocolMuxer(swarm.protocols, conn)
          })

          setImmediate(() => swarm.emit('peer-mux-established', pi))

          cb(null, muxedConn)
        })
      }
    }

    function openConnInMuxedConn (muxer, cb) {
      cb(muxer.newStream())
    }

    function protocolHandshake (conn, protocol, cb) {
      const ms = new multistream.Dialer()
      ms.handle(conn, (err) => {
        if (err) {
          return cb(err)
        }
        ms.select(protocol, (err, conn) => {
          if (err) {
            return cb(err)
          }
          proxyConn.setInnerConn(conn)
          cb(null, proxyConn)
        })
      })
    }
  }
}

module.exports = dial
