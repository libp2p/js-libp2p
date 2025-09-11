import { isPrivateIp } from '@libp2p/utils/private-ip'
import { WebSockets } from '@multiformats/multiaddr-matcher'
import type { ConnectionGater } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

const CODEC_IP4 = 0x04
const CODEC_IP6 = 0x29

/**
 * Returns a connection gater that disallows dialling private addresses or
 * insecure websockets by default.
 *
 * Browsers are severely limited in their resource usage so don't waste time
 * trying to dial undialable addresses, and they also print verbose error
 * messages when making connections over insecure transports which causes
 * confusion.
 */
export function connectionGater (gater: ConnectionGater = {}): ConnectionGater {
  if (gater.denyDialMultiaddr == null) {
    gater.denyDialMultiaddr = (multiaddr: Multiaddr) => {
      // do not connect to insecure websockets by default
      if (WebSockets.matches(multiaddr)) {
        return false
      }

      const tuples = multiaddr.stringTuples()

      // do not connect to private addresses by default
      if (tuples[0][0] === CODEC_IP4 || tuples[0][0] === CODEC_IP6) {
        return Boolean(isPrivateIp(`${tuples[0][1]}`))
      }

      return false
    }
  }

  return gater
}
