/* eslint-env mocha */

import { generateKeyPair } from '@libp2p/crypto/keys'
import { TypedEventEmitter, start, stop, FaultTolerance } from '@libp2p/interface'
import { mockUpgrader } from '@libp2p/interface-compliance-tests/mocks'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { persistentPeerStore } from '@libp2p/peer-store'
import { tcp } from '@libp2p/tcp'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { MemoryDatastore } from 'datastore-core/memory'
import { pEvent } from 'p-event'
import pWaitFor from 'p-wait-for'
import sinon from 'sinon'
import { DefaultAddressManager } from '../../src/address-manager/index.js'
import { defaultComponents, type Components } from '../../src/components.js'
import { DefaultTransportManager } from '../../src/transport-manager.js'
import type { PeerId } from '@libp2p/interface'

const addrs = [
  multiaddr('/ip4/127.0.0.1/tcp/0'),
  multiaddr('/ip4/127.0.0.1/tcp/0')
]

describe('Transport Manager (TCP)', () => {
  let tm: DefaultTransportManager
  let localPeer: PeerId
  let components: Components

  before(async () => {
    localPeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
  })

  beforeEach(async () => {
    const events = new TypedEventEmitter()
    components = defaultComponents({
      peerId: localPeer,
      events,
      datastore: new MemoryDatastore(),
      upgrader: mockUpgrader({ events })
    })
    components.addressManager = new DefaultAddressManager(components, { listen: addrs.map(addr => addr.toString()) })
    components.peerStore = persistentPeerStore(components)

    tm = new DefaultTransportManager(components, {
      faultTolerance: FaultTolerance.NO_FATAL
    })

    components.transportManager = tm

    await start(tm)
  })

  afterEach(async () => {
    await tm.removeAll()
    expect(tm.getTransports()).to.be.empty()
    await stop(tm)
  })

  it('should be able to add and remove a transport', async () => {
    expect(tm.getTransports()).to.have.lengthOf(0)
    tm.add(tcp()({
      logger: defaultLogger()
    }))
    expect(tm.getTransports()).to.have.lengthOf(1)
    await tm.remove('@libp2p/tcp')
    expect(tm.getTransports()).to.have.lengthOf(0)
  })

  it('should be able to listen', async () => {
    const transport = tcp()({
      logger: defaultLogger()
    })

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

  it('should be able to dial', async () => {
    tm.add(tcp()({
      logger: defaultLogger()
    }))
    await tm.listen(addrs)
    const addr = tm.getAddrs().shift()

    if (addr == null) {
      throw new Error('Could not find addr')
    }

    const connection = await tm.dial(addr)
    expect(connection).to.exist()
    await connection.close()
  })

  it('should remove listeners when they stop listening', async () => {
    const transport = tcp()({
      logger: defaultLogger()
    })
    tm.add(transport)

    expect(tm.getListeners()).to.have.lengthOf(0)

    const spyListener = sinon.spy(transport, 'createListener')

    await tm.listen(addrs)

    expect(spyListener.callCount).to.equal(addrs.length)

    // wait for listeners to start listening
    await pWaitFor(async () => {
      return tm.getListeners().length === addrs.length
    })

    // wait for listeners to stop listening
    const closePromise = Promise.all(
      spyListener.getCalls().map(async call => {
        return pEvent(call.returnValue, 'close')
      })
    )

    await Promise.all(
      tm.getListeners().map(async l => { await l.close() })
    )

    await closePromise

    expect(tm.getListeners()).to.have.lengthOf(0)

    await tm.stop()
  })
})
