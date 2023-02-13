/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { AutoDialler } from '../../src/connection-manager/auto-dialler.js'
import pWaitFor from 'p-wait-for'
import delay from 'delay'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { stubInterface } from 'sinon-ts'
import type { ConnectionManager } from '@libp2p/interface-connection-manager'
import type { PeerStore, Peer } from '@libp2p/interface-peer-store'
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
})
