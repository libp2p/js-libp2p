import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { circuitRelayServer, circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import { createClient } from '@libp2p/daemon-client'
import { echo } from '@libp2p/echo'
import { identify } from '@libp2p/identify'
import { mplex } from '@libp2p/mplex'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { plaintext } from '@libp2p/plaintext'
import { webSockets } from '@libp2p/websockets'
import { WebSockets } from '@multiformats/mafmt'
import { multiaddr } from '@multiformats/multiaddr'
import { execa } from 'execa'
import { path as p2pd } from 'go-libp2p'
import { createLibp2p } from 'libp2p'
import pDefer from 'p-defer'

/** @type {import('aegir').PartialOptions} */
export default {
  build: {
    bundlesizeMax: '147kB'
  },
  test: {
    before: async () => {
      const peerId = await createEd25519PeerId()
      const libp2p = await createLibp2p({
        connectionManager: {
          inboundConnectionThreshold: Infinity,
          minConnections: 0
        },
        addresses: {
          listen: [
            '/ip4/127.0.0.1/tcp/0/ws'
          ]
        },
        peerId,
        transports: [
          circuitRelayTransport(),
          webSockets()
        ],
        streamMuxers: [
          yamux(),
          mplex()
        ],
        connectionEncryption: [
          noise(),
          plaintext()
        ],
        services: {
          identify: identify(),
          relay: circuitRelayServer({
            reservations: {
              maxReservations: Infinity
            }
          }),
          echo: echo()
        }
      })

      const goLibp2pRelay = await createGoLibp2pRelay()

      return {
        libp2p,
        goLibp2pRelay,
        env: {
          RELAY_MULTIADDR: libp2p.getMultiaddrs().filter(ma => WebSockets.matches(ma)).pop(),
          GO_RELAY_PEER: goLibp2pRelay.peerId,
          GO_RELAY_MULTIADDRS: goLibp2pRelay.multiaddrs,
          GO_RELAY_APIADDR: goLibp2pRelay.apiAddr
        }
      }
    },
    after: async (_, before) => {
      await before.libp2p.stop()
      await before.goLibp2pRelay.proc.kill()
    }
  }
}

async function createGoLibp2pRelay () {
  const controlPort = Math.floor(Math.random() * (50000 - 10000 + 1)) + 10000
  const apiAddr = multiaddr(`/ip4/127.0.0.1/tcp/${controlPort}`)
  const deferred = pDefer()
  const proc = execa(p2pd(), [
    `-listen=${apiAddr.toString()}`,
    // listen on TCP, WebSockets and WebTransport
    '-hostAddrs=/ip4/127.0.0.1/tcp/0,/ip4/127.0.0.1/tcp/0/ws,/ip4/127.0.0.1/udp/0/quic-v1/webtransport',
    '-noise=true',
    '-dhtServer',
    '-relay',
    '-muxer=mplex'
  ], {
    env: {
      GOLOG_LOG_LEVEL: 'debug'
    }
  })

  proc.stdout?.on('data', (buf) => {
    const str = buf.toString()

    // daemon has started
    if (str.includes('Control socket:')) {
      deferred.resolve()
    }
  })
  await deferred.promise

  const daemonClient = createClient(apiAddr)
  const id = await daemonClient.identify()

  return {
    apiAddr,
    peerId: id.peerId.toString(),
    multiaddrs: id.addrs.map(ma => ma.toString()).join(','),
    proc
  }
}
