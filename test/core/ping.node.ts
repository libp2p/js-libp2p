/* eslint-env mocha */

import { expect } from 'aegir/chai'
import pTimes from 'p-times'
import { pipe } from 'it-pipe'
import { createNode, populateAddressBooks } from '../utils/creators/peer.js'
import { createBaseOptions } from '../utils/base-options.js'
import { PROTOCOL } from '../../src/ping/constants.js'
import { Multiaddr } from '@multiformats/multiaddr'
import pDefer from 'p-defer'
import type { Libp2pNode } from '../../src/libp2p.js'

describe('ping', () => {
  let nodes: Libp2pNode[]

  beforeEach(async () => {
    nodes = await Promise.all([
      createNode({ config: createBaseOptions() }),
      createNode({ config: createBaseOptions() }),
      createNode({ config: createBaseOptions() })
    ])
    await populateAddressBooks(nodes)

    await nodes[0].components.getPeerStore().addressBook.set(nodes[1].peerId, nodes[1].getMultiaddrs())
    await nodes[1].components.getPeerStore().addressBook.set(nodes[0].peerId, nodes[0].getMultiaddrs())
  })

  afterEach(async () => await Promise.all(nodes.map(async n => await n.stop())))

  it('ping once from peer0 to peer1 using a multiaddr', async () => {
    const ma = new Multiaddr(`${nodes[2].getMultiaddrs()[0].toString()}/p2p/${nodes[2].peerId.toString()}`)
    const latency = await nodes[0].ping(ma)

    expect(latency).to.be.a('Number')
  })

  it('ping once from peer0 to peer1 using a peerId', async () => {
    const latency = await nodes[0].ping(nodes[1].peerId)

    expect(latency).to.be.a('Number')
  })

  it('ping several times for getting an average', async () => {
    const latencies = await pTimes(5, async () => await nodes[1].ping(nodes[0].peerId))

    const averageLatency = latencies.reduce((p, c) => p + c, 0) / latencies.length
    expect(averageLatency).to.be.a('Number')
  })

  it('only waits for the first response to arrive', async () => {
    const defer = pDefer()

    await nodes[1].unhandle(PROTOCOL)
    await nodes[1].handle(PROTOCOL, ({ stream }) => {
      void pipe(
        stream,
        async function * (stream) {
          for await (const data of stream) {
            yield data

            // something longer than the test timeout
            await defer.promise
          }
        },
        stream
      )
    })

    const latency = await nodes[0].ping(nodes[1].peerId)

    expect(latency).to.be.a('Number')

    defer.resolve()
  })
})
