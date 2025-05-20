import { generateKeyPair } from '@libp2p/crypto/keys'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { stubInterface } from 'sinon-ts'
import { K } from '../src/constants.js'
import { PeerRouting } from '../src/peer-routing/index.js'
import { convertBuffer } from '../src/utils.js'
import { createPeerIdsWithPrivateKey } from './utils/create-peer-id.js'
import { sortClosestPeers } from './utils/sort-closest-peers.js'
import type { PeerAndKey } from './utils/create-peer-id.js'
import type { Validators } from '../src/index.js'
import type { Network } from '../src/network.js'
import type { QueryManager } from '../src/query/manager.js'
import type { RoutingTable } from '../src/routing-table/index.js'
import type { Peer, ComponentLogger, PeerId, PeerStore } from '@libp2p/interface'
import type { ConnectionManager } from '@libp2p/interface-internal'
import type { StubbedInstance } from 'sinon-ts'

interface StubbedPeerRoutingComponents {
  peerId: PeerId
  peerStore: StubbedInstance<PeerStore>
  logger: ComponentLogger
  connectionManager: StubbedInstance<ConnectionManager>
}

interface StubbedPeerRoutingInit {
  routingTable: StubbedInstance<RoutingTable>
  network: StubbedInstance<Network>
  validators: Validators
  queryManager: StubbedInstance<QueryManager>
  logPrefix: string
}

describe('peer-routing', () => {
  let peerRouting: PeerRouting
  let components: StubbedPeerRoutingComponents
  let init: StubbedPeerRoutingInit

  beforeEach(async () => {
    const privateKey = await generateKeyPair('Ed25519')
    const peerId = peerIdFromPrivateKey(privateKey)
    components = {
      peerId,
      peerStore: stubInterface(),
      logger: defaultLogger(),
      connectionManager: stubInterface()
    }

    init = {
      routingTable: stubInterface<RoutingTable>({
        kBucketSize: K
      }),
      network: stubInterface(),
      validators: {},
      queryManager: stubInterface(),
      logPrefix: 'libp2p:test-dht'
    }

    peerRouting = new PeerRouting(components, init)
  })

  describe('getClosestPeersOffline', () => {
    it('should only return DHT servers', async () => {
      const key = Uint8Array.from([0, 1, 2, 3, 4])
      const [
        serverPeerId,
        requester
      ] = await getSortedPeers(key)

      const serverPeer: Peer = stubInterface<Peer>({
        id: serverPeerId.peerId,
        addresses: [{
          isCertified: true,
          multiaddr: multiaddr('/ip4/127.0.0.1/tcp/4002')
        }]
      })

      init.routingTable.closestPeers.returns([
        serverPeer.id
      ])

      components.peerStore.getInfo.withArgs(serverPeer.id).resolves({
        id: serverPeer.id,
        multiaddrs: serverPeer.addresses.map(({ multiaddr }) => multiaddr)
      })

      const closer = await peerRouting.getCloserPeersOffline(key, requester.peerId)

      expect(closer).to.have.lengthOf(1)
      expect(closer[0].id).to.equal(serverPeer.id)
    })

    it('should include the target peer if known, even if the peer is not a DHT server', async () => {
      const clientPeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
      const key = clientPeerId.toMultihash().bytes
      const [
        serverPeerId,
        requester
      ] = await getSortedPeers(key)

      const clientPeer: Peer = stubInterface<Peer>({
        id: clientPeerId,
        addresses: [{
          isCertified: true,
          multiaddr: multiaddr('/ip4/127.0.0.1/tcp/4001')
        }]
      })
      const serverPeer: Peer = stubInterface<Peer>({
        id: serverPeerId.peerId,
        addresses: [{
          isCertified: true,
          multiaddr: multiaddr('/ip4/127.0.0.1/tcp/4002')
        }]
      })

      init.routingTable.closestPeers.returns([
        serverPeer.id
      ])

      components.peerStore.get.withArgs(serverPeer.id).resolves(serverPeer)
      components.peerStore.getInfo.withArgs(serverPeer.id).resolves({
        id: serverPeer.id,
        multiaddrs: serverPeer.addresses.map(({ multiaddr }) => multiaddr)
      })
      components.peerStore.get.withArgs(clientPeer.id).resolves(clientPeer)
      components.peerStore.getInfo.withArgs(clientPeer.id).resolves({
        id: clientPeer.id,
        multiaddrs: clientPeer.addresses.map(({ multiaddr }) => multiaddr)
      })

      const closer = await peerRouting.getCloserPeersOffline(key, requester.peerId)

      expect(closer).to.have.lengthOf(2)
      expect(closer[0].id).to.equal(clientPeer.id)
      expect(closer[1].id).to.equal(serverPeer.id)
    })

    // this is not in the spec
    it.skip('should only include peers closer than the requesting peer', async () => {
      const key = Uint8Array.from([0, 1, 2, 3, 4])
      const [
        closerPeerId,
        requester,
        furtherPeerId
      ] = await getSortedPeers(key)

      const closerPeer: Peer = stubInterface<Peer>({
        id: closerPeerId.peerId,
        addresses: [{
          isCertified: true,
          multiaddr: multiaddr('/ip4/127.0.0.1/tcp/4001')
        }]
      })
      const furtherPeer: Peer = stubInterface<Peer>({
        id: furtherPeerId.peerId,
        addresses: [{
          isCertified: true,
          multiaddr: multiaddr('/ip4/127.0.0.1/tcp/4002')
        }]
      })

      init.routingTable.closestPeers.returns([
        closerPeer.id,
        furtherPeer.id
      ])

      components.peerStore.get.withArgs(closerPeer.id).resolves(closerPeer)
      components.peerStore.getInfo.withArgs(closerPeer.id).resolves({
        id: closerPeer.id,
        multiaddrs: closerPeer.addresses.map(({ multiaddr }) => multiaddr)
      })
      components.peerStore.get.withArgs(furtherPeer.id).resolves(furtherPeer)
      components.peerStore.getInfo.withArgs(furtherPeer.id).resolves({
        id: furtherPeer.id,
        multiaddrs: furtherPeer.addresses.map(({ multiaddr }) => multiaddr)
      })

      const closer = await peerRouting.getCloserPeersOffline(key, requester.peerId)

      expect(closer).to.have.lengthOf(1)
      expect(closer[0].id).to.equal(closerPeer.id)
    })
  })
})

async function getSortedPeers (key: Uint8Array, count = 3): Promise<PeerAndKey[]> {
  const keyKadId = await convertBuffer(key)

  const peers = await createPeerIdsWithPrivateKey(count)

  return sortClosestPeers(peers, keyKadId)
}
