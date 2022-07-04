import { interopTests } from '@libp2p/interop'
import type { SpawnOptions, Daemon, DaemonFactory } from '@libp2p/interop'
import { createServer } from '@libp2p/daemon-server'
import { createClient } from '@libp2p/daemon-client'
import { createLibp2p, Libp2pOptions } from '../src/index.js'
import { Noise } from '@chainsafe/libp2p-noise'
import { TCP } from '@libp2p/tcp'
import { Multiaddr } from '@multiformats/multiaddr'
import { KadDHT } from '@libp2p/kad-dht'
import { path as p2pd } from 'go-libp2p'
import { execa } from 'execa'
import pDefer from 'p-defer'
import { logger } from '@libp2p/logger'
import { Yamux } from '@chainsafe/libp2p-yamux'
import fs from 'fs'
import { unmarshalPrivateKey } from '@libp2p/crypto/keys'
import type { PeerId } from '@libp2p/interface-peer-id'
import { peerIdFromKeys } from '@libp2p/peer-id'
import { FloodSub } from '@libp2p/floodsub'

// IPFS_LOGGING=debug DEBUG=libp2p*,go-libp2p:* npm run test:interop

async function createGoPeer (options: SpawnOptions): Promise<Daemon> {
  const controlPort = Math.floor(Math.random() * (50000 - 10000 + 1)) + 10000
  const apiAddr = new Multiaddr(`/ip4/0.0.0.0/tcp/${controlPort}`)

  const log = logger(`go-libp2p:${controlPort}`)

  const opts = [
    `-listen=${apiAddr.toString()}`,
    '-hostAddrs=/ip4/0.0.0.0/tcp/0'
  ]

  if (options.noise === true) {
    opts.push('-noise=true')
  }

  if (options.dht === true) {
    opts.push('-dhtServer')
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

  const deferred = pDefer()
  const proc = execa(p2pd(), opts)

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
      await proc.kill()
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
      listen: ['/ip4/0.0.0.0/tcp/0']
    },
    transports: [new TCP()],
    streamMuxers: [new Yamux()],
    connectionEncryption: [new Noise()]
  }

  if (options.dht === true) {
    // go-libp2p-daemon only has the older single-table DHT instead of the dual
    // lan/wan version found in recent go-ipfs versions. unfortunately it's been
    // abandoned so here we simulate the older config with the js implementation
    const dht = new KadDHT({
      clientMode: false
    })
    const lan = dht.lan

    const protocol = '/ipfs/kad/1.0.0'
    lan.protocol = protocol
    // @ts-expect-error
    lan.network.protocol = protocol
    // @ts-expect-error
    lan.topologyListener.protocol = protocol

    // @ts-expect-error
    opts.dht = lan
  }

  if (options.pubsub === true) {
    if (options.pubsubRouter === 'floodsub') {
      opts.pubsub = new FloodSub()
    } else {
      opts.pubsub = new FloodSub()
    }
  }

  const node = await createLibp2p(opts)
  const server = await createServer(new Multiaddr('/ip4/0.0.0.0/tcp/0'), node)
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
  process.exit(1)
})
