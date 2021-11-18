'use strict'

const { default: Queue } = require('p-queue')
const { xor } = require('uint8arrays/xor')
const { toString } = require('uint8arrays/to-string')
const defer = require('p-defer')
const errCode = require('err-code')
const { convertPeerId, convertBuffer } = require('../utils')
const { TimeoutController } = require('timeout-abort-controller')
const { anySignal } = require('any-signal')
const { queryErrorEvent } = require('./events')

const MAX_XOR = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF')

/**
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('../types').QueryEvent} QueryEvent
 * @typedef {import('./types').QueryFunc} QueryFunc
 */

/**
 * Walks a path through the DHT, calling the passed query function for
 * every peer encountered that we have not seen before.
 *
 * @param {object} context
 * @param {Uint8Array} context.key - what are we trying to find
 * @param {PeerId} context.startingPeer - where we start our query
 * @param {PeerId} context.ourPeerId - who we are
 * @param {Set<string>} context.peersSeen - list of base58btc peer IDs all paths have traversed
 * @param {AbortSignal} context.signal - when to stop querying
 * @param {QueryFunc} context.query - the query function to run with each peer
 * @param {number} context.alpha - how many concurrent node/value lookups to run
 * @param {number} context.pathIndex - how many concurrent node/value lookups to run
 * @param {number} context.numPaths - how many concurrent node/value lookups to run
 * @param {import('events').EventEmitter} context.cleanUp - will emit a 'cleanup' event if the caller exits the for..await of early
 * @param {number} [context.queryFuncTimeout] - a timeout for queryFunc in ms
 * @param {ReturnType<import('../utils').logger>} context.log
 */
module.exports.disjointPathQuery = async function * disjointPathQuery ({ key, startingPeer, ourPeerId, peersSeen, signal, query, alpha, pathIndex, numPaths, cleanUp, queryFuncTimeout, log }) {
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
   *
   * @param {PeerId} peer
   * @param {Uint8Array} peerKadId
   */
  function queryPeer (peer, peerKadId) {
    if (!peer) {
      return
    }

    peersSeen.add(peer.toB58String())

    const peerXor = BigInt('0x' + toString(xor(peerKadId, kadId), 'base16'))

    queue.add(async () => {
      let timeout
      const signals = [signal]

      if (queryFuncTimeout != null) {
        timeout = new TimeoutController(queryFuncTimeout)
        signals.push(timeout.signal)
      }

      const compoundSignal = anySignal(signals)

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
              if (peersSeen.has(closerPeer.id.toB58String())) { // eslint-disable-line max-depth
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
                // TODO: uncomment this
                // continue
              }

              log('querying closer peer %p', closerPeer.id)
              queryPeer(closerPeer.id, closerPeerKadId)
            }
          }

          // @ts-ignore simulate p-queue@7.x.x event
          queue.emit('completed', event)
        }

        timeout && timeout.clear()
      } catch (/** @type {any} */ err) {
        if (signal.aborted) {
          // @ts-ignore simulate p-queue@7.x.x event
          queue.emit('error', err)
        } else {
          // @ts-ignore simulate p-queue@7.x.x event
          queue.emit('completed', queryErrorEvent({
            from: peer,
            error: err
          }))
        }
      } finally {
        timeout && timeout.clear()
      }
    }, {
      // use xor value as the queue priority - closer peers should execute first
      // subtract it from MAX_XOR because higher priority values execute sooner

      // @ts-expect-error this is supposed to be a Number but it's ok to use BigInts
      // as long as all priorities are BigInts since we won't mix BigInts and Number
      // values in arithmetic operations
      priority: MAX_XOR - peerXor
    })
  }

  // begin the query with the starting peer
  queryPeer(startingPeer, await convertPeerId(startingPeer))

  // yield results as they come in
  yield * toGenerator(queue, signal, cleanUp, log)
}

/**
 * @param {Queue} queue
 * @param {AbortSignal} signal
 * @param {import('events').EventEmitter} cleanUp
 * @param {ReturnType<import('../utils').logger>} log
 */
async function * toGenerator (queue, signal, cleanUp, log) {
  let deferred = defer()
  let running = true
  /** @type {QueryEvent[]} */
  const results = []

  const cleanup = () => {
    if (!running) {
      return
    }

    log('clean up queue, results %d, queue size %d, pending tasks %d', results.length, queue.size, queue.pending)

    running = false
    queue.clear()
    results.splice(0, results.length)
  }

  // @ts-expect-error 'completed' event is in p-queue@7.x.x
  queue.on('completed', result => {
    results.push(result)
    deferred.resolve()
  })
  // @ts-expect-error 'error' event is in p-queue@7.x.x
  queue.on('error', err => {
    log('queue error', err)
    cleanup()
    deferred.reject(err)
  })
  queue.on('idle', () => {
    log('queue idle')
    running = false
    deferred.resolve()
  })

  // clear the queue and throw if the query is aborted
  signal.addEventListener('abort', () => {
    log('abort queue')
    const wasRunning = running
    cleanup()

    if (wasRunning) {
      deferred.reject(errCode(new Error('Query aborted'), 'ERR_QUERY_ABORTED'))
    }
  })

  // the user broke out of the loop early, ensure we resolve the deferred result
  // promise and clear the queue of any remaining jobs
  cleanUp.on('cleanup', () => {
    cleanup()
    deferred.resolve()
  })

  while (running) { // eslint-disable-line no-unmodified-loop-condition
    await deferred.promise
    deferred = defer()

    // yield all available results
    while (results.length) {
      const result = results.shift()

      if (result) {
        yield result
      }
    }
  }

  // yield any remaining results
  yield * results
}
