'use strict'

const setImmediate = require('async/setImmediate')

const multicodec = require('./multicodec')
const EE = require('events').EventEmitter
const multiaddr = require('multiaddr')
const mafmt = require('mafmt')
const Stop = require('./circuit/stop')
const Hop = require('./circuit/hop')
const proto = require('./protocol')
const utilsFactory = require('./circuit/utils')

const StreamHandler = require('./circuit/stream-handler')

const debug = require('debug')

const log = debug('libp2p:circuit:listener')
log.err = debug('libp2p:circuit:error:listener')

module.exports = (swarm, options, connHandler) => {
  const listener = new EE()
  const utils = utilsFactory(swarm)

  listener.stopHandler = new Stop(swarm)
  listener.stopHandler.on('connection', (conn) => listener.emit('connection', conn))
  listener.hopHandler = new Hop(swarm, options.hop)

  /**
   * Add swarm handler and listen for incoming connections
   *
   * @param {Multiaddr} ma
   * @param {Function} callback
   * @return {void}
   */
  listener.listen = (ma, callback) => {
    callback = callback || (() => {})

    swarm.handle(multicodec.relay, (_, conn) => {
      const sh = new StreamHandler(conn)

      sh.read((err, msg) => {
        if (err) {
          log.err(err)
          return
        }

        let request = null
        try {
          request = proto.CircuitRelay.decode(msg)
        } catch (err) {
          return utils.writeResponse(
            sh,
            proto.CircuitRelay.Status.MALFORMED_MESSAGE)
        }

        switch (request.type) {
          case proto.CircuitRelay.Type.CAN_HOP:
          case proto.CircuitRelay.Type.HOP: {
            return listener.hopHandler.handle(request, sh)
          }

          case proto.CircuitRelay.Type.STOP: {
            return listener.stopHandler.handle(request, sh, connHandler)
          }

          default: {
            utils.writeResponse(
              sh,
              proto.CircuitRelay.Status.INVALID_MSG_TYPE)
            return sh.close()
          }
        }
      })
    })

    setImmediate(() => listener.emit('listen'))
    callback()
  }

  /**
   * Remove swarm listener
   *
   * @param {Function} cb
   * @return {void}
   */
  listener.close = (cb) => {
    swarm.unhandle(multicodec.relay)
    setImmediate(() => listener.emit('close'))
    cb()
  }

  /**
   * Get fixed up multiaddrs
   *
   * NOTE: This method will grab the peers multiaddrs and expand them such that:
   *
   * a) If it's an existing /p2p-circuit address for a specific relay i.e.
   *    `/ip4/0.0.0.0/tcp/0/ipfs/QmRelay/p2p-circuit` this method will expand the
   *    address to `/ip4/0.0.0.0/tcp/0/ipfs/QmRelay/p2p-circuit/ipfs/QmPeer` where
   *    `QmPeer` is this peers id
   * b) If it's not a /p2p-circuit address, it will encapsulate the address as a /p2p-circuit
   *    addr, such when dialing over a relay with this address, it will create the circuit using
   *    the encapsulated transport address. This is useful when for example, a peer should only
   *    be dialed over TCP rather than any other transport
   *
   * @param {Function} callback
   * @return {void}
   */
  listener.getAddrs = (callback) => {
    let addrs = swarm._peerInfo.multiaddrs.toArray()

    // get all the explicit relay addrs excluding self
    const p2pAddrs = addrs.filter((addr) => {
      return mafmt.Circuit.matches(addr) &&
        !addr.toString().includes(swarm._peerInfo.id.toB58String())
    })

    // use the explicit relays instead of any relay
    if (p2pAddrs.length) {
      addrs = p2pAddrs
    }

    const listenAddrs = []
    addrs.forEach((addr) => {
      const peerMa = `/p2p-circuit/ipfs/${swarm._peerInfo.id.toB58String()}`
      if (addr.toString() === peerMa) {
        listenAddrs.push(multiaddr(peerMa))
        return
      }

      if (!mafmt.Circuit.matches(addr)) {
        if (addr.getPeerId()) {
          // by default we're reachable over any relay
          listenAddrs.push(multiaddr('/p2p-circuit').encapsulate(addr))
        } else {
          const ma = `${addr}/ipfs/${swarm._peerInfo.id.toB58String()}`
          listenAddrs.push(multiaddr('/p2p-circuit').encapsulate(ma))
        }
      } else {
        listenAddrs.push(addr.encapsulate(`/ipfs/${swarm._peerInfo.id.toB58String()}`))
      }
    })

    callback(null, listenAddrs)
  }

  return listener
}
