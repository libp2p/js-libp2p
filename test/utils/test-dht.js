'use strict'

const PeerBook = require('peer-book')
const pRetry = require('p-retry')
const delay = require('delay')

const KadDHT = require('../../src')
const { PROTOCOL_DHT } = require('../../src/constants')

const createPeerInfo = require('./create-peer-info')
const {
  createMockRegistrar,
  ConnectionPair
} = require('.')

class TestDHT {
  constructor () {
    this.nodes = []
  }

  spawn (length, options = {}) {
    return Promise.all(
      Array.from({ length })
        .map((_, index) => this._spawnOne(index, options))
    )
  }

  async _spawnOne (index, options = {}) {
    const regRecord = {}
    const peerStore = new PeerBook()

    // Disable random walk by default for more controlled testing
    options = {
      randomWalk: {
        enabled: false
      },
      ...options
    }

    const [p] = await createPeerInfo(1)
    const port = index !== undefined ? 8000 + index : 0

    p.multiaddrs.add(`/ip4/127.0.0.1/tcp/${port}/p2p/${p.id.toB58String()}`)

    const connectToPeer = async (peer) => {
      const remotePeerB58 = peer.toB58String()
      const remoteDht = this.nodes.find(
        (node) => node.peerInfo.id.toB58String() === remotePeerB58
      )

      const localOnConnect = regRecord[PROTOCOL_DHT].onConnect
      const remoteOnConnect = remoteDht.regRecord[PROTOCOL_DHT].onConnect

      const remoteHandler = remoteDht.regRecord[PROTOCOL_DHT].handler

      // Notice peers of connection
      const [c0, c1] = ConnectionPair()
      await localOnConnect(remoteDht.peerInfo, c1)
      await remoteOnConnect(p, c0)

      await remoteHandler({
        protocol: PROTOCOL_DHT,
        stream: c0.stream,
        connection: {
          remotePeer: p.id
        }
      })

      return {
        newStream: () => {
          return { stream: c1.stream }
        }
      }
    }

    const dht = new KadDHT({
      dialer: {
        connectToPeer
      },
      registrar: createMockRegistrar(regRecord),
      peerStore,
      peerInfo: p,
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

    await dht.start()

    dht.regRecord = regRecord
    this.nodes.push(dht)
    return dht
  }

  async connect (dhtA, dhtB) {
    const onConnectA = dhtA.regRecord[PROTOCOL_DHT].onConnect
    const onConnectB = dhtB.regRecord[PROTOCOL_DHT].onConnect

    const [c0, c1] = ConnectionPair()

    // Notice peers of connection
    await onConnectA(dhtB.peerInfo, c0)
    await onConnectB(dhtA.peerInfo, c1)

    return Promise.all([
      pRetry(async () => {
        const match = await dhtA.routingTable.find(dhtB.peerInfo.id)

        if (!match) {
          await delay(100)
          throw new Error('not found')
        }

        return match
      }, { retries: 50 }),
      pRetry(async () => {
        const match = await dhtB.routingTable.find(dhtA.peerInfo.id)

        if (!match) {
          await delay(100)
          throw new Error('not found')
        }

        return match
      }, { retries: 50 })
    ])
  }

  async teardown () {
    await Promise.all(this.nodes.map((node) => node.stop()))
    this.nodes = []
  }
}

module.exports = TestDHT
