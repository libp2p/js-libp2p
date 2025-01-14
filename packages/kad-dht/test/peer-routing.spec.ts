import { generateKeyPair } from '@libp2p/crypto/keys'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { stubInterface, type StubbedInstance } from 'sinon-ts'
import { PeerRouting } from '../src/peer-routing/index.js'
import { convertBuffer } from '../src/utils.js'
import { sortClosestPeers } from './utils/sort-closest-peers.js'
import type { Validators } from '../src/index.js'
import type { Network } from '../src/network.js'
import type { QueryManager } from '../src/query/manager.js'
import type { RoutingTable } from '../src/routing-table/index.js'
import type { Peer, ComponentLogger, PeerId, PeerStore } from '@libp2p/interface'

interface StubbedPeerRoutingComponents {
  peerId: PeerId
  peerStore: StubbedInstance<PeerStore>
  logger: ComponentLogger
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
      logger: defaultLogger()
    }

    init = {
      routingTable: stubInterface(),
      network: stubInterface(),
      validators: {},
      queryManager: stubInterface(),
      logPrefix: 'libp2p:test-dht'
    }

    peerRouting = new PeerRouting(components, init)
  })

  describe('getCloserPeersOffline', () => {
    it('should only return DHT servers', async () => {
      const key = Uint8Array.from([0, 1, 2, 3, 4])
      const [
        clientPeerId,
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
        id: serverPeerId,
        addresses: [{
          isCertified: true,
          multiaddr: multiaddr('/ip4/127.0.0.1/tcp/4002')
        }]
      })

      init.routingTable.closestPeers.returns([
        serverPeer.id
      ])

      components.peerStore.get.withArgs(serverPeer.id).resolves(serverPeer)
      components.peerStore.get.withArgs(clientPeer.id).resolves(clientPeer)

      const closer = await peerRouting.getCloserPeersOffline(key, requester)

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
        id: serverPeerId,
        addresses: [{
          isCertified: true,
          multiaddr: multiaddr('/ip4/127.0.0.1/tcp/4002')
        }]
      })

      init.routingTable.closestPeers.returns([
        serverPeer.id
      ])

      components.peerStore.get.withArgs(serverPeer.id).resolves(serverPeer)
      components.peerStore.get.withArgs(clientPeer.id).resolves(clientPeer)

      const closer = await peerRouting.getCloserPeersOffline(key, requester)

      expect(closer).to.have.lengthOf(2)
      expect(closer[0].id).to.equal(clientPeer.id)
      expect(closer[1].id).to.equal(serverPeer.id)
    })

    it('should only include peers closer than the requesting peer', async () => {
      const key = Uint8Array.from([0, 1, 2, 3, 4])
      const [
        closerPeerId,
        requester,
        furtherPeerId
      ] = await getSortedPeers(key)

      const closerPeer: Peer = stubInterface<Peer>({
        id: closerPeerId,
        addresses: [{
          isCertified: true,
          multiaddr: multiaddr('/ip4/127.0.0.1/tcp/4001')
        }]
      })
      const furtherPeer: Peer = stubInterface<Peer>({
        id: furtherPeerId,
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
      components.peerStore.get.withArgs(furtherPeer.id).resolves(furtherPeer)

      const closer = await peerRouting.getCloserPeersOffline(key, requester)

      expect(closer).to.have.lengthOf(1)
      expect(closer[0].id).to.equal(closerPeer.id)
    })
  })
})

async function getSortedPeers (key: Uint8Array, count = 3): Promise<PeerId[]> {
  const keyKadId = await convertBuffer(key)

  const peers = await Promise.all(
    new Array(count).fill(0).map(async () => peerIdFromPrivateKey(await generateKeyPair('Ed25519')))
  )

  return sortClosestPeers(peers, keyKadId)
}
