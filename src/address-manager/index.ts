import type { AddressManagerEvents } from '@libp2p/interfaces/address-manager'
import { CustomEvent, EventEmitter } from '@libp2p/interfaces/events'
import { Multiaddr } from '@multiformats/multiaddr'
import { peerIdFromString } from '@libp2p/peer-id'
import type { Components } from '@libp2p/interfaces/components'

export interface AddressManagerInit {
  announceFilter?: AddressFilter

  /**
   * list of multiaddrs string representation to listen
   */
  listen?: string[]

  /**
   * list of multiaddrs string representation to announce
   */
  announce?: string[]

  /**
   * list of multiaddrs string representation to never announce
   */
  noAnnounce?: string[]
}

export interface AddressFilter {
  (addrs: Multiaddr[]): Multiaddr[]
}

const defaultAddressFilter = (addrs: Multiaddr[]): Multiaddr[] => addrs

export class DefaultAddressManager extends EventEmitter<AddressManagerEvents> {
  private readonly components: Components
  private readonly listen: Set<string>
  private readonly announce: Set<string>
  private readonly observed: Set<string>
  private readonly announceFilter: AddressFilter

  /**
   * Responsible for managing the peer addresses.
   * Peers can specify their listen and announce addresses.
   * The listen addresses will be used by the libp2p transports to listen for new connections,
   * while the announce addresses will be used for the peer addresses' to other peers in the network.
   */
  constructor (components: Components, init: AddressManagerInit) {
    super()

    const { listen = [], announce = [] } = init

    this.components = components
    this.listen = new Set(listen.map(ma => ma.toString()))
    this.announce = new Set(announce.map(ma => ma.toString()))
    this.observed = new Set()
    this.announceFilter = init.announceFilter ?? defaultAddressFilter
  }

  /**
   * Get peer listen multiaddrs
   */
  getListenAddrs (): Multiaddr[] {
    return Array.from(this.listen).map((a) => new Multiaddr(a))
  }

  /**
   * Get peer announcing multiaddrs
   */
  getAnnounceAddrs (): Multiaddr[] {
    return Array.from(this.announce).map((a) => new Multiaddr(a))
  }

  /**
   * Get observed multiaddrs
   */
  getObservedAddrs (): Multiaddr[] {
    return Array.from(this.observed).map((a) => new Multiaddr(a))
  }

  /**
   * Add peer observed addresses
   */
  addObservedAddr (addr: string | Multiaddr): void {
    let ma = new Multiaddr(addr)
    const remotePeer = ma.getPeerId()

    // strip our peer id if it has been passed
    if (remotePeer != null) {
      const remotePeerId = peerIdFromString(remotePeer)

      // use same encoding for comparison
      if (remotePeerId.equals(this.components.getPeerId())) {
        ma = ma.decapsulate(new Multiaddr(`/p2p/${this.components.getPeerId().toString()}`))
      }
    }

    const addrString = ma.toString()

    // do not trigger the change:addresses event if we already know about this address
    if (this.observed.has(addrString)) {
      return
    }

    this.observed.add(addrString)
    this.dispatchEvent(new CustomEvent('change:addresses'))
  }

  getAddresses (): Multiaddr[] {
    let addrs = this.getAnnounceAddrs().map(ma => ma.toString())

    if (addrs.length === 0) {
      // no configured announce addrs, add configured listen addresses
      addrs = this.components.getTransportManager().getAddrs().map(ma => ma.toString())
    }

    addrs = addrs.concat(this.getObservedAddrs().map(ma => ma.toString()))

    // dedupe multiaddrs
    const addrSet = new Set(addrs)

    // Create advertising list
    return this.announceFilter(Array.from(addrSet)
      .map(str => new Multiaddr(str)))
      .map(ma => {
        if (ma.getPeerId() === this.components.getPeerId().toString()) {
          return ma
        }

        return ma.encapsulate(`/p2p/${this.components.getPeerId().toString()}`)
      })
  }
}
