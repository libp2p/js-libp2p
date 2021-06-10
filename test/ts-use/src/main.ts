import Libp2p = require('libp2p')
import Libp2pRecord = require('libp2p-record')

const TCP = require('libp2p-tcp')
const WEBSOCKETS = require('libp2p-websockets')
const NOISE = require('libp2p-noise')
const MPLEX = require('libp2p-mplex')
const Gossipsub = require('libp2p-gossipsub')
const DHT = require('libp2p-kad-dht')

const { dnsaddrResolver } = require('multiaddr/src/resolvers')
const { publicAddressesFirst } = require('libp2p-utils/src/address-sort')

const { SignaturePolicy } = require('libp2p-interfaces/src/pubsub/signature-policy')
const { FaultTolerance } = require('libp2p/src/transport-manager')
const filters = require('libp2p-websockets/src/filters')

const Bootstrap = require('libp2p-bootstrap')
const LevelStore = require('datastore-level')

const ipfsHttpClient = require('ipfs-http-client')
const DelegatedPeerRouter = require('libp2p-delegated-peer-routing')
const DelegatedContentRouter = require('libp2p-delegated-content-routing')
const PeerId = require('peer-id')


// Known peers addresses
const bootstrapMultiaddrs = [
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN'
]
const transportKey = WEBSOCKETS.prototype[Symbol.toStringTag]

async function main() {
  // create a peerId
  const peerId = await PeerId.create()

  const delegatedPeerRouting = new DelegatedPeerRouter(ipfsHttpClient.create({
    host: 'node0.delegate.ipfs.io', // In production you should setup your own delegates
    protocol: 'https',
    port: 443
  }))

  const delegatedContentRouting = new DelegatedContentRouter(peerId, ipfsHttpClient.create({
    host: 'node0.delegate.ipfs.io', // In production you should setup your own delegates
    protocol: 'https',
    port: 443
  }))

  const libp2p = await Libp2p.create({
    peerId,
    addresses: {
      listen: ['/ip4/127.0.0.1/tcp/8000', '/ip4/127.0.0.1/tcp/8001/ws']
    },
    modules: {
      transport: [TCP, WEBSOCKETS],
      streamMuxer: [MPLEX],
      connEncryption: [NOISE],
      peerDiscovery: [Bootstrap],
      pubsub: Gossipsub,
      dht: DHT,
      contentRouting: [delegatedContentRouting],
      peerRouting: [delegatedPeerRouting]
    },
    peerRouting: {
      refreshManager: {
        enabled: true,
        interval: 1000,
        bootDelay: 11111
      }
    },
    dialer: {
      maxParallelDials: 100,
      maxDialsPerPeer: 4,
      dialTimeout: 30e3,
      resolvers: {
        dnsaddr: dnsaddrResolver
      },
      addressSorter: publicAddressesFirst
    },
    connectionManager: {
      maxConnections: Infinity,
      minConnections: 0,
      pollInterval: 2000,
      defaultPeerValue: 1,
      maxData: Infinity,
      maxSentData: Infinity,
      maxReceivedData: Infinity,
      maxEventLoopDelay: Infinity,
      movingAverageInterval: 60000
    },
    transportManager: {
      faultTolerance: FaultTolerance.NO_FATAL
    },
    metrics: {
      enabled: true,
      computeThrottleMaxQueueSize: 1000,
      computeThrottleTimeout: 2000,
      movingAverageIntervals: [
        60 * 1000, // 1 minute
        5 * 60 * 1000, // 5 minutes
        15 * 60 * 1000 // 15 minutes
      ],
      maxOldPeersRetention: 50
    },
    datastore: new LevelStore('path/to/store'),
    peerStore: {
      persistence: false,
      threshold: 5
    },
    keychain: {
      pass: 'notsafepassword123456789',
      datastore: new LevelStore('path/to/store-keys')
    },
    config: {
      peerDiscovery: {
        autoDial: true,
        [Bootstrap.tag]: {
          enabled: true,
          list: bootstrapMultiaddrs // provide array of multiaddrs
        }
      },
      dht: {
        enabled: true,
        kBucketSize: 20,
        randomWalk: {
          enabled: true,            // Allows to disable discovery (enabled by default)
          interval: 300e3,
          timeout: 10e3
        },
        clientMode: true,
        validators: {
          pk: Libp2pRecord.validator.validators.pk
        },
        selectors: {
          pk: Libp2pRecord.selection.selectors.pk
        }
      },
      nat: {
        description: 'my-node', // set as the port mapping description on the router, defaults the current libp2p version and your peer id
        enabled: true, // defaults to true
        gateway: '192.168.1.1', // leave unset to auto-discover
        externalIp: '80.1.1.1', // leave unset to auto-discover
        ttl: 7200, // TTL for port mappings (min 20 minutes)
        keepAlive: true, // Refresh port mapping after TTL expires
        pmp: {
          enabled: false, // defaults to false
        }
      },
      relay: {
        enabled: true,           // Allows you to dial and accept relayed connections. Does not make you a relay.
        hop: {
          enabled: true,         // Allows you to be a relay for other peers
          active: true           // You will attempt to dial destination peers if you are not connected to them
        },
        advertise: {
          bootDelay: 15 * 60 * 1000, // Delay before HOP relay service is advertised on the network
          enabled: true,          // Allows you to disable the advertise of the Hop service
          ttl: 30 * 60 * 1000     // Delay Between HOP relay service advertisements on the network
        },
        autoRelay: {
          enabled: true,         // Allows you to bind to relays with HOP enabled for improving node dialability
          maxListeners: 2         // Configure maximum number of HOP relays to use
        }
      },
      transport: {
        [transportKey]: {
          filter: filters.all
        }
      },
      pubsub: {                     // The pubsub options (and defaults) can be found in the pubsub router documentation
        enabled: true,
        emitSelf: false,                                  // whether the node should emit to self on publish
        globalSignaturePolicy: SignaturePolicy.StrictSign // message signing policy
      }
    }
  })

  libp2p.connectionManager.on('peer:connect', (connection) => {
    console.log(`Connected to ${connection.remotePeer.toB58String()}`)
  })



  // Listen for new connections to peers
  libp2p.connectionManager.on('peer:connect', (connection) => {
    console.log(`Connected to ${connection.remotePeer.toB58String()}`)
  })

  // Listen for peers disconnecting
  libp2p.connectionManager.on('peer:disconnect', (connection) => {
    console.log(`Disconnected from ${connection.remotePeer.toB58String()}`)
  })


  await libp2p.start()
  console.log('started')
  await libp2p.stop()
}

main()
