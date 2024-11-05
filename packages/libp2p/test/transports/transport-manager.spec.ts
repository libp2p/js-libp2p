/* eslint-env mocha */

import { generateKeyPair } from '@libp2p/crypto/keys'
import { TypedEventEmitter, start, stop, FaultTolerance } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { memory } from '@libp2p/memory'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { persistentPeerStore } from '@libp2p/peer-store'
import { plaintext } from '@libp2p/plaintext'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { MemoryDatastore } from 'datastore-core'
import { pEvent } from 'p-event'
import pWaitFor from 'p-wait-for'
import sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { DefaultAddressManager } from '../../src/address-manager/index.js'
import { createLibp2p } from '../../src/index.js'
import { DefaultTransportManager } from '../../src/transport-manager.js'
import type { Components } from '../../src/components.js'
import type { Connection, Libp2p, Upgrader } from '@libp2p/interface'

const listenAddr = multiaddr('/ip4/127.0.0.1/tcp/0')
const addrs = [
  multiaddr('/memory/address-1'),
  multiaddr('/memory/address-2')
]

describe('Transport Manager', () => {
  let tm: DefaultTransportManager
  let components: Components

  beforeEach(async () => {
    const events = new TypedEventEmitter()
    components = {
      peerId: peerIdFromPrivateKey(await generateKeyPair('Ed25519')),
      events,
      upgrader: stubInterface<Upgrader>({
        upgradeInbound: async (ma) => stubInterface<Connection>(ma),
        upgradeOutbound: async (ma) => stubInterface<Connection>(ma)
      }),
      logger: defaultLogger(),
      datastore: new MemoryDatastore()
    } as any
    components.addressManager = new DefaultAddressManager(components, { listen: [listenAddr.toString()] })
    components.peerStore = persistentPeerStore(components)

    components.transportManager = tm = new DefaultTransportManager(components, {
      faultTolerance: FaultTolerance.NO_FATAL
    })
    await start(tm)
  })

  afterEach(async () => {
    await tm.removeAll()
    await stop(tm)
    expect(tm.getTransports()).to.be.empty()
  })

  it('should be able to add and remove a transport', async () => {
    const transport = memory()

    expect(tm.getTransports()).to.have.lengthOf(0)
    tm.add(transport(components))

    expect(tm.getTransports()).to.have.lengthOf(1)
    await tm.remove('@libp2p/memory')
    expect(tm.getTransports()).to.have.lengthOf(0)
  })

  it('should not be able to add a transport twice', async () => {
    tm.add(memory()(components))

    expect(() => {
      tm.add(memory()(components))
    })
      .to.throw()
      .and.to.have.property('name', 'InvalidParametersError')
  })

  it('should fail to dial an unsupported address', async () => {
    tm.add(memory()(components))
    const addr = multiaddr('/ip4/127.0.0.1/tcp/0')
    await expect(tm.dial(addr))
      .to.eventually.be.rejected()
      .and.to.have.property('name', 'TransportUnavailableError')
  })

  it('should fail to listen with no valid address', async () => {
    tm = new DefaultTransportManager(components)
    tm.add(memory()(components))

    await expect(start(tm))
      .to.eventually.be.rejected()
      .and.to.have.property('name', 'NoValidAddressesError')

    await stop(tm)
  })

  it('should be able to add and remove a transport', async () => {
    expect(tm.getTransports()).to.have.lengthOf(0)
    tm.add(memory()(components))
    expect(tm.getTransports()).to.have.lengthOf(1)
    await tm.remove('@libp2p/memory')
    expect(tm.getTransports()).to.have.lengthOf(0)
  })

  it('should be able to listen', async () => {
    const transport = memory()(components)

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
    tm.add(memory()(components))
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
    const transport = memory()(components)
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

describe('libp2p.transportManager (dial only)', () => {
  let libp2p: Libp2p

  afterEach(async () => {
    await stop(libp2p)
  })

  it('fails to start if multiaddr fails to listen', async () => {
    libp2p = await createLibp2p({
      addresses: {
        listen: ['/ip4/127.0.0.1/tcp/0']
      },
      transports: [memory()],
      connectionEncrypters: [plaintext()],
      start: false
    })

    await expect(libp2p.start()).to.eventually.be.rejected
      .with.property('name', 'NoValidAddressesError')
  })

  it('does not fail to start if provided listen multiaddr are not compatible to configured transports (when supporting dial only mode)', async () => {
    libp2p = await createLibp2p({
      addresses: {
        listen: ['/ip4/127.0.0.1/tcp/0']
      },
      transportManager: {
        faultTolerance: FaultTolerance.NO_FATAL
      },
      transports: [
        memory()
      ],
      connectionEncrypters: [
        plaintext()
      ],
      start: false
    })

    await expect(libp2p.start()).to.eventually.be.undefined()
  })

  it('does not fail to start if provided listen multiaddr fail to listen on configured transports (when supporting dial only mode)', async () => {
    libp2p = await createLibp2p({
      addresses: {
        listen: ['/ip4/127.0.0.1/tcp/12345/p2p/QmWDn2LY8nannvSWJzruUYoLZ4vV83vfCBwd8DipvdgQc3/p2p-circuit']
      },
      transportManager: {
        faultTolerance: FaultTolerance.NO_FATAL
      },
      transports: [
        memory()
      ],
      connectionEncrypters: [
        plaintext()
      ],
      start: false
    })

    await expect(libp2p.start()).to.eventually.be.undefined()
  })
})
