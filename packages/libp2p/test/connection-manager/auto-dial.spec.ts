/* eslint-env mocha */

import { TypedEventEmitter, type TypedEventTarget } from '@libp2p/interface/events'
import { PeerMap } from '@libp2p/peer-collections'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { PersistentPeerStore } from '@libp2p/peer-store'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { MemoryDatastore } from 'datastore-core'
import delay from 'delay'
import pWaitFor from 'p-wait-for'
import Sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { AutoDial } from '../../src/connection-manager/auto-dial.js'
import { LAST_DIAL_FAILURE_KEY } from '../../src/connection-manager/constants.js'
import { matchPeerId } from '../fixtures/match-peer-id.js'
import type { Libp2pEvents } from '@libp2p/interface'
import type { Connection } from '@libp2p/interface/connection'
import type { PeerId } from '@libp2p/interface/peer-id'
import type { PeerStore, Peer } from '@libp2p/interface/peer-store'
import type { ConnectionManager } from '@libp2p/interface-internal/connection-manager'

describe('auto-dial', () => {
  let autoDialler: AutoDial
  let events: TypedEventTarget<Libp2pEvents>
  let peerStore: PeerStore
  let peerId: PeerId

  beforeEach(async () => {
    peerId = await createEd25519PeerId()
    events = new TypedEventEmitter()
    peerStore = new PersistentPeerStore({
      datastore: new MemoryDatastore(),
      events,
      peerId
    })
  })

  afterEach(() => {
    if (autoDialler != null) {
      autoDialler.stop()
    }
  })

  it('should not dial peers without multiaddrs', async () => {
    // peers with protocols are dialled before peers without protocols
    const peerWithAddress: Peer = {
      id: await createEd25519PeerId(),
      protocols: [
        '/foo/bar'
      ],
      addresses: [{
        multiaddr: multiaddr('/ip4/127.0.0.1/tcp/4001'),
        isCertified: true
      }],
      metadata: new Map(),
      tags: new Map()
    }
    const peerWithoutAddress: Peer = {
      id: await createEd25519PeerId(),
      protocols: [],
      addresses: [],
      metadata: new Map(),
      tags: new Map()
    }

    await peerStore.save(peerWithAddress.id, peerWithAddress)
    await peerStore.save(peerWithoutAddress.id, peerWithoutAddress)

    const connectionManager = stubInterface<ConnectionManager>({
      getConnectionsMap: Sinon.stub().returns(new PeerMap()),
      getDialQueue: Sinon.stub().returns([])
    })

    autoDialler = new AutoDial({
      peerStore,
      connectionManager,
      events
    }, {
      minConnections: 10,
      autoDialInterval: 10000
    })
    autoDialler.start()
    void autoDialler.autoDial()

    await pWaitFor(() => {
      return connectionManager.openConnection.callCount === 1
    })
    await delay(1000)

    expect(connectionManager.openConnection.callCount).to.equal(1)
    expect(connectionManager.openConnection.calledWith(matchPeerId(peerWithAddress.id))).to.be.true()
    expect(connectionManager.openConnection.calledWith(matchPeerId(peerWithoutAddress.id))).to.be.false()
  })

  it('should not dial connected peers', async () => {
    const connectedPeer: Peer = {
      id: await createEd25519PeerId(),
      protocols: [],
      addresses: [{
        multiaddr: multiaddr('/ip4/127.0.0.1/tcp/4001'),
        isCertified: true
      }],
      metadata: new Map(),
      tags: new Map()
    }
    const unConnectedPeer: Peer = {
      id: await createEd25519PeerId(),
      protocols: [],
      addresses: [{
        multiaddr: multiaddr('/ip4/127.0.0.1/tcp/4002'),
        isCertified: true
      }],
      metadata: new Map(),
      tags: new Map()
    }

    await peerStore.save(connectedPeer.id, connectedPeer)
    await peerStore.save(unConnectedPeer.id, unConnectedPeer)

    const connectionMap = new PeerMap<Connection[]>()
    connectionMap.set(connectedPeer.id, [stubInterface<Connection>()])

    const connectionManager = stubInterface<ConnectionManager>({
      getConnectionsMap: Sinon.stub().returns(connectionMap),
      getDialQueue: Sinon.stub().returns([])
    })

    autoDialler = new AutoDial({
      peerStore,
      connectionManager,
      events
    }, {
      minConnections: 10
    })
    autoDialler.start()
    await autoDialler.autoDial()

    await pWaitFor(() => connectionManager.openConnection.callCount === 1)
    await delay(1000)

    expect(connectionManager.openConnection.callCount).to.equal(1)
    expect(connectionManager.openConnection.calledWith(matchPeerId(unConnectedPeer.id))).to.be.true()
    expect(connectionManager.openConnection.calledWith(matchPeerId(connectedPeer.id))).to.be.false()
  })

  it('should not dial peers already in the dial queue', async () => {
    // peers with protocols are dialled before peers without protocols
    const peerInDialQueue: Peer = {
      id: await createEd25519PeerId(),
      protocols: [],
      addresses: [{
        multiaddr: multiaddr('/ip4/127.0.0.1/tcp/4001'),
        isCertified: true
      }],
      metadata: new Map(),
      tags: new Map()
    }
    const peerNotInDialQueue: Peer = {
      id: await createEd25519PeerId(),
      protocols: [],
      addresses: [{
        multiaddr: multiaddr('/ip4/127.0.0.1/tcp/4002'),
        isCertified: true
      }],
      metadata: new Map(),
      tags: new Map()
    }

    await peerStore.save(peerInDialQueue.id, peerInDialQueue)
    await peerStore.save(peerNotInDialQueue.id, peerNotInDialQueue)

    const connectionManager = stubInterface<ConnectionManager>({
      getConnectionsMap: Sinon.stub().returns(new PeerMap()),
      getDialQueue: Sinon.stub().returns([{
        id: 'foo',
        peerId: peerInDialQueue.id,
        multiaddrs: [],
        status: 'queued'
      }])
    })

    autoDialler = new AutoDial({
      peerStore,
      connectionManager,
      events
    }, {
      minConnections: 10
    })
    autoDialler.start()
    await autoDialler.autoDial()

    await pWaitFor(() => connectionManager.openConnection.callCount === 1)
    await delay(1000)

    expect(connectionManager.openConnection.callCount).to.equal(1)
    expect(connectionManager.openConnection.calledWith(matchPeerId(peerNotInDialQueue.id))).to.be.true()
    expect(connectionManager.openConnection.calledWith(matchPeerId(peerInDialQueue.id))).to.be.false()
  })

  it('should not start parallel autodials', async () => {
    const peerStoreAllSpy = Sinon.spy(peerStore, 'all')

    const connectionManager = stubInterface<ConnectionManager>({
      getConnectionsMap: Sinon.stub().returns(new PeerMap()),
      getDialQueue: Sinon.stub().returns([])
    })

    autoDialler = new AutoDial({
      peerStore,
      connectionManager,
      events
    }, {
      minConnections: 10,
      autoDialInterval: 10000
    })
    autoDialler.start()

    // call autodial twice
    await Promise.all([
      autoDialler.autoDial(),
      autoDialler.autoDial()
    ])

    // should only have queried peer store once
    expect(peerStoreAllSpy.callCount).to.equal(1)
  })

  it('should not re-dial peers we have recently failed to dial', async () => {
    const peerWithAddress: Peer = {
      id: await createEd25519PeerId(),
      protocols: [],
      addresses: [{
        multiaddr: multiaddr('/ip4/127.0.0.1/tcp/4001'),
        isCertified: true
      }],
      metadata: new Map(),
      tags: new Map()
    }
    const undialablePeer: Peer = {
      id: await createEd25519PeerId(),
      protocols: [],
      addresses: [{
        multiaddr: multiaddr('/ip4/127.0.0.1/tcp/4002'),
        isCertified: true
      }],
      // we failed to dial them recently
      metadata: new Map([[LAST_DIAL_FAILURE_KEY, uint8ArrayFromString(`${Date.now() - 10}`)]]),
      tags: new Map()
    }

    await peerStore.save(peerWithAddress.id, peerWithAddress)
    await peerStore.save(undialablePeer.id, undialablePeer)

    const connectionManager = stubInterface<ConnectionManager>({
      getConnectionsMap: Sinon.stub().returns(new PeerMap()),
      getDialQueue: Sinon.stub().returns([])
    })

    autoDialler = new AutoDial({
      peerStore,
      connectionManager,
      events
    }, {
      minConnections: 10,
      autoDialPeerRetryThreshold: 2000
    })
    autoDialler.start()

    void autoDialler.autoDial()

    await pWaitFor(() => {
      return connectionManager.openConnection.callCount === 1
    })

    expect(connectionManager.openConnection.callCount).to.equal(1)
    expect(connectionManager.openConnection.calledWith(matchPeerId(peerWithAddress.id))).to.be.true()
    expect(connectionManager.openConnection.calledWith(matchPeerId(undialablePeer.id))).to.be.false()

    // pass the retry threshold
    await delay(2000)

    // autodial again
    void autoDialler.autoDial()

    await pWaitFor(() => {
      return connectionManager.openConnection.callCount === 3
    })

    // should have retried the unreachable peer
    expect(connectionManager.openConnection.calledWith(matchPeerId(undialablePeer.id))).to.be.true()
  })
})
