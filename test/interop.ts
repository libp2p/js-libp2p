import { interopTests } from '@libp2p/interop'
import type { SpawnOptions, Daemon, DaemonFactory } from '@libp2p/interop'
import { createServer } from '@libp2p/daemon-server'
import { createClient } from '@libp2p/daemon-client'
import { createLibp2p, Libp2pOptions, ServiceFactoryMap } from '../src/index.js'
import { noise } from '@chainsafe/libp2p-noise'
import { tcp } from '@libp2p/tcp'
import { multiaddr } from '@multiformats/multiaddr'
import { kadDHT } from '@libp2p/kad-dht'
import { path as p2pd } from 'go-libp2p'
import { execa } from 'execa'
import pDefer from 'p-defer'
import { logger } from '@libp2p/logger'
import { mplex } from '@libp2p/mplex'
import { yamux } from '@chainsafe/libp2p-yamux'
import fs from 'fs'
import { unmarshalPrivateKey } from '@libp2p/crypto/keys'
import type { PeerId } from '@libp2p/interface-peer-id'
import { peerIdFromKeys } from '@libp2p/peer-id'
import { floodsub } from '@libp2p/floodsub'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { circuitRelayServer, circuitRelayTransport } from '../src/circuit-relay/index.js'
import type { ServiceMap } from '@libp2p/interface-libp2p'
import { identifyService } from '../src/identify/index.js'
import { contentRouting } from '@libp2p/interface-content-routing'
import { peerRouting } from '@libp2p/interface-peer-routing'
import { peerDiscovery } from '@libp2p/interface-peer-discovery'

/**
 * @packageDocumentation
 *
 * To enable debug logging, run the tests with the following env vars:
 *
 * ```console
 * DEBUG=libp2p*,go-libp2p:* npm run test:interop
 * ```
 */

async function createGoPeer (options: SpawnOptions): Promise<Daemon> {
  const controlPort = Math.floor(Math.random() * (50000 - 10000 + 1)) + 10000
  const apiAddr = multiaddr(`/ip4/127.0.0.1/tcp/${controlPort}`)

  const log = logger(`go-libp2p:${controlPort}`)

  const opts = [
    `-listen=${apiAddr.toString()}`
  ]

  if (options.noListen === true) {
    opts.push('-noListenAddrs')
  } else {
    opts.push('-hostAddrs=/ip4/127.0.0.1/tcp/0')
  }

  if (options.noise === true) {
    opts.push('-noise=true')
  }

  if (options.dht === true) {
    opts.push('-dhtServer')
  }

  if (options.relay === true) {
    opts.push('-relay')
  }

  if (options.pubsub === true) {
    opts.push('-pubsub')
  }

  if (options.pubsubRouter != null) {
    opts.push(`-pubsubRouter=${options.pubsubRouter}`)
  }

  if (options.key != null) {
    opts.push(`-id=${options.key}`)
  }

  if (options.muxer === 'mplex') {
    opts.push('-muxer=mplex')
  } else {
    opts.push('-muxer=yamux')
  }

  const deferred = pDefer()
  const proc = execa(p2pd(), opts, {
    env: {
      GOLOG_LOG_LEVEL: 'debug'
    }
  })

  proc.stdout?.on('data', (buf: Buffer) => {
    const str = buf.toString()
    log(str)

    // daemon has started
    if (str.includes('Control socket:')) {
      deferred.resolve()
    }
  })

  proc.stderr?.on('data', (buf) => {
    log.error(buf.toString())
  })

  await deferred.promise

  return {
    client: createClient(apiAddr),
    stop: async () => {
      proc.kill()
    }
  }
}

async function createJsPeer (options: SpawnOptions): Promise<Daemon> {
  let peerId: PeerId | undefined

  if (options.key != null) {
    const keyFile = fs.readFileSync(options.key)
    const privateKey = await unmarshalPrivateKey(keyFile)
    peerId = await peerIdFromKeys(privateKey.public.bytes, privateKey.bytes)
  }

  const opts: Libp2pOptions<ServiceMap> = {
    peerId,
    addresses: {
      listen: options.noListen === true ? [] : ['/ip4/127.0.0.1/tcp/0']
    },
    transports: [tcp(), circuitRelayTransport()],
    streamMuxers: [],
    // @ts-expect-error remove after https://github.com/ChainSafe/js-libp2p-noise/pull/306
    connectionEncryption: [noise()]
  }

  const services: ServiceFactoryMap = {
    identify: identifyService()
  }

  if (options.muxer === 'mplex') {
    opts.streamMuxers?.push(mplex())
  } else {
    opts.streamMuxers?.push(yamux())
  }

  if (options.pubsub === true) {
    if (options.pubsubRouter === 'floodsub') {
      services.pubsub = floodsub()
    } else {
      // @ts-expect-error remove after gossipsub is upgraded to @libp2p/interface-peer-store@2.x.x
      services.pubsub = gossipsub()
    }
  }

  if (options.relay === true) {
    services.relay = circuitRelayServer()
  }

  if (options.dht === true) {
    services.dht = (components: any) => {
      const dht: any = kadDHT({
        clientMode: false
      })(components)

      // go-libp2p-daemon only has the older single-table DHT instead of the dual
      // lan/wan version found in recent go-ipfs versions. unfortunately it's been
      // abandoned so here we simulate the older config with the js implementation
      const lan: any = dht.lan

      const protocol = '/ipfs/kad/1.0.0'
      lan.protocol = protocol
      lan.network.protocol = protocol
      lan.topologyListener.protocol = protocol

      Object.defineProperties(lan, {
        [contentRouting]: {
          get () {
            return dht[contentRouting]
          }
        },
        [peerRouting]: {
          get () {
            return dht[peerRouting]
          }
        },
        [peerDiscovery]: {
          get () {
            return dht[peerDiscovery]
          }
        }
      })

      return lan
    }
  }

  const node: any = await createLibp2p({
    ...opts,
    services
  })

  const server = createServer(multiaddr('/ip4/0.0.0.0/tcp/0'), node)
  await server.start()

  return {
    client: createClient(server.getMultiaddr()),
    stop: async () => {
      await server.stop()
      await node.stop()
    }
  }
}

async function main (): Promise<void> {
  const factory: DaemonFactory = {
    async spawn (options: SpawnOptions) {
      if (options.type === 'go') {
        return await createGoPeer(options)
      }

      return await createJsPeer(options)
    }
  }

  await interopTests(factory)
}

main().catch(err => {
  console.error(err) // eslint-disable-line no-console
  process.exit(1)
})
