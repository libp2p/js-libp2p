'use strict'

const PeerStore = require('libp2p/src/peer-store')
const pRetry = require('p-retry')
const delay = require('delay')
const multiaddr = require('multiaddr')

const KadDHT = require('../../src')
const { PROTOCOL_DHT } = require('../../src/constants')

const createPeerId = require('./create-peer-id')
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
    const regRecord = {}
    const peerStore = new PeerStore()

    // Disable random walk by default for more controlled testing
    options = {
      randomWalk: {
        enabled: false
      },
      ...options
    }

    const [peerId] = await createPeerId(1)

    const connectToPeer = (localDHT, peer) => {
      const remotePeerB58 = peer.toB58String()
      const remoteDht = this.nodes.find(
        (node) => node.peerId.toB58String() === remotePeerB58
      )

      const localOnConnect = regRecord[PROTOCOL_DHT].onConnect
      const remoteOnConnect = remoteDht.regRecord[PROTOCOL_DHT].onConnect

      const remoteHandler = remoteDht.regRecord[PROTOCOL_DHT].handler

      // Notice peers of connection
      const [c0, c1] = ConnectionPair()

      return {
        newStream: async () => {
          if (remoteDht._clientMode) {
            throw new Error('unsupported protocol')
          }

          // Trigger on connect for servers connecting
          if (!remoteDht._clientMode) await localOnConnect(remoteDht.peerId, c1)
          if (!localDHT._clientMode) await remoteOnConnect(peerId, c0)

          await remoteHandler({
            protocol: PROTOCOL_DHT,
            stream: c0.stream,
            connection: {
              remotePeer: peerId
            }
          })
          return { stream: c1.stream }
        }
      }
    }

    const dht = new KadDHT({
      libp2p: {
        multiaddrs: [multiaddr('/ip4/0.0.0.0/tcp/4002')]
      },
      dialer: {
        connectToPeer: (peer) => connectToPeer(dht, peer)
      },
      registrar: createMockRegistrar(regRecord),
      peerStore,
      peerId: peerId,
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

    if (autoStart) {
      await dht.start()
    }

    dht.regRecord = regRecord
    this.nodes.push(dht)
    return dht
  }

  async connect (dhtA, dhtB) {
    const onConnectA = dhtA.regRecord[PROTOCOL_DHT].onConnect
    const onConnectB = dhtB.regRecord[PROTOCOL_DHT].onConnect

    const [c0, c1] = ConnectionPair()

    const routingTableChecks = []

    // Notice peers of connection
    if (!dhtB._clientMode) {
      // B is a server, trigger connect events on A
      await onConnectA(dhtB.peerId, c0)
      routingTableChecks.push(async () => {
        const match = await dhtA.routingTable.find(dhtB.peerId)

        if (!match) {
          await delay(100)
          throw new Error('not found')
        }

        return match
      })
    }
    if (!dhtA._clientMode) {
      // A is a server, trigger connect events on B
      await onConnectB(dhtA.peerId, c1)
      routingTableChecks.push(async () => {
        const match = await dhtB.routingTable.find(dhtA.peerId)

        if (!match) {
          await delay(100)
          throw new Error('not found')
        }

        return match
      })
    }

    // Check routing tables
    return Promise.all(routingTableChecks.map(check => {
      pRetry(check, { retries: 50 })
    }))
  }

  async teardown () {
    await Promise.all(this.nodes.map((node) => node.stop()))
    this.nodes = []
  }
}

module.exports = TestDHT
