'use strict'

const setImmediate = require('async/setImmediate')

const multicodec = require('./multicodec')
const EventEmitter = require('events')
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


module.exports = ({ handler, upgrader, dialer }, options) => {
  const listener = new EventEmitter()
  // const utils = utilsFactory(swarm)

  // listener.stopHandler = new Stop(swarm)
  // listener.stopHandler.on('connection', (conn) => listener.emit('connection', conn))
  // listener.hopHandler = new Hop(swarm, options.hop)

  /**
   * Add swarm handler and listen for incoming connections
   *
   * @param {Multiaddr} addr
   * @param {Function} callback
   * @return {void}
   */
  listener.listen = async (addr) => {
    // TODO: Connect to the relay
    // TODO: Once connected to the relay, update our multiaddrs
    // TODO: Once disconnected from the relay, update our multiaddrs
    // (there should probably be some delay here to avoid spamming identify push updates)
    const connection = await dialer.connectToMultiaddr(addr, {})

    // TODO: When we get a STOP connection (we're the receiver), call the `handler`

    listener.emit('listening')
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
