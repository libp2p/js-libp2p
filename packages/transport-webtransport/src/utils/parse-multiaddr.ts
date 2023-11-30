import { CodeError } from '@libp2p/interface'
import { peerIdFromString } from '@libp2p/peer-id'
import { type Multiaddr, protocols } from '@multiformats/multiaddr'
import { WebTransport } from '@multiformats/multiaddr-matcher'
import { bases, digest } from 'multiformats/basics'
import type { PeerId } from '@libp2p/interface'
import type { MultihashDigest } from 'multiformats/hashes/interface'

// @ts-expect-error - Not easy to combine these types.
const multibaseDecoder = Object.values(bases).map(b => b.decoder).reduce((d, b) => d.or(b))

function decodeCerthashStr (s: string): MultihashDigest {
  return digest.decode(multibaseDecoder.decode(s))
}

export interface ParsedMultiaddr {
  url: string
  certhashes: MultihashDigest[]
  remotePeer?: PeerId
}

export function parseMultiaddr (ma: Multiaddr): ParsedMultiaddr {
  if (!WebTransport.matches(ma)) {
    throw new CodeError('Invalid multiaddr, was not a WebTransport address', 'ERR_INVALID_MULTIADDR')
  }

  const parts = ma.stringTuples()
  const certhashes = parts
    .filter(([name, _]) => name === protocols('certhash').code)
    .map(([_, value]) => decodeCerthashStr(value ?? ''))

  // only take the first peer id in the multiaddr as it may be a relay
  const remotePeer = parts
    .filter(([name, _]) => name === protocols('p2p').code)
    .map(([_, value]) => peerIdFromString(value ?? ''))[0]

  const opts = ma.toOptions()
  let host = opts.host

  if (opts.family === 6 && host?.includes(':')) {
    /**
     * This resolves cases where `new WebTransport()` fails to construct because of an invalid URL being passed.
     *
     * `new URL('https://::1:4001/blah')` will throw a `TypeError: Failed to construct 'URL': Invalid URL`
     * `new URL('https://[::1]:4001/blah')` is valid and will not.
     *
     * @see https://datatracker.ietf.org/doc/html/rfc3986#section-3.2.2
     */
    host = `[${host}]`
  }

  return {
    // All webtransport urls are https
    url: `https://${host}:${opts.port}`,
    certhashes,
    remotePeer
  }
}
