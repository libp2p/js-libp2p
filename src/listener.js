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

    swarm.handle(multicodec.relay, (relayProto, conn) => {
      const streamHandler = new StreamHandler(conn)

      streamHandler.read((err, msg) => {
        if (err) {
          log.err(err)
          return
        }

        let request = null
        try {
          request = proto.CircuitRelay.decode(msg)
        } catch (err) {
          return utils.writeResponse(streamHandler, proto.CircuitRelay.Status.MALFORMED_MESSAGE)
        }

        switch (request.type) {
          case proto.CircuitRelay.Type.CAN_HOP:
          case proto.CircuitRelay.Type.HOP: {
            return listener.hopHandler.handle(request, streamHandler)
          }

          case proto.CircuitRelay.Type.STOP: {
            return listener.stopHandler.handle(request, streamHandler, connHandler)
          }

          default: {
            return utils.writeResponse(streamHandler, proto.CircuitRelay.Status.INVALID_MSG_TYPE)
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
    swarm.unhandle(multicodec.stop)
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
   *    addr such that dials a relay uses that address to dial this peer
   *
   * @param {Function} callback
   * @return {void}
   */
  listener.getAddrs = (callback) => {
    let addrs = swarm._peerInfo.multiaddrs.toArray()

    // get all the explicit relay addrs excluding self
    let p2pAddrs = addrs.filter((addr) => {
      return mafmt.Circuit.matches(addr) &&
        !addr.toString().includes(swarm._peerInfo.id.toB58String())
    })

    // use the explicit relays instead of any relay
    if (p2pAddrs.length) {
      addrs = p2pAddrs
    }

    let listenAddrs = []
    addrs.forEach((addr) => {
      const peerMa = `/p2p-circuit/ipfs/${swarm._peerInfo.id.toB58String()}`
      if (addr.toString() === peerMa) {
        listenAddrs.push(multiaddr(peerMa))
        return
      }

      if (!mafmt.Circuit.matches(addr)) {
        if (addr.getPeerId()) {
          // by default we're reachable over any relay
          listenAddrs.push(multiaddr(`/p2p-circuit`).encapsulate(addr))
        } else {
          listenAddrs.push(multiaddr(`/p2p-circuit`).encapsulate(`${addr}/ipfs/${swarm._peerInfo.id.toB58String()}`))
        }
      } else {
        listenAddrs.push(addr.encapsulate(`/ipfs/${swarm._peerInfo.id.toB58String()}`))
      }
    })

    callback(null, listenAddrs)
  }

  return listener
}
