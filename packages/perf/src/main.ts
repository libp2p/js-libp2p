import { start } from '@libp2p/interface/startable'
import { connectionPair } from '@libp2p/interface-compliance-tests/mocks'
import { multiaddr } from '@multiformats/multiaddr'
import yargs from 'yargs'
import { defaultInit, perfService } from '../src/index.js'
import { createComponents } from '../test/index.spec.js'
import type { Multiaddr } from '@multiformats/multiaddr'

const argv = yargs
  .options({
    'run-server': {
      type: 'boolean',
      demandOption: true,
      default: false,
      description: 'Whether to run as a server'
    },
    'server-ip-address': {
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
  const listenAddrs: Multiaddr[] = []

  if (runServer) {
    const { host, port } = splitHostPort(serverIpAddress)
    // #TODO: right now we only support tcp
    listenAddrs.push(multiaddr(`/ip4/${host}/tcp/${port}`))
  }

  const localComponents = await createComponents(listenAddrs)
  const remoteComponents = await createComponents()

  const client = perfService(defaultInit)(localComponents)
  const server = perfService(defaultInit)(remoteComponents)

  await start(client)
  await start(server)

  const startTime = Date.now()

  const [localToRemote, remoteToLocal] = connectionPair(localComponents, remoteComponents)
  localComponents.events.safeDispatchEvent('connection:open', { detail: localToRemote })
  remoteComponents.events.safeDispatchEvent('connection:open', { detail: remoteToLocal })

  await client.perf(remoteComponents.peerId, BigInt(uploadBytes), BigInt(downloadBytes))

  const endTime = Date.now()

  // eslint-disable-next-line no-console
  console.log('latency: ' + JSON.stringify({ latency: endTime - startTime }))
}

function splitHostPort (urlString: string): { host: string, port?: string } {
  try {
    const url = new URL(urlString)
    return {
      host: url.hostname,
      port: url.port
    }
  } catch (error) {
    throw Error('Invalid server address')
  }
}

main(argv['run-server'], argv['server-ip-address'], argv.transport, argv['upload-bytes'], argv['download-bytes']).catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})
