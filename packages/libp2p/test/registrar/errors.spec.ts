import { generateKeyPair } from '@libp2p/crypto/keys'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { persistentPeerStore } from '@libp2p/peer-store'
import { expect } from 'aegir/chai'
import { MemoryDatastore } from 'datastore-core/memory'
import { TypedEventEmitter } from 'main-event'
import { stubInterface } from 'sinon-ts'
import { defaultComponents } from '../../src/components.js'
import { DefaultConnectionManager } from '../../src/connection-manager/index.js'
import { Registrar } from '../../src/registrar.js'
import type { Components } from '../../src/components.js'
import type { Upgrader, ConnectionGater, PeerId } from '@libp2p/interface'
import type { TransportManager } from '@libp2p/interface-internal'

describe('registrar errors', () => {
  let components: Components
  let registrar: Registrar
  let peerId: PeerId

  before(async () => {
    peerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const events = new TypedEventEmitter()
    components = defaultComponents({
      peerId,
      events,
      datastore: new MemoryDatastore(),
      upgrader: stubInterface<Upgrader>(),
      transportManager: stubInterface<TransportManager>(),
      connectionGater: stubInterface<ConnectionGater>()
    })
    components.peerStore = persistentPeerStore(components)
    components.connectionManager = new DefaultConnectionManager(components, {
      maxConnections: 1000,
      inboundUpgradeTimeout: 1000
    })
    registrar = new Registrar(components)
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
