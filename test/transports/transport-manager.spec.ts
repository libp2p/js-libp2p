/* eslint-env mocha */

import { expect } from 'aegir/utils/chai.js'
import sinon from 'sinon'
import { Multiaddr } from '@multiformats/multiaddr'
import { WebSockets } from '@libp2p/websockets'
import * as filters from '@libp2p/websockets/filters'
import { NOISE } from '@chainsafe/libp2p-noise'
import { DefaultAddressManager } from '../../src/address-manager/index.js'
import { DefaultTransportManager, FAULT_TOLERANCE } from '../../src/transport-manager.js'
import { mockUpgrader } from '@libp2p/interface-compliance-tests/mocks'
import { MULTIADDRS_WEBSOCKETS } from '../fixtures/browser.js'
import { codes as ErrorCodes } from '../../src/errors.js'
import Peers from '../fixtures/peers.js'
import { Components } from '@libp2p/interfaces/components'
import { createEd25519PeerId, createFromJSON } from '@libp2p/peer-id-factory'
import type { PeerId } from '@libp2p/interfaces/peer-id'
import { createLibp2pNode, Libp2pNode } from '../../src/libp2p.js'

const listenAddr = new Multiaddr('/ip4/127.0.0.1/tcp/0')

describe('Transport Manager (WebSockets)', () => {
  let tm: DefaultTransportManager
  let components: Components

  before(async () => {
    components = new Components({
      peerId: await createEd25519PeerId(),
      upgrader: mockUpgrader()
    })
    components.setAddressManager(new DefaultAddressManager(components, { listen: [listenAddr.toString()] }))

    tm = new DefaultTransportManager(components)
  })

  afterEach(async () => {
    await tm.removeAll()
    expect(tm.getTransports()).to.be.empty()
  })

  it('should be able to add and remove a transport', async () => {
    const transport = new WebSockets({
      filter: filters.all
    })

    expect(tm.getTransports()).to.have.lengthOf(0)
    tm.add(transport)

    expect(tm.getTransports()).to.have.lengthOf(1)
    await tm.remove(transport.constructor.name)
    expect(tm.getTransports()).to.have.lengthOf(0)
  })

  it('should not be able to add a transport twice', async () => {
    tm.add(new WebSockets())

    expect(() => {
      tm.add(new WebSockets())
    })
      .to.throw()
      .and.to.have.property('code', ErrorCodes.ERR_DUPLICATE_TRANSPORT)
  })

  it('should be able to dial', async () => {
    tm.add(new WebSockets({ filter: filters.all }))
    const addr = MULTIADDRS_WEBSOCKETS[0]
    const connection = await tm.dial(addr)
    expect(connection).to.exist()
    await connection.close()
  })

  it('should fail to dial an unsupported address', async () => {
    tm.add(new WebSockets({ filter: filters.all }))
    const addr = new Multiaddr('/ip4/127.0.0.1/tcp/0')
    await expect(tm.dial(addr))
      .to.eventually.be.rejected()
      .and.to.have.property('code', ErrorCodes.ERR_TRANSPORT_UNAVAILABLE)
  })

  it('should fail to listen with no valid address', async () => {
    tm.add(new WebSockets({ filter: filters.all }))

    await expect(tm.listen([listenAddr]))
      .to.eventually.be.rejected()
      .and.to.have.property('code', ErrorCodes.ERR_NO_VALID_ADDRESSES)
  })
})

describe('libp2p.transportManager (dial only)', () => {
  let peerId: PeerId
  let libp2p: Libp2pNode

  before(async () => {
    peerId = await createFromJSON(Peers[0])
  })

  afterEach(async () => {
    sinon.restore()

    if (libp2p != null) {
      await libp2p.stop()
    }
  })

  it('fails to start if multiaddr fails to listen', async () => {
    libp2p = await createLibp2pNode({
      peerId,
      addresses: {
        listen: ['/ip4/127.0.0.1/tcp/0']
      },
      transports: [new WebSockets()],
      connectionEncryption: [NOISE]
    })

    await expect(libp2p.start()).to.eventually.be.rejected
      .with.property('code', ErrorCodes.ERR_NO_VALID_ADDRESSES)
  })

  it('does not fail to start if provided listen multiaddr are not compatible to configured transports (when supporting dial only mode)', async () => {
    libp2p = await createLibp2pNode({
      peerId,
      addresses: {
        listen: ['/ip4/127.0.0.1/tcp/0']
      },
      transportManager: {
        faultTolerance: FAULT_TOLERANCE.NO_FATAL
      },
      transports: [
        new WebSockets()
      ],
      connectionEncryption: [
        NOISE
      ]
    })

    await libp2p.start()
  })

  it('does not fail to start if provided listen multiaddr fail to listen on configured transports (when supporting dial only mode)', async () => {
    libp2p = await createLibp2pNode({
      peerId,
      addresses: {
        listen: ['/ip4/127.0.0.1/tcp/12345/p2p/QmWDn2LY8nannvSWJzruUYoLZ4vV83vfCBwd8DipvdgQc3/p2p-circuit']
      },
      transportManager: {
        faultTolerance: FAULT_TOLERANCE.NO_FATAL
      },
      transports: [
        new WebSockets()
      ],
      connectionEncryption: [
        NOISE
      ]
    })

    await libp2p.start()
  })
})
