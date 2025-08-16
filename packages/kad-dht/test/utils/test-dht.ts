import { generateKeyPair } from '@libp2p/crypto/keys'
import { start, stop } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { persistentPeerStore } from '@libp2p/peer-store'
import { streamPair } from '@libp2p/utils'
import { multiaddr } from '@multiformats/multiaddr'
import { MemoryDatastore } from 'datastore-core/memory'
import delay from 'delay'
import { TypedEventEmitter } from 'main-event'
import pRetry from 'p-retry'
import { stubInterface } from 'sinon-ts'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { KadDHT as KadDHTClass } from '../../src/kad-dht.js'
import type { KadDHTInit } from '../../src/index.js'
import type { ComponentLogger, Connection, Libp2pEvents, PeerId, PeerStore, PrivateKey, TypedEventTarget } from '@libp2p/interface'
import type { AddressManager, ConnectionManager, Registrar } from '@libp2p/interface-internal'
import type { Ping } from '@libp2p/ping'
import type { Datastore } from 'interface-datastore'
import type { StubbedInstance } from 'sinon-ts'

let memoryIndex = 0

export interface StubbedKadDHTComponents {
  peerId: PeerId
  privateKey: PrivateKey
  registrar: StubbedInstance<Registrar>
  addressManager: StubbedInstance<AddressManager>
  peerStore: PeerStore
  connectionManager: StubbedInstance<ConnectionManager>
  datastore: Datastore
  events: TypedEventTarget<Libp2pEvents>
  logger: ComponentLogger
  ping: Ping
}

export interface KadDHTPeer {
  dht: KadDHTClass
  components: StubbedKadDHTComponents
}

export class TestDHT {
  private readonly peers: Map<string, KadDHTPeer>

  constructor () {
    this.peers = new Map()
  }

  async spawn (options: Partial<KadDHTInit> = {}, autoStart = true): Promise<KadDHTPeer> {
    const events = new TypedEventEmitter<Libp2pEvents>()

    const privateKey = await generateKeyPair('Ed25519')
    const peerId = peerIdFromPrivateKey(privateKey)

    const components: StubbedKadDHTComponents = {
      peerId,
      privateKey,
      datastore: new MemoryDatastore(),
      registrar: stubInterface<Registrar>(),
      addressManager: stubInterface<AddressManager>(),
      peerStore: stubInterface<PeerStore>(),
      connectionManager: stubInterface<ConnectionManager>({
        openStream: async (peer, protocol, options) => {
          const [outbound, inbound] = await streamPair()

          Promise.resolve().then(async () => {
            const remote = this.peers.get(peer.toString())
            await remote?.dht['rpc'].onIncomingStream(inbound, stubInterface<Connection>({
              remotePeer: peerId,
              remoteAddr: remote.components.addressManager.getAddresses()[0]
            }))
          })
            .catch(err => {
              inbound.abort(err)
            })

          return outbound
        },
        isDialable: async () => true
      }),
      events,
      logger: defaultLogger(),
      ping: stubInterface<Ping>()
    }
    components.peerStore = persistentPeerStore({
      ...components,
      events
    })

    await start(...Object.values(components))

    const addressManager = stubInterface<AddressManager>()
    addressManager.getAddresses.returns([
      multiaddr(`/memory/${memoryIndex++}/p2p/${components.peerId.toString()}`)
    ])

    components.addressManager = addressManager

    // ensure the current node is in it's own peer store
    await components.peerStore.merge(peerId, {
      multiaddrs: addressManager.getAddresses()
    })

    const opts: KadDHTInit = {
      validators: {
        async v () {

        },
        async v2 () {

        }
      },
      selectors: {
        v: (key, values) => {
          const strings = values
            .map(buf => uint8ArrayToString(buf))
          const sortedStrings = strings
            .toSorted((a, b) => a.localeCompare(b))

          const target = sortedStrings[sortedStrings.length - 1]

          return strings.findIndex(str => str === target)
        }
      },
      querySelfInterval: 600_000,
      initialQuerySelfInterval: 600_000,
      allowQueryWithZeroPeers: true,
      clientMode: false,
      peerInfoMapper: (peer) => peer,
      ...options
    }

    const dht = new KadDHTClass(components, opts)

    // skip peer validation
    dht.routingTable.kb.verify = async () => true

    // simulate libp2p._onDiscoveryPeer
    dht.addEventListener('peer', (evt) => {
      const peerData = evt.detail

      if (components.peerId.equals(peerData.id)) {
        return
      }

      void components.peerStore.merge(peerData.id, {
        multiaddrs: peerData.multiaddrs
      })
    })

    if (autoStart) {
      await start(dht)
    }

    const peer = {
      dht,
      components
    }

    this.peers.set(components.peerId.toString(), peer)

    return peer
  }

  async connect (dhtA: KadDHTPeer, dhtB: KadDHTPeer): Promise<void> {
    await dhtA.components.peerStore.merge(dhtB.components.peerId, {
      multiaddrs: dhtB.components.addressManager.getAddresses()
    })
    await dhtB.components.peerStore.merge(dhtA.components.peerId, {
      multiaddrs: dhtA.components.addressManager.getAddresses()
    })

    // simulate identify
    for (const call of dhtA.components.registrar.register.getCalls()) {
      await call.args[1].onConnect?.(dhtB.components.peerId, stubInterface<Connection>({
        remotePeer: dhtB.components.peerId,
        remoteAddr: dhtB.components.addressManager.getAddresses()[0]
      }))
    }
    for (const call of dhtB.components.registrar.register.getCalls()) {
      await call.args[1].onConnect?.(dhtA.components.peerId, stubInterface<Connection>({
        remotePeer: dhtA.components.peerId,
        remoteAddr: dhtA.components.addressManager.getAddresses()[0]
      }))
    }

    // wait for peers to appear in each others' routing tables
    await checkConnected(dhtA, dhtB)

    async function checkConnected (a: KadDHTPeer, b: KadDHTPeer): Promise<PeerId[]> {
      const routingTableChecks: Array<() => Promise<PeerId>> = []

      if (b.dht.getMode() === 'server') {
        routingTableChecks.push(async () => {
          const match = await a.dht.routingTable.find(b.components.peerId)

          if (match == null) {
            await delay(100)
            throw new Error('not found')
          }

          return match
        })
      }

      if (a.dht.getMode() === 'server') {
        routingTableChecks.push(async () => {
          const match = await b.dht.routingTable.find(a.components.peerId)

          if (match == null) {
            await delay(100)
            throw new Error('not found')
          }

          return match
        })
      }

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
