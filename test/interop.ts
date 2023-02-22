import { interopTests } from '@libp2p/interop'
import type { SpawnOptions, Daemon, DaemonFactory } from '@libp2p/interop'
import { createServer } from '@libp2p/daemon-server'
import { createClient } from '@libp2p/daemon-client'
import { createLibp2p, Libp2pOptions } from '../src/index.js'
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

async function createGoPeer (options: SpawnOptions): Promise<Daemon> {
  const controlPort = Math.floor(Math.random() * (50000 - 10000 + 1)) + 10000
  const apiAddr = multiaddr(`/ip4/0.0.0.0/tcp/${controlPort}`)

  const log = logger(`go-libp2p:${controlPort}`)

  const opts = [
    `-listen=${apiAddr.toString()}`
  ]

  if (options.noListen === true) {
    opts.push('-noListenAddrs')
  } else {
    opts.push('-hostAddrs=/ip4/0.0.0.0/tcp/0')
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
      proc.kill('SIGKILL')
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

  const opts: Libp2pOptions = {
    peerId,
    addresses: {
      listen: options.noListen === true ? [] : ['/ip4/0.0.0.0/tcp/0']
    },
    transports: [tcp()],
    streamMuxers: [],
    connectionEncryption: [noise()],
    nat: {
      enabled: false
    }
  }

  if (options.muxer === 'mplex') {
    opts.streamMuxers?.push(mplex())
  } else {
    opts.streamMuxers?.push(yamux())
  }

  if (options.pubsub === true) {
    if (options.pubsubRouter === 'floodsub') {
      opts.pubsub = floodsub()
    } else {
      opts.pubsub = floodsub()
    }
  }

  opts.relay = {
    enabled: true,
    hop: {
      enabled: options.relay === true
    },
    reservationManager: {
      enabled: false
    }
  }

  if (options.dht === true) {
    opts.dht = (components: any) => {
      const dht = kadDHT({
        clientMode: false
      })(components)

      // go-libp2p-daemon only has the older single-table DHT instead of the dual
      // lan/wan version found in recent go-ipfs versions. unfortunately it's been
      // abandoned so here we simulate the older config with the js implementation
      const lan = dht.lan

      const protocol = '/ipfs/kad/1.0.0'
      lan.protocol = protocol
      // @ts-expect-error
      lan.network.protocol = protocol
      // @ts-expect-error
      lan.topologyListener.protocol = protocol

      return lan
    }
  }

  const node = await createLibp2p(opts)

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

async function main () {
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
})
