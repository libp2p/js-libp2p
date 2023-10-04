import { EventEmitter } from '@libp2p/interface/events'
import { start, stop } from '@libp2p/interface/startable'
import { mockRegistrar, mockConnectionManager, mockNetwork } from '@libp2p/interface-compliance-tests/mocks'
import { logger } from '@libp2p/logger'
import { PersistentPeerStore } from '@libp2p/peer-store'
import { multiaddr } from '@multiformats/multiaddr'
import { MemoryDatastore } from 'datastore-core/memory'
import delay from 'delay'
import pRetry from 'p-retry'
import { stubInterface } from 'ts-sinon'
import { DefaultDualKadDHT } from '../../src/dual-kad-dht.js'
import { createPeerId } from './create-peer-id.js'
import type { DualKadDHT, KadDHTComponents, KadDHTInit } from '../../src/index.js'
import type { DefaultKadDHT } from '../../src/kad-dht.js'
import type { Libp2pEvents } from '@libp2p/interface'
import type { PeerId } from '@libp2p/interface/peer-id'
import type { PeerStore } from '@libp2p/interface/peer-store'
import type { AddressManager } from '@libp2p/interface-internal/address-manager'
import type { ConnectionManager } from '@libp2p/interface-internal/connection-manager'
import type { Registrar } from '@libp2p/interface-internal/registrar'

const log = logger('libp2p:kad-dht:test-dht')

export class TestDHT {
  private readonly peers: Map<string, { dht: DualKadDHT, registrar: Registrar }>

  constructor () {
    this.peers = new Map()
  }

  async spawn (options: Partial<KadDHTInit> = {}, autoStart = true): Promise<DefaultDualKadDHT> {
    const events = new EventEmitter<Libp2pEvents>()
    const components: KadDHTComponents = {
      peerId: await createPeerId(),
      datastore: new MemoryDatastore(),
      registrar: mockRegistrar(),
      // connectionGater: mockConnectionGater(),
      addressManager: stubInterface<AddressManager>(),
      peerStore: stubInterface<PeerStore>(),
      connectionManager: stubInterface<ConnectionManager>(),
      events
    }
    components.connectionManager = mockConnectionManager({
      ...components,
      events
    })
    components.peerStore = new PersistentPeerStore({
      ...components,
      events
    })

    await start(...Object.values(components))

    mockNetwork.addNode({
      ...components,
      events
    })

    const addressManager = stubInterface<AddressManager>()
    addressManager.getAddresses.returns([
      multiaddr(`/ip4/127.0.0.1/tcp/4002/p2p/${components.peerId.toString()}`),
      multiaddr(`/ip4/192.168.1.1/tcp/4002/p2p/${components.peerId.toString()}`),
      multiaddr(`/ip4/85.3.31.0/tcp/4002/p2p/${components.peerId.toString()}`)
    ])

    components.addressManager = addressManager

    const opts: KadDHTInit = {
      validators: {
        async v () {

        },
        async v2 () {

        }
      },
      selectors: {
        v: () => 0
      },
      querySelfInterval: 600000,
      initialQuerySelfInterval: 600000,
      allowQueryWithZeroPeers: true,
      ...options
    }

    const dht = new DefaultDualKadDHT(components, opts)

    // simulate libp2p._onDiscoveryPeer
    dht.addEventListener('peer', (evt) => {
      const peerData = evt.detail

      if (components.peerId.equals(peerData.id) === true) {
        return
      }

      components.peerStore.merge(peerData.id, {
        multiaddrs: peerData.multiaddrs,
        protocols: peerData.protocols
      })
        .catch(err => { log.error(err) })
    })

    if (autoStart) {
      await dht.start()
    }

    this.peers.set(components.peerId.toString(), {
      dht,
      registrar: components.registrar
    })

    return dht
  }

  async connect (dhtA: DefaultDualKadDHT, dhtB: DefaultDualKadDHT): Promise<void> {
    // need addresses in the address book otherwise we won't know whether to add
    // the peer to the public or private DHT and will do nothing
    await dhtA.components.peerStore.merge(dhtB.components.peerId, {
      multiaddrs: dhtB.components.addressManager.getAddresses()
    })
    await dhtB.components.peerStore.merge(dhtA.components.peerId, {
      multiaddrs: dhtA.components.addressManager.getAddresses()
    })

    await dhtA.components.connectionManager.openConnection(dhtB.components.peerId)

    // wait for peers to appear in each others' routing tables
    await checkConnected(dhtA.lan, dhtB.lan)

    // only wait for WANs to connect if we are in server mode
    if ((await dhtA.wan.getMode()) === 'server' && (await dhtB.wan.getMode()) === 'server') {
      await checkConnected(dhtA.wan, dhtB.wan)
    }

    async function checkConnected (a: DefaultKadDHT, b: DefaultKadDHT): Promise<PeerId[]> {
      const routingTableChecks = []

      routingTableChecks.push(async () => {
        const match = await a.routingTable.find(dhtB.components.peerId)

        if (match == null) {
          await delay(100)
          throw new Error('not found')
        }

        return match
      })

      routingTableChecks.push(async () => {
        const match = await b.routingTable.find(dhtA.components.peerId)

        if (match == null) {
          await delay(100)
          throw new Error('not found')
        }

        return match
      })

      // Check routing tables
      return Promise.all(
        routingTableChecks
          .map(
            async check => pRetry(check, { retries: 50 })
          )
      )
    }
  }

  async teardown (): Promise<void> {
    await Promise.all(
      Array.from(this.peers.entries()).map(async ([_, { dht }]) => {
        await stop(dht)
      })
    )
    this.peers.clear()
  }
}
