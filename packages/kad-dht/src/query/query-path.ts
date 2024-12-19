import { setMaxListeners } from '@libp2p/interface'
import { Queue } from '@libp2p/utils/queue'
import { anySignal } from 'any-signal'
import { xor as uint8ArrayXor } from 'uint8arrays/xor'
import { xorCompare as uint8ArrayXorCompare } from 'uint8arrays/xor-compare'
import { QueryAbortedError } from '../errors.js'
import { convertPeerId, convertBuffer } from '../utils.js'
import { queryErrorEvent } from './events.js'
import type { QueryEvent } from '../index.js'
import type { QueryFunc } from '../query/types.js'
import type { Logger, PeerId, RoutingOptions, AbortOptions } from '@libp2p/interface'
import type { ConnectionManager } from '@libp2p/interface-internal'
import type { PeerSet } from '@libp2p/peer-collections'

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

  /**
   * The libp2p connection manager
   */
  connectionManager: ConnectionManager
}

interface QueryQueueOptions extends AbortOptions {
  distance: Uint8Array
}

/**
 * Walks a path through the DHT, calling the passed query function for
 * every peer encountered that we have not seen before
 */
export async function * queryPath (options: QueryPathOptions): AsyncGenerator<QueryEvent, void, undefined> {
  const { key, startingPeer, ourPeerId, signal, query, alpha, pathIndex, numPaths, queryFuncTimeout, log, peersSeen, connectionManager } = options
  // Only ALPHA node/value lookups are allowed at any given time for each process
  // https://github.com/libp2p/specs/tree/master/kad-dht#alpha-concurrency-parameter-%CE%B1
  const queue = new Queue<QueryEvent | undefined, QueryQueueOptions>({
    concurrency: alpha,
    sort: (a, b) => uint8ArrayXorCompare(a.options.distance, b.options.distance)
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

    const peerXor = uint8ArrayXor(peerKadId, kadId)

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
          ...options,
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
                log.trace('already seen %p in query', closerPeer.id)
                continue
              }

              if (ourPeerId.equals(closerPeer.id)) { // eslint-disable-line max-depth
                log('not querying ourselves')
                continue
              }

              if (!(await connectionManager.isDialable(closerPeer.multiaddrs))) { // eslint-disable-line max-depth
                log('not querying undialable peer')
                continue
              }

              const closerPeerKadId = await convertPeerId(closerPeer.id)
              const closerPeerXor = uint8ArrayXor(closerPeerKadId, kadId)

              // only continue query if closer peer is actually closer
              if (uint8ArrayXorCompare(closerPeerXor, peerXor) !== -1) { // eslint-disable-line max-depth
                log.trace('skipping %p as they are not closer to %b than %p', closerPeer.id, key, peer)
                continue
              }

              log.trace('querying closer peer %p', closerPeer.id)
              queryPeer(closerPeer.id, closerPeerKadId)
            }
          }

          queue.safeDispatchEvent('completed', {
            detail: event
          })
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
      distance: peerXor
    }).catch(err => {
      log.error(err)
    })
  }

  // begin the query with the starting peer
  queryPeer(startingPeer, await convertPeerId(startingPeer))

  try {
    // yield results as they come in
    for await (const event of queue.toGenerator({ signal })) {
      if (event != null) {
        yield event
      }
    }
  } catch (err) {
    if (signal.aborted) {
      throw new QueryAbortedError('Query aborted')
    }

    throw err
  }
}
