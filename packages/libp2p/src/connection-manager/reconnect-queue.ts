import { KEEP_ALIVE } from '@libp2p/interface'
import { PeerQueue } from '@libp2p/utils'
import pRetry from 'p-retry'
import { MAX_PARALLEL_RECONNECTS } from './constants.ts'
import type { ComponentLogger, Libp2pEvents, Logger, Metrics, Peer, PeerId, PeerStore, Startable } from '@libp2p/interface'
import type { ConnectionManager } from '@libp2p/interface-internal'
import type { TypedEventTarget } from 'main-event'

export interface ReconnectQueueComponents {
  connectionManager: ConnectionManager
  events: TypedEventTarget<Libp2pEvents>
  peerStore: PeerStore
  logger: ComponentLogger
  metrics?: Metrics
}

export interface ReconnectQueueInit {
  retries?: number
  retryInterval?: number
  backoffFactor?: number
  maxParallelReconnects?: number
}

/**
 * When peers tagged with `KEEP_ALIVE` disconnect, this component attempts to
 * redial them
 */
export class ReconnectQueue implements Startable {
  private readonly log: Logger
  private readonly queue: PeerQueue
  private started: boolean
  private readonly peerStore: PeerStore
  private readonly retries: number
  private readonly retryInterval?: number
  private readonly backoffFactor?: number
  private readonly connectionManager: ConnectionManager
  private readonly events: TypedEventTarget<Libp2pEvents>

  constructor (components: ReconnectQueueComponents, init: ReconnectQueueInit = {}) {
    this.log = components.logger.forComponent('libp2p:reconnect-queue')
    this.peerStore = components.peerStore
    this.connectionManager = components.connectionManager
    this.queue = new PeerQueue({
      concurrency: init.maxParallelReconnects ?? MAX_PARALLEL_RECONNECTS,
      metricName: 'libp2p_reconnect_queue',
      metrics: components.metrics
    })
    this.started = false
    this.retries = init.retries ?? 5
    this.backoffFactor = init.backoffFactor
    this.retryInterval = init.retryInterval
    this.events = components.events

    components.events.addEventListener('peer:disconnect', (evt) => {
      this.maybeReconnect(evt.detail)
        .catch(err => {
          this.log.error('failed to maybe reconnect to %p - %e', evt.detail, err)
        })
    })
  }

  private async maybeReconnect (peerId: PeerId): Promise<void> {
    if (!this.started) {
      return
    }

    const peer = await this.peerStore.get(peerId)

    if (!hasKeepAliveTag(peer)) {
      return
    }

    if (this.queue.has(peerId)) {
      return
    }

    this.queue.add(async (options) => {
      try {
        await pRetry(async (attempt) => {
          if (!this.started) {
            return
          }

          try {
            await this.connectionManager.openConnection(peerId, {
              signal: options?.signal
            })
          } catch (err) {
            this.log('reconnecting to %p attempt %d of %d failed - %e', peerId, attempt, this.retries, err)
            throw err
          }
        }, {
          signal: options?.signal,
          retries: this.retries,
          factor: this.backoffFactor,
          minTimeout: this.retryInterval
        })
      } catch (err) {
        // the queue aborts the job when we stop, that is not a failed reconnect
        if (options?.signal?.aborted !== true) {
          await this.reconnectFailed(peer, err)
        }

        throw err
      }
    }, {
      peerId
    })
      .catch(err => {
        // failures are handled by the job
        this.log.trace('reconnecting to %p ended - %e', peerId, err)
      })
  }

  private async reconnectFailed (peer: Peer, err: any): Promise<void> {
    this.log.error('failed to reconnect to %p - %e', peer.id, err)

    const tags: Record<string, undefined> = {}

    ;[...peer.tags.keys()].forEach(key => {
      if (key.startsWith(KEEP_ALIVE)) {
        tags[key] = undefined
      }
    })

    try {
      await this.peerStore.merge(peer.id, {
        tags
      })

      this.events.safeDispatchEvent('peer:reconnect-failure', {
        detail: peer.id
      })
    } catch (err) {
      this.log.error('failed to remove keep-alive tag from %p - %e', peer.id, err)
    }
  }

  start (): void {
    this.started = true
  }

  async afterStart (): Promise<void> {
    // re-connect to any peers with the KEEP_ALIVE tag
    void Promise.resolve()
      .then(async () => {
        const keepAlivePeers: Peer[] = await this.peerStore.all({
          filters: [
            (peer) => hasKeepAliveTag(peer)
          ]
        })

        await Promise.all(
          keepAlivePeers.map(async peer => {
            await this.connectionManager.openConnection(peer.id)
              .catch(err => {
                this.log.error('could not open connection to keepalive peer - %e', err)
              })
          })
        )
      })
      .catch(err => {
        this.log.error('error reconnect to peers after start - %e', err)
      })
  }

  stop (): void {
    this.started = false
    this.queue.abort()
  }
}

function hasKeepAliveTag (peer: Peer): boolean {
  for (const tag of peer.tags.keys()) {
    if (tag.startsWith(KEEP_ALIVE)) {
      return true
    }
  }

  return false
}
