import { generateKeyPair } from '@libp2p/crypto/keys'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { Libp2pRecord } from '@libp2p/record'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { stubInterface } from 'sinon-ts'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { K } from '../src/constants.ts'
import { MessageType } from '../src/message/dht.ts'
import { PeerRouting } from '../src/peer-routing/index.ts'
import { peerResponseEvent, queryErrorEvent } from '../src/query/events.ts'
import { convertBuffer, convertPeerId } from '../src/utils.ts'
import { createPeerIdsWithPrivateKey } from './utils/create-peer-id.ts'
import { sortClosestPeers } from './utils/sort-closest-peers.ts'
import type { PeerAndKey } from './utils/create-peer-id.ts'
import type { QueryEvent, Validators } from '../src/index.ts'
import type { Network } from '../src/network.ts'
import type { QueryManager } from '../src/query/manager.ts'
import type { QueryFunc } from '../src/query/types.ts'
import type { RoutingTable } from '../src/routing-table/index.ts'
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

  describe('findPeerLocal', () => {
    it('should return undefined when peer exists locally but has no addresses', async () => {
      const peerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

      init.routingTable.find.withArgs(peerId).resolves(peerId)
      components.peerStore.get.withArgs(peerId).resolves(stubInterface<Peer>({
        id: peerId,
        addresses: []
      }))

      await expect(peerRouting.findPeerLocal(peerId)).to.eventually.equal(undefined)
    })

    it('should return peer info when peer has addresses', async () => {
      const peerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
      const address = multiaddr('/ip4/127.0.0.1/tcp/4001')

      components.peerStore.get.withArgs(peerId).resolves(stubInterface<Peer>({
        id: peerId,
        addresses: [{
          isCertified: false,
          multiaddr: address
        }]
      }))

      await expect(peerRouting.findPeerLocal(peerId)).to.eventually.deep.equal({
        id: peerId,
        multiaddrs: [address]
      })
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

  describe('getClosestPeers', () => {
    it('only adds peers to the closest set if they responded to the query', async () => {
      const key = Uint8Array.from([0, 1, 2, 3, 4])
      const [livePeer, deadPeer] = await getSortedPeers(key, 2)
      const path = { index: 0, queued: 0, running: 0, total: 1 }

      // the QueryManager is stubbed, so drive the query function ourselves for
      // both peers and re-yield whatever the network produces for each
      const run = async function * (_key: Uint8Array, query: QueryFunc): AsyncGenerator<QueryEvent> {
        for (const { peerId } of [livePeer, deadPeer]) {
          yield * query({
            key,
            peer: { id: peerId, multiaddrs: [] },
            peerKadId: await convertPeerId(peerId),
            path,
            numPaths: 1
          })
        }
      }
      init.queryManager.run.callsFake(run)

      // the live peer answers; the dead peer only errors, never sending a
      // PEER_RESPONSE
      const sendRequest = async function * (to: PeerId): AsyncGenerator<QueryEvent> {
        if (to.equals(livePeer.peerId)) {
          yield peerResponseEvent({ from: to, messageType: MessageType.FIND_NODE, path })
        } else {
          yield queryErrorEvent({ from: to, error: new Error('could not dial peer'), path })
        }
      }
      init.network.sendRequest.callsFake(sendRequest)

      const finalPeerIds: PeerId[] = []
      for await (const event of peerRouting.getClosestPeers(key)) {
        if (event.name === 'FINAL_PEER') {
          finalPeerIds.push(event.peer.id)
        }
      }

      expect(finalPeerIds).to.have.lengthOf(1)
      expect(finalPeerIds[0].equals(livePeer.peerId)).to.be.true()
    })
  })

  describe('getValueOrPeers', () => {
    it('rejects a record whose key does not match the queried key', async () => {
      const [responder] = await getSortedPeers(Uint8Array.from([0, 1, 2, 3, 4]), 1)
      const path = { index: 0, queued: 0, running: 0, total: 1 }

      // a permissive validator so the record passes verification - only a
      // comparison against the queried key should be able to reject it
      init.validators = {
        test: async () => {}
      }
      peerRouting = new PeerRouting(components, init)

      const queriedKey = uint8ArrayFromString('/test/queried')
      const record = new Libp2pRecord(
        uint8ArrayFromString('/test/other'),
        uint8ArrayFromString('value'),
        new Date()
      )

      init.network.sendRequest.callsFake(async function * (): AsyncGenerator<QueryEvent> {
        yield peerResponseEvent({ from: responder.peerId, messageType: MessageType.GET_VALUE, record, path })
      })

      const events: QueryEvent[] = []
      for await (const event of peerRouting.getValueOrPeers(responder.peerId, queriedKey, { path })) {
        events.push(event)
      }

      // the record is published under a different key, so it must be discarded
      // as a query error rather than surfaced as a response to this query
      expect(events.map(event => event.name)).to.include('QUERY_ERROR')
      const records = events.filter(event => event.name === 'PEER_RESPONSE' && event.record != null)
      expect(records).to.have.lengthOf(0)
    })
  })
})

async function getSortedPeers (key: Uint8Array, count = 3): Promise<PeerAndKey[]> {
  const keyKadId = await convertBuffer(key)

  const peers = await createPeerIdsWithPrivateKey(count)

  return sortClosestPeers(peers, keyKadId)
}
