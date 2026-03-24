import { generateKeyPair } from '@libp2p/crypto/keys'
import { AbortError } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import drain from 'it-drain'
import { stubInterface } from 'sinon-ts'
import { K } from '../src/constants.js'
import { MessageType } from '../src/message/dht.js'
import { PeerRouting } from '../src/peer-routing/index.js'
import { peerResponseEvent } from '../src/query/events.js'
import { convertBuffer, convertPeerId } from '../src/utils.js'
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

  describe('getClosestPeers', () => {
    it('should emit FINAL_PEER events for peers successfully contacted during a query', async () => {
      const key = Uint8Array.from([0, 1, 2, 3, 4])
      const [peer1] = await getSortedPeers(key)
      const peer1Multiaddr = multiaddr('/ip4/127.0.0.1/tcp/4001')
      const path = { index: 0, queued: 0, running: 1, total: 1 }

      // queryManager.run calls queryFunc for peer1, then completes normally
      init.queryManager.run.callsFake(async function * (k, queryFunc) {
        const peer1KadId = await convertPeerId(peer1.peerId)

        yield * queryFunc({
          key: k,
          peer: { id: peer1.peerId, multiaddrs: [peer1Multiaddr] },
          path,
          peerKadId: peer1KadId,
          numPaths: 1,
          signal: new AbortController().signal
        })
      })

      // network.sendRequest returns a PEER_RESPONSE indicating successful contact
      init.network.sendRequest.callsFake(async function * () {
        yield peerResponseEvent({
          from: peer1.peerId,
          messageType: MessageType.FIND_NODE,
          closer: [],
          providers: [],
          record: undefined,
          path
        }, {})
      })

      const events = []
      for await (const event of peerRouting.getClosestPeers(key)) {
        events.push(event)
      }

      const finalPeerEvents = events.filter(e => e.name === 'FINAL_PEER')
      expect(finalPeerEvents).to.have.lengthOf(1)
      expect(finalPeerEvents[0]).to.have.nested.property('peer.id', peer1.peerId)
    })

    it('should emit FINAL_PEER events for peers contacted before an abort, then propagate the abort', async () => {
      const key = Uint8Array.from([0, 1, 2, 3, 4])
      const [peer1] = await getSortedPeers(key)
      const peer1Multiaddr = multiaddr('/ip4/127.0.0.1/tcp/4001')
      const path = { index: 0, queued: 0, running: 1, total: 1 }

      // queryManager.run calls queryFunc for peer1 (recording the contact), then throws AbortError
      init.queryManager.run.callsFake(async function * (k, queryFunc) {
        const peer1KadId = await convertPeerId(peer1.peerId)

        yield * queryFunc({
          key: k,
          peer: { id: peer1.peerId, multiaddrs: [peer1Multiaddr] },
          path,
          peerKadId: peer1KadId,
          numPaths: 1,
          signal: new AbortController().signal
        })

        throw new AbortError('Query timed out')
      })

      // network.sendRequest returns a PEER_RESPONSE so 'contacted' becomes true
      init.network.sendRequest.callsFake(async function * () {
        yield peerResponseEvent({
          from: peer1.peerId,
          messageType: MessageType.FIND_NODE,
          closer: [],
          providers: [],
          record: undefined,
          path
        }, {})
      })

      const events = []
      let threw = false
      try {
        for await (const event of peerRouting.getClosestPeers(key)) {
          events.push(event)
        }
      } catch (err: any) {
        expect(err).to.have.property('name', 'AbortError')
        threw = true
      }

      expect(threw).to.be.true('getClosestPeers should have propagated the AbortError')
      const finalPeerEvents = events.filter(e => e.name === 'FINAL_PEER')
      expect(finalPeerEvents).to.have.lengthOf(1)
      expect(finalPeerEvents[0]).to.have.nested.property('peer.id', peer1.peerId)
    })

    it('should propagate non-AbortError from queryManager', async () => {
      const key = Uint8Array.from([0, 1, 2, 3, 4])
      const testError = new Error('test error')

      init.queryManager.run.callsFake(async function * () {
        yield * ([] as any[])
        throw testError
      })

      await expect(drain(peerRouting.getClosestPeers(key))).to.eventually.be.rejectedWith(testError)
    })

    it('should not emit FINAL_PEER for peers that returned a query error', async () => {
      const key = Uint8Array.from([0, 1, 2, 3, 4])
      const [peer1] = await getSortedPeers(key)
      const peer1Multiaddr = multiaddr('/ip4/127.0.0.1/tcp/4001')
      const path = { index: 0, queued: 0, running: 1, total: 1 }

      init.queryManager.run.callsFake(async function * (k, queryFunc) {
        const peer1KadId = await convertPeerId(peer1.peerId)

        yield * queryFunc({
          key: k,
          peer: { id: peer1.peerId, multiaddrs: [peer1Multiaddr] },
          path,
          peerKadId: peer1KadId,
          numPaths: 1,
          signal: new AbortController().signal
        })
      })

      // network.sendRequest yields no PEER_RESPONSE — simulates a failed contact
      init.network.sendRequest.callsFake(async function * () {
        // yields nothing (peer was not contactable)
      })

      const events = []
      for await (const event of peerRouting.getClosestPeers(key)) {
        events.push(event)
      }

      const finalPeerEvents = events.filter(e => e.name === 'FINAL_PEER')
      expect(finalPeerEvents).to.have.lengthOf(0)
    })
  })

  describe('getClosestPeersOffline', () => {
    it('should only return DHT servers', async () => {
      const key = Uint8Array.from([0, 1, 2, 3, 4])
      const [
        serverPeerId
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

      const closer = await peerRouting.getClosestPeersOffline(key)

      expect(closer).to.have.lengthOf(1)
      expect(closer[0].id).to.equal(serverPeer.id)
    })

    it('should include the target peer if known, even if the peer is not a DHT server', async () => {
      const clientPeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
      const key = clientPeerId.toMultihash().bytes
      const [
        serverPeerId
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

      const closer = await peerRouting.getClosestPeersOffline(key)

      expect(closer).to.have.lengthOf(2)
      expect(closer[0].id).to.equal(clientPeer.id)
      expect(closer[1].id).to.equal(serverPeer.id)
    })
  })
})

async function getSortedPeers (key: Uint8Array, count = 3): Promise<PeerAndKey[]> {
  const keyKadId = await convertBuffer(key)

  const peers = await createPeerIdsWithPrivateKey(count)

  return sortClosestPeers(peers, keyKadId)
}
