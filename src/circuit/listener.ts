import { CustomEvent, EventEmitter } from '@libp2p/interfaces'
import type { ConnectionManager } from '@libp2p/interfaces/registrar'
import type { Dialer } from '@libp2p/interfaces/dialer'
import type { Listener } from '@libp2p/interfaces/transport'
import { Multiaddr } from '@multiformats/multiaddr'

export interface ListenerOptions {
  dialer: Dialer
  connectionManager: ConnectionManager
}

export function createListener (options: ListenerOptions): Listener {
  const listeningAddrs = new Map()

  /**
   * Add swarm handler and listen for incoming connections
   */
  async function listen (addr: Multiaddr): Promise<void> {
    const addrString = addr.toString().split('/p2p-circuit').find(a => a !== '')
    const relayConn = await options.dialer.dial(new Multiaddr(addrString))
    const relayedAddr = relayConn.remoteAddr.encapsulate('/p2p-circuit')

    listeningAddrs.set(relayConn.remotePeer.toString(), relayedAddr)
    listener.dispatchEvent(new CustomEvent('listening'))
  }

  /**
   * Get fixed up multiaddrs
   *
   * NOTE: This method will grab the peers multiaddrs and expand them such that:
   *
   * a) If it's an existing /p2p-circuit address for a specific relay i.e.
   * `/ip4/0.0.0.0/tcp/0/ipfs/QmRelay/p2p-circuit` this method will expand the
   * address to `/ip4/0.0.0.0/tcp/0/ipfs/QmRelay/p2p-circuit/ipfs/QmPeer` where
   * `QmPeer` is this peers id
   * b) If it's not a /p2p-circuit address, it will encapsulate the address as a /p2p-circuit
   * addr, such when dialing over a relay with this address, it will create the circuit using
   * the encapsulated transport address. This is useful when for example, a peer should only
   * be dialed over TCP rather than any other transport
   *
   * @returns {Multiaddr[]}
   */
  function getAddrs () {
    const addrs = []
    for (const addr of listeningAddrs.values()) {
      addrs.push(addr)
    }
    return addrs
  }

  const listener: Listener = Object.assign(new EventEmitter(), {
    close: async () => await Promise.resolve(),
    listen,
    getAddrs
  })

  // Remove listeningAddrs when a peer disconnects
  options.connectionManager.addEventListener('peer:disconnect', (evt) => {
    const { detail: connection } = evt
    const deleted = listeningAddrs.delete(connection.remotePeer.toString())

    if (deleted) {
      // Announce listen addresses change
      listener.dispatchEvent(new CustomEvent('close'))
    }
  })

  return listener
}
