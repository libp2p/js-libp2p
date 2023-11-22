/* eslint-env mocha */

import { ping, PING_PROTOCOL, type PingService } from '@libp2p/ping'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { pipe } from 'it-pipe'
import { createLibp2p } from 'libp2p'
import pDefer from 'p-defer'
import { createBaseOptions } from './fixtures/base-options.js'
import type { Libp2p } from '@libp2p/interface'

describe.only('ping', () => {
  let nodes: Array<Libp2p<{ ping: PingService }>>

  beforeEach(async () => {
    nodes = await Promise.all([
      createLibp2p(createBaseOptions({
        services: {
          ping: ping()
        }
      })),
      createLibp2p(createBaseOptions({
        services: {
          ping: ping()
        }
      })),
      createLibp2p(createBaseOptions({
        services: {
          ping: ping()
        }
      }))
    ])
  })

  afterEach(async () => Promise.all(nodes.map(async n => { await n.stop() })))

  it('ping once from peer0 to peer1 using a multiaddr', async () => {
    const ma = multiaddr(nodes[2].getMultiaddrs()[0])
    const latency = await nodes[0].services.ping.ping(ma)

    expect(latency).to.be.a('Number')
  })

  it('ping once from peer0 to peer1 using a peerId', async () => {
    const latency = await nodes[0].services.ping.ping(nodes[1].getMultiaddrs())

    expect(latency).to.be.a('Number')
  })

  it('ping several times for getting an average', async () => {
    const latencies = []

    for (let i = 0; i < 5; i++) {
      latencies.push(await nodes[1].services.ping.ping(nodes[0].getMultiaddrs()))
    }

    const averageLatency = latencies.reduce((p, c) => p + c, 0) / latencies.length
    expect(averageLatency).to.be.a('Number')
  })

  it('only waits for the first response to arrive', async () => {
    const defer = pDefer()

    await nodes[1].unhandle(PING_PROTOCOL)
    await nodes[1].handle(PING_PROTOCOL, ({ stream }) => {
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
    }, {
      runOnTransientConnection: true
    })

    const latency = await nodes[0].services.ping.ping(nodes[1].getMultiaddrs())

    expect(latency).to.be.a('Number')

    defer.resolve()
  })

  it('allows two incoming streams from the same peer', async () => {
    const remote = nodes[0]
    const client = await createLibp2p(createBaseOptions({
      services: {
        ping: ping({
          // Allow two outbound ping streams.
          // It is not allowed by the spec, but this test needs to open two concurrent streams.
          maxOutboundStreams: 2
        })
      }
    }))
    await client.peerStore.patch(remote.peerId, {
      multiaddrs: remote.getMultiaddrs()
    })
    // register our new node for shutdown after the test finishes
    // otherwise the Mocha/Node.js process never finishes
    nodes.push(client)

    // Send two ping requests in parallel, this should open two concurrent streams
    const results = await Promise.allSettled([
      client.services.ping.ping(remote.peerId),
      client.services.ping.ping(remote.peerId)
    ])

    // Verify that the remote peer accepted both inbound streams
    expect(results.map(describe)).to.deep.equal(['fulfilled', 'fulfilled'])

    function describe (result: PromiseSettledResult<number>): string {
      return result.status === 'fulfilled' ? result.status : result.reason ?? result.status
    }
  })
})
