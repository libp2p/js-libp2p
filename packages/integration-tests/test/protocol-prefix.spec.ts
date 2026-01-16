import { fetch } from '@libp2p/fetch'
import { identify } from '@libp2p/identify'
import { ping } from '@libp2p/ping'
import { expect } from 'aegir/chai'
import { createLibp2p } from 'libp2p'
import { pEvent } from 'p-event'
import { createBaseOptions } from './fixtures/base-options.js'
import type { Libp2p } from '@libp2p/interface'

describe('Protocol prefix is configurable', () => {
  let libp2p: Libp2p

  afterEach(async () => {
    if (libp2p != null) {
      await libp2p.stop()
    }
  })

  it('protocolPrefix is provided', async () => {
    const testProtocol = 'test-protocol'
    libp2p = await createLibp2p(createBaseOptions({
      services: {
        identify: identify({
          protocolPrefix: testProtocol
        }),
        ping: ping({
          protocolPrefix: testProtocol
        }),
        fetch: fetch({
          protocolPrefix: testProtocol
        })
      },
      start: false
    }))

    const eventPromise = pEvent(libp2p, 'self:peer:update')
    await libp2p.start()
    await eventPromise

    const peer = await libp2p.peerStore.get(libp2p.peerId)
    expect(peer.protocols).to.include.members([
      `/${testProtocol}/fetch/0.0.1`,
      `/${testProtocol}/id/1.0.0`,
      `/${testProtocol}/ping/1.0.0`
    ])
  })

  it('protocolPrefix is not provided', async () => {
    libp2p = await createLibp2p(createBaseOptions({
      services: {
        identify: identify(),
        ping: ping(),
        fetch: fetch()
      },
      start: false
    }))

    const eventPromise = pEvent(libp2p, 'self:peer:update')
    await libp2p.start()
    await eventPromise

    const peer = await libp2p.peerStore.get(libp2p.peerId)
    expect(peer.protocols).to.include.members([
      '/ipfs/id/1.0.0',
      '/ipfs/ping/1.0.0',
      '/libp2p/fetch/0.0.1'
    ])
  })
})
