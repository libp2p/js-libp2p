/* eslint-env mocha */

import { TypedEventEmitter, type ConnectionGater, type PeerId } from '@libp2p/interface'
import { mockUpgrader } from '@libp2p/interface-compliance-tests/mocks'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { PersistentPeerStore } from '@libp2p/peer-store'
import { expect } from 'aegir/chai'
import { MemoryDatastore } from 'datastore-core/memory'
import { stubInterface } from 'sinon-ts'
import { defaultComponents } from '../../src/components.js'
import { DefaultConnectionManager } from '../../src/connection-manager/index.js'
import { DefaultRegistrar } from '../../src/registrar.js'
import type { Components } from '../../src/components.js'
import type { Registrar, TransportManager } from '@libp2p/interface-internal'

describe('registrar errors', () => {
  let components: Components
  let registrar: Registrar
  let peerId: PeerId

  before(async () => {
    peerId = await createEd25519PeerId()
    const events = new TypedEventEmitter()
    components = defaultComponents({
      peerId,
      events,
      datastore: new MemoryDatastore(),
      upgrader: mockUpgrader({ events }),
      transportManager: stubInterface<TransportManager>(),
      connectionGater: stubInterface<ConnectionGater>()
    })
    components.peerStore = new PersistentPeerStore(components)
    components.connectionManager = new DefaultConnectionManager(components, {
      maxConnections: 1000,
      inboundUpgradeTimeout: 1000
    })
    registrar = new DefaultRegistrar(components)
  })

  it('should fail to register a protocol if no multicodec is provided', () => {
    // @ts-expect-error invalid parameters
    return expect(registrar.register()).to.eventually.be.rejected()
  })

  it('should fail to register a protocol if an invalid topology is provided', () => {
    const fakeTopology = {
      random: 1
    }

    // @ts-expect-error invalid parameters
    return expect(registrar.register(fakeTopology)).to.eventually.be.rejected()
  })
})
