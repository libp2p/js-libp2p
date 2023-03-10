import { PersistentPeerStore } from '@libp2p/peer-store'
import pRetry from 'p-retry'
import { multiaddr } from '@multiformats/multiaddr'
import { createPeerId } from './create-peer-id.js'
import { MemoryDatastore } from 'datastore-core/memory'
import { mockRegistrar, mockConnectionManager, mockNetwork } from '@libp2p/interface-mocks'
import type { Registrar } from '@libp2p/interface-registrar'
import { KadDHT } from '../../src/kad-dht.js'
import { DualKadDHT } from '../../src/dual-kad-dht.js'
import { logger } from '@libp2p/logger'
import type { KadDHTComponents, KadDHTInit } from '../../src/index.js'
import type { AddressManager } from '@libp2p/interface-address-manager'
import { stubInterface } from 'ts-sinon'
import { start } from '@libp2p/interfaces/startable'
import delay from 'delay'
import type { ConnectionManager } from '@libp2p/interface-connection-manager'
import type { PeerStore } from '@libp2p/interface-peer-store'
import type { PeerId } from '@libp2p/interface-peer-id'

const log = logger('libp2p:kad-dht:test-dht')

export class TestDHT {
  private readonly peers: Map<string, { dht: DualKadDHT, registrar: Registrar }>

  constructor () {
    this.peers = new Map()
  }

  async spawn (options: Partial<KadDHTInit> = {}, autoStart = true): Promise<DualKadDHT> {
    const components: KadDHTComponents = {
      peerId: await createPeerId(),
      datastore: new MemoryDatastore(),
      registrar: mockRegistrar(),
      // connectionGater: mockConnectionGater(),
      addressManager: stubInterface<AddressManager>(),
      peerStore: stubInterface<PeerStore>(),
      connectionManager: stubInterface<ConnectionManager>()
    }
    components.connectionManager = mockConnectionManager(components)
    components.peerStore = new PersistentPeerStore(components)

    await start(...Object.values(components))

    mockNetwork.addNode(components)

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
      ...options
    }

    const dht: DualKadDHT = new DualKadDHT(
      components,
      new KadDHT(components, {
        protocolPrefix: '/ipfs',
        lan: false,
        ...opts
      }),
      new KadDHT(components, {
        protocolPrefix: '/ipfs',
        lan: true,
        ...opts,
        clientMode: false
      })
    )

    // simulate libp2p._onDiscoveryPeer
    dht.addEventListener('peer', (evt) => {
      const peerData = evt.detail

      if (components.peerId.equals(peerData.id)) {
        return
      }

      Promise.all([
        components.peerStore.addressBook.add(peerData.id, peerData.multiaddrs),
        components.peerStore.protoBook.set(peerData.id, peerData.protocols)
      ]).catch(err => { log.error(err) })
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

  async connect (dhtA: DualKadDHT, dhtB: DualKadDHT): Promise<void> {
    // need addresses in the address book otherwise we won't know whether to add
    // the peer to the public or private DHT and will do nothing
    await dhtA.components.peerStore.addressBook.add(dhtB.components.peerId, dhtB.components.addressManager.getAddresses())
    await dhtB.components.peerStore.addressBook.add(dhtA.components.peerId, dhtA.components.addressManager.getAddresses())

    await dhtA.components.connectionManager.openConnection(dhtB.components.peerId)

    // wait for peers to appear in each others' routing tables
    await checkConnected(dhtA.lan, dhtB.lan)

    // only wait for WANs to connect if we are in server mode
    if ((await dhtA.wan.getMode()) === 'server' && (await dhtB.wan.getMode()) === 'server') {
      await checkConnected(dhtA.wan, dhtB.wan)
    }

    async function checkConnected (a: KadDHT, b: KadDHT): Promise<PeerId[]> {
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
      return await Promise.all(
        routingTableChecks
          .map(
            async check => await pRetry(check, { retries: 50 })
          )
      )
    }
  }

  async teardown (): Promise<void> {
    await Promise.all(
      Array.from(this.peers.entries()).map(async ([_, { dht }]) => { await dht.stop() })
    )
    this.peers.clear()
  }
}
