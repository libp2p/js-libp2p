import { peerIdFromString } from '@libp2p/peer-id'
import { debounce } from '@libp2p/utils/debounce'
import { multiaddr, protocols } from '@multiformats/multiaddr'
import type { ComponentLogger, Libp2pEvents, Logger, TypedEventTarget, PeerId, PeerStore } from '@libp2p/interface'
import type { AddressManager as AddressManagerInterface, TransportManager } from '@libp2p/interface-internal'
import type { Multiaddr } from '@multiformats/multiaddr'

export interface AddressManagerInit {
  /**
   * Pass an function in this field to override the list of addresses
   * that are announced to the network
   */
  announceFilter?: AddressFilter

  /**
   * A list of string multiaddrs to listen on
   */
  listen?: string[]

  /**
   * A list of string multiaddrs to use instead of those reported by transports
   */
  announce?: string[]

  /**
   * A list of string multiaddrs string to never announce
   */
  noAnnounce?: string[]

  /**
   * A list of string multiaddrs to add to the list of announced addresses
   */
  appendAnnounce?: string[]
}

export interface AddressManagerComponents {
  peerId: PeerId
  transportManager: TransportManager
  peerStore: PeerStore
  events: TypedEventTarget<Libp2pEvents>
  logger: ComponentLogger
}

/**
 * A function that takes a list of multiaddrs and returns a list
 * to announce
 */
export interface AddressFilter {
  (addrs: Multiaddr[]): Multiaddr[]
}

const defaultAddressFilter = (addrs: Multiaddr[]): Multiaddr[] => addrs

interface ObservedAddressMetadata {
  confident: boolean
}

/**
 * If the passed multiaddr contains the passed peer id, remove it
 */
function stripPeerId (ma: Multiaddr, peerId: PeerId): Multiaddr {
  const observedPeerIdStr = ma.getPeerId()

  // strip our peer id if it has been passed
  if (observedPeerIdStr != null) {
    const observedPeerId = peerIdFromString(observedPeerIdStr)

    // use same encoding for comparison
    if (observedPeerId.equals(peerId)) {
      ma = ma.decapsulate(multiaddr(`/p2p/${peerId.toString()}`))
    }
  }

  return ma
}

const CODEC_IP4 = 0x04
const CODEC_IP6 = 0x29
const CODEC_DNS4 = 0x36
const CODEC_DNS6 = 0x37
const CODEC_TCP = 0x06
const CODEC_UDP = 0x0111

interface PublicAddressMapping {
  externalIp: string
  externalPort: number
}

export class AddressManager implements AddressManagerInterface {
  private readonly log: Logger
  private readonly components: AddressManagerComponents
  // this is an array to allow for duplicates, e.g. multiples of `/ip4/0.0.0.0/tcp/0`
  private readonly listen: string[]
  private readonly announce: Set<string>
  private readonly appendAnnounce: Set<string>
  private readonly observed: Map<string, ObservedAddressMetadata>
  private readonly announceFilter: AddressFilter
  private readonly ipDomainMappings: Map<string, string>
  private readonly publicAddressMappings: Map<string, PublicAddressMapping[]>

  /**
   * Responsible for managing the peer addresses.
   * Peers can specify their listen and announce addresses.
   * The listen addresses will be used by the libp2p transports to listen for new connections,
   * while the announce addresses will be used for the peer addresses' to other peers in the network.
   */
  constructor (components: AddressManagerComponents, init: AddressManagerInit = {}) {
    const { listen = [], announce = [], appendAnnounce = [] } = init

    this.components = components
    this.log = components.logger.forComponent('libp2p:address-manager')
    this.listen = listen.map(ma => ma.toString())
    this.announce = new Set(announce.map(ma => ma.toString()))
    this.appendAnnounce = new Set(appendAnnounce.map(ma => ma.toString()))
    this.observed = new Map()
    this.ipDomainMappings = new Map()
    this.publicAddressMappings = new Map()
    this.announceFilter = init.announceFilter ?? defaultAddressFilter

    // this method gets called repeatedly on startup when transports start listening so
    // debounce it so we don't cause multiple self:peer:update events to be emitted
    this._updatePeerStoreAddresses = debounce(this._updatePeerStoreAddresses.bind(this), 1000)

    // update our stored addresses when new transports listen
    components.events.addEventListener('transport:listening', () => {
      this._updatePeerStoreAddresses()
    })
    // update our stored addresses when existing transports stop listening
    components.events.addEventListener('transport:close', () => {
      this._updatePeerStoreAddresses()
    })
  }

