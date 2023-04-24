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
import { EventEmitter } from '@libp2p/interfaces/events'

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

    const connectionManager = stubInterface<ConnectionManager>()
    connectionManager.getConnections.returns([])

    const autoDialler = new AutoDial({
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
})
