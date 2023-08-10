import { peerIdFromString } from '@libp2p/peer-id'
import { type Multiaddr, protocols } from '@multiformats/multiaddr'
import { bases, digest } from 'multiformats/basics'
import type { PeerId } from '@libp2p/interface/peer-id'
import type { MultihashDigest } from 'multiformats/hashes/interface'

// @ts-expect-error - Not easy to combine these types.
const multibaseDecoder = Object.values(bases).map(b => b.decoder).reduce((d, b) => d.or(b))

function decodeCerthashStr (s: string): MultihashDigest {
  return digest.decode(multibaseDecoder.decode(s))
}

export function parseMultiaddr (ma: Multiaddr): { url: string, certhashes: MultihashDigest[], remotePeer?: PeerId } {
  const parts = ma.stringTuples()

  // This is simpler to have inline than extract into a separate function
  // eslint-disable-next-line complexity
  const { url, certhashes, remotePeer } = parts.reduce((state: { url: string, certhashes: MultihashDigest[], seenHost: boolean, seenPort: boolean, remotePeer?: PeerId }, [proto, value]) => {
    switch (proto) {
      case protocols('ip6').code:
      // @ts-expect-error - ts error on switch fallthrough
      case protocols('dns6').code:
        if (value?.includes(':') === true) {
          /**
           * This resolves cases where `new globalThis.WebTransport` fails to construct because of an invalid URL being passed.
           *
           * `new URL('https://::1:4001/blah')` will throw a `TypeError: Failed to construct 'URL': Invalid URL`
           * `new URL('https://[::1]:4001/blah')` is valid and will not.
           *
           * @see https://datatracker.ietf.org/doc/html/rfc3986#section-3.2.2
           */
          value = `[${value}]`
        }
      // eslint-disable-next-line no-fallthrough
      case protocols('ip4').code:
      case protocols('dns4').code:
        if (state.seenHost || state.seenPort) {
          throw new Error('Invalid multiaddr, saw host and already saw the host or port')
        }
        return {
          ...state,
          url: `${state.url}${value ?? ''}`,
          seenHost: true
        }
      case protocols('quic').code:
      case protocols('quic-v1').code:
      case protocols('webtransport').code:
        if (!state.seenHost || !state.seenPort) {
          throw new Error("Invalid multiaddr, Didn't see host and port, but saw quic/webtransport")
        }
        return state
      case protocols('udp').code:
        if (state.seenPort) {
          throw new Error('Invalid multiaddr, saw port but already saw the port')
        }
        return {
          ...state,
          url: `${state.url}:${value ?? ''}`,
          seenPort: true
        }
      case protocols('certhash').code:
        if (!state.seenHost || !state.seenPort) {
          throw new Error('Invalid multiaddr, saw the certhash before seeing the host and port')
        }
        return {
          ...state,
          certhashes: state.certhashes.concat([decodeCerthashStr(value ?? '')])
        }
      case protocols('p2p').code:
        return {
          ...state,
          remotePeer: peerIdFromString(value ?? '')
        }
      default:
        throw new Error(`unexpected component in multiaddr: ${proto} ${protocols(proto).name} ${value ?? ''} `)
    }
  },
  // All webtransport urls are https
  { url: 'https://', seenHost: false, seenPort: false, certhashes: [] })

  return { url, certhashes, remotePeer }
}
