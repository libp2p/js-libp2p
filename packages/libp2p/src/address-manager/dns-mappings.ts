import { isPrivateIp } from '@libp2p/utils/private-ip'
import { trackedMap } from '@libp2p/utils/tracked-map'
import { multiaddr, protocols } from '@multiformats/multiaddr'
import type { AddressManagerComponents, AddressManagerInit } from './index.js'
import type { Logger } from '@libp2p/interface'
import type { NodeAddress } from '@libp2p/interface-internal'
import type { Multiaddr, StringTuple } from '@multiformats/multiaddr'

const MAX_DATE = 8_640_000_000_000_000

export const defaultValues = {
  maxObservedAddresses: 10
}

interface DNSMapping {
  domain: string
  verified: boolean
  expires: number
  lastVerified?: number
}

const CODEC_TLS = 0x01c0
const CODEC_SNI = 0x01c1
const CODEC_DNS = 0x35
const CODEC_DNS4 = 0x36
const CODEC_DNS6 = 0x37
const CODEC_DNSADDR = 0x38

export class DNSMappings {
  private readonly log: Logger
  private readonly mappings: Map<string, DNSMapping>

  constructor (components: AddressManagerComponents, init: AddressManagerInit = {}) {
    this.log = components.logger.forComponent('libp2p:address-manager:dns-mappings')
    this.mappings = trackedMap({
      name: 'libp2p_address_manager_dns_mappings',
      metrics: components.metrics
    })
  }

  has (ma: Multiaddr): boolean {
    const host = this.findHost(ma)

    for (const mapping of this.mappings.values()) {
      if (mapping.domain === host) {
        return true
      }
    }

    return false
  }

  add (domain: string, addresses: string[]): void {
    addresses.forEach(ip => {
      this.log('add DNS mapping %s to %s', ip, domain)
      // we are only confident if this is an local domain mapping, otherwise
      // we will require external validation
      const verified = isPrivateIp(ip) === true

      this.mappings.set(ip, {
        domain,
        verified,
        expires: verified ? MAX_DATE - Date.now() : 0,
        lastVerified: verified ? MAX_DATE - Date.now() : undefined
      })
    })
  }

  remove (ma: Multiaddr): boolean {
    const host = this.findHost(ma)
    let wasConfident = false

    for (const [ip, mapping] of this.mappings.entries()) {
      if (mapping.domain === host) {
        this.log('removing %s to %s DNS mapping %e', ip, mapping.domain)
        this.mappings.delete(ip)
        wasConfident = wasConfident || mapping.verified
      }
    }

    return wasConfident
  }

  getAll (addresses: NodeAddress[]): NodeAddress[] {
    const dnsMappedAddresses: NodeAddress[] = []

    for (let i = 0; i < addresses.length; i++) {
      const address = addresses[i]
      const tuples = address.multiaddr.stringTuples()
      const host = tuples[0][1]

      if (host == null) {
        continue
      }

      for (const [ip, mapping] of this.mappings.entries()) {
        if (host !== ip) {
          continue
        }

        // insert SNI tuple after TLS tuple, if one is present
        const mappedIp = this.maybeAddSNITuple(tuples, mapping.domain)

        if (mappedIp) {
          // remove the address and replace it with the version that includes
          // the SNI tuple
          addresses.splice(i, 1)
          i--

          dnsMappedAddresses.push({
            multiaddr: multiaddr(`/${
              tuples.map(tuple => {
                return [
                  protocols(tuple[0]).name,
                  tuple[1]
                ].join('/')
              }).join('/')
            }`),
            verified: mapping.verified,
            type: 'dns-mapping',
            expires: mapping.expires,
            lastVerified: mapping.lastVerified
          })
        }
      }
    }

    return dnsMappedAddresses
  }

  private maybeAddSNITuple (tuples: StringTuple[], domain: string): boolean {
    for (let j = 0; j < tuples.length; j++) {
      if (tuples[j][0] === CODEC_TLS && tuples[j + 1]?.[0] !== CODEC_SNI) {
        tuples.splice(j + 1, 0, [CODEC_SNI, domain])
        return true
      }
    }

    return false
  }

  confirm (ma: Multiaddr, ttl: number): boolean {
    const host = this.findHost(ma)
    let startingConfidence = false

    for (const [ip, mapping] of this.mappings.entries()) {
      if (mapping.domain === host) {
        this.log('marking %s to %s DNS mapping as verified', ip, mapping.domain)
        startingConfidence = mapping.verified
        mapping.verified = true
        mapping.expires = Date.now() + ttl
        mapping.lastVerified = Date.now()
      }
    }

    return startingConfidence
  }

  unconfirm (ma: Multiaddr, ttl: number): boolean {
    const host = this.findHost(ma)
    let wasConfident = false

    for (const [ip, mapping] of this.mappings.entries()) {
      if (mapping.domain === host) {
        this.log('removing verification of %s to %s DNS mapping', ip, mapping.domain)
        wasConfident = wasConfident || mapping.verified
        mapping.verified = false
        mapping.expires = Date.now() + ttl
      }
    }

    return wasConfident
  }

  private findHost (ma: Multiaddr): string | undefined {
    for (const tuple of ma.stringTuples()) {
      if (tuple[0] === CODEC_SNI) {
        return tuple[1]
      }

      if (tuple[0] === CODEC_DNS || tuple[0] === CODEC_DNS4 || tuple[0] === CODEC_DNS6 || tuple[0] === CODEC_DNSADDR) {
        return tuple[1]
      }
    }
  }
}
