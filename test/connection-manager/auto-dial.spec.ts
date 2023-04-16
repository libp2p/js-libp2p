/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { AutoDial } from '../../src/connection-manager/auto-dial.js'
import pWaitFor from 'p-wait-for'
import delay from 'delay'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { stubInterface } from 'sinon-ts'
import type { ConnectionManager } from '@libp2p/interface-connection-manager'
import type { PeerStore, Peer } from '@libp2p/interface-peer-store'
import { multiaddr } from '@multiformats/multiaddr'
import { PeerMap } from '@libp2p/peer-collections'
import type { Connection } from '@libp2p/interface-connection'

describe('auto-dial', () => {
  it('should not auto dial peers without multiaddrs', async () => {
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
      metadata: new Map()
    }
    const peerWithoutAddress: Peer = {
      id: await createEd25519PeerId(),
      protocols: [],
      addresses: [],
      metadata: new Map()
    }

    const peerStore = stubInterface<PeerStore>()

    peerStore.all.returns(Promise.resolve([
      peerWithAddress, peerWithoutAddress
    ]))

    const connectionManager = stubInterface<ConnectionManager>()
    connectionManager.getConnectionsMap.returns(new PeerMap())
    connectionManager.getDialQueue.returns([])

    const autoDialler = new AutoDial({
      peerStore,
      connectionManager
    }, {
      minConnections: 10
    })
    await autoDialler.autoDial()

    await pWaitFor(() => connectionManager.openConnection.callCount === 1)
    await delay(1000)

    expect(connectionManager.openConnection.callCount).to.equal(1)
    expect(connectionManager.openConnection.calledWith(peerWithAddress.id)).to.be.true()
    expect(connectionManager.openConnection.calledWith(peerWithoutAddress.id)).to.be.false()
  })

  it('should not auto dial peers in the dial queue', async () => {
    // peers with protocols are dialled before peers without protocols
    const peers: Peer[] = [{
      id: await createEd25519PeerId(),
      protocols: [
        '/foo/bar'
      ],
      addresses: [{
        multiaddr: multiaddr('/ip4/127.0.0.1/tcp/4001'),
        isCertified: true
      }],
      metadata: new Map()
    }, {
      id: await createEd25519PeerId(),
      protocols: [
        '/foo/bar'
      ],
      addresses: [{
        multiaddr: multiaddr('/ip4/127.0.0.1/tcp/4001'),
        isCertified: true
      }],
      metadata: new Map()
    }]

    const peerStore = stubInterface<PeerStore>()

    peerStore.all.returns(Promise.resolve(peers))

    const connectionManager = stubInterface<ConnectionManager>()
    connectionManager.getConnectionsMap.returns(new PeerMap())
    connectionManager.getDialQueue.returns([{
      id: peers[0].id.toString(),
      status: 'active',
      peerId: peers[0].id,
      multiaddrs: peers[0].addresses.map(a => a.multiaddr)
    }])

    const autoDialler = new AutoDial({
      peerStore,
      connectionManager
    }, {
      minConnections: 10
    })
    await autoDialler.autoDial()

    await pWaitFor(() => connectionManager.openConnection.callCount === 1)
    await delay(1000)

    expect(connectionManager.openConnection.callCount).to.equal(1)
    expect(connectionManager.openConnection.calledWith(peers[1].id)).to.be.true()
    expect(connectionManager.openConnection.calledWith(peers[0].id)).to.be.false()
  })

  it('should not auto dial connected peers', async () => {
    // peers with protocols are dialled before peers without protocols
    const peers: Peer[] = [{
      id: await createEd25519PeerId(),
      protocols: [
        '/foo/bar'
      ],
      addresses: [{
        multiaddr: multiaddr('/ip4/127.0.0.1/tcp/4001'),
        isCertified: true
      }],
      metadata: new Map()
    }, {
      id: await createEd25519PeerId(),
      protocols: [
        '/foo/bar'
      ],
      addresses: [{
        multiaddr: multiaddr('/ip4/127.0.0.1/tcp/4001'),
        isCertified: true
      }],
      metadata: new Map()
    }]

    const peerStore = stubInterface<PeerStore>()

    peerStore.all.returns(Promise.resolve(peers))

    const connections = new PeerMap<Connection[]>()
    connections.set(peers[0].id, [stubInterface<Connection>()])

    const connectionManager = stubInterface<ConnectionManager>()
    connectionManager.getConnectionsMap.returns(connections)
    connectionManager.getDialQueue.returns([])

    const autoDialler = new AutoDial({
      peerStore,
      connectionManager
    }, {
      minConnections: 10
    })
    await autoDialler.autoDial()

    await pWaitFor(() => connectionManager.openConnection.callCount === 1)
    await delay(1000)

    expect(connectionManager.openConnection.callCount).to.equal(1)
    expect(connectionManager.openConnection.calledWith(peers[1].id)).to.be.true()
    expect(connectionManager.openConnection.calledWith(peers[0].id)).to.be.false()
  })
})
