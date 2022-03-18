/* eslint-env mocha */

import { expect } from 'aegir/utils/chai.js'
import { AutoDialler } from '../../src/connection-manager/auto-dialler.js'
import pWaitFor from 'p-wait-for'
import delay from 'delay'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { Components } from '@libp2p/interfaces/components'
import { stubInterface } from 'ts-sinon'
import type { ConnectionManager } from '@libp2p/interfaces/registrar'
import type { PeerStore, Peer } from '@libp2p/interfaces/peer-store'
import type { Dialer } from '@libp2p/interfaces/dialer'

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
      addresses: [],
      metadata: new Map()
    }

    const peerStore = stubInterface<PeerStore>()

    peerStore.all.returns(Promise.resolve([
      self, other
    ]))

    const connectionManager = stubInterface<ConnectionManager>()
    connectionManager.getConnectionList.returns([])
    const dialer = stubInterface<Dialer>()

    const autoDialler = new AutoDialler(new Components({
      peerId: self.id,
      peerStore,
      connectionManager,
      dialer
    }), {
      minConnections: 10
    })

    await autoDialler.start()

    await pWaitFor(() => dialer.dial.callCount === 1)
    await delay(1000)

    await autoDialler.stop()

    expect(dialer.dial.callCount).to.equal(1)
    expect(dialer.dial.calledWith(self.id)).to.be.false()
  })
})
