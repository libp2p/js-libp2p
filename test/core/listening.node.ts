/* eslint-env mocha */

import { expect } from 'aegir/utils/chai.js'
import { TCP } from '@libp2p/tcp'
import { NOISE } from '@chainsafe/libp2p-noise'
import { createPeerId } from '../utils/creators/peer.js'
import type { PeerId } from '@libp2p/interfaces/peer-id'
import { createLibp2pNode, Libp2pNode } from '../../src/libp2p.js'

const listenAddr = '/ip4/0.0.0.0/tcp/0'

describe('Listening', () => {
  let peerId: PeerId
  let libp2p: Libp2pNode

  before(async () => {
    peerId = await createPeerId()
  })

  after(async () => {
    await libp2p.stop()
  })

  it('should replace wildcard host and port with actual host and port on startup', async () => {
    libp2p = await createLibp2pNode({
      peerId,
      addresses: {
        listen: [listenAddr]
      },
      transports: [
        new TCP()
      ],
      connectionEncrypters: [
        NOISE
      ]
    })

    await libp2p.start()

    const addrs = libp2p.components.getTransportManager().getAddrs()

    // Should get something like:
    //   /ip4/127.0.0.1/tcp/50866
    //   /ip4/192.168.1.2/tcp/50866
    expect(addrs.length).to.be.at.least(2)
    for (const addr of addrs) {
      const opts = addr.toOptions()
      expect(opts.family).to.equal(4)
      expect(opts.transport).to.equal('tcp')
      expect(opts.host).to.match(/[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/)
      expect(opts.port).to.be.gt(0)
    }
  })
})
