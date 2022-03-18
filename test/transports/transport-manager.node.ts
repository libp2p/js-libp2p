/* eslint-env mocha */

import { expect } from 'aegir/utils/chai.js'
import { MemoryDatastore } from 'datastore-core/memory'
import { DefaultAddressManager } from '../../src/address-manager/index.js'
import { DefaultTransportManager } from '../../src/transport-manager.js'
import { PersistentPeerStore } from '@libp2p/peer-store'
import { PeerRecord } from '@libp2p/peer-record'
import { TCP } from '@libp2p/tcp'
import { Multiaddr } from '@multiformats/multiaddr'
import { mockUpgrader, mockConnectionGater } from '@libp2p/interface-compliance-tests/mocks'
import sinon from 'sinon'
import Peers from '../fixtures/peers.js'
import pWaitFor from 'p-wait-for'
import type { PeerId } from '@libp2p/interfaces/peer-id'
import { createFromJSON } from '@libp2p/peer-id-factory'
import { Components } from '@libp2p/interfaces/components'
import { PeerRecordUpdater } from '../../src/peer-record-updater.js'

const addrs = [
  new Multiaddr('/ip4/127.0.0.1/tcp/0'),
  new Multiaddr('/ip4/127.0.0.1/tcp/0')
]

describe('Transport Manager (TCP)', () => {
  const connectionGater = mockConnectionGater()
  let tm: DefaultTransportManager
  let localPeer: PeerId
  let components: Components

  before(async () => {
    localPeer = await createFromJSON(Peers[0])
  })

  beforeEach(() => {
    components = new Components({
      peerId: localPeer,
      datastore: new MemoryDatastore(),
      upgrader: mockUpgrader()
    })
    components.setAddressManager(new DefaultAddressManager(components, { listen: addrs.map(addr => addr.toString()) }))
    components.setPeerStore(new PersistentPeerStore(components, {
      addressFilter: connectionGater.filterMultiaddrForPeer
    }))

    tm = new DefaultTransportManager(components)

    components.setTransportManager(tm)
  })

  afterEach(async () => {
    await tm.removeAll()
    expect(tm.getTransports()).to.be.empty()
  })

  it('should be able to add and remove a transport', async () => {
    expect(tm.getTransports()).to.have.lengthOf(0)
    tm.add(new TCP())
    expect(tm.getTransports()).to.have.lengthOf(1)
    await tm.remove(TCP.prototype[Symbol.toStringTag])
    expect(tm.getTransports()).to.have.lengthOf(0)
  })

  it('should be able to listen', async () => {
    const transport = new TCP()

    expect(tm.getTransports()).to.be.empty()

    tm.add(transport)

    expect(tm.getTransports()).to.have.lengthOf(1)

    const spyListener = sinon.spy(transport, 'createListener')
    await tm.listen(addrs)

    // Ephemeral ip addresses may result in multiple listeners
    expect(tm.getAddrs().length).to.equal(addrs.length)
    await tm.stop()
    expect(spyListener.called).to.be.true()
  })

  it('should create self signed peer record on listen', async () => {
    const peerRecordUpdater = new PeerRecordUpdater(components)
    await peerRecordUpdater.start()

    let signedPeerRecord = await components.getPeerStore().addressBook.getPeerRecord(localPeer)
    expect(signedPeerRecord).to.not.exist()

    tm.add(new TCP())
    await tm.listen(addrs)

    // Should created Self Peer record on new listen address, but it is done async
    // with no event so we have to wait a bit
    await pWaitFor(async () => {
      signedPeerRecord = await components.getPeerStore().addressBook.getPeerRecord(localPeer)

      return signedPeerRecord != null
    }, { interval: 100, timeout: 2000 })

    if (signedPeerRecord == null) {
      throw new Error('Could not get signed peer record')
    }

    const record = PeerRecord.createFromProtobuf(signedPeerRecord.payload)
    expect(record).to.exist()
    expect(record.multiaddrs.length).to.equal(addrs.length)
    await peerRecordUpdater.stop()
  })

  it('should be able to dial', async () => {
    tm.add(new TCP())
    await tm.listen(addrs)
    const addr = tm.getAddrs().shift()

    if (addr == null) {
      throw new Error('Could not find addr')
    }

    const connection = await tm.dial(addr)
    expect(connection).to.exist()
    await connection.close()
  })
})
