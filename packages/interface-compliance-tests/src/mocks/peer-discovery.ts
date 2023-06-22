import { EventEmitter } from '@libp2p/interface/events'
import { peerDiscovery } from '@libp2p/interface/peer-discovery'
import * as PeerIdFactory from '@libp2p/peer-id-factory'
import { multiaddr } from '@multiformats/multiaddr'
import type { PeerDiscovery, PeerDiscoveryEvents } from '@libp2p/interface/peer-discovery'
import type { PeerInfo } from '@libp2p/interface/peer-info'

interface MockDiscoveryInit {
  discoveryDelay?: number
}

/**
 * Emits 'peer' events on discovery.
 */
export class MockDiscovery extends EventEmitter<PeerDiscoveryEvents> implements PeerDiscovery {
  public readonly options: MockDiscoveryInit
  private _isRunning: boolean
  private _timer: any

  constructor (init = {}) {
    super()

    this.options = init
    this._isRunning = false
  }

  readonly [peerDiscovery] = this

  start (): void {
    this._isRunning = true
    this._discoverPeer()
  }

  stop (): void {
    clearTimeout(this._timer)
    this._isRunning = false
  }

  isStarted (): boolean {
    return this._isRunning
  }

  _discoverPeer (): void {
    if (!this._isRunning) return

    PeerIdFactory.createEd25519PeerId()
      .then(peerId => {
        this._timer = setTimeout(() => {
          this.safeDispatchEvent<PeerInfo>('peer', {
            detail: {
              id: peerId,
              multiaddrs: [multiaddr('/ip4/127.0.0.1/tcp/8000')],
              protocols: []
            }
          })
        }, this.options.discoveryDelay ?? 1000)
      })
      .catch(() => {})
  }
}
