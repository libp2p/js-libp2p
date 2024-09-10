/* eslint-env mocha */

import { plaintext } from '@libp2p/plaintext'
import { tcp } from '@libp2p/tcp'
import { expect } from 'aegir/chai'
import { createLibp2p } from '../../src/index.js'
import type { Libp2p } from '@libp2p/interface'

const listenAddr = '/ip4/0.0.0.0/tcp/0'

describe('Listening', () => {
  let libp2p: Libp2p

  after(async () => {
    await libp2p.stop()
  })

  it('should replace wildcard host and port with actual host and port on startup', async () => {
    libp2p = await createLibp2p({
      addresses: {
        listen: [listenAddr]
      },
      transports: [
        tcp()
      ],
      connectionEncrypters: [
        plaintext()
      ]
    })

    await libp2p.start()

    // @ts-expect-error components field is private
    const addrs = libp2p.components.transportManager.getAddrs()

    // Should get something like:
    //   /ip4/127.0.0.1/tcp/50866
    //   /ip4/192.168.1.2/tcp/50866
    expect(addrs.length).to.be.at.least(1)
    for (const addr of addrs) {
      const opts = addr.toOptions()
      expect(opts.family).to.equal(4)
      expect(opts.transport).to.equal('tcp')
      expect(opts.host).to.match(/[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/)
      expect(opts.port).to.be.gt(0)
    }
  })
})
