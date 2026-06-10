import { randomBytes } from '@libp2p/crypto'
import { generateKeyPair } from '@libp2p/crypto/keys'
import { start, stop } from '@libp2p/interface'
import { mdns } from '@libp2p/mdns'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { tcp } from '@libp2p/tcp'
import { multiaddr } from '@multiformats/multiaddr'
import { createLibp2p } from 'libp2p'
import defer from 'p-defer'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import type { Libp2p } from '@libp2p/interface'
import type { Libp2pOptions } from 'libp2p'

const listenAddr = multiaddr('/ip4/127.0.0.1/tcp/0')

describe('mdns', () => {
  let libp2p: Libp2p

  afterEach(async () => {
    if (libp2p != null) {
      await libp2p.stop()
    }
  })

  it('should discover all peers on the local network', async function () {
    if (process.env.CI != null) {
      // MDNS is flaky in CI
      return this.skip()
    }

    const deferred = defer()

    // use a random tag to prevent CI collision
    const serviceTag = `libp2p-test-${uint8ArrayToString(randomBytes(4), 'base16')}.local`

    const getConfig = (opts?: Libp2pOptions): Libp2pOptions => ({
      start: false,
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
      ],
      ...opts
    })

    libp2p = await createLibp2p(getConfig())

    const remotePeer1 = await generateKeyPair('Ed25519')
    const remotePeer2 = await generateKeyPair('Ed25519')

    const remoteLibp2p1 = await createLibp2p(getConfig({
      privateKey: remotePeer1
    }))
    const remoteLibp2p2 = await createLibp2p(getConfig({
      privateKey: remotePeer2
    }))

    const expectedPeers = new Set([
      peerIdFromPrivateKey(remotePeer1).toString(),
      peerIdFromPrivateKey(remotePeer2).toString()
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

    await stop(
      remoteLibp2p1,
      remoteLibp2p2
    )
  })
})
