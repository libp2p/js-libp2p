/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { AutoDialler } from '../../src/connection-manager/auto-dialler.js'
import pWaitFor from 'p-wait-for'
import delay from 'delay'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { stubInterface } from 'sinon-ts'
import type { ConnectionManager } from '@libp2p/interface-connection-manager'
import type { PeerStore, Peer } from '@libp2p/interface-peer-store'
import type { Connection } from '@libp2p/interface-connection'
import { multiaddr } from '@multiformats/multiaddr'

describe('Auto-dialler', () => {
  it('should not dial self', async () => {
    // peers with protocols are dialled before peers without protocols
    const self: Peer = {
      id: await createEd25519PeerId(),
      protocols: [
        '/foo/bar'
      ],
      addresses: [],
      metadata: new Map()
    }
    const other: Peer = {
      id: await createEd25519PeerId(),
      protocols: [],
      addresses: [{
        multiaddr: multiaddr('/ip4/127.0.0.1/tcp/4001'),
        isCertified: true
      }],
      metadata: new Map()
    }

    const peerStore = stubInterface<PeerStore>()

    peerStore.all.returns(Promise.resolve([
      self, other
    ]))

    const connectionManager = stubInterface<ConnectionManager>()
    connectionManager.getConnections.returns([])

    const autoDialler = new AutoDialler({
      peerId: self.id,
      peerStore,
      connectionManager
    }, {
      minConnections: 10
    })

    await autoDialler.start()

    await pWaitFor(() => connectionManager.openConnection.callCount === 1)
    await delay(1000)

    await autoDialler.stop()

    expect(connectionManager.openConnection.callCount).to.equal(1)
    expect(connectionManager.openConnection.calledWith(self.id)).to.be.false()
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
    connectionManager.getConnections.returns([])

    const autoDialler = new AutoDialler({
      peerId: await createEd25519PeerId(),
      peerStore,
      connectionManager
    }, {
      minConnections: 10
    })

    await autoDialler.start()

    await pWaitFor(() => connectionManager.openConnection.callCount === 1)
    await delay(1000)

    await autoDialler.stop()

    expect(connectionManager.openConnection.callCount).to.equal(1)
    expect(connectionManager.openConnection.calledWith(peerWithAddress.id)).to.be.true()
    expect(connectionManager.openConnection.calledWith(peerWithoutAddress.id)).to.be.false()
  })

  // eslint-disable-next-line no-only-tests/no-only-tests
  it.only('Should dial multiple requests in parallel', async () => {
    // const peer1: Peer = {
    //   id: await createEd25519PeerId(),
    //   protocols: [],
    //   addresses: [{
    //     multiaddr: multiaddr('/ip4/127.0.0.1/tcp/4001'),
    //     isCertified: true
    //   }],
    //   metadata: new Map()
    // }
    // const peer2: Peer = {
    //   id: await createEd25519PeerId(),
    //   protocols: [],
    //   addresses: [{
    //     multiaddr: multiaddr('/ip4/127.0.0.1/tcp/4001'),
    //     isCertified: true
    //   }],
    //   metadata: new Map()
    // }
    const getPeer = async (): Promise<Peer> => ({
      id: await createEd25519PeerId(),
      protocols: [],
      addresses: [{
        multiaddr: multiaddr('/ip4/127.0.0.1/tcp/4001'),
        isCertified: true
      }],
      metadata: new Map()
    })

    /**
     * @note Browser limits will prevent a certain number of parallel connections at a time
     * This test will pass when tested in the browser only because we are not
     * actually opening connections, but using a stubbed connectionManager
     */
    const numPeers = 100
    // create an array of `numPeers` peers
    const peers = await Promise.all(new Array(numPeers).fill(0).map(getPeer))
    const peerStore = stubInterface<PeerStore>()

    peerStore.all.returns(Promise.resolve(peers))

    const connectionManager = stubInterface<ConnectionManager>()
    connectionManager.getConnections.returns([])
    connectionManager.openConnection.returns(new Promise((resolve, reject) => {
      const Connection = stubInterface<Connection>()
      setTimeout(() => {
        resolve(Connection)
      /**
       * delay to resolve each connection should be longer than the timeout we
       * wait for connection requests below
       */
      }, 3000)
    }))

    const autoDialler = new AutoDialler({
      peerId: await createEd25519PeerId(),
      peerStore,
      connectionManager
    }, {
      minConnections: 10
    })

    await autoDialler.start()

    /**
     * the delay here needs to be less than the time it takes to resolve one
     * "openConnection" request, to ensure two are in flight at the same time
     */
    await pWaitFor(() => connectionManager.openConnection.callCount === numPeers, { timeout: 2000 })

    await autoDialler.stop()
    expect(connectionManager.openConnection.callCount).to.equal(numPeers)
  })
})
