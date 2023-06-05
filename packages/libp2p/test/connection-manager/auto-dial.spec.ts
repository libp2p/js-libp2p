/* eslint-env mocha */

import { EventEmitter } from '@libp2p/interfaces/events'
import { PeerMap } from '@libp2p/peer-collections'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import delay from 'delay'
import pWaitFor from 'p-wait-for'
import { stubInterface } from 'sinon-ts'
import { AutoDial } from '../../src/connection-manager/auto-dial.js'
import type { Connection } from '@libp2p/interface-connection'
import type { ConnectionManager } from '@libp2p/interface-connection-manager'
import type { PeerStore, Peer } from '@libp2p/interface-peer-store'

describe('auto-dial', () => {
  let autoDialler: AutoDial

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

    const peerStore = stubInterface<PeerStore>()

    peerStore.all.returns(Promise.resolve([
      peerWithAddress, peerWithoutAddress
    ]))

    const connectionManager = stubInterface<ConnectionManager>({
      getConnectionsMap: new PeerMap(),
      getDialQueue: []
    })

    autoDialler = new AutoDial({
      peerStore,
      connectionManager,
      events: new EventEmitter()
    }, {
      minConnections: 10
    })
    autoDialler.start()
    await autoDialler.autoDial()

    await pWaitFor(() => connectionManager.openConnection.callCount === 1)
    await delay(1000)

    expect(connectionManager.openConnection.callCount).to.equal(1)
    expect(connectionManager.openConnection.calledWith(peerWithAddress.id)).to.be.true()
    expect(connectionManager.openConnection.calledWith(peerWithoutAddress.id)).to.be.false()
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

    const peerStore = stubInterface<PeerStore>()

    peerStore.all.returns(Promise.resolve([
      connectedPeer, unConnectedPeer
    ]))

    const connectionMap = new PeerMap<Connection[]>()
    connectionMap.set(connectedPeer.id, [stubInterface<Connection>()])

    const connectionManager = stubInterface<ConnectionManager>({
      getConnectionsMap: connectionMap,
      getDialQueue: []
    })

    autoDialler = new AutoDial({
      peerStore,
      connectionManager,
      events: new EventEmitter()
    }, {
      minConnections: 10
    })
    autoDialler.start()
    await autoDialler.autoDial()

    await pWaitFor(() => connectionManager.openConnection.callCount === 1)
    await delay(1000)

    expect(connectionManager.openConnection.callCount).to.equal(1)
    expect(connectionManager.openConnection.calledWith(unConnectedPeer.id)).to.be.true()
    expect(connectionManager.openConnection.calledWith(connectedPeer.id)).to.be.false()
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

    const peerStore = stubInterface<PeerStore>()

    peerStore.all.returns(Promise.resolve([
      peerInDialQueue, peerNotInDialQueue
    ]))

    const connectionManager = stubInterface<ConnectionManager>({
      getConnectionsMap: new PeerMap(),
      getDialQueue: [{
        id: 'foo',
        peerId: peerInDialQueue.id,
        multiaddrs: [],
        status: 'queued'
      }]
    })

    autoDialler = new AutoDial({
      peerStore,
      connectionManager,
      events: new EventEmitter()
    }, {
      minConnections: 10
    })
    autoDialler.start()
    await autoDialler.autoDial()

    await pWaitFor(() => connectionManager.openConnection.callCount === 1)
    await delay(1000)

    expect(connectionManager.openConnection.callCount).to.equal(1)
    expect(connectionManager.openConnection.calledWith(peerNotInDialQueue.id)).to.be.true()
    expect(connectionManager.openConnection.calledWith(peerInDialQueue.id)).to.be.false()
  })
})
