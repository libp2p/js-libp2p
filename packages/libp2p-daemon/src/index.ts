#! /usr/bin/env node
/* eslint no-console: ["error", { allow: ["log", "warn", "error"] }] */

import { multiaddr } from '@multiformats/multiaddr'
import esMain from 'es-main'
import yargs from 'yargs'
// @ts-expect-error no types
import YargsPromise from 'yargs-promise'
import type { Libp2pServer } from '@libp2p/daemon-server'
import type { Multiaddr } from '@multiformats/multiaddr'

const args = process.argv.slice(2)
const parser = new YargsPromise(yargs)

const log = console.log

export default async function main (processArgs: string[]): Promise<void> {
  parser.yargs
    .option('listen', {
      desc: 'daemon control listen multiaddr',
      type: 'string',
      default: '/unix/tmp/p2pd.sock'
    })
    .option('quiet', {
      alias: 'q',
      desc: 'be quiet',
      type: 'boolean',
      default: false
    })
    .option('id', {
      desc: 'peer identity; private key file',
      type: 'string',
      default: ''
    })
    .option('hostAddrs', {
      desc: 'Comma separated list of multiaddrs the host should listen on',
      type: 'string',
      default: ''
    })
    .option('announceAddrs', {
      desc: 'Comma separated list of multiaddrs the host should announce to the network',
      type: 'string',
      default: ''
    })
    .option('bootstrap', {
      alias: 'b',
      desc: 'Connects to bootstrap peers and bootstraps the dht if enabled',
      type: 'boolean',
      default: false
    })
    .option('bootstrapPeers', {
      desc: 'Comma separated list of bootstrap peers; defaults to the IPFS DHT peers',
      type: 'string',
      default: ''
    })
    .option('dht', {
      desc: 'Enables the DHT in full node mode',
      type: 'boolean',
      default: false
    })
    .option('dhtClient', {
      desc: '(Not yet supported) Enables the DHT in client mode',
      type: 'boolean',
      default: false
    })
    .option('nat', {
      desc: 'Enables UPnP NAT hole punching',
      type: 'boolean',
      default: false
    })
    .option('connMgr', {
      desc: '(Not yet supported) Enables the Connection Manager',
      type: 'boolean',
      default: false
    })
    .option('connMgrLo', {
      desc: 'Number identifying the number of peers below which this node will not activate preemptive disconnections',
      type: 'number'
    })
    .option('connMgrHi', {
      desc: 'Number identifying the maximum number of peers the current peer is willing to be connected to before is starts disconnecting',
      type: 'number'
    })
    .option('pubsub', {
      desc: 'Enables pubsub',
      type: 'boolean',
      default: false
    })
    .option('pubsubRouter', {
      desc: 'Specifies the pubsub router implementation',
      type: 'string',
      default: 'gossipsub'
    })
    .fail((msg: string, err: Error | undefined, yargs?: any) => {
      if (err != null) {
        throw err // preserve stack
      }

      if (args.length > 0) {
        // eslint-disable-next-line
        log(msg)
      }

      yargs.showHelp()
    })

  const { data, argv } = await parser.parse(processArgs)

  if (data != null) {
    // Log help and exit
    // eslint-disable-next-line
    log(data)
    process.exit(0)
  }

  const daemon = await createLibp2pServer(multiaddr(argv.listen), argv)
  await daemon.start()

  if (argv.quiet !== true) {
    // eslint-disable-next-line
    log('daemon has started')
  }
}

export async function createLibp2pServer (listenAddr: Multiaddr, argv: any): Promise<Libp2pServer> {
  // const libp2p = await createLibp2p(argv)
  // const daemon = await createServer(multiaddr(argv.listen), libp2p)

  throw new Error('Not implemented yet')
}

if (esMain(import.meta)) {
  main(process.argv)
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
}
