import type { Multiaddr } from '@multiformats/multiaddr'
import { convertToString } from '@multiformats/multiaddr/convert'

// Protocols https://github.com/multiformats/multiaddr/blob/master/protocols.csv
// code  size  name
// 4     32    ip4
// 41    128   ip6
enum Protocol {
  ip4 = 4,
  ip6 = 41
}

export function multiaddrToIPStr(multiaddr: Multiaddr): string | null {
  for (const tuple of multiaddr.tuples()) {
    switch (tuple[0]) {
      case Protocol.ip4:
      case Protocol.ip6:
        return convertToString(tuple[0], tuple[1]!)
    }
  }

  return null
}
