import fs from 'fs'
import { privateKeyFromProtobuf } from '@libp2p/crypto/keys'
import { createClient } from '@libp2p/daemon-client'
import { createServer } from '@libp2p/daemon-server'
import { connectInteropTests } from '@libp2p/interop'
import { logger } from '@libp2p/logger'
import { tcp } from '@libp2p/tcp'
import { yamux } from '@libp2p/yamux'
import { multiaddr } from '@multiformats/multiaddr'
import { execa } from 'execa'
import { path as p2pd } from 'go-libp2p'
import { createLibp2p } from 'libp2p'
import pDefer from 'p-defer'
import { noise } from '../src/index.js'
import type { PrivateKey } from '@libp2p/interface'
import type { SpawnOptions, Daemon, DaemonFactory } from '@libp2p/interop'
import type { Libp2pOptions } from 'libp2p'

async function createGoPeer (options: SpawnOptions): Promise<Daemon> {
  const controlPort = Math.floor(Math.random() * (50000 - 10000 + 1)) + 10000
  const apiAddr = multiaddr(`/ip4/0.0.0.0/tcp/${controlPort}`)

  const log = logger(`go-libp2p:${controlPort}`)

  const opts = [
    `-listen=${apiAddr.toString()}`,
    '-hostAddrs=/ip4/0.0.0.0/tcp/0'
  ]

  if (options.encryption === 'noise') {
    opts.push('-noise=true')
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
      proc.kill()
    }
  }
}

async function createJsPeer (options: SpawnOptions): Promise<Daemon> {
  let privateKey: PrivateKey | undefined

  if (options.key != null) {
    const keyFile = fs.readFileSync(options.key)
    privateKey = privateKeyFromProtobuf(keyFile)
  }

  const opts: Libp2pOptions = {
    privateKey,
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/0']
    },
    transports: [tcp()],
    streamMuxers: [yamux()],
    connectionEncrypters: [noise()]
  }

  const node = await createLibp2p(opts)
  const server = createServer(multiaddr('/ip4/0.0.0.0/tcp/0'), node as any)
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
        return createGoPeer(options)
      }

      return createJsPeer(options)
    }
  }

  connectInteropTests(factory)
}

main().catch(err => {
  console.error(err) // eslint-disable-line no-console
  process.exit(1)
})
