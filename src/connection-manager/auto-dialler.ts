import { logger } from '@libp2p/logger'
import mergeOptions from 'merge-options'
// @ts-expect-error retimer does not have types
import retimer from 'retimer'
import type { Startable } from '@libp2p/interfaces/startable'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { ConnectionManager } from '@libp2p/interface-connection-manager'
import type { PeerStore } from '@libp2p/interface-peer-store'
import AbortAbort from 'abortabort'
import type { Connection } from '@libp2p/interface-connection'

const log = logger('libp2p:connection-manager:auto-dialler')

export interface AutoDiallerInit {
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
  minConnections: 0,
  autoDialInterval: 10000
}

export class AutoDialler implements Startable {
  private readonly components: AutoDiallerComponents
  private readonly options: Required<AutoDiallerInit>
  private running: boolean
  private autoDialTimeout?: ReturnType<retimer>
  private readonly abortController?: AbortAbort
  connectionMap: Map<string, Promise<Connection>>

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
    this.abortController = new AbortAbort()
    this.connectionMap = new Map<string, Promise<Connection>>()

    log('options: %j', this.options)
  }

  isStarted (): boolean {
    return this.running
  }

  /**
   * Starts the auto dialer
   */
  async start (): Promise<void> {
    this.running = true

    void this._autoDial().catch(err => {
      log.error('could not start autodial', err)
    })

    log('started')
  }

  /**
   * Stops the auto dialler
   */
  async stop (): Promise<void> {
    this.running = false
    // This will cause all pending dials to be aborted as well.
    this.abortController?.abort()

    if (this.autoDialTimeout != null) {
      this.autoDialTimeout.clear()
    }

    log('stopped')
  }

  async _autoDial (): Promise<void> {
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
    let peers = await this.components.peerStore.all()

    peers = peers.filter((peer) => {
      // do not dial ourselves
      if (peer.id.equals(this.components.peerId)) {
        return false
      }

      // do not dial peers without multiaddrs
      if (peer.addresses.length === 0) {
        return false
      }

      return true
    })

    /**
     * shuffle the peers
     *
     * @todo: Be smarter about shuffling peers. We should add weights to peers that are more likely to succeed
     */
    peers = peers.sort(() => Math.random() > 0.5 ? 1 : -1)

    peers = peers.sort((a, b) => {
      // dial peers with the most protocols first
      if (b.protocols.length > a.protocols.length) {
        return 1
      }

      // dial peers with public keys first
      if (b.id.publicKey != null && a.id.publicKey == null) {
        return 1
      }

      return -1
    })

    for (let i = 0; this.running && i < peers.length && this.components.connectionManager.getConnections().length < minConnections; i++) {
      // Connection Manager was stopped during async dial
      if (!this.running) {
        return
      }

      const peer = peers[i]
      const peerIdString = peer.id.toString()

      if (this.components.connectionManager.getConnections(peer.id).length === 0 && !this.connectionMap.has(peerIdString)) {
        log('connecting to a peerStore stored peer %p', peer.id)
        const connectionAbortController = new AbortAbort()
        this.abortController?.addDependant(connectionAbortController)

        /**
         * we do not need to await the connection attempts because we are
         * blocking new calls to `openConnection` by checking whether the
         * peer already has an attempt in the `connectionMap` and we are
         * removing the peer from the `connectionMap` when the attempt
         * finishes (successful or not)
         */
        const connectionAttempt = this.components.connectionManager.openConnection(peer.id, { signal: connectionAbortController.signal })
        connectionAttempt.catch((err: any) => {
          log.error('could not connect to peerStore stored peer', err)
        })
        this.connectionMap.set(peerIdString, connectionAttempt)
        connectionAttempt.finally(() => {
          this.connectionMap.delete(peerIdString)
          connectionAbortController.abort()
        })
      }
    }

    // Connection Manager was stopped
    if (!this.running) {
      return
    }

    this.autoDialTimeout = retimer(this._autoDial, this.options.autoDialInterval)
  }
}
