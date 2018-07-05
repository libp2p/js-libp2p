#! /usr/bin/env node

'use strict'

// This script generates the table of packages you can see in the readme

// Columns to show at the header of the table
const columns = [
  'Package',
  'Version',
  'Deps',
  'CI',
  'Coverage'
]

// Headings are a string
// Arrays are packages. Index 0 is the GitHub repo and index 1 is the npm package
const rows = [
  'Libp2p',
  ['libp2p/interface-libp2p', 'interface-libp2p'],
  ['libp2p/js-libp2p', 'libp2p'],

  'Connection',
  ['libp2p/interface-connection', 'interface-connection'],

  'Transport',
  ['libp2p/interface-transport', 'interface-transport'],
  ['libp2p/js-libp2p-circuit', 'libp2p-circuit'], // should this be NAT Traversal only?
  ['libp2p/js-libp2p-tcp', 'libp2p-tcp'],
  ['libp2p/js-libp2p-udp', 'libp2p-udp'],
  ['libp2p/js-libp2p-udt', 'libp2p-udt'],
  ['libp2p/js-libp2p-utp', 'libp2p-utp'],
  ['libp2p/js-libp2p-webrtc-direct', 'libp2p-webrtc-direct'],
  ['libp2p/js-libp2p-webrtc-star', 'libp2p-webrtc-star'],
  ['libp2p/js-libp2p-websockets', 'libp2p-websockets'],
  ['libp2p/js-libp2p-websocket-star', 'libp2p-websocket-star'],
  ['libp2p/js-libp2p-websocket-star-rendezvous', 'libp2p-websocket-star-rendezvous'],

  'Crypto Channels',
  ['libp2p/js-libp2p-secio', 'libp2p-secio'],

  'Stream Muxers',
  ['libp2p/interface-stream-muxer', 'interface-stream-muxer'],
  ['libp2p/js-libp2p-mplex', 'libp2p-mplex'],
  ['libp2p/js-libp2p-spdy', 'libp2p-spdy'],

  'Discovery',
  ['libp2p/interface-peer-discovery', 'interface-peer-discovery'],
  ['libp2p/js-libp2p-bootstrap', 'libp2p-bootstrap'],
  ['libp2p/js-libp2p-kad-dht', 'libp2p-kad-dht'], // should this be here?
  ['libp2p/js-libp2p-mdns', 'libp2p-mdns'],
  ['libp2p/js-libp2p-rendezvous', 'libp2p-rendezvous'],
  ['libp2p/js-libp2p-webrtc-star', 'libp2p-webrtc-star'],
  ['libp2p/js-libp2p-websocket-star', 'libp2p-websocket-star'],

  'NAT Traversal',
  ['libp2p/js-libp2p-circuit', 'libp2p-circuit'],
  ['libp2p/js-libp2p-nat-mngr', 'libp2p-nat-mngr'],

  'Data Types',
  ['libp2p/js-peer-book', 'peer-book'],
  ['libp2p/js-peer-id', 'peer-id'],
  ['libp2p/js-peer-info', 'peer-info'],

  'Content Routing',
  ['libp2p/interface-content-routing', 'interface-content-routing'],
  ['libp2p/js-libp2p-delegated-content-routing', 'libp2p-delegated-content-routing'],
  ['libp2p/js-libp2p-kad-dht', 'libp2p-kad-dht'],

  'Peer Routing',
  ['libp2p/interface-peer-routing', 'interface-peer-routing'],
  ['libp2p/js-libp2p-delegated-peer-routing', 'libp2p-delegated-peer-routing'],
  ['libp2p/js-libp2p-kad-dht', 'libp2p-kad-dht'],

  'Record Store',
  ['libp2p/interface-record-store', 'interface-record-store'],
  ['libp2p/js-libp2p-record', 'libp2p-record'],

  'Generics',
  ['libp2p/js-libp2p-connection-manager', 'libp2p-connection-manager'],
  ['libp2p/js-libp2p-crypto', 'libp2p-crypto'],
  ['libp2p/js-libp2p-crypto-secp256k1', 'libp2p-crypto-secp256k1'],
  ['libp2p/js-libp2p-switch', 'libp2p-switch'],

  'Extensions',
  ['libp2p/js-libp2p-floodsub', 'libp2p-floodsub'],
  ['libp2p/js-libp2p-identify', 'libp2p-identify'],
  ['libp2p/js-libp2p-keychain', 'libp2p-keychain'],
  ['libp2p/js-libp2p-ping', 'libp2p-ping'],
  ['libp2p/js-libp2p-pnet', 'libp2p-pnet'],

  'Utilities',
  ['libp2p/js-p2pcat', 'p2pcat']
]

const isItemPackage = (item) => {
  return Array.isArray(item)
}

const packageBadges = [
  // Package
  (gh, npm) => `[\`${npm}\`](//github.com/${gh})`,
  // Version
  (gh, npm) => `[![npm](https://img.shields.io/npm/v/${npm}.svg?maxAge=86400&style=flat-square)](//github.com/${gh}/releases)`,
  // Deps
  (gh, npm) => `[![Deps](https://david-dm.org/${gh}.svg?style=flat-square)](https://david-dm.org/${gh})`,
  // CI
  (gh, npm) => {
    // Need to fix the path for jenkins links, as jenkins adds `/job/` between everything
    const jenkinsPath = gh.split('/').join('/job/')
    return `[![jenkins](https://ci.ipfs.team/buildStatus/icon?job=${gh}/master)](https://ci.ipfs.team/job/${jenkinsPath}/job/master/)`
  },
  // Coverage
  (gh, npm) => `[![codecov](https://codecov.io/gh/${gh}/branch/master/graph/badge.svg)](https://codecov.io/gh/${gh})`
]

// Creates the table row for a package
const generatePackageRow = (item) => {
  const row = packageBadges.map((func) => {
    // First string is GitHub path, second is npm package name
    return func(item[0], item[1])
  }).join(' | ')
  const fullRow = `| ${row} |`
  return fullRow
}

// Generates a row for the table, depending if it's a package or a heading
const generateRow = (item) => {
  if (isItemPackage(item)) {
    return generatePackageRow(item)
  } else {
    return `| **${item}** |`
  }
}

const header = `| ${columns.join(' | ')} |`
const hr = `| ${columns.map(() => '---------').join('|')} |`

const toPrint = [
  header,
  hr,
  rows.map((row) => generateRow(row)).join('\n')
]

toPrint.forEach((t) => console.log(t))

