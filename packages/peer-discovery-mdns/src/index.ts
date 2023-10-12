import { MulticastDNS } from './mdns.js'
import type { MulticastDNSInit, MulticastDNSComponents } from './mdns.js'
import type { PeerDiscovery } from '@libp2p/interface/peer-discovery'

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
