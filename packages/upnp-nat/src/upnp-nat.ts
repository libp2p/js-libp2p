import { upnpNat, type NatAPI } from '@achingbrain/nat-port-mapper'
import { CodeError, ERR_INVALID_PARAMETERS } from '@libp2p/interface'
import { isLoopback } from '@libp2p/utils/multiaddr/is-loopback'
import { isPrivateIp } from '@libp2p/utils/private-ip'
import { fromNodeAddress } from '@multiformats/multiaddr'
import { isBrowser } from 'wherearewe'
import type { UPnPNATComponents, UPnPNATInit } from './index.js'
import type { Logger, Startable } from '@libp2p/interface'

const DEFAULT_TTL = 7200

function highPort (min = 1024, max = 65535): number {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

export class UPnPNAT implements Startable {
  private readonly components: UPnPNATComponents
  private readonly externalAddress?: string
  private readonly localAddress?: string
  private readonly description: string
  private readonly ttl: number
  private readonly keepAlive: boolean
  private readonly gateway?: string
  private started: boolean
  private client?: NatAPI
  private readonly log: Logger

  constructor (components: UPnPNATComponents, init: UPnPNATInit) {
    this.components = components

    this.log = components.logger.forComponent('libp2p:upnp-nat')
    this.started = false
    this.externalAddress = init.externalAddress
    this.localAddress = init.localAddress
    this.description = init.description ?? `${components.nodeInfo.name}@${components.nodeInfo.version} ${this.components.peerId.toString()}`
    this.ttl = init.ttl ?? DEFAULT_TTL
    this.keepAlive = init.keepAlive ?? true
    this.gateway = init.gateway

    if (this.ttl < DEFAULT_TTL) {
      throw new CodeError(`NatManager ttl should be at least ${DEFAULT_TTL} seconds`, ERR_INVALID_PARAMETERS)
    }
  }

  isStarted (): boolean {
    return this.started
  }

  start (): void {
    // #TODO: is there a way to remove this? Seems like a hack
  }

  /**
   * Attempt to use uPnP to configure port mapping using the current gateway.
   *
   * Run after start to ensure the transport manager has all addresses configured.
   */
  afterStart (): void {
    if (isBrowser || this.started) {
      return
    }

    this.started = true

    // done async to not slow down startup
    void this.mapIpAddresses().catch((err) => {
      // hole punching errors are non-fatal
      this.log.error(err)
    })
  }

  async mapIpAddresses (): Promise<void> {
    const addrs = this.components.transportManager.getAddrs()

    for (const addr of addrs) {
      // try to open uPnP ports for each thin waist address
      const { family, host, port, transport } = addr.toOptions()

      if (!addr.isThinWaistAddress() || transport !== 'tcp') {
        // only bare tcp addresses
        // eslint-disable-next-line no-continue
        continue
      }

      if (isLoopback(addr)) {
        // eslint-disable-next-line no-continue
        continue
      }

      if (family !== 4) {
        // ignore ipv6
        // eslint-disable-next-line no-continue
        continue
      }

      const client = this._getClient()
      const publicIp = this.externalAddress ?? await client.externalIp()
      const isPrivate = isPrivateIp(publicIp)

      if (isPrivate === true) {
        throw new CodeError(`${publicIp} is private - please set config.nat.externalIp to an externally routable IP or ensure you are not behind a double NAT`, 'ERR_DOUBLE_NAT')
      }

      if (isPrivate == null) {
        throw new CodeError(`${publicIp} is not an IP address`, ERR_INVALID_PARAMETERS)
      }

      const publicPort = highPort()

      this.log(`opening uPnP connection from ${publicIp}:${publicPort} to ${host}:${port}`)

      await client.map({
        publicPort,
        localPort: port,
        localAddress: this.localAddress,
        protocol: transport.toUpperCase() === 'TCP' ? 'TCP' : 'UDP'
      })

      this.components.addressManager.addObservedAddr(fromNodeAddress({
        family: 4,
        address: publicIp,
        port: publicPort
      }, transport))
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
      this.log.error(err)
    }
  }
}
