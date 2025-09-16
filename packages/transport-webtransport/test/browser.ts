/* eslint-env mocha */

import { noise } from '@libp2p/noise'
import { ping } from '@libp2p/ping'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import all from 'it-all'
import { createLibp2p } from 'libp2p'
import { pEvent } from 'p-event'
import { Uint8ArrayList } from 'uint8arraylist'
import { webTransport } from '../src/index.js'
import type { Ping } from '@libp2p/ping'
import type { Libp2p } from 'libp2p'
import { stop } from '@libp2p/interface'

describe('libp2p-webtransport', () => {
  let node: Libp2p<{ ping: Ping }>

  beforeEach(async () => {
    node = await createLibp2p({
      transports: [webTransport()],
      connectionEncrypters: [noise()],
      connectionGater: {
        denyDialMultiaddr: async () => false
      },
      connectionMonitor: {
        enabled: false
      },
      services: {
        ping: ping()
      }
    })
  })

  afterEach(async () => {
    await stop(node)
  })

  it('webtransport connects to go-libp2p', async () => {
    if (process.env.GO_LIBP2P_ADDR == null) {
      throw new Error('GO_LIBP2P_ADDR not found')
    }

    const maStr: string = process.env.GO_LIBP2P_ADDR
    const ma = multiaddr(maStr)

    // Ping many times
    for (let index = 0; index < 50; index++) {
      const res = await node.services.ping.ping(ma)

      expect(res).to.be.greaterThan(-1)
    }
  })

  it('fails to connect without certhashes', async () => {
    if (process.env.GO_LIBP2P_ADDR == null) {
      throw new Error('GO_LIBP2P_ADDR not found')
    }

    const maStr: string = process.env.GO_LIBP2P_ADDR
    const maStrNoCerthash: string = maStr.split('/certhash')[0]
    const maStrP2p = maStr.split('/p2p/')[1]
    const ma = multiaddr(maStrNoCerthash + '/p2p/' + maStrP2p)

    await expect(node.dial(ma)).to.eventually.be.rejected()
      .with.property('name', 'NoValidAddressesError')
  })

  it('fails to connect due to an aborted signal', async () => {
    if (process.env.GO_LIBP2P_ADDR == null) {
      throw new Error('GO_LIBP2P_ADDR not found')
    }

    const maStr: string = process.env.GO_LIBP2P_ADDR
    const ma = multiaddr(maStr)

    const controller = new AbortController()
    controller.abort()

    const err = await expect(node.dial(ma, {
      signal: controller.signal
    })).to.eventually.be.rejected()
    expect(err.toString()).to.contain('aborted')
  })

  it('closes writes of streams after they have sunk a source', async () => {
    // This is the behavior of stream muxers: (see mplex, yamux and compliance tests: https://github.com/libp2p/js-libp2p/blob/main/packages/interface-compliance-tests/src/stream-muxer/close-test.ts)
    if (process.env.GO_LIBP2P_ADDR == null) {
      throw new Error('GO_LIBP2P_ADDR not found')
    }

    const maStr: string = process.env.GO_LIBP2P_ADDR
    const ma = multiaddr(maStr)

    const data = [
      Uint8Array.from([0]),
      Uint8Array.from([1, 2, 3, 4]),
      Uint8Array.from([5, 6, 7]),
      Uint8Array.from([8, 9, 10, 11]),
      Uint8Array.from([12, 13, 14, 15])
    ]

    async function * gen (): AsyncGenerator<Uint8Array, void, undefined> {
      yield * data
    }

    const stream = await node.dialProtocol(ma, '/echo/1.0.0')

    expect(stream.timeline.close).to.be.undefined()

    // send and receive data
    const [output] = await Promise.all([
      all(stream),
      Promise.resolve().then(async () => {
        for await (const buf of gen()) {
          if (!stream.send(buf)) {
            await pEvent(stream, 'drain', {
              rejectionEvents: [
                'close'
              ]
            })
          }
        }

        await stream.close()
      })
    ])

    expect(stream.writeStatus).to.equal('closed')

    // should have read all of the bytes
    expect(new Uint8ArrayList(...output).subarray()).to.equalBytes(new Uint8ArrayList(...data).subarray())

    // should have set timeline events
    expect(stream.timeline.close).to.be.greaterThan(0)
  })
})
