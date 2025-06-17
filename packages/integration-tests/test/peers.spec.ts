/* eslint-env mocha */

import { KEEP_ALIVE } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import { createLibp2p } from 'libp2p'
import pWaitFor from 'p-wait-for'
import { createBaseOptions } from './fixtures/base-options.js'
import type { Libp2p } from '@libp2p/interface'

describe('peers', () => {
  let nodes: Libp2p[]

  beforeEach(async () => {
    nodes = await Promise.all([
      createLibp2p(createBaseOptions()),
      createLibp2p(createBaseOptions()),
      createLibp2p(createBaseOptions())
    ])
  })

  afterEach(async () => Promise.all(nodes.map(async n => { await n.stop() })))

  it('should redial a peer tagged with KEEP_ALIVE', async () => {
    await nodes[0].dial(nodes[1].getMultiaddrs())

    expect(nodes[0].getConnections(nodes[1].peerId)).to.not.be.empty()

    await nodes[0].peerStore.merge(nodes[1].peerId, {
      tags: {
        [KEEP_ALIVE]: {
          value: 1
        }
      }
    })

    await Promise.all(
      nodes[0].getConnections(nodes[1].peerId).map(async conn => conn.close())
    )

    await pWaitFor(async () => {
      return nodes[0].getConnections(nodes[1].peerId).length > 0
    }, {
      interval: 100,
      timeout: {
        milliseconds: 5000,
        message: 'Did not reconnect to peer tagged with KEEP_ALIVE'
      }
    })
  })

  it('should store the multiaddr for a peer after a successful dial', async () => {
    await nodes[0].dial(nodes[1].getMultiaddrs())

    expect(nodes[0].getConnections(nodes[1].peerId)).to.not.be.empty()

    const peer = await nodes[0].peerStore.get(nodes[1].peerId)
    expect(peer.addresses).to.not.be.empty()
    expect(peer.metadata.get('last-dial-success')).to.be.ok()
  })
})
