/* eslint-env mocha */

import { yamux } from '@chainsafe/libp2p-yamux'
import { identify, type Identify } from '@libp2p/identify'
import { kadDHT, passthroughMapper } from '@libp2p/kad-dht'
import { mplex } from '@libp2p/mplex'
import { ping } from '@libp2p/ping'
import { plaintext } from '@libp2p/plaintext'
import { tcp } from '@libp2p/tcp'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { createLibp2p } from 'libp2p'
import pDefer from 'p-defer'
import pWaitFor from 'p-wait-for'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import type { Libp2p, PeerId } from '@libp2p/interface'
import type { KadDHT } from '@libp2p/kad-dht'
import type { PingService } from '@libp2p/ping'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { Libp2pOptions } from 'libp2p'

export const subsystemMulticodecs = [
  '/test/kad/1.0.0',
  '/other/1.0.0'
]

const listenAddr = multiaddr('/ip4/127.0.0.1/tcp/8000')
const remoteListenAddr = multiaddr('/ip4/127.0.0.1/tcp/8001')

async function getRemoteAddr (remotePeerId: PeerId, libp2p: Libp2p): Promise<Multiaddr> {
  const { addresses } = await libp2p.peerStore.get(remotePeerId)

  if (addresses.length === 0) {
    throw new Error('No addrs found')
  }

  const addr = addresses[0]

  return addr.multiaddr.encapsulate(`/p2p/${remotePeerId.toString()}`)
}

describe('DHT subsystem operates correctly', () => {
  let libp2p: Libp2p<{ dht: KadDHT }>
  let remoteLibp2p: Libp2p<{ dht: KadDHT }>
  let remAddr: Multiaddr

  describe('dht started before connect', () => {
    beforeEach(async () => {
      libp2p = await createLibp2p({
        addresses: {
          listen: [listenAddr.toString()]
        },
        transports: [
          tcp()
        ],
        connectionEncrypters: [
          plaintext()
        ],
        streamMuxers: [
          yamux(),
          mplex()
        ],
        services: {
          dht: kadDHT({
            protocol: subsystemMulticodecs[0],
            peerInfoMapper: passthroughMapper,
            allowQueryWithZeroPeers: true
          }),
          ping: ping(),
          identify: identify()
        }
      })

      remoteLibp2p = await createLibp2p({
        addresses: {
          listen: [remoteListenAddr.toString()]
        },
        transports: [
          tcp()
        ],
        connectionEncrypters: [
          plaintext()
        ],
        streamMuxers: [
          yamux(),
          mplex()
        ],
        services: {
          dht: kadDHT({
            protocol: subsystemMulticodecs[0],
            peerInfoMapper: passthroughMapper,
            allowQueryWithZeroPeers: true
          }),
          ping: ping(),
          identify: identify()
        }
      })

      await Promise.all([
        libp2p.start(),
        remoteLibp2p.start()
      ])

      await libp2p.peerStore.patch(remoteLibp2p.peerId, {
        multiaddrs: [remoteListenAddr]
      })
      remAddr = await getRemoteAddr(remoteLibp2p.peerId, libp2p)
    })

    afterEach(async () => {
      if (libp2p != null) {
        await libp2p.stop()
      }

      if (remoteLibp2p != null) {
        await remoteLibp2p.stop()
      }
    })

    it('should get notified of connected peers on dial', async () => {
      const stream = await libp2p.dialProtocol(remAddr, subsystemMulticodecs)

      expect(stream).to.exist()

      return Promise.all([
        // @ts-expect-error private field
        pWaitFor(() => libp2p.services.dht.routingTable.size === 1),
        // @ts-expect-error private field
        pWaitFor(() => remoteLibp2p.services.dht.routingTable.size === 1)
      ])
    })

    it('should put on a peer and get from the other', async () => {
      const key = uint8ArrayFromString('hello')
      const value = uint8ArrayFromString('world')

      await libp2p.dialProtocol(remoteLibp2p.peerId, subsystemMulticodecs)
      await Promise.all([
        // @ts-expect-error private field
        pWaitFor(() => libp2p.services.dht.routingTable.size === 1),
        // @ts-expect-error private field
        pWaitFor(() => remoteLibp2p.services.dht.routingTable.size === 1)
      ])

      await libp2p.contentRouting.put(key, value)

      const fetchedValue = await remoteLibp2p.contentRouting.get(key)
      expect(fetchedValue).to.equalBytes(value)
    })
  })

  it('kad-dht should discover other peers', async () => {
    const deferred = pDefer()

    const getConfig = (): Libp2pOptions<{ dht: KadDHT, ping: PingService, identify: Identify }> => ({
      addresses: {
        listen: [
          listenAddr.toString()
        ]
      },
      services: {
        dht: kadDHT({
          protocol: subsystemMulticodecs[0],
          peerInfoMapper: passthroughMapper,
          allowQueryWithZeroPeers: true
        }),
        ping: ping(),
        identify: identify()
      }
    })

    const localConfig = getConfig()

    libp2p = await createLibp2p(localConfig)

    const remoteLibp2p1 = await createLibp2p(getConfig())
    const remoteLibp2p2 = await createLibp2p(getConfig())

    libp2p.addEventListener('peer:discovery', (evt) => {
      const { id } = evt.detail

      if (id.equals(remoteLibp2p1.peerId)) {
        libp2p.removeEventListener('peer:discovery')
        deferred.resolve()
      }
    })

    await Promise.all([
      libp2p.start(),
      remoteLibp2p1.start(),
      remoteLibp2p2.start()
    ])

    await libp2p.peerStore.patch(remoteLibp2p1.peerId, {
      multiaddrs: remoteLibp2p1.getMultiaddrs()
    })
    await remoteLibp2p2.peerStore.patch(remoteLibp2p1.peerId, {
      multiaddrs: remoteLibp2p1.getMultiaddrs()
    })

    // Topology:
    // A -> B
    // C -> B
    await Promise.all([
      libp2p.dial(remoteLibp2p1.peerId),
      remoteLibp2p2.dial(remoteLibp2p1.peerId)
    ])

    await deferred.promise
    return Promise.all([
      remoteLibp2p1.stop(),
      remoteLibp2p2.stop()
    ])
  })
})