  readonly [Symbol.toStringTag] = '@libp2p/address-manager'

  _updatePeerStoreAddresses (): void {
    // if announce addresses have been configured, ensure they make it into our peer
    // record for things like identify
    const addrs = this.getAddresses()
      .map(ma => {
        // strip our peer id if it is present
        if (ma.getPeerId() === this.components.peerId.toString()) {
          return ma.decapsulate(`/p2p/${this.components.peerId.toString()}`)
        }

        return ma
      })

    this.components.peerStore.patch(this.components.peerId, {
      multiaddrs: addrs
    })
      .catch(err => { this.log.error('error updating addresses', err) })
  }

  /**
   * Get peer listen multiaddrs
   */
  getListenAddrs (): Multiaddr[] {
    return Array.from(this.listen).map((a) => multiaddr(a))
  }

  /**
   * Get peer announcing multiaddrs
   */
  getAnnounceAddrs (): Multiaddr[] {
    return Array.from(this.announce).map((a) => multiaddr(a))
  }

  /**
   * Get peer announcing multiaddrs
   */
  getAppendAnnounceAddrs (): Multiaddr[] {
    return Array.from(this.appendAnnounce).map((a) => multiaddr(a))
  }

  /**
   * Get observed multiaddrs
   */
  getObservedAddrs (): Multiaddr[] {
    return Array.from(this.observed).map(([a]) => multiaddr(a))
  }

  /**
   * Add peer observed addresses
   */
  addObservedAddr (addr: Multiaddr): void {
    addr = stripPeerId(addr, this.components.peerId)
    const addrString = addr.toString()

    // do not trigger the change:addresses event if we already know about this address
    if (this.observed.has(addrString)) {
      return
    }

    this.observed.set(addrString, {
      confident: false
    })
  }

  confirmObservedAddr (addr: Multiaddr): void {
    addr = stripPeerId(addr, this.components.peerId)
    const addrString = addr.toString()

    const metadata = this.observed.get(addrString) ?? {
      confident: false
    }

    const startingConfidence = metadata.confident

    this.observed.set(addrString, {
      confident: true
    })

    // only trigger the 'self:peer:update' event if our confidence in an address has changed
    if (!startingConfidence) {
      this._updatePeerStoreAddresses()
    }
  }

  removeObservedAddr (addr: Multiaddr): void {
    addr = stripPeerId(addr, this.components.peerId)
    const addrString = addr.toString()

    this.observed.delete(addrString)
  }

