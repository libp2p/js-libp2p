import { PersistentPeerStore } from '@libp2p/peer-store'
import pRetry from 'p-retry'
import delay from 'delay'
import { Multiaddr } from '@multiformats/multiaddr'
import { createPeerId } from './create-peer-id.js'
import { MemoryDatastore } from 'datastore-core/memory'
import { isPeerId, PeerId } from '@libp2p/interfaces/peer-id'
import { mockRegistrar, connectionPair, mockConnectionGater } from '@libp2p/interface-compliance-tests/mocks'
import type { Dialer } from '@libp2p/interfaces/dialer'
import type { Registrar } from '@libp2p/interfaces/registrar'
import { KadDHT } from '../../src/kad-dht.js'
import { DualKadDHT } from '../../src/dual-kad-dht.js'
import { logger } from '@libp2p/logger'
import { Components } from '@libp2p/interfaces/components'
import type { KadDHTInit } from '../../src/index.js'
import type { AddressManager } from '@libp2p/interfaces'
import { stubInterface } from 'ts-sinon'

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
      registrar: mockRegistrar()
    })
    components.setPeerStore(new PersistentPeerStore(components, { addressFilter: async () => true }))

    const connectToPeer = async (localDHT: DualKadDHT, peerId: PeerId | Multiaddr, protocols: string | string[]) => {
      const protocol = Array.isArray(protocols) ? protocols[0] : protocols
      const peer = this.peers.get(peerId.toString())

      if (!isPeerId(peerId)) {
        throw new Error('PeerId cannot be Multiaddr')
      }

      if (peer == null) {
        throw new Error(`No DHT found for peer ${peerId.toString()}`)
      }

      const { dht: remoteDht, registrar: remoteRegistrar } = peer

      if (protocol === dht.wan.protocol && (await remoteDht.getMode()) === 'client') {
        throw new Error(`Cannot connect to remote DHT wan client ${remoteDht.components.getPeerId().toString()} on protocol ${protocol} as it is in client mode`)
      }

      const localTopology = components.getRegistrar().getTopologies(protocol)[0]
      const remoteTopology = remoteRegistrar.getTopologies(protocol)[0]
      const remoteHandler = remoteRegistrar.getHandler(protocol)

      if (localTopology == null) {
        throw new Error('Local topology not registered with registrar')
      }

      if (remoteTopology == null) {
        throw new Error('Remote topology not registered with registrar')
      }

      if (remoteHandler == null) {
        throw new Error('Remote handler not registered with registrar')
      }

      // Notice peers of connection
      const [peerAtoPeerB, peerBtoPeerA] = await connectionPair({
        peerId: localDHT.components.getPeerId(),
        registrar: components.getRegistrar()
      }, {
        peerId,
        registrar: remoteRegistrar
      })

      // Trigger on connect for servers connecting
      await localTopology.onConnect(peerId, peerAtoPeerB)

      if ((await localDHT.getMode()) !== 'client') {
        await remoteTopology.onConnect(peerId, peerBtoPeerA)
      }

      await remoteHandler({
        protocol: protocol,
        stream: (await peerBtoPeerA.newStream([protocol])).stream,
        connection: peerBtoPeerA
      })

      return await peerAtoPeerB.newStream([protocol])
    }

    const dialer: Dialer = {
      dial: () => {
        throw new Error('Not implemented')
      },
      dialProtocol: async (peer: PeerId | Multiaddr, protocol: string | string[]) => await connectToPeer(dht, peer, protocol)
    }
    components.setDialer(dialer)

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
    const [peerAtoPeerB, peerBToPeerA] = await connectionPair({
      peerId: dhtA.components.getPeerId(),
      registrar: dhtA.components.getRegistrar()
    }, {
      peerId: dhtB.components.getPeerId(),
      registrar: dhtB.components.getRegistrar()
    })

    // Libp2p dial adds multiaddrs to the addressBook
    await dhtA.components.getPeerStore().addressBook.add(dhtB.components.getPeerId(), dhtB.components.getAddressManager().getAddresses())
    await dhtB.components.getPeerStore().addressBook.add(dhtA.components.getPeerId(), dhtA.components.getAddressManager().getAddresses())

    // Notice peers of connection
    await connectDHT(dhtA.lan, dhtB.lan)
    await connectDHT(dhtA.wan, dhtB.wan)

    async function connectDHT (a: KadDHT, b: KadDHT) {
      const topologyA = a.components.getRegistrar().getTopologies(a.protocol)[0]
      const topologyB = b.components.getRegistrar().getTopologies(b.protocol)[0]

      if (topologyA == null || topologyB == null) {
        throw new Error(`Topologies were not registered for protocol ${a.protocol}`)
      }

      const routingTableChecks = []

      await topologyA.onConnect(dhtB.components.getPeerId(), peerAtoPeerB)

      routingTableChecks.push(async () => {
        const match = await a.routingTable.find(dhtB.components.getPeerId())

        if (match == null) {
          await delay(100)
          throw new Error('not found')
        }

        return match
      })

      await topologyB.onConnect(dhtA.components.getPeerId(), peerBToPeerA)

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
