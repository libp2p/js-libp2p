/* eslint-env mocha */

import { expect } from 'aegir/chai'
import delay from 'delay'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { QueryManager } from '../src/query/manager.js'
import { createPeerId, createPeerIds } from './utils/create-peer-id.js'
import all from 'it-all'
import drain from 'it-drain'
import { sortClosestPeers } from './utils/sort-closest-peers.js'
import {
  peerResponseEvent,
  valueEvent,
  queryErrorEvent
} from '../src/query/events.js'
import type { PeerId } from '@libp2p/interface-peer-id'
import { EventTypes, QueryEvent } from '@libp2p/interface-dht'
import { MESSAGE_TYPE } from '../src/message/index.js'
import type { QueryFunc } from '../src/query/types.js'
import { convertBuffer } from '../src/utils.js'

interface TopologyEntry {
  delay?: number
  error?: Error
  value?: Uint8Array
  closerPeers?: number[]
  event: QueryEvent
}
type Topology = Record<string, {
  delay?: number | undefined
  error?: Error | undefined
  event: QueryEvent
}>

describe('QueryManager', () => {
  let ourPeerId: PeerId
  let peers: PeerId[]
  let key: Uint8Array

  function createTopology (opts: Record<number, { delay?: number, error?: Error, value?: Uint8Array, closerPeers?: number[] }>): Topology {
    const topology: Record<string, { delay?: number, error?: Error, event: QueryEvent }> = {}

    Object.keys(opts).forEach(key => {
      const id = parseInt(key)
      const from = peers[id]
      const config = opts[id]

      let event: QueryEvent

      if (config.value !== undefined) {
        event = valueEvent({ from, value: config.value })
      } else if (config.error != null) {
        event = queryErrorEvent({ from, error: config.error })
      } else {
        event = peerResponseEvent({
          from,
          messageType: MESSAGE_TYPE.GET_VALUE,
          closer: (config.closerPeers ?? []).map((id) => ({
            id: peers[id],
            multiaddrs: [],
            protocols: []
          }))
        })
      }

      const entry: TopologyEntry = {
        event
      }

      if (config.delay != null) {
        entry.delay = config.delay
      }

      topology[from.toString()] = entry
    })

    return topology
  }

  function createQueryFunction (topology: Record<string, { delay?: number, event: QueryEvent }>): QueryFunc {
    const queryFunc: QueryFunc = async function * ({ peer }) {
      const res = topology[peer.toString()]

      if (res.delay != null) {
        await delay(res.delay)
      }

      yield res.event
    }

    return queryFunc
  }

  before(async () => {
    const unsortedPeers = await createPeerIds(39)
    ourPeerId = await createPeerId()
    key = (await createPeerId()).toBytes()

    // sort remaining peers by XOR distance to the key, low -> high
    peers = await sortClosestPeers(unsortedPeers, await convertBuffer(key))
  })

  it('does not run queries before start', async () => {
    const manager = new QueryManager({
      peerId: ourPeerId
    }, {
      disjointPaths: 1
    })

    // @ts-expect-error not enough params
    await expect(all(manager.run())).to.eventually.be.rejectedWith(/not started/)
  })

  it('does not run queries after stop', async () => {
    const manager = new QueryManager({
      peerId: ourPeerId
    }, {
      disjointPaths: 1
    })

    await manager.start()
    await manager.stop()

    // @ts-expect-error not enough params
    await expect(all(manager.run())).to.eventually.be.rejectedWith(/not started/)
  })

  it('should pass query context', async () => {
    const manager = new QueryManager({
      peerId: ourPeerId
    }, {
      disjointPaths: 1
    })
    await manager.start()

    const queryFunc: QueryFunc = async function * (context) { // eslint-disable-line require-await
      expect(context).to.have.property('key').that.equalBytes(key)
      expect(context).to.have.property('peer').that.deep.equals(peers[0])
      expect(context).to.have.property('signal').that.is.an.instanceOf(AbortSignal)
      expect(context).to.have.property('pathIndex').that.equals(0)
      expect(context).to.have.property('numPaths').that.equals(1)

      yield valueEvent({
        from: context.peer,
        value: uint8ArrayFromString('cool')
      })
    }

    const results = await all(manager.run(key, peers, queryFunc))

    expect(results).to.have.lengthOf(1)
    // @ts-expect-error types are wrong
    expect(results).to.deep.containSubset([{
      value: uint8ArrayFromString('cool')
    }])

    await manager.stop()
  })

  it('simple run - succeed finding value', async () => {
    const manager = new QueryManager({
      peerId: ourPeerId
    }, {
      disjointPaths: 1,
      alpha: 1
    })
    await manager.start()

    const peersQueried = []

    const queryFunc: QueryFunc = async function * ({ peer, signal }) { // eslint-disable-line require-await
      expect(signal).to.be.an.instanceOf(AbortSignal)
      peersQueried.push(peer)

      if (peersQueried.length === 1) {
        // query more peers
        yield peerResponseEvent({
          from: peer,
          messageType: MESSAGE_TYPE.GET_VALUE,
          closer: peers.slice(0, 5).map(id => ({ id, multiaddrs: [], protocols: [] }))
        })
      } else if (peersQueried.length === 6) {
        // all peers queried, return result
        yield valueEvent({
          from: peer,
          value: uint8ArrayFromString('cool')
        })
      } else {
        // a peer that cannot help in our query
        yield peerResponseEvent({
          from: peer,
          messageType: MESSAGE_TYPE.GET_VALUE
        })
      }
    }

    const results = await all(manager.run(key, [peers[7]], queryFunc))

    // e.g. our starting peer plus the 5x closerPeers returned n the first iteration
    expect(results).to.have.lengthOf(6)

    expect(results).to.containSubset([{
      value: uint8ArrayFromString('cool')
    }])
    // should be a result in there somewhere

    await manager.stop()
  })

  it('simple run - fail to find value', async () => {
    const manager = new QueryManager({
      peerId: ourPeerId
    }, {
      disjointPaths: 1,
      alpha: 1
    })
    await manager.start()

    const peersQueried = []

    const queryFunc: QueryFunc = async function * ({ peer }) { // eslint-disable-line require-await
      peersQueried.push(peer)

      if (peersQueried.length === 1) {
        // query more peers
        yield peerResponseEvent({
          from: peer,
          messageType: MESSAGE_TYPE.GET_VALUE,
          closer: peers.slice(0, 5).map(id => ({ id, multiaddrs: [], protocols: [] }))
        })
      } else {
        // a peer that cannot help in our query
        yield peerResponseEvent({
          from: peer,
          messageType: MESSAGE_TYPE.GET_VALUE
        })
      }
    }

    const results = await all(manager.run(key, [peers[7]], queryFunc))

    // e.g. our starting peer plus the 5x closerPeers returned n the first iteration
    expect(results).to.have.lengthOf(6)
    // should not be a result in there
    expect(results.find(res => res.name === 'VALUE')).to.not.be.ok()

    await manager.stop()
  })

  it('should abort a query', async () => {
    const manager = new QueryManager({
      peerId: ourPeerId
    }, {
      disjointPaths: 2,
      alpha: 1
    })
    await manager.start()

    const controller = new AbortController()
    let aborted

    // 0 -> 10 -> 11 -> 12...
    // 1 -> 20 -> 21 -> 22...
    const topology = createTopology({
      0: { closerPeers: [10] },
      10: { closerPeers: [11] },
      11: { closerPeers: [12] },
      1: { closerPeers: [20] },
      20: { closerPeers: [21] },
      21: { closerPeers: [22] }
    })

    const queryFunc: QueryFunc = async function * ({ peer, signal }) { // eslint-disable-line require-await
      signal.addEventListener('abort', () => {
        aborted = true
      })

      await delay(1000)

      yield topology[peer.toString()].event
    }

    setTimeout(() => {
      controller.abort()
    }, 10)

    await expect(all(manager.run(key, peers, queryFunc, { signal: controller.signal }))).to.eventually.be.rejected().with.property('code', 'ERR_QUERY_ABORTED')

    expect(aborted).to.be.true()

    await manager.stop()
  })

  it('should allow a sub-query to timeout without aborting the whole query', async () => {
    const manager = new QueryManager({
      peerId: ourPeerId
    }, {
      disjointPaths: 2,
      alpha: 2
    })
    await manager.start()

    // 2 -> 1 -> 0
    // 4 -> 3 -> 0
    const topology = createTopology({
      0: { value: uint8ArrayFromString('true') },
      1: { delay: 1000, closerPeers: [0] },
      2: { delay: 1000, closerPeers: [1] },
      3: { delay: 10, closerPeers: [0] },
      4: { delay: 10, closerPeers: [3] }
    })

    const queryFunc: QueryFunc = async function * ({ peer, signal }) { // eslint-disable-line require-await
      let aborted = false

      signal.addEventListener('abort', () => {
        aborted = true
      })

      const res = topology[peer.toString()]

      if (res.delay != null) {
        await delay(res.delay)
      }

      if (aborted) {
        throw new Error('Aborted by signal')
      }

      yield res.event
    }

    const result = await all(manager.run(key, [peers[2], peers[4]], queryFunc, { queryFuncTimeout: 500 }))

    // should have traversed through the three nodes to the value and the one that timed out
    expect(result).to.have.lengthOf(4)
    expect(result).to.have.deep.nested.property('[2].value', uint8ArrayFromString('true'))
    expect(result).to.have.nested.property('[3].error.message', 'Aborted by signal')

    await manager.stop()
  })

  it('does not return an error if only some queries error', async () => {
    const manager = new QueryManager({
      peerId: ourPeerId
    }, {
      disjointPaths: 10
    })
    await manager.start()

    const queryFunc: QueryFunc = async function * ({ peer, pathIndex }) { // eslint-disable-line require-await
      if (pathIndex % 2 === 0) {
        yield queryErrorEvent({
          from: peer,
          error: new Error('Urk!')
        })
      } else {
        yield peerResponseEvent({ from: peer, messageType: MESSAGE_TYPE.GET_VALUE })
      }
    }

    const results = await all(manager.run(key, peers, queryFunc))

    // didn't add any extra peers during the query
    expect(results).to.have.lengthOf(manager.disjointPaths)
    // should not be a result in there
    expect(results.find(res => res.name === 'VALUE')).to.not.be.ok()
    // half of the results should have the error property
    expect(results.reduce((acc, curr) => {
      if (curr.name === 'QUERY_ERROR') {
        return acc + 1
      }

      return acc
    }, 0)).to.equal(5)

    await manager.stop()
  })

  it('returns empty run if initial peer list is empty', async () => {
    const manager = new QueryManager({
      peerId: ourPeerId
    }, {
      disjointPaths: 10
    })
    await manager.start()

    const queryFunc: QueryFunc = async function * ({ peer }) { // eslint-disable-line require-await
      yield valueEvent({ from: peer, value: uint8ArrayFromString('cool') })
    }

    const results = await all(manager.run(key, [], queryFunc))

    expect(results).to.have.lengthOf(0)

    await manager.stop()
  })

  it('should query closer peers first', async () => {
    const manager = new QueryManager({
      peerId: ourPeerId
    }, {
      disjointPaths: 1,
      alpha: 1
    })
    await manager.start()

    // 9 -> 8 -> 7 -> 6 -> 5 -> 0
    //  \-> 4 -> 3 -> 2 -> 1 -> 0     <-- should take this branch first
    const topology = createTopology({
      9: { closerPeers: [8, 4] },
      8: { closerPeers: [7] },
      7: { closerPeers: [6] },
      6: { closerPeers: [5] },
      5: { closerPeers: [0] },
      4: { closerPeers: [3] },
      3: { closerPeers: [2] },
      2: { closerPeers: [1] },
      1: { closerPeers: [0] },
      0: { value: uint8ArrayFromString('hello world') }
    })

    const results = await all(manager.run(key, [peers[9]], createQueryFunction(topology)))
    const traversedPeers = results
      .map(event => {
        if (event.type !== EventTypes.PEER_RESPONSE && event.type !== EventTypes.VALUE) {
          throw new Error(`Unexpected query event type ${event.type}`)
        }

        return event.from
      })

    expect(traversedPeers).to.deep.equal([
      peers[9],
      peers[4],
      peers[3],
      peers[2],
      peers[1],
      peers[0],
      peers[8],
      peers[7],
      peers[6],
      peers[5]
    ])

    await manager.stop()
  })

  it('should stop when passing through the same node twice', async () => {
    const manager = new QueryManager({
      peerId: ourPeerId
    }, {
      disjointPaths: 20,
      alpha: 1
    })
    await manager.start()

    const topology = createTopology({
      6: { closerPeers: [2] },
      5: { closerPeers: [4] },
      4: { closerPeers: [3] },
      3: { closerPeers: [2] },
      2: { closerPeers: [1] },
      1: { closerPeers: [0] },
      0: { value: uint8ArrayFromString('hello world') }
    })

    const results = await all(manager.run(key, [peers[6], peers[5]], createQueryFunction(topology)))
    const traversedPeers = results
      .map(event => {
        if (event.type !== EventTypes.PEER_RESPONSE && event.type !== EventTypes.VALUE) {
          throw new Error(`Unexpected query event type ${event.type}`)
        }

        return event.from
      })

    expect(traversedPeers).lengthOf(7)

    await manager.stop()
  })

  it('only closerPeers', async () => {
    const manager = new QueryManager({
      peerId: ourPeerId
    }, {
      disjointPaths: 1,
      alpha: 1
    })
    await manager.start()

    const queryFunc: QueryFunc = async function * ({ peer }) { // eslint-disable-line require-await
      yield peerResponseEvent({
        from: peer,
        messageType: MESSAGE_TYPE.GET_VALUE,
        closer: [{
          id: peers[2],
          multiaddrs: [],
          protocols: []
        }]
      })
    }

    const results = await all(manager.run(key, [peers[3]], queryFunc))

    expect(results).to.have.lengthOf(2)
    expect(results).to.have.deep.nested.property('[0].closer[0].id', peers[2])
    expect(results).to.have.deep.nested.property('[1].closer[0].id', peers[2])

    await manager.stop()
  })

  it('only closerPeers concurrent', async () => {
    const manager = new QueryManager({
      peerId: ourPeerId
    }, {
      disjointPaths: 3
    })
    await manager.start()

    //  9 -> 2
    //  8 -> 6 -> 4
    //       5 -> 3
    //  7 -> 1 -> 0
    const topology = createTopology({
      0: { closerPeers: [] },
      1: { closerPeers: [0] },
      2: { closerPeers: [] },
      3: { closerPeers: [] },
      4: { closerPeers: [] },
      5: { closerPeers: [3] },
      6: { closerPeers: [4, 5] },
      7: { closerPeers: [1] },
      8: { closerPeers: [6] },
      9: { closerPeers: [2] }
    })

    const results = await all(manager.run(key, [peers[9], peers[8], peers[7]], createQueryFunction(topology)))

    // Should visit all peers
    expect(results).to.have.lengthOf(10)

    await manager.stop()
  })

  it('queries stop after shutdown', async () => {
    const manager = new QueryManager({
      peerId: ourPeerId
    }, {
      disjointPaths: 1,
      alpha: 1
    })
    await manager.start()

    // 3 -> 2 -> 1 -> 0
    const topology = createTopology({
      0: { closerPeers: [] },
      // Should not reach here because query gets shut down
      1: { closerPeers: [0] },
      2: { closerPeers: [1] },
      3: { closerPeers: [2] }
    })

    const visited: PeerId[] = []

    const queryFunc: QueryFunc = async function * ({ peer }) { // eslint-disable-line require-await
      visited.push(peer)

      const getResult = async (): Promise<QueryEvent> => {
        const res = topology[peer.toString()]
        // this delay is necessary so `dhtA.stop` has time to stop the
        // requests before they all complete
        await delay(100)

        return res.event
      }

      // Shut down after visiting peers[2]
      if (peer === peers[2]) {
        await manager.stop()

        yield getResult()
      }

      yield getResult()
    }

    // shutdown will cause the query to stop early but without an error
    await drain(manager.run(key, [peers[3]], queryFunc))

    // Should only visit peers up to the point where we shut down
    expect(visited).to.have.lengthOf(2)
    expect(visited).to.deep.include(peers[3])
    expect(visited).to.deep.include(peers[2])
  })

  it('disjoint path values', async () => {
    const manager = new QueryManager({
      peerId: ourPeerId
    }, {
      disjointPaths: 2
    })
    await manager.start()

    const values = ['v0', 'v1'].map((str) => uint8ArrayFromString(str))

    // 2 -> 1 -> 0 (v0)
    // 4 -> 3 (v1)
    const topology = createTopology({
      0: { value: values[0] },
      // Top level node
      1: { closerPeers: [0] },
      2: { closerPeers: [1] },
      3: { value: values[1] },
      4: { closerPeers: [3] }
    })

    const results = await all(manager.run(key, [peers[2], peers[4]], createQueryFunction(topology)))

    // visited all the nodes
    expect(results).to.have.lengthOf(5)

    // found both values
    // @ts-expect-error types are wrong
    expect(results).to.deep.containSubset([{
      value: values[0]
    }])
    // @ts-expect-error types are wrong
    expect(results).to.deep.containSubset([{
      value: values[1]
    }])

    await manager.stop()
  })

  it('disjoint path continue other paths after error on one path', async () => {
    const manager = new QueryManager({
      peerId: ourPeerId
    }, {
      disjointPaths: 2
    })
    await manager.start()

    // 2 -> 1 (delay) -> 0 [pathComplete]
    // 5 -> 4 [error] -> 3
    const topology = createTopology({
      0: { value: uint8ArrayFromString('true') },
      // This query has a delay which means it only returns after the other
      // path has already returned an error
      1: { delay: 100, closerPeers: [0] },
      2: { closerPeers: [1] },
      3: { value: uint8ArrayFromString('false') },
      // Return an error at this point
      4: { closerPeers: [3], error: new Error('Nooo!') },
      5: { closerPeers: [4] }
    })

    const results = await all(manager.run(key, [peers[2], peers[5]], createQueryFunction(topology)))

    // @ts-expect-error types are wrong
    expect(results).to.deep.containSubset([{
      value: uint8ArrayFromString('true')
    }])
    // @ts-expect-error types are wrong
    expect(results).to.not.deep.containSubset([{
      value: uint8ArrayFromString('false')
    }])

    await manager.stop()
  })

  it('should end paths when they have no closer peers to those already queried', async () => {
    const manager = new QueryManager({
      peerId: ourPeerId
    }, {
      disjointPaths: 1, alpha: 1
    })
    await manager.start()

    // 3 -> 2 -> 1 -> 4 -> 5 -> 6 // should stop at 1
    const topology = createTopology({
      1: { closerPeers: [4] },
      2: { closerPeers: [1] },
      3: { closerPeers: [2] },
      4: { closerPeers: [5] },
      5: { closerPeers: [6] },
      6: {}
    })

    const results = await all(manager.run(key, [peers[3]], createQueryFunction(topology)))

    // should not have a value
    expect(results.find(res => res.name === 'VALUE')).to.not.be.ok()

    // should have traversed peers 3, 2 & 1
    expect(results).to.containSubset([{
      from: peers[3]
    }, {
      from: peers[2]
    }, {
      from: peers[1]
    }])

    // should not have traversed peers 4, 5 & 6
    expect(results).to.not.containSubset([{
      from: peers[4]
    }, {
      from: peers[5]
    }, {
      from: peers[6]
    }])

    await manager.stop()
  })
})
