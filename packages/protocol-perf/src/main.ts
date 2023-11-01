import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { unmarshalPrivateKey } from '@libp2p/crypto/keys'
import { createFromPrivKey } from '@libp2p/peer-id-factory'
import { tcp } from '@libp2p/tcp'
import { multiaddr } from '@multiformats/multiaddr'
import { createLibp2p } from 'libp2p'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { defaultInit, perfService } from '../src/index.js'
import { testPrivKey } from './constants.js'

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
  const listenAddrs: string[] = []

  const { host, port } = splitHostPort(serverIpAddress)
  // #TODO: right now we only support tcp
  const tcpMultiaddr = multiaddr(`/ip4/${host}/tcp/${port}`)

  const config = {
    transports: [tcp()],
    streamMuxers: [yamux()],
    connectionEncryption: [
      noise()
    ],
    services: {
      perf: perfService(defaultInit)
    }
  }

  const encoded = uint8ArrayFromString(testPrivKey, 'base64pad')
  const privateKey = await unmarshalPrivateKey(encoded)
  const peerId = await createFromPrivKey(privateKey)
  const tcpMultiaddrAddress = `${tcpMultiaddr.toString()}/p2p/${peerId.toString()}`

  if (runServer) {
    listenAddrs.push(tcpMultiaddrAddress)

    Object.assign(config, {
      peerId,
      addresses: {
        listen: listenAddrs
      }
    })
  }

  const node = await createLibp2p(config)

  await node.start()

  if (!runServer) {
    const connection = await node.dial(multiaddr(tcpMultiaddrAddress))
    const finalOutput = await node.services.perf.measurePerformance(connection, uploadBytes, downloadBytes)

    // eslint-disable-next-line no-console
    console.log(finalOutput)

    await node.stop()
  }
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
