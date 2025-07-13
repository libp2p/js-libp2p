import { AbortError } from '@libp2p/interface'
import { Queue } from '@libp2p/utils/queue'
import { pushable } from 'it-pushable'
import { xor as uint8ArrayXor } from 'uint8arrays/xor'
import { xorCompare as uint8ArrayXorCompare } from 'uint8arrays/xor-compare'
import { convertPeerId, convertBuffer } from '../utils.js'
import { pathEndedEvent, queryErrorEvent } from './events.js'
import type { QueryEvent } from '../index.js'
import type { QueryFunc } from '../query/types.js'
import type { Logger, PeerId, RoutingOptions, AbortOptions, PeerInfo } from '@libp2p/interface'
import type { ConnectionManager } from '@libp2p/interface-internal'
import type { Filter } from '@libp2p/utils/filters'

export interface QueryPathOptions extends RoutingOptions {
  /**
   * What are we trying to find
   */
  key: Uint8Array

  /**
   * Where we start our query
   */
  startingPeers: PeerId[]

  /**
   * Who we are
   */
  ourPeerId: PeerId

  /**
   * The query function to run with each peer
   */
  query: QueryFunc

  /**
   * How many concurrent node/value lookups to run
   */
  alpha: number

  /**
   * The index within `k` this path represents
   */
  path: number

  /**
   * How many disjoint paths are in this query
   */
  numPaths: number

  /**
   * Query log
   */
  log: Logger

  /**
   * Set of peers seen by this and other paths
   */
  peersSeen: Filter

  /**
   * The libp2p connection manager
   */
  connectionManager: ConnectionManager

  /**
   * The overall query abort signal
   */
  signal: AbortSignal
}

interface QueryQueueOptions extends AbortOptions {
  distance: Uint8Array
}

/**
 * Walks a path through the DHT, calling the passed query function for
 * every peer encountered that we have not seen before
 */
export async function * queryPath (options: QueryPathOptions): AsyncGenerator<QueryEvent, void, undefined> {
  const { key, startingPeers, ourPeerId, query, alpha, path, numPaths, log, peersSeen, connectionManager, signal } = options
  const events = pushable<QueryEvent>({
    objectMode: true
  })

  // Only ALPHA node/value lookups are allowed at any given time for each process
  // https://github.com/libp2p/specs/tree/master/kad-dht#alpha-concurrency-parameter-%CE%B1
  const queue = new Queue<undefined, QueryQueueOptions>({
    concurrency: alpha,
    sort: (a, b) => uint8ArrayXorCompare(a.options.distance, b.options.distance)
  })
  queue.addEventListener('idle', () => {
    events.push(pathEndedEvent({
      path: {
        index: path,
        queued: queue.queued,
        running: queue.running,
        total: queue.size
      }
    }, options))

    events.end()
  })
  queue.addEventListener('failure', (evt) => {
    log.error('error during query - %e', evt.detail.error)
  })

  const onAbort = (): void => {
    queue.abort()
    events.end(new AbortError())
  }

  signal.addEventListener('abort', onAbort)

  try {
    // perform lookups on kadId, not the actual value
    const kadId = await convertBuffer(key, {
      signal
    })

    /**
     * Adds the passed peer to the query queue if it's not us and no other path
     * has passed through this peer
     */
    function queryPeer (peer: PeerInfo, peerKadId: Uint8Array): void {
      if (peer == null) {
        return
      }

      peersSeen.add(peer.id.toMultihash().bytes)

      const peerXor = uint8ArrayXor(peerKadId, kadId)

      queue.add(async () => {
        try {
          for await (const event of query({
            ...options,
            key,
            peer,
            path: {
              index: path,
              queued: queue.queued,
              running: queue.running,
              total: queue.size
            },
            numPaths,
            peerKadId,
            signal
          })) {
            // if there are closer peers and the query has not completed, continue the query
            if (event.name === 'PEER_RESPONSE') {
              for (const closerPeer of event.closer) {
                if (peersSeen.has(closerPeer.id.toMultihash().bytes)) { // eslint-disable-line max-depth
                  log('already seen %p in query', closerPeer.id)
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

                const closerPeerKadId = await convertPeerId(closerPeer.id, {
                  signal
                })
                const closerPeerXor = uint8ArrayXor(closerPeerKadId, kadId)

                // only continue query if closer peer is actually closer
                if (uint8ArrayXorCompare(closerPeerXor, peerXor) !== -1) { // eslint-disable-line max-depth
                  log('skipping %p as they are not closer to %b than %p', closerPeer.id, key, peer)
                  continue
                }

                log('querying closer peer %p', closerPeer.id)
                queryPeer(closerPeer, closerPeerKadId)
              }
            }

            events.push({
              ...event,
              path: {
                index: path,
                queued: queue.queued,
                running: queue.running,
                total: queue.size
              }
            })
          }
        } catch (err: any) {
          // yield error event if query is continuing
          events.push(queryErrorEvent({
            from: peer.id,
            error: err,
            path: {
              index: path,
              queued: queue.queued,
              running: queue.running - 1,
              total: queue.size - 1
            }
          }, options))
        }
      }, {
        distance: peerXor
      }).catch(err => {
        log.error('error during query - %e', err)
      })
    }

    // begin the query with the starting peers
    await Promise.all(
      startingPeers.map(async startingPeer => {
        queryPeer({ id: startingPeer, multiaddrs: [] }, await convertPeerId(startingPeer, {
          signal
        }))
      })
    )

    // yield results as they come in
    yield * events
  } finally {
    signal.removeEventListener('abort', onAbort)
  }
}
