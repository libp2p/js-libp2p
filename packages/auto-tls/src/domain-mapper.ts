import { isIPv4, isIPv6 } from '@chainsafe/is-ip'
import { multiaddr } from '@multiformats/multiaddr'
import { getPublicIps } from './utils.js'
import type { ComponentLogger, Libp2pEvents, Logger, TypedEventTarget } from '@libp2p/interface'
import type { AddressManager } from '@libp2p/interface-internal'

const MAX_DATE = 8_640_000_000_000_000

export interface DomainMapperComponents {
  logger: ComponentLogger
  events: TypedEventTarget<Libp2pEvents>
  addressManager: AddressManager
}

export interface DomainMapperInit {
  domain: string
  autoConfirmAddress?: boolean
}

export class DomainMapper {
  private readonly log: Logger
  private readonly addressManager: AddressManager
  private readonly events: TypedEventTarget<Libp2pEvents>
  private readonly mappedAddresses: Set<string>
  private readonly domain: string
  private readonly autoConfirmAddress: boolean
  private hasCertificate: boolean

  constructor (components: DomainMapperComponents, init: DomainMapperInit) {
    this.log = components.logger.forComponent('libp2p:auto-tls:domain-mapper')
    this.addressManager = components.addressManager
    this.events = components.events
    this.domain = init.domain
    this.autoConfirmAddress = init.autoConfirmAddress ?? false

    this.mappedAddresses = new Set()
    this.hasCertificate = false

    this.onCertificate = this.onCertificate.bind(this)
    this.onSelfUpdate = this.onSelfUpdate.bind(this)
  }

  start (): void {
    this.events.addEventListener('self:peer:update', this.onSelfUpdate)
    this.events.addEventListener('certificate:provision', this.onCertificate)
    this.events.addEventListener('certificate:renew', this.onCertificate)
  }

  stop (): void {
    this.events.removeEventListener('self:peer:update', this.onSelfUpdate)
    this.events.removeEventListener('certificate:provision', this.onCertificate)
    this.events.removeEventListener('certificate:renew', this.onCertificate)
  }

  onSelfUpdate (): void {
    if (this.hasCertificate) {
      this.updateMappings()
    }
  }

  onCertificate (): void {
    this.hasCertificate = true
    this.updateMappings()
  }

  updateMappings (): void {
    const publicIps = getPublicIps(
      this.addressManager.getAddressesWithMetadata()
        .map(({ multiaddr }) => multiaddr)
    )

    // did our public IPs change?
    const addedIp4 = []
    const addedIp6 = []
    const removedIp4 = []
    const removedIp6 = []

    for (const ip of publicIps) {
      if (this.mappedAddresses.has(ip)) {
        continue
      }

      if (isIPv4(ip)) {
        addedIp4.push(ip)
      }

      if (isIPv6(ip)) {
        addedIp6.push(ip)
      }
    }

    for (const ip of this.mappedAddresses) {
      if (publicIps.has(ip)) {
        continue
      }

      if (isIPv4(ip)) {
        removedIp4.push(ip)
      }

      if (isIPv6(ip)) {
        removedIp6.push(ip)
      }
    }

    removedIp4.forEach(ip => {
      const domain = this.toDomain(ip, 4)
      this.log.trace('removing mapping of IP %s to domain %s', ip, domain)
      this.addressManager.removeDNSMapping(domain)
      this.mappedAddresses.delete(ip)
    })

    removedIp6.forEach(ip => {
      const domain = this.toDomain(ip, 6)
      this.log.trace('removing mapping of IP %s to domain %s', ip, domain)
      this.addressManager.removeDNSMapping(domain)
      this.mappedAddresses.delete(ip)
    })

    addedIp4.forEach(ip => {
      const domain = this.toDomain(ip, 4)
      this.log.trace('mapping IP %s to domain %s', ip, domain)
      this.addressManager.addDNSMapping(domain, [ip])
      this.mappedAddresses.add(ip)

      if (this.autoConfirmAddress) {
        const ma = multiaddr(`/dns4/${domain}`)
        this.log('auto-confirming IP address %a', ma)
        this.addressManager.confirmObservedAddr(ma, {
          ttl: MAX_DATE - Date.now()
        })
      }
    })

    addedIp6.forEach(ip => {
      const domain = this.toDomain(ip, 6)
      this.log.trace('mapping IP %s to domain %s', ip, domain)
      this.addressManager.addDNSMapping(domain, [ip])
      this.mappedAddresses.add(ip)

      if (this.autoConfirmAddress) {
        const ma = multiaddr(`/dns6/${domain}`)
        this.log('auto-confirming IP address %a', ma)
        this.addressManager.confirmObservedAddr(ma, {
          ttl: MAX_DATE - Date.now()
        })
      }
    })
  }

  private toDomain (ip: string, family: 4 | 6): string {
    if (family === 4) {
      // https://github.com/ipshipyard/p2p-forge#ipv4-subdomain-handling
      return `${ip.replaceAll('.', '-')}.${this.domain}`
    }

    // https://github.com/ipshipyard/p2p-forge#ipv6-subdomain-handling
    let ipSubdomain = ip.replaceAll(':', '-')

    if (ipSubdomain.startsWith('-')) {
      ipSubdomain = `0${ipSubdomain}`
    }

    if (ipSubdomain.endsWith('-')) {
      ipSubdomain = `${ipSubdomain}0`
    }

    return `${ipSubdomain}.${this.domain}`
  }
}