  getAddresses (): Multiaddr[] {
    let multiaddrs = this.getAnnounceAddrs()

    if (multiaddrs.length === 0) {
      // no configured announce addrs, add configured listen addresses
      multiaddrs = this.components.transportManager.getAddrs()
    }

    multiaddrs = multiaddrs
      .concat(
        // add additional announce addresses
        ...this.getAppendAnnounceAddrs(),

        // add observed addresses we are confident in
        Array.from(this.observed)
          .filter(([ma, metadata]) => metadata.confident)
          .map(([ma]) => multiaddr(ma))
      )

    // add public addresses
    const ipMappedMultiaddrs: Multiaddr[] = []
    multiaddrs.forEach(ma => {
      const tuples = ma.stringTuples()
      let tuple: string | undefined

      // see if the internal host/port/protocol tuple has been mapped externally
      if ((tuples[0][0] === CODEC_IP4 || tuples[0][0] === CODEC_IP6) && tuples[1][0] === CODEC_TCP) {
        tuple = `${tuples[0][1]}-${tuples[1][1]}-tcp`
      } else if ((tuples[0][0] === CODEC_IP4 || tuples[0][0] === CODEC_IP6) && tuples[1][0] === CODEC_UDP) {
        tuple = `${tuples[0][1]}-${tuples[1][1]}-udp`
      }

      if (tuple == null) {
        return
      }

      const mappings = this.publicAddressMappings.get(tuple)

      if (mappings == null) {
        return
      }

      mappings.forEach(mapping => {
        tuples[0][1] = mapping.externalIp
        tuples[1][1] = `${mapping.externalPort}`

        ipMappedMultiaddrs.push(
          multiaddr(`/${
            tuples.map(tuple => {
              return [
                protocols(tuple[0]).name,
                tuple[1]
              ].join('/')
            }).join('/')
          }`)
        )
      })
    })
    multiaddrs = multiaddrs.concat(ipMappedMultiaddrs)

    // add ip->domain mappings
    const dnsMappedMultiaddrs: Multiaddr[] = []
    for (const ma of multiaddrs) {
      const tuples = ma.stringTuples()
      let mappedIp = false

      for (const [ip, domain] of this.ipDomainMappings.entries()) {
        for (let i = 0; i < tuples.length; i++) {
          if (tuples[i][1] !== ip) {
            continue
          }

          if (tuples[i][0] === CODEC_IP4) {
            tuples[i][0] = CODEC_DNS4
            tuples[i][1] = domain
            mappedIp = true
          }

          if (tuples[i][0] === CODEC_IP6) {
            tuples[i][0] = CODEC_DNS6
            tuples[i][1] = domain
            mappedIp = true
          }
        }
      }

      if (mappedIp) {
        dnsMappedMultiaddrs.push(
          multiaddr(`/${
            tuples.map(tuple => {
              return [
                protocols(tuple[0]).name,
                tuple[1]
              ].join('/')
            }).join('/')
          }`)
        )
      }
    }
    multiaddrs = multiaddrs.concat(dnsMappedMultiaddrs)

    // dedupe multiaddrs
    const addrSet = new Set<string>()
    multiaddrs = multiaddrs.filter(ma => {
      const maStr = ma.toString()

      if (addrSet.has(maStr)) {
        return false
      }

      addrSet.add(maStr)

      return true
    })

    // Create advertising list
    return this.announceFilter(
      Array.from(addrSet)
        .map(str => {
          const ma = multiaddr(str)

          // do not append our peer id to a path multiaddr as it will become invalid
          if (ma.protos().pop()?.path === true) {
            return ma
          }

          if (ma.getPeerId() === this.components.peerId.toString()) {
            return ma
          }

          return ma.encapsulate(`/p2p/${this.components.peerId.toString()}`)
        })
    )
  }

  addDNSMapping (domain: string, addresses: string[]): void {
    addresses.forEach(ip => {
      this.log('add DNS mapping %s to %s', ip, domain)
      this.ipDomainMappings.set(ip, domain)
    })
    this._updatePeerStoreAddresses()
  }

  removeDNSMapping (domain: string): void {
    for (const [key, value] of this.ipDomainMappings.entries()) {
      if (value === domain) {
        this.log('remove DNS mapping for %s', domain)
        this.ipDomainMappings.delete(key)
      }
    }
    this._updatePeerStoreAddresses()
  }

  addPublicAddressMapping (internalIp: string, internalPort: number, externalIp: string, externalPort: number = internalPort, protocol: 'tcp' | 'udp' = 'tcp'): void {
    const key = `${internalIp}-${internalPort}-${protocol}`
    const mappings = this.publicAddressMappings.get(key) ?? []
    mappings.push({
      externalIp,
      externalPort
    })

    this.publicAddressMappings.set(key, mappings)
    this._updatePeerStoreAddresses()
  }

  removePublicAddressMapping (internalIp: string, internalPort: number, externalIp: string, externalPort: number = internalPort, protocol: 'tcp' | 'udp' = 'tcp'): void {
    const key = `${internalIp}-${internalPort}-${protocol}`
    const mappings = (this.publicAddressMappings.get(key) ?? []).filter(mapping => {
      return mapping.externalIp !== externalIp && mapping.externalPort !== externalPort
    })

    if (mappings.length === 0) {
      this.publicAddressMappings.delete(key)
    } else {
      this.publicAddressMappings.set(key, mappings)
    }

    this._updatePeerStoreAddresses()
  }
}
