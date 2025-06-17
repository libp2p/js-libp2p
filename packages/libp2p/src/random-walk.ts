import { randomBytes } from '@libp2p/crypto'
import { anySignal } from 'any-signal'
import { TypedEventEmitter, setMaxListeners } from 'main-event'
import pDefer from 'p-defer'
import { raceEvent } from 'race-event'
import { raceSignal } from 'race-signal'
import type { AbortOptions, ComponentLogger, Logger, PeerInfo, PeerRouting, Startable } from '@libp2p/interface'
import type { RandomWalk as RandomWalkInterface } from '@libp2p/interface-internal'
import type { DeferredPromise } from 'p-defer'

export interface RandomWalkComponents {
  peerRouting: PeerRouting
  logger: ComponentLogger
}

interface RandomWalkEvents {
  'walk:peer': CustomEvent<PeerInfo>
  'walk:error': CustomEvent<Error>
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

  readonly [Symbol.toStringTag] = '@libp2p/random-walk'

  start (): void {
    this.shutdownController = new AbortController()
    setMaxListeners(Infinity, this.shutdownController.signal)
  }

  stop (): void {
    this.shutdownController.abort()
  }

  async * walk (options?: AbortOptions): AsyncGenerator<PeerInfo> {
    if (!this.walking) {
      // start the query that causes walk:peer events to be emitted
      this.startWalk()
    }

    this.walkers++
    const signal = anySignal([this.shutdownController.signal, options?.signal])
    setMaxListeners(Infinity, signal)

    try {
      while (true) {
        // if another consumer has paused the query, start it again
        this.needNext?.resolve()
        this.needNext = pDefer()

        // wait for a walk:peer or walk:error event
        const event = await raceEvent<CustomEvent<PeerInfo>>(this, 'walk:peer', signal, {
          errorEvent: 'walk:error'
        })

        yield event.detail
      }
    } finally {
      signal.clear()
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
          const data = randomBytes(32)
          let s = Date.now()

          for await (const peer of this.peerRouting.getClosestPeers(data, { signal })) {
            if (signal.aborted) {
              this.log('aborting walk')
            }

            signal.throwIfAborted()

            this.log('found peer %p after %dms for %d walkers', peer.id, Date.now() - s, this.walkers)
            found++
            this.safeDispatchEvent('walk:peer', {
              detail: peer
            })

            // if we only have one consumer, pause the query until they request
            // another random peer or they signal they are no longer interested
            if (this.walkers === 1 && this.needNext != null) {
              this.log('wait for need next')
              await raceSignal(this.needNext.promise, signal)
            }

            s = Date.now()
          }

          this.log('walk iteration for %b and %d walkers finished, found %d peers', data, this.walkers, found)
        } catch (err) {
          this.log.error('random walk errored', err)

          this.safeDispatchEvent('walk:error', {
            detail: err
          })
        }
      }

      this.log('no walkers left, ended walk')
    })
      .catch(err => {
        this.log.error('random walk errored', err)
      })
      .finally(() => {
        this.log('finished walk, found %d peers after %dms', found, Date.now() - start)
        this.walking = false
      })
  }
}
