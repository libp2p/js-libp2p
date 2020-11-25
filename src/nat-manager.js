'use strict'

const NatAPI = require('@motrix/nat-api')
const debug = require('debug')
const promisify = require('promisify-es6')
const Multiaddr = require('multiaddr')
const log = Object.assign(debug('libp2p:nat'), {
  error: debug('libp2p:nat:err')
})
const { isBrowser } = require('ipfs-utils/src/env')
const retry = require('p-retry')
const isPrivateIp = require('private-ip')
const pkg = require('../package.json')

/**
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('./transport-manager')} TransportManager
 * @typedef {import('./address-manager')} AddressManager
 */

function highPort (min = 1024, max = 65535) {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

class NatManager {
  /**
   * @class
   * @param {object} options
   * @param {PeerId} options.peerId - The peer ID of the current node
   * @param {TransportManager} options.transportManager - A transport manager
   * @param {AddressManager} options.addressManager - An address manager
   * @param {boolean} options.enabled - Whether to enable the NAT manager
   * @param {string} [options.externalIp] - Pass a value to use instead of auto-detection
   * @param {string} [options.description] - A string value to use for the port mapping description on the gateway
   * @param {number} [options.ttl] - How long UPnP port mappings should last for in seconds
   * @param {boolean} [options.keepAlive] - Whether to automatically refresh UPnP port mappings when their TTL is reached
   * @param {string} [options.gateway] - Pass a value to use instead of auto-detection
   * @param {object} [options.pmp] - PMP options
   * @param {boolean} [options.pmp.enabled] - Whether to enable PMP as well as UPnP
   */
  constructor ({ peerId, addressManager, transportManager, ...options }) {
    this._peerId = peerId
    this._addressManager = addressManager
    this._transportManager = transportManager

    this._enabled = options.enabled
    this._externalIp = options.externalIp
    this._options = {
      description: options.description || `${pkg.name}@${pkg.version} ${this._peerId}`,
      ttl: options.ttl || 7200,
      autoUpdate: options.keepAlive || true,
      gateway: options.gateway,
      enablePMP: Boolean(options.pmp && options.pmp.enabled)
    }
  }

  /**
   * Starts the NAT manager
   */
  start () {
    if (isBrowser || !this._enabled) {
      return
    }

    // done async to not slow down startup
    this._start().catch((err) => {
      // hole punching errors are non-fatal
      log.error(err)
    })
  }

  async _start () {
    const addrs = this._transportManager.getAddrs()

    for (const addr of addrs) {
      // try to open uPnP ports for each thin waist address
      const { family, host, port, transport } = addr.toOptions()

      if (!addr.isThinWaistAddress() || transport !== 'tcp') {
        // only bare tcp addresses
        continue
      }

      if (host === '127.0.0.1' || host === '::1') {
        // ignore loopback addresses
        continue
      }

      if (family !== 'ipv4') {
        // ignore ipv6
        continue
      }

      const client = this._getClient()
      const publicIp = this._externalIp || await client.externalIp()

      if (isPrivateIp(publicIp)) {
        throw new Error(`${publicIp} is private - please set config.nat.externalIp to an externally routable IP or ensure you are not behind a double NAT`)
      }

      const publicPort = highPort()

      log(`opening uPnP connection from ${publicIp}:${publicPort} to ${host}:${port}`)

      await client.map({
        publicPort,
        privatePort: port,
        protocol: transport.toUpperCase()
      })

      this._addressManager.addObservedAddr(Multiaddr.fromNodeAddress({
        family: 'IPv4',
        address: publicIp,
        port: `${publicPort}`
      }, transport))
    }
  }

  _getClient () {
    if (this._client) {
      return this._client
    }

    const client = new NatAPI(this._options)
    const map = promisify(client.map, { context: client })
    const destroy = promisify(client.destroy, { context: client })
    const externalIp = promisify(client.externalIp, { context: client })

    this._client = {
      // these are all network operations so add a retry
      map: (...args) => retry(() => map(...args), { onFailedAttempt: log.error }),
      destroy: (...args) => retry(() => destroy(...args), { onFailedAttempt: log.error }),
      externalIp: (...args) => retry(() => externalIp(...args), { onFailedAttempt: log.error })
    }

    return this._client
  }

  /**
   * Stops the NAT manager
   *
   * @async
   */
  async stop () {
    if (isBrowser || !this._client) {
      return
    }

    try {
      await this._client.destroy()
      this._client = null
    } catch (err) {
      log.error(err)
    }
  }
}

module.exports = NatManager
