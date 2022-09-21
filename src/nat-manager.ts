import { upnpNat, NatAPI } from '@achingbrain/nat-port-mapper'
import { logger } from '@libp2p/logger'
import { fromNodeAddress } from '@multiformats/multiaddr'
import { isBrowser } from 'wherearewe'
import isPrivateIp from 'private-ip'
import * as pkg from './version.js'
import errCode from 'err-code'
import { codes } from './errors.js'
import { isLoopback } from '@libp2p/utils/multiaddr/is-loopback'
import type { Startable } from '@libp2p/interfaces/startable'
import type { Components } from '@libp2p/components'

const log = logger('libp2p:nat')
const DEFAULT_TTL = 7200

function highPort (min = 1024, max = 65535) {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

export interface PMPOptions {
  /**
   * Whether to enable PMP as well as UPnP
   */
  enabled?: boolean
}

export interface NatManagerInit {
  /**
   * Whether to enable the NAT manager
   */
  enabled: boolean

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
  keepAlive: boolean

  /**
   * Pass a value to use instead of auto-detection
   */
  gateway?: string
}

export class NatManager implements Startable {
  private readonly components: Components
  private readonly enabled: boolean
  private readonly externalAddress?: string
  private readonly localAddress?: string
  private readonly description: string
  private readonly ttl: number
  private readonly keepAlive: boolean
  private readonly gateway?: string
  private started: boolean
  private client?: NatAPI

  constructor (components: Components, init: NatManagerInit) {
    this.components = components

    this.started = false
    this.enabled = init.enabled
    this.externalAddress = init.externalAddress
    this.localAddress = init.localAddress
    this.description = init.description ?? `${pkg.name}@${pkg.version} ${this.components.getPeerId().toString()}`
    this.ttl = init.ttl ?? DEFAULT_TTL
    this.keepAlive = init.keepAlive ?? true
    this.gateway = init.gateway

    if (this.ttl < DEFAULT_TTL) {
      throw errCode(new Error(`NatManager ttl should be at least ${DEFAULT_TTL} seconds`), codes.ERR_INVALID_PARAMETERS)
    }
  }

  isStarted () {
    return this.started
  }

  start () {}

  /**
   * Attempt to use uPnP to configure port mapping using the current gateway.
   *
   * Run after start to ensure the transport manager has all addresses configured.
   */
  afterStart () {
    if (isBrowser || !this.enabled || this.started) {
      return
    }

    this.started = true

    // done async to not slow down startup
    void this._start().catch((err) => {
      // hole punching errors are non-fatal
      log.error(err)
    })
  }

  async _start () {
    const addrs = this.components.getTransportManager().getAddrs()

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

      const client = await this._getClient()
      const publicIp = this.externalAddress ?? await client.externalIp()

      if (isPrivateIp(publicIp)) {
        throw new Error(`${publicIp} is private - please set config.nat.externalIp to an externally routable IP or ensure you are not behind a double NAT`)
      }

      const publicPort = highPort()

      log(`opening uPnP connection from ${publicIp}:${publicPort} to ${host}:${port}`)

      await client.map({
        publicPort,
        localPort: port,
        localAddress: this.localAddress,
        protocol: transport.toUpperCase() === 'TCP' ? 'TCP' : 'UDP'
      })

      this.components.getAddressManager().addObservedAddr(fromNodeAddress({
        family: 4,
        address: publicIp,
        port: publicPort
      }, transport))
    }
  }

  async _getClient () {
    if (this.client != null) {
      return this.client
    }

    this.client = await upnpNat({
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
  async stop () {
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
