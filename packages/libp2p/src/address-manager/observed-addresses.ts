import { isLinkLocal } from '@libp2p/utils/multiaddr/is-link-local'
import { isPrivate } from '@libp2p/utils/multiaddr/is-private'
import { trackedMap } from '@libp2p/utils/tracked-map'
import { multiaddr } from '@multiformats/multiaddr'
import type { AddressManagerComponents, AddressManagerInit } from './index.js'
import type { Logger } from '@libp2p/interface'
import type { NodeAddress } from '@libp2p/interface-internal'
import type { Multiaddr } from '@multiformats/multiaddr'

export const defaultValues = {
  maxObservedAddresses: 10
}

interface ObservedAddressMetadata {
  verified: boolean
  expires: number
  lastVerified?: number
}

export class ObservedAddresses {
  private readonly log: Logger
  private readonly addresses: Map<string, ObservedAddressMetadata>
  private readonly maxObservedAddresses: number

  constructor (components: AddressManagerComponents, init: AddressManagerInit = {}) {
    this.log = components.logger.forComponent('libp2p:address-manager:observed-addresses')
    this.addresses = trackedMap({
      name: 'libp2p_address_manager_observed_addresses',
      metrics: components.metrics
    })
    this.maxObservedAddresses = init.maxObservedAddresses ?? defaultValues.maxObservedAddresses
  }

  has (ma: Multiaddr): boolean {
    return this.addresses.has(ma.toString())
  }

  removePrefixed (prefix: string): void {
    for (const key of this.addresses.keys()) {
      if (key.toString().startsWith(prefix)) {
        this.addresses.delete(key)
      }
    }
  }

  add (ma: Multiaddr): void {
    if (this.addresses.size === this.maxObservedAddresses) {
      return
    }

    if (isPrivate(ma) || isLinkLocal(ma)) {
      return
    }

    this.log('adding observed address %a', ma)
    this.addresses.set(ma.toString(), {
      verified: false,
      expires: 0
    })
  }

  getAll (): NodeAddress[] {
    return Array.from(this.addresses)
      .map(([ma, metadata]) => ({
        multiaddr: multiaddr(ma),
        verified: metadata.verified,
        type: 'observed',
        expires: metadata.expires,
        lastVerified: metadata.lastVerified
      }))
  }

  remove (ma: Multiaddr): boolean {
    const startingConfidence = this.addresses.get(ma.toString())?.verified ?? false

    this.log('removing observed address %a', ma)
    this.addresses.delete(ma.toString())

    return startingConfidence
  }

  confirm (ma: Multiaddr, ttl: number): boolean {
    const addrString = ma.toString()
    const metadata = this.addresses.get(addrString) ?? {
      verified: false,
      expires: Date.now() + ttl,
      lastVerified: Date.now()
    }
    const startingConfidence = metadata.verified
    metadata.verified = true
    metadata.expires = Date.now() + ttl
    metadata.lastVerified = Date.now()

    this.log('marking observed address %a as verified', addrString)
    this.addresses.set(addrString, metadata)

    return startingConfidence
  }
}
