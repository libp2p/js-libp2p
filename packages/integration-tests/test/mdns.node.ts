/* eslint-env mocha */

import { randomBytes } from '@libp2p/crypto'
import { start } from '@libp2p/interface'
import { mdns } from '@libp2p/mdns'
import { tcp } from '@libp2p/tcp'
import { multiaddr } from '@multiformats/multiaddr'
import { createLibp2p } from 'libp2p'
import defer from 'p-defer'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import type { Libp2p } from '@libp2p/interface'
import type { Libp2pOptions } from 'libp2p'

const isCI = process.env.CI != null
const listenAddr = multiaddr('/ip4/127.0.0.1/tcp/0')

describe('mdns', () => {
  let libp2p: Libp2p

  afterEach(async () => {
    if (libp2p != null) {
      await libp2p.stop()
    }
  })

  it('should discover all peers on the local network', async () => {
    if (isCI) {
      return
    }

    const deferred = defer()

    // use a random tag to prevent CI collision
    const serviceTag = `libp2p-test-${uint8ArrayToString(randomBytes(4), 'base16')}.local`

    const getConfig = (): Libp2pOptions => ({
      addresses: {
        listen: [
          listenAddr.toString()
        ]
      },
      transports: [
        tcp()
      ],
      peerDiscovery: [
        mdns({
          interval: 200, // discover quickly
          serviceTag
        })
      ]
    })

    libp2p = await createLibp2p(getConfig())
    const remoteLibp2p1 = await createLibp2p(getConfig())
    const remoteLibp2p2 = await createLibp2p(getConfig())

    const expectedPeers = new Set([
      remoteLibp2p1.peerId.toString(),
      remoteLibp2p2.peerId.toString()
    ])

    libp2p.addEventListener('peer:discovery', (evt) => {
      const { id } = evt.detail

      expectedPeers.delete(id.toString())

      if (expectedPeers.size === 0) {
        libp2p.removeEventListener('peer:discovery')
        deferred.resolve()
      }
    })

    await start(
      remoteLibp2p1,
      remoteLibp2p2,
      libp2p
    )

    await deferred.promise

    await remoteLibp2p1.stop()
    await remoteLibp2p2.stop()
  })
})
