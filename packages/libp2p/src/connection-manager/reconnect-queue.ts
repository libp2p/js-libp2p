import { KEEP_ALIVE } from '@libp2p/interface'
import { PeerQueue } from '@libp2p/utils/peer-queue'
import pRetry from 'p-retry'
import type { ComponentLogger, Libp2pEvents, Logger, Peer, PeerId, PeerStore, Startable, TypedEventTarget } from '@libp2p/interface'
import type { ConnectionManager } from '@libp2p/interface-internal'

export interface ReconnectQueueComponents {
  connectionManager: ConnectionManager
  events: TypedEventTarget<Libp2pEvents>
  peerStore: PeerStore
  logger: ComponentLogger
}

export interface ReconnectQueueInit {
  retries?: number
  interval?: number
  factor?: number
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
  private readonly interval?: number
  private readonly factor?: number
  private readonly connectionManager: ConnectionManager

  constructor (components: ReconnectQueueComponents, init: ReconnectQueueInit = {}) {
    this.log = components.logger.forComponent('libp2p:reconnect-queue')
    this.peerStore = components.peerStore
    this.connectionManager = components.connectionManager
    this.queue = new PeerQueue()
    this.started = false
    this.retries = init.retries ?? 5
    this.factor = init.factor

    components.events.addEventListener('peer:disconnect', (evt) => {
      this.maybeReconnect(evt.detail)
        .catch(err => {
          this.log.error('failed to maybe reconnect to %p', evt.detail, err)
        })
    })
  }

  private async maybeReconnect (peerId: PeerId): Promise<void> {
    if (!this.started) {
      return
    }

    const peer = await this.peerStore.get(peerId)

    if (!peer.tags.has(KEEP_ALIVE)) {
      return
    }

    if (this.queue.has(peerId)) {
      return
    }

    this.queue.add(async (options) => {
      await pRetry(async (attempt) => {
        if (!this.started) {
          return
        }

        try {
          await this.connectionManager.openConnection(peerId, {
            signal: options?.signal
          })
        } catch (err) {
          this.log('reconnecting to %p attempt %d of %d failed', peerId, attempt, this.retries, err)
          throw err
        }
      }, {
        signal: options?.signal,
        retries: this.retries,
        factor: this.factor,
        minTimeout: this.interval
      })
    }, {
      peerId
    })
      .catch(err => {
        this.log.error('failed to reconnect to %p', peerId, err)
      })
  }

  start (): void {
    this.started = true
  }

  async afterStart (): Promise<void> {
    // re-connect to any peers with the KEEP_ALIVE tag
    void Promise.resolve()
      .then(async () => {
        const keepAlivePeers: Peer[] = await this.peerStore.all({
          filters: [(peer) => {
            return peer.tags.has(KEEP_ALIVE)
          }]
        })

        await Promise.all(
          keepAlivePeers.map(async peer => {
            await this.connectionManager.openConnection(peer.id)
              .catch(err => {
                this.log.error(err)
              })
          })
        )
      })
      .catch(err => {
        this.log.error(err)
      })
  }

  stop (): void {
    this.started = false
    this.queue.abort()
  }
}
