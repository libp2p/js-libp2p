import { setMaxListeners } from '@libp2p/interface'
import { anySignal } from 'any-signal'
import Queue from 'p-queue'
import { toString } from 'uint8arrays/to-string'
import { xor } from 'uint8arrays/xor'
import { convertPeerId, convertBuffer } from '../utils.js'
import { queryErrorEvent } from './events.js'
import { queueToGenerator } from './utils.js'
import type { CleanUpEvents } from './manager.js'
import type { QueryEvent } from '../index.js'
import type { QueryFunc } from '../query/types.js'
import type { Logger, TypedEventTarget, PeerId, RoutingOptions } from '@libp2p/interface'
import type { PeerSet } from '@libp2p/peer-collections'

const MAX_XOR = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF')

export interface QueryPathOptions extends RoutingOptions {
  /**
   * What are we trying to find
   */
  key: Uint8Array

  /**
   * Where we start our query
   */
  startingPeer: PeerId

  /**
   * Who we are
   */
  ourPeerId: PeerId

  /**
   * When to stop querying
   */
  signal: AbortSignal

  /**
   * The query function to run with each peer
   */
  query: QueryFunc

  /**
   * How many concurrent node/value lookups to run
   */
  alpha: number

  /**
   * How many concurrent node/value lookups to run
   */
  pathIndex: number

  /**
   * How many concurrent node/value lookups to run
   */
  numPaths: number

  /**
   * will emit a 'cleanup' event if the caller exits the for..await of early
   */
  cleanUp: TypedEventTarget<CleanUpEvents>

  /**
   * A timeout for queryFunc in ms
   */
  queryFuncTimeout?: number

  /**
   * Query log
   */
  log: Logger

  /**
   * Set of peers seen by this and other paths
   */
  peersSeen: PeerSet
}

/**
 * Walks a path through the DHT, calling the passed query function for
 * every peer encountered that we have not seen before
 */
export async function * queryPath (options: QueryPathOptions): AsyncGenerator<QueryEvent, void, undefined> {
  const { key, startingPeer, ourPeerId, signal, query, alpha, pathIndex, numPaths, cleanUp, queryFuncTimeout, log, peersSeen } = options
  // Only ALPHA node/value lookups are allowed at any given time for each process
  // https://github.com/libp2p/specs/tree/master/kad-dht#alpha-concurrency-parameter-%CE%B1
  const queue = new Queue({
    concurrency: alpha
  })

  // perform lookups on kadId, not the actual value
  const kadId = await convertBuffer(key)

  /**
   * Adds the passed peer to the query queue if it's not us and no
   * other path has passed through this peer
   */
  function queryPeer (peer: PeerId, peerKadId: Uint8Array): void {
    if (peer == null) {
      return
    }

    peersSeen.add(peer)

    const peerXor = BigInt('0x' + toString(xor(peerKadId, kadId), 'base16'))

    queue.add(async () => {
      const signals = [signal]

      if (queryFuncTimeout != null) {
        signals.push(AbortSignal.timeout(queryFuncTimeout))
      }

      const compoundSignal = anySignal(signals)

      // this signal can get listened to a lot
      setMaxListeners(Infinity, compoundSignal)

      try {
        for await (const event of query({
          key,
          peer,
          signal: compoundSignal,
          pathIndex,
          numPaths
        })) {
          if (compoundSignal.aborted) {
            return
          }

          // if there are closer peers and the query has not completed, continue the query
          if (event.name === 'PEER_RESPONSE') {
            for (const closerPeer of event.closer) {
              if (peersSeen.has(closerPeer.id)) { // eslint-disable-line max-depth
                log('already seen %p in query', closerPeer.id)
                continue
              }

              if (ourPeerId.equals(closerPeer.id)) { // eslint-disable-line max-depth
                log('not querying ourselves')
                continue
              }

              const closerPeerKadId = await convertPeerId(closerPeer.id)
              const closerPeerXor = BigInt('0x' + toString(xor(closerPeerKadId, kadId), 'base16'))

              // only continue query if closer peer is actually closer
              if (closerPeerXor > peerXor) { // eslint-disable-line max-depth
                log('skipping %p as they are not closer to %b than %p', closerPeer.id, key, peer)
                continue
              }

              log('querying closer peer %p', closerPeer.id)
              queryPeer(closerPeer.id, closerPeerKadId)
            }
          }
          queue.emit('completed', event)
        }
      } catch (err: any) {
        if (!signal.aborted) {
          return queryErrorEvent({
            from: peer,
            error: err
          }, options)
        }
      } finally {
        compoundSignal.clear()
      }
    }, {
      // use xor value as the queue priority - closer peers should execute first
      // subtract it from MAX_XOR because higher priority values execute sooner

      // @ts-expect-error this is supposed to be a Number but it's ok to use BigInts
      // as long as all priorities are BigInts since we won't mix BigInts and Number
      // values in arithmetic operations
      priority: MAX_XOR - peerXor
    }).catch(err => {
      log.error(err)
    })
  }

  // begin the query with the starting peer
  queryPeer(startingPeer, await convertPeerId(startingPeer))

  // yield results as they come in
  yield * queueToGenerator(queue, signal, cleanUp, log)
}
