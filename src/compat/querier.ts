import { CustomEvent, EventEmitter } from '@libp2p/interfaces/events'
import MDNS from 'multicast-dns'
import { logger } from '@libp2p/logger'
import { SERVICE_TAG_LOCAL, MULTICAST_IP, MULTICAST_PORT } from './constants.js'
import type { PeerDiscovery, PeerDiscoveryEvents } from '@libp2p/interface-peer-discovery'
import type { ResponsePacket } from 'multicast-dns'
import type { RemoteInfo } from 'dgram'
import { findPeerInfoInAnswers } from './utils.js'
import { symbol } from '@libp2p/interface-peer-discovery'
import type { Startable } from '@libp2p/interfaces/dist/src/startable.js'
import type { PeerId } from '@libp2p/interface-peer-id'

const log = logger('libp2p:mdns:compat:querier')

export interface QuerierInit {
  queryInterval?: number
  queryPeriod?: number
}

export interface QuerierComponents {
  peerId: PeerId
}

export interface Handle {
  stop: () => Promise<void>
}

export class Querier extends EventEmitter<PeerDiscoveryEvents> implements PeerDiscovery, Startable {
  private readonly _init: Required<QuerierInit>
  private _handle?: Handle
  private readonly components: QuerierComponents

  constructor (components: QuerierComponents, init: QuerierInit = {}) {
    super()

    const { queryInterval, queryPeriod } = init

    this.components = components
    this._init = {
      // Re-query in leu of network change detection (every 60s by default)
      queryInterval: queryInterval ?? 60000,
      // Time for which the MDNS server will stay alive waiting for responses
      // Must be less than options.queryInterval!
      queryPeriod: Math.min(
        queryInterval ?? 60000,
        queryPeriod ?? 5000
      )
    }
    this._onResponse = this._onResponse.bind(this)
  }

  get [symbol] (): true {
    return true
  }

  get [Symbol.toStringTag] () {
    return '@libp2p/go-mdns-querier'
  }

  isStarted () {
    return Boolean(this._handle)
  }

  start () {
    this._handle = periodically(() => {
      // Create a querier that queries multicast but gets responses unicast
      const mdns = MDNS({ multicast: false, interface: '0.0.0.0', port: 0 })

      mdns.on('response', this._onResponse)

      // @ts-expect-error @types/multicast-dns are wrong
      mdns.query({
        id: nextId(), // id > 0 for unicast response
        questions: [{
          name: SERVICE_TAG_LOCAL,
          type: 'PTR',
          class: 'IN'
        }]
      }, null, {
        address: MULTICAST_IP,
        port: MULTICAST_PORT
      })

      return {
        stop: async () => {
          mdns.removeListener('response', this._onResponse)
          return await new Promise(resolve => mdns.destroy(resolve))
        }
      }
    }, {
      period: this._init.queryPeriod,
      interval: this._init.queryInterval
    })
  }

  _onResponse (event: ResponsePacket, info: RemoteInfo) {
    log.trace('received mDNS query response')
    const answers = event.answers ?? []

    const peerInfo = findPeerInfoInAnswers(answers, this.components.peerId)

    if (peerInfo == null) {
      log('could not read peer data from query response')
      return
    }

    if (peerInfo.multiaddrs.length === 0) {
      log('could not parse multiaddrs from mDNS response')
      return
    }

    log('discovered peer in mDNS qeury response %p', peerInfo.id)

    this.dispatchEvent(new CustomEvent('peer', {
      detail: peerInfo
    }))
  }

  async stop () {
    if (this._handle != null) {
      await this._handle.stop()
    }
  }
}

/**
 * Run `fn` for a certain period of time, and then wait for an interval before
 * running it again. `fn` must return an object with a stop function, which is
 * called when the period expires.
 */
function periodically (fn: () => Handle, options: { period: number, interval: number }) {
  let handle: Handle | null
  let timeoutId: NodeJS.Timer
  let stopped = false

  const reRun = () => {
    handle = fn()
    timeoutId = setTimeout(() => {
      if (handle != null) {
        handle.stop().catch(log)
      }

      if (!stopped) {
        timeoutId = setTimeout(reRun, options.interval)
      }

      handle = null
    }, options.period)
  }

  reRun()

  return {
    async stop () {
      stopped = true
      clearTimeout(timeoutId)
      if (handle != null) {
        await handle.stop()
      }
    }
  }
}

const nextId = (() => {
  let id = 0
  return () => {
    id++
    if (id === Number.MAX_SAFE_INTEGER) id = 1
    return id
  }
})()
