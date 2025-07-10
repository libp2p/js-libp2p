/* eslint-env mocha */

import { FaultTolerance, stop } from '@libp2p/interface'
import { memory } from '@libp2p/memory'
import { plaintext } from '@libp2p/plaintext'
import { expect } from 'aegir/chai'
import { createLibp2p } from 'libp2p'
import type { Libp2p } from '@libp2p/interface'

describe('Listening', () => {
  let libp2p: Libp2p

  afterEach(async () => {
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

  it('fails to start if multiaddr fails to listen', async () => {
    libp2p = await createLibp2p({
      addresses: {
        listen: ['/ip4/127.0.0.1/tcp/0']
      },
      transports: [memory()],
      connectionEncrypters: [plaintext()],
      start: false
    })

    await expect(libp2p.start()).to.eventually.be.rejected
      .with.property('name', 'UnsupportedListenAddressesError')
  })

  it('does not fail to start if provided listen multiaddr are not compatible to configured transports (when supporting dial only mode)', async () => {
    libp2p = await createLibp2p({
      addresses: {
        listen: ['/ip4/127.0.0.1/tcp/0']
      },
      transportManager: {
        faultTolerance: FaultTolerance.NO_FATAL
      },
      transports: [
        memory()
      ],
      connectionEncrypters: [
        plaintext()
      ],
      start: false
    })

    await expect(libp2p.start()).to.eventually.be.undefined()
  })

  it('does not fail to start if provided listen multiaddr fail to listen on configured transports (when supporting dial only mode)', async () => {
    libp2p = await createLibp2p({
      addresses: {
        listen: ['/ip4/127.0.0.1/tcp/12345/p2p/QmWDn2LY8nannvSWJzruUYoLZ4vV83vfCBwd8DipvdgQc3/p2p-circuit']
      },
      transportManager: {
        faultTolerance: FaultTolerance.NO_FATAL
      },
      transports: [
        memory()
      ],
      connectionEncrypters: [
        plaintext()
      ],
      start: false
    })

    await expect(libp2p.start()).to.eventually.be.undefined()
  })
})
