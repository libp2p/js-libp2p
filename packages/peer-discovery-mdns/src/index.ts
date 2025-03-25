/**
 * @packageDocumentation
 *
 * A peer discover mechanism that uses [mDNS](https://datatracker.ietf.org/doc/html/rfc6762) to discover peers on the local network.
 *
 * @example Use with libp2p
 *
 * ```TypeScript
 * import { createLibp2p } from 'libp2p'
 * import { mdns } from '@libp2p/mdns'
 *
 * const libp2p = await createLibp2p({
 *   peerDiscovery: [
 *     mdns()
 *   ]
 * })
 *
 * libp2p.addEventListener('peer:discovery', (evt) => {
 *   libp2p.dial(evt.detail.multiaddrs) // dial discovered peers
 *   console.log('found peer: ', evt.detail.toString())
 * })
 * ```
 *
 * ## MDNS messages
 *
 * A query is sent to discover the libp2p nodes on the local network
 *
 * ```JSON
 * {
 *    "type": "query",
 *    "questions": [{
 *      "name": "_p2p._udp.local",
 *      "type": "PTR"
 *    }]
 * }
 * ```
 *
 * When a query is detected, each libp2p node sends an answer about itself
 *
 * ```JSON
 * [{
 *   "name": "_p2p._udp.local",
 *   "type": "PTR",
 *   "class": "IN",
 *   "ttl": 120,
 *   "data": "QmNPubsDWATVngE3d5WDSNe7eVrFLuk38qb9t6vdLnu2aK._p2p._udp.local"
 * }, {
 *   "name": "QmNPubsDWATVngE3d5WDSNe7eVrFLuk38qb9t6vdLnu2aK._p2p._udp.local",
 *   "type": "SRV",
 *   "class": "IN",
 *   "ttl": 120,
 *   "data": {
 *     "priority": 10,
 *     "weight": 1,
 *     "port": "20002",
 *     "target": "LAPTOP-G5LJ7VN9"
 *   }
 * }, {
 *   "name": "QmNPubsDWATVngE3d5WDSNe7eVrFLuk38qb9t6vdLnu2aK._p2p._udp.local",
 *   "type": "TXT",
 *   "class": "IN",
 *   "ttl": 120,
 *   "data": ["QmNPubsDWATVngE3d5WDSNe7eVrFLuk38qb9t6vdLnu2aK"]
 * }, {
 *   "name": "LAPTOP-G5LJ7VN9",
 *   "type": "A",
 *   "class": "IN",
 *   "ttl": 120,
 *   "data": "127.0.0.1"
 * }, {
 *   "name": "LAPTOP-G5LJ7VN9",
 *   "type": "AAAA",
 *   "class": "IN",
 *   "ttl": 120,
 *   "data": "::1"
 * }]
 * ```
 */

import { MulticastDNS } from './mdns.js'
import type { MulticastDNSInit, MulticastDNSComponents } from './mdns.js'
import type { PeerDiscovery } from '@libp2p/interface'

export type { MulticastDNSInit, MulticastDNSComponents }

export function mdns (init: MulticastDNSInit = {}): (components: MulticastDNSComponents) => PeerDiscovery {
  return (components: MulticastDNSComponents) => new MulticastDNS(components, init)
}

/* for reference

   [ { name: '_p2p._udp.local',
       type: 'PTR',
       class: 1,
       ttl: 120,
       data: 'XQxZeAH6MX2n4255fzYmyUCUdhQ0DAWv.p2p._udp.local' },

     { name: 'XQxZeAH6MX2n4255fzYmyUCUdhQ0DAWv.p2p._udp.local',
       type: 'TXT',
       class: 1,
       ttl: 120,
       data: 'dnsaddr=/ip4/127.0.0.1/tcp/80/p2p/QmbBHw1Xx9pUpAbrVZUKTPL5Rsph5Q9GQhRvcWVBPFgGtC' },
]

*/
