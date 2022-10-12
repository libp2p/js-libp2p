import { logger } from '@libp2p/logger'
import mergeOptions from 'merge-options'
// @ts-expect-error retimer does not have types
import retimer from 'retimer'
import all from 'it-all'
import { pipe } from 'it-pipe'
import filter from 'it-filter'
import sort from 'it-sort'
import type { Startable } from '@libp2p/interfaces/startable'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { ConnectionManager } from '@libp2p/interface-connection-manager'
import type { PeerStore } from '@libp2p/interface-peer-store'

const log = logger('libp2p:connection-manager:auto-dialler')

export interface AutoDiallerInit {
  /**
   * Should preemptively guarantee connections are above the low watermark
   */
  enabled?: boolean

  /**
   * The minimum number of connections to avoid pruning
   */
  minConnections?: number

  /**
   * How often, in milliseconds, it should preemptively guarantee connections are above the low watermark
   */
  autoDialInterval?: number
}

export interface AutoDiallerComponents {
  peerId: PeerId
  connectionManager: ConnectionManager
  peerStore: PeerStore
}

const defaultOptions: Partial<AutoDiallerInit> = {
  enabled: true,
  minConnections: 0,
  autoDialInterval: 10000
}

export class AutoDialler implements Startable {
  private readonly components: AutoDiallerComponents
  private readonly options: Required<AutoDiallerInit>
  private running: boolean
  private autoDialTimeout?: ReturnType<retimer>

  /**
   * Proactively tries to connect to known peers stored in the PeerStore.
   * It will keep the number of connections below the upper limit and sort
   * the peers to connect based on wether we know their keys and protocols.
   */
  constructor (components: AutoDiallerComponents, init: AutoDiallerInit) {
    this.components = components
    this.options = mergeOptions.call({ ignoreUndefined: true }, defaultOptions, init)
    this.running = false
    this._autoDial = this._autoDial.bind(this)

    log('options: %j', this.options)
  }

  isStarted () {
    return this.running
  }

  /**
   * Starts the auto dialer
   */
  async start () {
    if (!this.options.enabled) {
      log('not enabled')
      return
    }

    this.running = true

    void this._autoDial().catch(err => {
      log.error('could start autodial', err)
    })

    log('started')
  }

  /**
   * Stops the auto dialler
   */
  async stop () {
    if (!this.options.enabled) {
      log('not enabled')
      return
    }

    this.running = false

    if (this.autoDialTimeout != null) {
      this.autoDialTimeout.clear()
    }

    log('stopped')
  }

  async _autoDial () {
    if (this.autoDialTimeout != null) {
      this.autoDialTimeout.clear()
    }

    const minConnections = this.options.minConnections

    // Already has enough connections
    if (this.components.connectionManager.getConnections().length >= minConnections) {
      this.autoDialTimeout = retimer(this._autoDial, this.options.autoDialInterval)

      return
    }

    // Sort peers on whether we know protocols or public keys for them
    const allPeers = await this.components.peerStore.all()

    const peers = await pipe(
      // shuffle the peers
      allPeers.sort(() => Math.random() > 0.5 ? 1 : -1),
      (source) => filter(source, (peer) => !peer.id.equals(this.components.peerId)),
      (source) => sort(source, (a, b) => {
        if (b.protocols.length > a.protocols.length) {
          return 1
        } else if (b.id.publicKey != null && a.id.publicKey == null) {
          return 1
        }
        return -1
      }),
      async (source) => await all(source)
    )

    for (let i = 0; this.running && i < peers.length && this.components.connectionManager.getConnections().length < minConnections; i++) {
      // Connection Manager was stopped during async dial
      if (!this.running) {
        return
      }

      const peer = peers[i]

      if (this.components.connectionManager.getConnections(peer.id).length === 0) {
        log('connecting to a peerStore stored peer %p', peer.id)
        try {
          await this.components.connectionManager.openConnection(peer.id)
        } catch (err: any) {
          log.error('could not connect to peerStore stored peer', err)
        }
      }
    }

    // Connection Manager was stopped
    if (!this.running) {
      return
    }

    this.autoDialTimeout = retimer(this._autoDial, this.options.autoDialInterval)
  }
}
