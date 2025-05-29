import { isNetworkAddress } from '@libp2p/utils/multiaddr/is-network-address'
import { isPrivate } from '@libp2p/utils/multiaddr/is-private'
import { trackedMap } from '@libp2p/utils/tracked-map'
import type { AddressManagerComponents, AddressManagerInit } from './index.js'
import type { Logger } from '@libp2p/interface'
import type { NodeAddress } from '@libp2p/interface-internal'
import type { Multiaddr } from '@multiformats/multiaddr'

export const defaultValues = {
  maxObservedAddresses: 10
}

interface TransportAddressMetadata {
  verified: boolean
  expires: number
  lastVerified?: number
}

export class TransportAddresses {
  private readonly log: Logger
  private readonly addresses: Map<string, TransportAddressMetadata>
  private readonly maxObservedAddresses: number

  constructor (components: AddressManagerComponents, init: AddressManagerInit = {}) {
    this.log = components.logger.forComponent('libp2p:address-manager:observed-addresses')
    this.addresses = trackedMap({
      name: 'libp2p_address_manager_transport_addresses',
      metrics: components.metrics
    })
    this.maxObservedAddresses = init.maxObservedAddresses ?? defaultValues.maxObservedAddresses
  }

  get (multiaddr: Multiaddr, ttl: number): NodeAddress {
    if (isPrivate(multiaddr)) {
      return {
        multiaddr,
        verified: true,
        type: 'transport',
        expires: Date.now() + ttl,
        lastVerified: Date.now()
      }
    }

    const key = this.toKey(multiaddr)
    let metadata = this.addresses.get(key)

    if (metadata == null) {
      metadata = {
        verified: !isNetworkAddress(multiaddr),
        expires: 0
      }

      this.addresses.set(key, metadata)
    }

    return {
      multiaddr,
      verified: metadata.verified,
      type: 'transport',
      expires: metadata.expires,
      lastVerified: metadata.lastVerified
    }
  }

  has (ma: Multiaddr): boolean {
    const key = this.toKey(ma)
    return this.addresses.has(key)
  }

  remove (ma: Multiaddr): boolean {
    const key = this.toKey(ma)
    const startingConfidence = this.addresses.get(key)?.verified ?? false

    this.log('removing observed address %a', ma)
    this.addresses.delete(key)

    return startingConfidence
  }

  confirm (ma: Multiaddr, ttl: number): boolean {
    const key = this.toKey(ma)
    const metadata = this.addresses.get(key) ?? {
      verified: false,
      expires: 0,
      lastVerified: 0
    }

    const startingConfidence = metadata.verified

    metadata.verified = true
    metadata.expires = Date.now() + ttl
    metadata.lastVerified = Date.now()

    this.addresses.set(key, metadata)

    return startingConfidence
  }

  unconfirm (ma: Multiaddr, ttl: number): boolean {
    const key = this.toKey(ma)
    const metadata = this.addresses.get(key) ?? {
      verified: false,
      expires: 0
    }

    const startingConfidence = metadata.verified

    metadata.verified = false
    metadata.expires = Date.now() + ttl

    this.addresses.set(key, metadata)

    return startingConfidence
  }

  private toKey (ma: Multiaddr): string {
    if (isNetworkAddress(ma)) {
      // only works for dns/ip based addresses
      const options = ma.toOptions()

      return `${options.host}-${options.port}-${options.transport}`
    }

    return ma.toString()
  }
}
