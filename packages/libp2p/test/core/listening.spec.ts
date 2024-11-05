/* eslint-env mocha */

import { stop } from '@libp2p/interface'
import { memory } from '@libp2p/memory'
import { plaintext } from '@libp2p/plaintext'
import { expect } from 'aegir/chai'
import { createLibp2p } from '../../src/index.js'
import type { Libp2p } from '@libp2p/interface'

describe('Listening', () => {
  let libp2p: Libp2p

  after(async () => {
    await stop(libp2p)
  })

  it('should replace wildcard host and port with actual host and port on startup', async () => {
    const listenAddress = '/memory/address-1'

    libp2p = await createLibp2p({
      addresses: {
        listen: [
          listenAddress
        ]
      },
      transports: [
        memory()
      ],
      connectionEncrypters: [
        plaintext()
      ]
    })

    await libp2p.start()

    // @ts-expect-error components field is private
    const addrs = libp2p.components.transportManager.getAddrs()

    // Should get something like:
    //   /memory/address-1
    expect(addrs).to.have.lengthOf(1)
    expect(addrs[0].toString()).to.equal(listenAddress)
  })
})
