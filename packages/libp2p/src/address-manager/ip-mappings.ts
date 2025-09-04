import { isIPv4 } from '@chainsafe/is-ip'
import { getNetConfig, isNetworkAddress, trackedMap } from '@libp2p/utils'
import { CODE_IP4, CODE_IP6, multiaddr } from '@multiformats/multiaddr'
import type { AddressManagerComponents, AddressManagerInit } from './index.js'
import type { Logger } from '@libp2p/interface'
import type { NodeAddress } from '@libp2p/interface-internal'
import type { Multiaddr } from '@multiformats/multiaddr'

export const defaultValues = {
  maxObservedAddresses: 10
}

interface PublicAddressMapping {
  internalIp: string
  internalPort: number
  externalIp: string
  externalPort: number
  externalFamily: 4 | 6
  protocol: 'tcp' | 'udp'
  verified: boolean
  expires: number
  lastVerified?: number
}

export class IPMappings {
  private readonly log: Logger
  private readonly mappings: Map<string, PublicAddressMapping[]>

  constructor (components: AddressManagerComponents, init: AddressManagerInit = {}) {
    this.log = components.logger.forComponent('libp2p:address-manager:ip-mappings')
    this.mappings = trackedMap({
      name: 'libp2p_address_manager_ip_mappings',
      metrics: components.metrics
    })
  }

  has (ma: Multiaddr): boolean {
    const config = getNetConfig(ma)

    if (config.type !== 'ip4' && config.type !== 'ip6') {
      return false
    }

    for (const mappings of this.mappings.values()) {
      for (const mapping of mappings) {
        if (mapping.externalIp === config.host) {
          return true
        }
      }
    }

    return false
  }

  add (internalIp: string, internalPort: number, externalIp: string, externalPort: number = internalPort, protocol: 'tcp' | 'udp' = 'tcp'): void {
    const key = `${internalIp}-${internalPort}-${protocol}`
    const mappings = this.mappings.get(key) ?? []
    const mapping: PublicAddressMapping = {
      internalIp,
      internalPort,
      externalIp,
      externalPort,
      externalFamily: isIPv4(externalIp) ? 4 : 6,
      protocol,
      verified: false,
      expires: 0
    }
    mappings.push(mapping)

    this.mappings.set(key, mappings)
  }

  remove (ma: Multiaddr): boolean {
    const config = getNetConfig(ma)

    if (config.type !== 'ip4' && config.type !== 'ip6') {
      return false
    }

    let wasConfident = false

    for (const [key, mappings] of this.mappings.entries()) {
      for (let i = 0; i < mappings.length; i++) {
        const mapping = mappings[i]

        if (mapping.externalIp === config.host && mapping.externalPort === config.port && mapping.protocol === config.protocol) {
          this.log('removing %s:%s to %s:%s %s IP mapping', mapping.externalIp, mapping.externalPort, config.host, config.port, config.protocol)

          wasConfident = wasConfident || mapping.verified
          mappings.splice(i, 1)
          i--
        }
      }

      if (mappings.length === 0) {
        this.mappings.delete(key)
      }
    }

    return wasConfident
  }

  getAll (addresses: NodeAddress[]): NodeAddress[] {
    const ipMappedAddresses: NodeAddress[] = []

    for (const { multiaddr: ma } of addresses) {
      if (!isNetworkAddress(ma)) {
        continue
      }

      const config = getNetConfig(ma)

      if (config.type !== 'ip4' && config.type !== 'ip6') {
        continue
      }

      let key: string | undefined

      // see if the internal host/port/protocol tuple has been mapped externally
      if (config.protocol === 'tcp') {
        key = `${config.host}-${config.port}-tcp`
      } else if (config.protocol === 'udp') {
        key = `${config.host}-${config.port}-udp`
      }

      if (key == null) {
        continue
      }

      const mappings = this.mappings.get(key)

      if (mappings == null) {
        continue
      }

      for (const mapping of mappings) {
        ipMappedAddresses.push({
          multiaddr: this.maybeOverrideIp(ma, mapping.externalIp, mapping.externalFamily, mapping.protocol, mapping.externalPort),
          verified: mapping.verified,
          type: 'ip-mapping',
          expires: mapping.expires,
          lastVerified: mapping.lastVerified
        })
      }
    }

    return ipMappedAddresses
  }

  private maybeOverrideIp (ma: Multiaddr, externalIp: string, externalFamily: number, protocol: 'tcp' | 'udp', externalPort: number): Multiaddr {
    const components = ma.getComponents()

    const ipIndex = components.findIndex(c => c.code === CODE_IP4 || c.code === CODE_IP6)
    const portIndex = components.findIndex(c => c.name === protocol)

    if (ipIndex > -1 && portIndex > -1) {
      components[ipIndex].value = externalIp
      components[ipIndex].code = externalFamily === 4 ? CODE_IP4 : CODE_IP6
      components[portIndex].value = `${externalPort}`

      return multiaddr(components)
    }

    return ma
  }

  confirm (ma: Multiaddr, ttl: number): boolean {
    if (!isNetworkAddress(ma)) {
      return false
    }

    const config = getNetConfig(ma)
    let startingConfidence = false

    for (const mappings of this.mappings.values()) {
      for (const mapping of mappings) {
        if (mapping.externalIp === config.host) {
          this.log('marking %s to %s IP mapping as verified', mapping.internalIp, mapping.externalIp)
          startingConfidence = mapping.verified
          mapping.verified = true
          mapping.expires = Date.now() + ttl
          mapping.lastVerified = Date.now()
        }
      }
    }

    return startingConfidence
  }

  unconfirm (ma: Multiaddr, ttl: number): boolean {
    if (!isNetworkAddress(ma)) {
      return false
    }

    const config = getNetConfig(ma)
    let wasConfident = false

    for (const mappings of this.mappings.values()) {
      for (let i = 0; i < mappings.length; i++) {
        const mapping = mappings[i]

        if (mapping.externalIp === config.host && mapping.externalPort === config.port && mapping.protocol === config.protocol) {
          this.log('removing verification of %s:%s to %s:%s %s IP mapping', mapping.externalIp, mapping.externalPort, config.host, config.port, config.protocol)

          wasConfident = wasConfident || mapping.verified
          mapping.verified = false
          mapping.expires = Date.now() + ttl
        }
      }
    }

    return wasConfident
  }
}
