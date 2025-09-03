import { multiaddr } from '@multiformats/multiaddr'
import { convertToIpNet } from '@multiformats/multiaddr/convert'
import { Circuit } from '@multiformats/multiaddr-matcher'
import type { IpNet } from '@chainsafe/netmask'
import type { Connection, AbortOptions, PeerId } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

/**
 * These are speculative protocols that are run automatically on connection open
 * so are usually not the reason the connection was opened.
 *
 * Consequently when requested it should be safe to close connections that only
 * have these protocol streams open.
 */
const DEFAULT_CLOSABLE_PROTOCOLS = [
  // identify
  '/ipfs/id/1.0.0',

  // identify-push
  '/ipfs/id/push/1.0.0',

  // autonat
  '/libp2p/autonat/1.0.0',

  // dcutr
  '/libp2p/dcutr'
]

export interface SafelyCloseConnectionOptions extends AbortOptions {
  /**
   * Only close the stream if it either has no protocol streams open or only
   * ones in this list.
   *
   * @default ['/ipfs/id/1.0.0']
   */
  closableProtocols?: string[]
}

/**
 * Close the passed connection if it has no streams, or only closable protocol
 * streams, falling back to aborting the connection if closing it cleanly fails.
 */
export async function safelyCloseConnectionIfUnused (connection?: Connection, options?: SafelyCloseConnectionOptions): Promise<void> {
  const streamProtocols = connection?.streams?.map(stream => stream.protocol) ?? []
  const closableProtocols = options?.closableProtocols ?? DEFAULT_CLOSABLE_PROTOCOLS

  // if the connection has protocols not in the closable protocols list, do not
  // close the connection
  if (streamProtocols.filter(proto => proto != null && !closableProtocols.includes(proto)).length > 0) {
    return
  }

  try {
    await connection?.close(options)
  } catch (err: any) {
    connection?.abort(err)
  }
}

/**
 * Converts a multiaddr string or object to an IpNet object.
 * If the multiaddr doesn't include /ipcidr, it will encapsulate with the appropriate CIDR:
 * - /ipcidr/32 for IPv4
 * - /ipcidr/128 for IPv6
 *
 * @param {string | Multiaddr} ma - The multiaddr string or object to convert.
 * @returns {IpNet} The converted IpNet object.
 * @throws {Error} Throws an error if the multiaddr is not valid.
 */
export function multiaddrToIpNet (ma: string | Multiaddr): IpNet {
  try {
    let parsedMa: Multiaddr
    if (typeof ma === 'string') {
      parsedMa = multiaddr(ma)
    } else {
      parsedMa = ma
    }

    const protoNames = new Set([...parsedMa.getComponents().map(component => component.name)])

    // Check if /ipcidr is already present
    if (!protoNames.has('ipcidr')) {
      const isIPv6 = protoNames.has('ip6')
      const cidr = isIPv6 ? '/ipcidr/128' : '/ipcidr/32'
      parsedMa = parsedMa.encapsulate(cidr)
    }

    return convertToIpNet(parsedMa)
  } catch (error) {
    throw new Error(`Can't convert to IpNet, Invalid multiaddr format: ${ma}`)
  }
}

/**
 * Returns true if the passed multiaddr would result in a direct connection to
 * the peer.
 *
 * Currently only circuit relay addresses are supported as indirect connections.
 */
export function isDirect (ma: Multiaddr): boolean {
  return !Circuit.exactMatch(ma)
}

/**
 * If there is an existing non-limited connection to the remote peer return it,
 * unless it is indirect and at least one of the passed dial addresses would
 * result in a direct connection
 */
export function findExistingConnection (peerId?: PeerId, connections?: Connection[], dialAddresses?: Multiaddr[]): Connection | undefined {
  if (peerId == null || connections == null) {
    return
  }

  const existingConnection = connections
    .sort((a, b) => {
      if (a.direct) {
        return -1
      }

      if (b.direct) {
        return 1
      }

      return 0
    })
    .find(con => con.limits == null)

  if (existingConnection == null || existingConnection.direct || dialAddresses == null) {
    return existingConnection
  }

  // we have an indirect, but unlimited connection - test the dial addresses to
  // see if any of them would result in a direct connection, in which case allow
  // the attempt to upgrade to a direct connection
  const wouldUpgradeToDirect = dialAddresses.some(ma => isDirect(ma))

  if (wouldUpgradeToDirect) {
    return
  }

  return existingConnection
}
