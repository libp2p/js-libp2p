// Compatibility with Go libp2p MDNS
import { EventEmitter, CustomEvent } from '@libp2p/interfaces/events'
import { Responder } from './responder.js'
import { Querier } from './querier.js'
import type { PeerDiscovery, PeerDiscoveryEvents } from '@libp2p/interface-peer-discovery'
import { symbol } from '@libp2p/interface-peer-discovery'
import type { MulticastDNSComponents } from '../index.js'

export interface GoMulticastDNSInit {
  queryPeriod?: number
  queryInterval?: number
}

export class GoMulticastDNS extends EventEmitter<PeerDiscoveryEvents> implements PeerDiscovery {
  private _started: boolean
  private readonly _responder: Responder
  private readonly _querier: Querier

  constructor (components: MulticastDNSComponents, options: GoMulticastDNSInit = {}) {
    super()
    const { queryPeriod, queryInterval } = options

    this._started = false

    this._responder = new Responder(components)
    this._querier = new Querier(components, {
      queryInterval,
      queryPeriod
    })

    this._querier.addEventListener('peer', (evt) => {
      this.dispatchEvent(new CustomEvent('peer', { detail: evt.detail }))
    })
  }

  get [symbol] (): true {
    return true
  }

  get [Symbol.toStringTag] () {
    return '@libp2p/go-mdns'
  }

  isStarted () {
    return this._started
  }

  async start () {
    if (this.isStarted()) {
      return
    }

    this._started = true

    await Promise.all([
      this._responder.start(),
      this._querier.start()
    ])
  }

  async stop () {
    if (!this.isStarted()) {
      return
    }

    this._started = false

    await Promise.all([
      this._responder.stop(),
      this._querier.stop()
    ])
  }
}
