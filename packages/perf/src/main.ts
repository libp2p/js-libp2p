import { mockRegistrar, mockUpgrader, mockConnectionGater, connectionPair } from '@libp2p/interface-compliance-tests/src/mocks'
import type { TransportManager } from '@libp2p/interface-internal/src/transport-manager'
import { EventEmitter } from '@libp2p/interface/src/events'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { PersistentPeerStore } from '@libp2p/peer-store'
import { MemoryDatastore } from 'datastore-core'
import { DefaultAddressManager } from 'libp2p/src/address-manager'
import { type Components, defaultComponents } from 'libp2p/src/components'
import { DefaultConnectionManager } from 'libp2p/src/connection-manager'
import { stubInterface } from 'sinon-ts'
import yargs from 'yargs'
import { multiaddr } from '@multiformats/multiaddr'
import type { Multiaddr } from '@multiformats/multiaddr'
import { perfService, type PerfServiceInit } from '.'
import { start } from '@libp2p/interface/src/startable'


export const defaultInit: PerfServiceInit = {
  protocolName: '/perf/1.0.0',
  maxInboundStreams: 1 << 10,
  maxOutboundStreams: 1 << 10,
  timeout: 10000,
  writeBlockSize: BigInt(64 << 10)
}

const argv = yargs
    .options({
      'run-server': {
          type: 'boolean',
          demandOption: true,
          default: false,
          description: 'Whether to run as a server',
      },
      'server-ip-address': {
          type: 'string',
          demandOption: false,
          description: 'Server IP address',
          default: '',
      },
      'transport': {
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
      },
    })
    .command('help', 'Print usage information', yargs.help)
    .parseSync()

export async function main(runServer: boolean, serverIpAddress: string, transport: string, uploadBytes: number, downloadBytes: number): Promise<void> {
	const listenAddrs: Multiaddr[] = []

	if (runServer === true) {
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

	console.log('latency: ' + JSON.stringify({ latency: endTime - startTime}))
}

function splitHostPort(urlString: string): { host: string, port?: string } {
  try {
    const url = new URL(urlString);
    return {
      host: url.hostname,
      port: url.port || undefined,
    };
  } catch (error) {
    throw Error('Invalid server address');
  }
}


export async function createComponents (listenMaddrs: Multiaddr[] = []): Promise<Components> {
  const peerId = await createEd25519PeerId()

  const events = new EventEmitter()

  const components = defaultComponents({
    peerId,
    registrar: mockRegistrar(),
    upgrader: mockUpgrader(),
    datastore: new MemoryDatastore(),
    transportManager: stubInterface<TransportManager>(),
    connectionGater: mockConnectionGater(),
    events
  })

  components.peerStore = new PersistentPeerStore(components)
  components.connectionManager = new DefaultConnectionManager(components, {
    minConnections: 50,
    maxConnections: 1000,
    autoDialInterval: 1000,
    inboundUpgradeTimeout: 1000
  })

  components.addressManager = new DefaultAddressManager(components, {
    announce: listenMaddrs.map(ma => ma.toString())
  })

  return components
}

main(argv['run-server'], argv['server-ip-address'], argv['transport'], argv['upload-bytes'], argv['download-bytes'])