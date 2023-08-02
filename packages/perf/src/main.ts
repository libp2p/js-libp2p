import { yamux } from '@chainsafe/libp2p-yamux'
import { peerIdFromString } from '@libp2p/peer-id'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { tcp } from '@libp2p/tcp'
import { multiaddr } from '@multiformats/multiaddr'
import { createLibp2p } from 'libp2p'
import { plaintext } from 'libp2p/insecure'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { defaultInit, perfService } from '../src/index.js'
import type { PeerId } from '@libp2p/interface-peer-id'

const argv = yargs(hideBin(process.argv))
  .options({
    'run-server': {
      type: 'boolean',
      demandOption: true,
      default: false,
      description: 'Whether to run as a server'
    },
    'server-address': {
      type: 'string',
      demandOption: false,
      description: 'Server IP address',
      default: ''
    },
    transport: {
      type: 'string',
      demandOption: false,
      description: 'Transport to use',
      default: 'tcp'
    },
    'upload-bytes': {
      type: 'number',
      demandOption: false,
      description: 'Number of bytes to upload',
      default: 0
    },
    'download-bytes': {
      type: 'number',
      demandOption: false,
      description: 'Number of bytes to download',
      default: 0
    }
  })
  .command('help', 'Print usage information', yargs.help)
  .parseSync()

export async function main (runServer: boolean, serverIpAddress: string, transport: string, uploadBytes: number, downloadBytes: number): Promise<void> {
  let peerId: PeerId

  const listenAddrs: string[] = []

  const { host, port } = splitHostPort(serverIpAddress)
  // #TODO: right now we only support tcp
  const tcpMultiaddr = multiaddr(`/ip4/${host}/tcp/${port}`)

  const config = {
    transports: [tcp()],
    streamMuxers: [yamux()],
    connectionEncryption: [
      plaintext()
    ],
    services: {
      perf: perfService(defaultInit)
    }
  }

  if (runServer) {
    peerId = await createEd25519PeerId()
    listenAddrs.push(`${tcpMultiaddr.toString()}/p2p/${peerId.toString()}`)

    Object.assign(config, {
      peerId,
      addresses: {
        listen: listenAddrs
      }
    })
  } else {
    peerId = peerIdFromString('12D3KooWDpJ7As7BWAwRMfu1VU2WCqNjvq387JEYKDBj4kx6nXTN')
  }

  const node = await createLibp2p(config)

  await node.start()

  const startTime = Date.now()

  if (!runServer) {
    await node.dial(multiaddr(`${tcpMultiaddr.toString()}/p2p/${peerId.toString()}`))
  }

  await node.services.perf.perf(peerId, BigInt(uploadBytes), BigInt(downloadBytes))

  const endTime = Date.now()

  await node.stop()

  // eslint-disable-next-line no-console
  console.log('latency: ' + JSON.stringify({ latency: endTime - startTime }))
}

function splitHostPort (address: string): { host: string, port?: string } {
  try {
    const parts = address.split(':')
    const host = parts[0]
    const port = parts[1]
    return {
      host,
      port
    }
  } catch (error) {
    throw Error('Invalid server address')
  }
}

main(argv['run-server'], argv['server-address'], argv.transport, argv['upload-bytes'], argv['download-bytes']).catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})
