import { randomBytes } from '@libp2p/crypto'
import { TypedEventEmitter, setMaxListeners } from '@libp2p/interface'
import { anySignal } from 'any-signal'
import pDefer, { type DeferredPromise } from 'p-defer'
import { raceSignal } from 'race-signal'
import type { ComponentLogger, Logger, PeerInfo, PeerRouting, Startable } from '@libp2p/interface'
import type { RandomWalk as RandomWalkInterface } from '@libp2p/interface-internal'

export interface RandomWalkComponents {
  peerRouting: PeerRouting
  logger: ComponentLogger
}

interface RandomWalkEvents {
  'walk:peer': CustomEvent<PeerInfo>
}

export class RandomWalk extends TypedEventEmitter<RandomWalkEvents> implements RandomWalkInterface, Startable {
  private readonly peerRouting: PeerRouting
  private readonly log: Logger
  private walking: boolean
  private walkers: number
  private shutdownController: AbortController
  private walkController?: AbortController
  private needNext?: DeferredPromise<void>

  constructor (components: RandomWalkComponents) {
    super()

    this.log = components.logger.forComponent('libp2p:random-walk')
    this.peerRouting = components.peerRouting
    this.walkers = 0
    this.walking = false

    // stops any in-progress walks when the node is shut down
    this.shutdownController = new AbortController()
    setMaxListeners(Infinity, this.shutdownController.signal)
  }

  start (): void {
    this.shutdownController = new AbortController()
    setMaxListeners(Infinity, this.shutdownController.signal)
  }

  stop (): void {
    this.shutdownController.abort()
  }

  async * walk (): AsyncGenerator<PeerInfo> {
    if (!this.walking) {
      this.startWalk()
    }

    this.walkers++

    let deferred = pDefer<PeerInfo>()
    const onPeer = (event: CustomEvent<PeerInfo>): void => {
      deferred.resolve(event.detail)
    }

    this.addEventListener('walk:peer', onPeer)

    try {
      while (true) {
        // if another consumer has paused the query, start it again
        this.needNext?.resolve()
        this.needNext = pDefer()

        const peerInfo = await deferred.promise
        deferred = pDefer()

        yield peerInfo
      }
    } finally {
      this.removeEventListener('walk:peer', onPeer)
      this.walkers--

      // stop the walk if no more consumers are interested
      if (this.walkers === 0) {
        this.walkController?.abort()
        this.walkController = undefined
      }
    }
  }

  private startWalk (): void {
    this.walking = true

    // the signal for this controller will be aborted if no more random peers
    // are required
    this.walkController = new AbortController()
    setMaxListeners(Infinity, this.walkController.signal)

    const signal = anySignal([this.walkController.signal, this.shutdownController.signal])
    setMaxListeners(Infinity, signal)

    const start = Date.now()
    let found = 0

    Promise.resolve().then(async () => {
      this.log('start walk')

      // find peers until no more consumers are interested
      while (this.walkers > 0) {
        try {
          for await (const peer of this.peerRouting.getClosestPeers(randomBytes(32), { signal })) {
            signal.throwIfAborted()

            this.log('found peer %p', peer.id)
            found++
            this.safeDispatchEvent('walk:peer', {
              detail: peer
            })

            // if we only have one consumer, pause the query until they request
            // another random peer or they signal they are no longer interested
            if (this.walkers === 1 && this.needNext != null) {
              await raceSignal(this.needNext.promise, signal)
            }
          }
        } catch (err) {
          this.log.error('randomwalk errored', err)
        }
      }
    })
      .catch(err => {
        this.log.error('randomwalk errored', err)
      })
      .finally(() => {
        this.log('finished walk, found %d peers after %dms', found, Date.now() - start)
        this.walking = false
      })
  }
}
