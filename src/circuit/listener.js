'use strict'

const EventEmitter = require('events')
const multiaddr = require('multiaddr')

const debug = require('debug')
const log = debug('libp2p:circuit:listener')
log.err = debug('libp2p:circuit:error:listener')

/**
 * @param {Libp2p} libp2p
 * @returns {Listener} a transport listener
 */
module.exports = (libp2p) => {
  const listener = new EventEmitter()
  const listeningAddrs = new Map()

  // Remove listeningAddrs when a peer disconnects
  libp2p.connectionManager.on('peer:disconnect', (connection) => {
    listeningAddrs.delete(connection.remotePeer.toB58String())
  })

  /**
   * Add swarm handler and listen for incoming connections
   *
   * @param {Multiaddr} addr
   * @return {void}
   */
  listener.listen = async (addr) => {
    const addrString = String(addr).split('/p2p-circuit').find(a => a !== '')

    const relayConn = await libp2p.dial(multiaddr(addrString))
    const relayedAddr = relayConn.remoteAddr.encapsulate('/p2p-circuit')

    listeningAddrs.set(relayConn.remotePeer.toB58String(), relayedAddr)
    listener.emit('listening')
  }

  /**
   * TODO: Remove the peers from our topology
   *
   * @return {void}
   */
  listener.close = () => {}

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
   * @return {Multiaddr[]}
   */
  listener.getAddrs = () => {
    const addrs = []
    for (const addr of listeningAddrs.values()) {
      addrs.push(addr)
    }
    return addrs
  }

  return listener
}
