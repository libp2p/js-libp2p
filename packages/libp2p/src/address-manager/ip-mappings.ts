import { isIPv4 } from '@chainsafe/is-ip'
import { trackedMap } from '@libp2p/utils/tracked-map'
import { multiaddr, protocols } from '@multiformats/multiaddr'
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

const CODEC_IP4 = 0x04
const CODEC_IP6 = 0x29
const CODEC_TCP = 0x06
const CODEC_UDP = 0x0111

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
    const tuples = ma.stringTuples()

    for (const mappings of this.mappings.values()) {
      for (const mapping of mappings) {
        if (mapping.externalIp === tuples[0][1]) {
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
    const tuples = ma.stringTuples()
    const host = tuples[0][1] ?? ''
    const protocol = tuples[1][0] === CODEC_TCP ? 'tcp' : 'udp'
    const port = parseInt(tuples[1][1] ?? '0')
    let wasConfident = false

    for (const [key, mappings] of this.mappings.entries()) {
      for (let i = 0; i < mappings.length; i++) {
        const mapping = mappings[i]

        if (mapping.externalIp === host && mapping.externalPort === port && mapping.protocol === protocol) {
          this.log('removing %s:%s to %s:%s %s IP mapping', mapping.externalIp, mapping.externalPort, host, port, protocol)

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
      const tuples = ma.stringTuples()
      let tuple: string | undefined

      // see if the internal host/port/protocol tuple has been mapped externally
      if ((tuples[0][0] === CODEC_IP4 || tuples[0][0] === CODEC_IP6) && tuples[1][0] === CODEC_TCP) {
        tuple = `${tuples[0][1]}-${tuples[1][1]}-tcp`
      } else if ((tuples[0][0] === CODEC_IP4 || tuples[0][0] === CODEC_IP6) && tuples[1][0] === CODEC_UDP) {
        tuple = `${tuples[0][1]}-${tuples[1][1]}-udp`
      }

      if (tuple == null) {
        continue
      }

      const mappings = this.mappings.get(tuple)

      if (mappings == null) {
        continue
      }

      for (const mapping of mappings) {
        tuples[0][0] = mapping.externalFamily === 4 ? CODEC_IP4 : CODEC_IP6
        tuples[0][1] = mapping.externalIp
        tuples[1][1] = `${mapping.externalPort}`

        ipMappedAddresses.push({
          multiaddr: multiaddr(`/${
            tuples.map(tuple => {
              return [
                protocols(tuple[0]).name,
                tuple[1]
              ].join('/')
            }).join('/')
          }`),
          verified: mapping.verified,
          type: 'ip-mapping',
          expires: mapping.expires,
          lastVerified: mapping.lastVerified
        })
      }
    }

    return ipMappedAddresses
  }

  confirm (ma: Multiaddr, ttl: number): boolean {
    const tuples = ma.stringTuples()
    const host = tuples[0][1]
    let startingConfidence = false

    for (const mappings of this.mappings.values()) {
      for (const mapping of mappings) {
        if (mapping.externalIp === host) {
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
    const tuples = ma.stringTuples()
    const host = tuples[0][1] ?? ''
    const protocol = tuples[1][0] === CODEC_TCP ? 'tcp' : 'udp'
    const port = parseInt(tuples[1][1] ?? '0')
    let wasConfident = false

    for (const mappings of this.mappings.values()) {
      for (let i = 0; i < mappings.length; i++) {
        const mapping = mappings[i]

        if (mapping.externalIp === host && mapping.externalPort === port && mapping.protocol === protocol) {
          this.log('removing verification of %s:%s to %s:%s %s IP mapping', mapping.externalIp, mapping.externalPort, host, port, protocol)

          wasConfident = wasConfident || mapping.verified
          mapping.verified = false
          mapping.expires = Date.now() + ttl
        }
      }
    }

    return wasConfident
  }
}
