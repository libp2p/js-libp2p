import { PersistentPeerStore } from '@libp2p/peer-store'
import pRetry from 'p-retry'
import { Multiaddr } from '@multiformats/multiaddr'
import { createPeerId } from './create-peer-id.js'
import { MemoryDatastore } from 'datastore-core/memory'
import { mockRegistrar, mockConnectionGater, mockConnectionManager, mockNetwork } from '@libp2p/interface-mocks'
import type { Registrar } from '@libp2p/interface-registrar'
import { KadDHT } from '../../src/kad-dht.js'
import { DualKadDHT } from '../../src/dual-kad-dht.js'
import { logger } from '@libp2p/logger'
import { Components } from '@libp2p/components'
import type { KadDHTInit } from '../../src/index.js'
import type { AddressManager } from '@libp2p/interface-address-manager'
import { stubInterface } from 'ts-sinon'
import { start } from '@libp2p/interfaces/startable'
import delay from 'delay'

const log = logger('libp2p:kad-dht:test-dht')

export class TestDHT {
  private readonly peers: Map<string, { dht: DualKadDHT, registrar: Registrar}>

  constructor () {
    this.peers = new Map()
  }

  async spawn (options: Partial<KadDHTInit> = {}, autoStart = true) {
    const components = new Components({
      peerId: await createPeerId(),
      connectionGater: mockConnectionGater(),
      datastore: new MemoryDatastore(),
      registrar: mockRegistrar(),
      peerStore: new PersistentPeerStore(),
      connectionManager: mockConnectionManager()
    })

    await start(components)

    mockNetwork.addNode(components)

    const addressManager = stubInterface<AddressManager>()
    addressManager.getAddresses.returns([
      new Multiaddr(`/ip4/127.0.0.1/tcp/4002/p2p/${components.getPeerId().toString()}`),
      new Multiaddr(`/ip4/192.168.1.1/tcp/4002/p2p/${components.getPeerId().toString()}`),
      new Multiaddr(`/ip4/85.3.31.0/tcp/4002/p2p/${components.getPeerId().toString()}`)
    ])

    components.setAddressManager(addressManager)

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
      new KadDHT({
        protocolPrefix: '/ipfs',
        lan: false,
        ...opts
      }),
      new KadDHT({
        protocolPrefix: '/ipfs',
        lan: true,
        ...opts,
        clientMode: false
      })
    )
    dht.init(components)

    // simulate libp2p._onDiscoveryPeer
    dht.addEventListener('peer', (evt) => {
      const peerData = evt.detail

      if (components.getPeerId().equals(peerData.id)) {
        return
      }

      Promise.all([
        components.getPeerStore().addressBook.add(peerData.id, peerData.multiaddrs),
        components.getPeerStore().protoBook.set(peerData.id, peerData.protocols)
      ]).catch(err => log.error(err))
    })

    if (autoStart) {
      await dht.start()
    }

    this.peers.set(components.getPeerId().toString(), {
      dht,
      registrar: components.getRegistrar()
    })

    return dht
  }

  async connect (dhtA: DualKadDHT, dhtB: DualKadDHT) {
    // need addresses in the address book otherwise we won't know whether to add
    // the peer to the public or private DHT and will do nothing
    await dhtA.components.getPeerStore().addressBook.add(dhtB.components.getPeerId(), dhtB.components.getAddressManager().getAddresses())
    await dhtB.components.getPeerStore().addressBook.add(dhtA.components.getPeerId(), dhtA.components.getAddressManager().getAddresses())

    await dhtA.components.getConnectionManager().openConnection(dhtB.components.getPeerId())

    // wait for peers to appear in each others' routing tables
    await checkConnected(dhtA.lan, dhtB.lan)

    // only wait for WANs to connect if we are in server mode
    if ((await dhtA.wan.getMode()) === 'server' && (await dhtB.wan.getMode()) === 'server') {
      await checkConnected(dhtA.wan, dhtB.wan)
    }

    async function checkConnected (a: KadDHT, b: KadDHT) {
      const routingTableChecks = []

      routingTableChecks.push(async () => {
        const match = await a.routingTable.find(dhtB.components.getPeerId())

        if (match == null) {
          await delay(100)
          throw new Error('not found')
        }

        return match
      })

      routingTableChecks.push(async () => {
        const match = await b.routingTable.find(dhtA.components.getPeerId())

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

  async teardown () {
    await Promise.all(
      Array.from(this.peers.entries()).map(async ([_, { dht }]) => await dht.stop())
    )
    this.peers.clear()
  }
}
