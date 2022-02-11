// Compatibility with Go libp2p MDNS
import { EventEmitter, CustomEvent } from '@libp2p/interfaces'
import { Responder } from './responder.js'
import { Querier } from './querier.js'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { PeerId } from '@libp2p/interfaces/peer-id'
import type { PeerDiscovery, PeerDiscoveryEvents } from '@libp2p/interfaces/peer-discovery'

export class GoMulticastDNS extends EventEmitter<PeerDiscoveryEvents> implements PeerDiscovery {
  private _started: boolean
  private readonly _responder: Responder
  private readonly _querier: Querier

  constructor (options: { peerId: PeerId, multiaddrs: Multiaddr[], queryPeriod?: number, queryInterval?: number }) {
    super()
    const { peerId, multiaddrs, queryPeriod, queryInterval } = options

    this._started = false

    this._responder = new Responder({
      peerId,
      multiaddrs
    })
    this._querier = new Querier({
      peerId,
      queryInterval,
      queryPeriod
    })

    this._querier.addEventListener('peer', (evt) => {
      this.dispatchEvent(new CustomEvent('peer', { detail: evt.detail }))
    })
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
