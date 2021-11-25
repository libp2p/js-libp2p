'use strict'

const PeerStore = require('libp2p/src/peer-store')
const pRetry = require('p-retry')
const delay = require('delay')
const { Multiaddr } = require('multiaddr')
const { create } = require('../../src')
const createPeerId = require('./create-peer-id')
const { MemoryDatastore } = require('datastore-core/memory')
const {
  createMockRegistrar,
  ConnectionPair
} = require('.')

class TestDHT {
  constructor () {
    this.nodes = []
  }

  spawn (length, options = {}, autoStart = true) {
    return Promise.all(
      Array.from({ length })
        .map((_, index) => this._spawnOne(index, options, autoStart))
    )
  }

  async _spawnOne (index, options = {}, autoStart = true) {
    const [peerId] = await createPeerId(1)

    const regRecord = {}
    const peerStore = new PeerStore({ peerId })

    options = {
      protocolPrefix: '/ipfs',
      ...options
    }

    const connectToPeer = async (localDHT, peer, protocol) => {
      const remoteDht = this.nodes.find(
        (node) => node._libp2p.peerId.equals(peer)
      )

      if (remoteDht._clientMode) {
        throw new Error('Cannot connect to remote DHT client')
      }

      const localOnConnect = regRecord[protocol].onConnect
      const remoteOnConnect = remoteDht.regRecord[protocol].onConnect
      const remoteHandler = remoteDht.regRecord[protocol].handler

      // Notice peers of connection
      const [c0, c1] = ConnectionPair()

      // Trigger on connect for servers connecting
      await localOnConnect(remoteDht._libp2p.peerId, c1)

      if (!localDHT._clientMode) {
        await remoteOnConnect(peerId, c0)
      }

      await remoteHandler({
        protocol: protocol,
        stream: c0.stream,
        connection: {
          remotePeer: peerId
        }
      })

      return { stream: c1.stream }
    }

    const registrar = createMockRegistrar(regRecord)

    const dht = create({
      libp2p: {
        peerId,
        multiaddrs: [
          new Multiaddr('/ip4/127.0.0.1/tcp/4002'),
          new Multiaddr('/ip4/192.168.1.1/tcp/4002'),
          new Multiaddr('/ip4/85.3.31.0/tcp/4002')
        ],
        peerStore,
        datastore: new MemoryDatastore(),
        dialProtocol: (peer, protocol, options) => connectToPeer(dht, peer, protocol, options),
        registrar,
        handle: (protocol, fn) => {
          registrar.handle(protocol, fn)
        },
        unhandle: (protocol) => {
          registrar.unhandle(protocol)
        },
        on: () => {},
        connectionManager: {
          on: () => {}
        }
      },
      validators: {
        v: {
          func () {
            return Promise.resolve(true)
          },
          sign: false
        },
        v2: {
          func () {
            return Promise.resolve(true)
          },
          sign: false
        }
      },
      selectors: {
        v: () => 0
      },
      ...options
    })

    // simulate libp2p._onDiscoveryPeer
    dht.on('peer', (peerData) => {
      if (peerData.id.toB58String() === peerId.toB58String()) {
        return
      }

      peerData.multiaddrs && peerStore.addressBook.add(peerData.id, peerData.multiaddrs)
      peerData.protocols && peerStore.protoBook.set(peerData.id, peerData.protocols)
    })

    if (autoStart) {
      dht.start()
    }

    dht.regRecord = regRecord
    this.nodes.push(dht)

    return dht
  }

  async connect (dhtA, dhtB) {
    const onConnectA = dhtA.regRecord[dhtA._lan._protocol].onConnect
    const onConnectB = dhtB.regRecord[dhtB._lan._protocol].onConnect
    const [c0, c1] = ConnectionPair()
    const routingTableChecks = []

    // Libp2p dial adds multiaddrs to the addressBook
    dhtA._libp2p.peerStore.addressBook.add(dhtB._libp2p.peerId, dhtB._libp2p.multiaddrs)
    dhtB._libp2p.peerStore.addressBook.add(dhtA._libp2p.peerId, dhtA._libp2p.multiaddrs)

    // Notice peers of connection
    if (!dhtB._clientMode) {
      // B is a server, trigger connect events on A
      await onConnectA(dhtB._libp2p.peerId, c0)
      routingTableChecks.push(async () => {
        const match = await dhtA._lan._routingTable.find(dhtB._libp2p.peerId)

        if (!match) {
          await delay(100)
          throw new Error('not found')
        }

        return match
      })
    }

    if (!dhtA._clientMode) {
      // A is a server, trigger connect events on B
      await onConnectB(dhtA._libp2p.peerId, c1)
      routingTableChecks.push(async () => {
        const match = await dhtB._lan._routingTable.find(dhtA._libp2p.peerId)

        if (!match) {
          await delay(100)
          throw new Error('not found')
        }

        return match
      })
    }

    // Check routing tables
    return Promise.all(routingTableChecks.map(check => {
      return pRetry(check, { retries: 50 })
    }))
  }

  teardown () {
    this.nodes.forEach(node => node.stop())
    this.nodes = []
  }
}

module.exports = TestDHT
