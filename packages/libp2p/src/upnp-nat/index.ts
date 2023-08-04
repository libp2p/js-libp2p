import { upnpNat, type NatAPI } from '@achingbrain/nat-port-mapper'
import { CodeError } from '@libp2p/interface/errors'
import { logger } from '@libp2p/logger'
import { isLoopback } from '@libp2p/utils/multiaddr/is-loopback'
import { fromNodeAddress } from '@multiformats/multiaddr'
import isPrivateIp from 'private-ip'
import { isBrowser } from 'wherearewe'
import { codes } from '../errors.js'
import * as pkg from '../version.js'
import type { AddressManager } from '@libp2p/interface-internal/address-manager'
import type { Libp2pEvents } from '@libp2p/interface'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { TransportManager } from '@libp2p/interface-internal/transport-manager'
import type { EventEmitter } from '@libp2p/interface/events'
import type { Startable } from '@libp2p/interface/startable'

const log = logger('libp2p:upnp-nat')
const DEFAULT_TTL = 7200

function highPort (min = 1024, max = 65535): number {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

export interface PMPOptions {
  /**
   * Whether to enable PMP as well as UPnP
   */
  enabled?: boolean
}

export interface UPnPNATInit {
  /**
   * Pass a value to use instead of auto-detection
   */
  externalAddress?: string

  /**
   * Pass a value to use instead of auto-detection
   */
  localAddress?: string

  /**
   * A string value to use for the port mapping description on the gateway
   */
  description?: string

  /**
   * How long UPnP port mappings should last for in seconds (minimum 1200)
   */
  ttl?: number

  /**
   * Whether to automatically refresh UPnP port mappings when their TTL is reached
   */
  keepAlive?: boolean

  /**
   * Pass a value to use instead of auto-detection
   */
  gateway?: string
}

export interface UPnPNATComponents {
  peerId: PeerId
  transportManager: TransportManager
  addressManager: AddressManager
  events: EventEmitter<Libp2pEvents>
}

class UPnPNAT implements Startable {
  private readonly components: UPnPNATComponents
  private readonly externalAddress?: string
  private readonly localAddress?: string
  private readonly description: string
  private readonly ttl: number
  private readonly keepAlive: boolean
  private readonly gateway?: string
  private started: boolean
  private client?: NatAPI

  constructor (components: UPnPNATComponents, init: UPnPNATInit) {
    this.components = components

    this.started = false
    this.externalAddress = init.externalAddress
    this.localAddress = init.localAddress
    this.description = init.description ?? `${pkg.name}@${pkg.version} ${this.components.peerId.toString()}`
    this.ttl = init.ttl ?? DEFAULT_TTL
    this.keepAlive = init.keepAlive ?? true
    this.gateway = init.gateway

    if (this.ttl < DEFAULT_TTL) {
      throw new CodeError(`NatManager ttl should be at least ${DEFAULT_TTL} seconds`, codes.ERR_INVALID_PARAMETERS)
    }

    // try to map external ports when our address list changes
    this.components.events.addEventListener('self:peer:update', () => {
      this.mapAddresses()
        .catch(err => {
          log.error('error mapping external addresses', err)
        })
    })
  }

  isStarted (): boolean {
    return this.started
  }

  start (): void {
    if (isBrowser || this.started) {
      return
    }

    this.started = true
  }

  /**
   * Attempt to use uPnP to configure port mapping using the current gateway.
   *
   * Run after start to ensure the transport manager has all addresses configured.
   */
  async mapAddresses (): Promise<void> {
    const addrs = this.components.transportManager.getAddrs()

    for (const addr of addrs) {
      // try to open uPnP ports for each thin waist address
      const { family, host, port, transport } = addr.toOptions()

      if (!addr.isThinWaistAddress() || transport !== 'tcp') {
        // only bare tcp addresses
        // eslint-disable-next-line no-continue
        log.trace('skipping %a as it is not a think waist address', addr)
        continue
      }

      if (isLoopback(addr)) {
        // eslint-disable-next-line no-continue
        log.trace('skipping %a as it is a loopback address', addr)
        continue
      }

      if (family !== 4) {
        // ignore ipv6
        // eslint-disable-next-line no-continue
        log.trace('skipping %a as it is not an ip4 address', addr)
        continue
      }

      const client = this._getClient()

      if (client.openPorts.map(p => p.localPort).includes(port)) {
        // skip ports we have already mapped
        log.trace('skipping %a as it is already mapped', addr)
        continue
      }

      const publicIp = this.externalAddress ?? await client.externalIp()
      const isPrivate = isPrivateIp(publicIp)

      if (isPrivate === true) {
        throw new Error(`${publicIp} is private - please set config.nat.externalIp to an externally routable IP or ensure you are not behind a double NAT`)
      }

      if (isPrivate == null) {
        throw new Error(`${publicIp} is not an IP address`)
      }

      if (!this.isStarted()) {
        return
      }

      const publicPort = highPort()

      log(`opening uPnP connection from ${publicIp}:${publicPort} to ${host}:${port}`)

      await client.map({
        publicPort,
        localPort: port,
        localAddress: this.localAddress,
        protocol: transport.toUpperCase() === 'TCP' ? 'TCP' : 'UDP'
      })

      const externalAddress = fromNodeAddress({
        family: 4,
        address: publicIp,
        port: publicPort
      }, transport)

      log('mapped external uPnP address %a', externalAddress)

      this.components.addressManager.addObservedAddr(externalAddress)
    }
  }

  _getClient (): NatAPI {
    if (this.client != null) {
      return this.client
    }

    this.client = upnpNat({
      description: this.description,
      ttl: this.ttl,
      keepAlive: this.keepAlive,
      gateway: this.gateway
    })

    return this.client
  }

  /**
   * Stops the NAT manager
   */
  async stop (): Promise<void> {
    if (isBrowser || this.client == null) {
      return
    }

    try {
      await this.client.close()
      this.client = undefined
    } catch (err: any) {
      log.error(err)
    }
  }
}

export function uPnPNATService (init: UPnPNATInit = {}): (components: UPnPNATComponents) => UPnPNAT {
  return (components: UPnPNATComponents) => {
    return new UPnPNAT(components, init)
  }
}
