'use strict'
/* eslint-env mocha */

const { expect } = require('aegir/utils/chai')

const pTimes = require('p-times')
const pipe = require('it-pipe')

const peerUtils = require('../utils/creators/peer')
const baseOptions = require('../utils/base-options')
const { PROTOCOL } = require('../../src/ping/constants')

describe('ping', () => {
  let nodes

  beforeEach(async () => {
    nodes = await peerUtils.createPeer({
      number: 3,
      config: baseOptions
    })

    nodes[0].peerStore.addressBook.set(nodes[1].peerId, nodes[1].multiaddrs)
    nodes[1].peerStore.addressBook.set(nodes[0].peerId, nodes[0].multiaddrs)
  })

  afterEach(() => Promise.all(nodes.map(n => n.stop())))

  it('ping once from peer0 to peer1 using a multiaddr', async () => {
    const ma = `${nodes[2].multiaddrs[0]}/p2p/${nodes[2].peerId.toB58String()}`
    const latency = await nodes[0].ping(ma)

    expect(latency).to.be.a('Number')
  })

  it('ping once from peer0 to peer1 using a peerId', async () => {
    const latency = await nodes[0].ping(nodes[1].peerId)

    expect(latency).to.be.a('Number')
  })

  it('ping several times for getting an average', async () => {
    const latencies = await pTimes(5, () => nodes[1].ping(nodes[0].peerId))

    const averageLatency = latencies.reduce((p, c) => p + c, 0) / latencies.length
    expect(averageLatency).to.be.a('Number')
  })

  it('only waits for the first response to arrive', async () => {
    nodes[1].handle(PROTOCOL, async ({ connection, stream }) => {
      let firstInvocation = true

      await pipe(
        stream,
        function (stream) {
          const output = {
            [Symbol.asyncIterator]: () => output,
            next: async () => {
              if (firstInvocation) {
                firstInvocation = false

                // eslint-disable-next-line no-unreachable-loop
                for await (const data of stream) {
                  return {
                    value: data,
                    done: false
                  }
                }
              } else {
                return new Promise() // never resolve
              }
            }
          }

          return output
        },
        stream
      )
    })

    const latency = await nodes[0].ping(nodes[1].peerId)

    expect(latency).to.be.a('Number')
  })
})
