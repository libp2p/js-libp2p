/* eslint-env mocha */

import { generateKeyPair } from '@libp2p/crypto/keys'
import { TypedEventEmitter, start, stop, FaultTolerance } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { persistentPeerStore } from '@libp2p/peer-store'
import { multiaddr, type Multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { MemoryDatastore } from 'datastore-core'
import { pEvent } from 'p-event'
import pWaitFor from 'p-wait-for'
import Sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { DefaultAddressManager } from '../../src/address-manager/index.js'
import { DefaultTransportManager } from '../../src/transport-manager.js'
import type { Components } from '../../src/components.js'
import type { Connection, Transport, Upgrader, Listener } from '@libp2p/interface'

const listenAddr = multiaddr('/ip4/127.0.0.1/tcp/0')
const addrs = [
  multiaddr('/memory/address-1'),
  multiaddr('/memory/address-2')
]
const testTransportTag = 'test-transport'

describe('Transport Manager', () => {
  let tm: DefaultTransportManager
  let components: Components
  let transport: Transport

  beforeEach(async () => {
    const events = new TypedEventEmitter()
    components = {
      peerId: peerIdFromPrivateKey(await generateKeyPair('Ed25519')),
      events,
      upgrader: stubInterface<Upgrader>({
        upgradeInbound: Sinon.stub().resolves(),
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

    transport = stubInterface<Transport>({
      dial: async () => stubInterface<Connection>(),
      dialFilter: (addrs) => {
        return addrs.filter(ma => ma.toString().startsWith('/memory'))
      },
      listenFilter: (addrs) => {
        return addrs.filter(ma => ma.toString().startsWith('/memory'))
      },
      createListener: () => {
        let addr: Multiaddr | undefined
        const closeListeners: Array<() => void> = []

        return stubInterface<Listener>({
          listen: async (a) => {
            addr = a
          },
          getAddrs: () => addr != null ? [addr] : [],
          close: async () => {
            addr = undefined
            closeListeners.forEach(fn => {
              fn()
            })
          },
          addEventListener: (event, handler: any) => {
            if (event === 'close') {
              closeListeners.push(handler)
            }
          }
        })
      }
    })
    transport[Symbol.toStringTag] = testTransportTag
  })

  afterEach(async () => {
    await tm.removeAll()
    await stop(tm)
    expect(tm.getTransports()).to.be.empty()
  })

  it('should be able to add and remove a transport', async () => {
    expect(tm.getTransports()).to.have.lengthOf(0)
    tm.add(transport)

    expect(tm.getTransports()).to.have.lengthOf(1)
    await tm.remove(testTransportTag)
    expect(tm.getTransports()).to.have.lengthOf(0)
  })

  it('should not be able to add a transport twice', async () => {
    tm.add(transport)

    expect(() => {
      tm.add(transport)
    })
      .to.throw()
      .and.to.have.property('name', 'InvalidParametersError')
  })

  it('should fail to dial an unsupported address', async () => {
    tm.add(transport)
    const addr = multiaddr('/ip4/127.0.0.1/tcp/0')
    await expect(tm.dial(addr))
      .to.eventually.be.rejected()
      .and.to.have.property('name', 'TransportUnavailableError')
  })

  it('should fail to listen with no valid address', async () => {
    tm = new DefaultTransportManager(components)
    tm.add(transport)

    await expect(start(tm))
      .to.eventually.be.rejected()
      .and.to.have.property('name', 'NoValidAddressesError')

    await stop(tm)
  })

  it('should be able to add and remove a transport', async () => {
    expect(tm.getTransports()).to.have.lengthOf(0)
    tm.add(transport)
    expect(tm.getTransports()).to.have.lengthOf(1)
    await tm.remove(testTransportTag)
    expect(tm.getTransports()).to.have.lengthOf(0)
  })

  it('should be able to listen', async () => {
    expect(tm.getTransports()).to.be.empty()

    tm.add(transport)

    expect(tm.getTransports()).to.have.lengthOf(1)

    const spyListener = Sinon.spy(transport, 'createListener')
    await tm.listen(addrs)

    expect(tm.getAddrs().length).to.equal(addrs.length)
    await tm.stop()
    expect(spyListener.called).to.be.true()
  })

  it('should be able to dial', async () => {
    tm.add(transport)
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
    tm.add(transport)

    expect(tm.getListeners()).to.have.lengthOf(0)

    const spyListener = Sinon.spy(transport, 'createListener')

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
