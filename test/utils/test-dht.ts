import { createPeerStore } from '@libp2p/peer-store'
import pRetry from 'p-retry'
import delay from 'delay'
import { Multiaddr } from '@multiformats/multiaddr'
import { createPeerId } from './create-peer-id.js'
import { MemoryDatastore } from 'datastore-core/memory'
import type { PeerId } from '@libp2p/interfaces/peer-id'
import { base58btc } from 'multiformats/bases/base58'
import { mockRegistrar, connectionPair } from '@libp2p/interface-compliance-tests/mocks'
import { CustomEvent, Dialer } from '@libp2p/interfaces'
import type { IncomingStreamData, Registrar } from '@libp2p/interfaces/registrar'
import { KadDHT, KadDHTOptions } from '../../src/kad-dht.js'
import { DualKadDHT } from '../../src/dual-kad-dht.js'
import { logger } from '@libp2p/logger'
import sinon from 'sinon'

const log = logger('libp2p:kad-dht:test-dht')

export class TestDHT {
  private readonly peers: Map<string, { dht: DualKadDHT, registrar: Registrar}>

  constructor () {
    this.peers = new Map()
  }

  async spawn (options: Partial<KadDHTOptions> = {}, autoStart = true) {
    const peerId = await createPeerId()
    const registrar = mockRegistrar()
    const datastore = new MemoryDatastore()
    const peerStore = createPeerStore({
      peerId,
      datastore
    })

    const connectToPeer = async (localDHT: DualKadDHT, peerId: PeerId, protocol: string) => {
      const peer = this.peers.get(peerId.toString(base58btc))

      if (peer == null) {
        throw new Error(`No DHT found for peer ${peerId.toString(base58btc)}`)
      }

      const { dht: remoteDht, registrar: remoteRegistrar } = peer

      if (protocol === dht.wan.protocol && (await remoteDht.getMode()) === 'client') {
        throw new Error(`Cannot connect to remote DHT wan client ${remoteDht.peerId.toString()} on protocol ${protocol} as it is in client mode`)
      }

      const localTopology = registrar.getTopologies(protocol)[0]
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
        peerId: localDHT.peerId,
        registrar
      }, {
        peerId,
        registrar: remoteRegistrar
      })

      // Trigger on connect for servers connecting
      await localTopology.onConnect(peerId, peerAtoPeerB)

      if ((await localDHT.getMode()) !== 'client') {
        await remoteTopology.onConnect(peerId, peerBtoPeerA)
      }

      await remoteHandler(new CustomEvent<IncomingStreamData>('incomingStream', {
        detail: {
          protocol: protocol,
          stream: (await peerBtoPeerA.newStream([protocol])).stream,
          connection: peerBtoPeerA
        }
      }))

      return await peerAtoPeerB.newStream([protocol])
    }

    const dialer: Dialer = {
      dial: () => {
        throw new Error('Not implemented')
      },
      dialProtocol: async (peer, protocol) => await connectToPeer(dht, peer, protocol),
      getTokens: sinon.stub(),
      releaseToken: sinon.stub()
    }

    const opts = {
      validators: {
        v: {
          async func () {

          }
        },
        v2: {
          async func () {

          }
        }
      },
      selectors: {
        v: () => 0
      },
      querySelfInterval: 600000,
      bootstrapPeers: [],
      dialer,
      addressable: {
        multiaddrs: [
          new Multiaddr('/ip4/127.0.0.1/tcp/4002'),
          new Multiaddr('/ip4/192.168.1.1/tcp/4002'),
          new Multiaddr('/ip4/85.3.31.0/tcp/4002')
        ]
      },
      peerStore,
      peerId,
      datastore,
      registrar,
      ...options
    }

    const dht: DualKadDHT = new DualKadDHT(
      new KadDHT({
        protocol: '/ipfs/kad/1.0.0',
        lan: false,
        ...opts
      }),
      new KadDHT({
        protocol: '/ipfs/lan/kad/1.0.0',
        lan: true,
        ...opts,
        clientMode: false
      }),
      opts.peerId,
      opts.peerStore
    )

    // simulate libp2p._onDiscoveryPeer
    dht.addEventListener('peer', (evt) => {
      const peerData = evt.detail

      if (peerId.equals(peerData.id)) {
        return
      }

      Promise.all([
        peerStore.addressBook.add(peerData.id, peerData.multiaddrs),
        peerStore.protoBook.set(peerData.id, peerData.protocols)
      ]).catch(err => log.error(err))
    })

    if (autoStart) {
      await dht.start()
    }

    this.peers.set(peerId.toString(base58btc), {
      dht,
      registrar
    })

    return dht
  }

  async connect (dhtA: DualKadDHT, dhtB: DualKadDHT) {
    const [peerAtoPeerB, peerBToPeerA] = await connectionPair({
      peerId: dhtA.peerId,
      registrar: dhtA.lan.registrar
    }, {
      peerId: dhtB.peerId,
      registrar: dhtB.lan.registrar
    })

    // Libp2p dial adds multiaddrs to the addressBook
    await dhtA.peerStore.addressBook.add(dhtB.peerId, dhtB.wan.addressable.multiaddrs)
    await dhtB.peerStore.addressBook.add(dhtA.peerId, dhtA.wan.addressable.multiaddrs)

    // Notice peers of connection
    await connectDHT(dhtA.lan, dhtB.lan)
    await connectDHT(dhtA.wan, dhtB.wan)

    async function connectDHT (a: KadDHT, b: KadDHT) {
      const topologyA = a.registrar.getTopologies(a.protocol)[0]
      const topologyB = b.registrar.getTopologies(b.protocol)[0]

      if (topologyA == null || topologyB == null) {
        throw new Error(`Topologies were not registered for protocol ${a.protocol}`)
      }

      const routingTableChecks = []

      await topologyA.onConnect(dhtB.peerId, peerAtoPeerB)

      routingTableChecks.push(async () => {
        const match = await a.routingTable.find(dhtB.peerId)

        if (match == null) {
          await delay(100)
          throw new Error('not found')
        }

        return match
      })

      await topologyB.onConnect(dhtA.peerId, peerBToPeerA)

      routingTableChecks.push(async () => {
        const match = await b.routingTable.find(dhtA.peerId)

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
