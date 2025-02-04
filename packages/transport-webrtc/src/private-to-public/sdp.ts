import { InvalidParametersError } from '@libp2p/interface'
import { type Multiaddr } from '@multiformats/multiaddr'
import { bases, digest } from 'multiformats/basics'
import { InvalidFingerprintError, UnsupportedHashAlgorithmError } from '../error.js'
import { MAX_MESSAGE_SIZE } from '../stream.js'
import { CERTHASH_CODE } from './transport.js'
import type { LoggerOptions } from '@libp2p/interface'
import type { MultihashDigest } from 'multiformats/hashes/interface'

/**
 * Get base2 | identity decoders
 */
// @ts-expect-error - Not easy to combine these types.
export const mbdecoder: any = Object.values(bases).map(b => b.decoder).reduce((d, b) => d.or(b))

export function getLocalFingerprint (pc: RTCPeerConnection, options: LoggerOptions): string | undefined {
  // try to fetch fingerprint from local certificate
  const localCert = pc.getConfiguration().certificates?.at(0)
  if (localCert?.getFingerprints == null) {
    options.log.trace('fetching fingerprint from local SDP')
    const localDescription = pc.localDescription
    if (localDescription == null) {
      return undefined
    }
    return getFingerprintFromSdp(localDescription.sdp)
  }

  options.log.trace('fetching fingerprint from local certificate')

  if (localCert.getFingerprints().length === 0) {
    return undefined
  }

  const fingerprint = localCert.getFingerprints()[0].value
  if (fingerprint == null) {
    throw new InvalidFingerprintError('', 'no fingerprint on local certificate')
  }

  return fingerprint
}

const fingerprintRegex = /^a=fingerprint:(?:\w+-[0-9]+)\s(?<fingerprint>(:?[0-9a-fA-F]{2})+)$/m
export function getFingerprintFromSdp (sdp: string): string | undefined {
  const searchResult = sdp.match(fingerprintRegex)
  return searchResult?.groups?.fingerprint
}

/**
 * Get base2 | identity decoders
 */
function ipv (ma: Multiaddr): string {
  for (const proto of ma.protoNames()) {
    if (proto.startsWith('ip')) {
      return proto.toUpperCase()
    }
  }

  return 'IP6'
}

// Extract the certhash from a multiaddr
export function certhash (ma: Multiaddr): string {
  const tups = ma.stringTuples()
  const certhash = tups.filter((tup) => tup[0] === CERTHASH_CODE).map((tup) => tup[1])[0]

  if (certhash === undefined || certhash === '') {
    throw new InvalidParametersError(`Couldn't find a certhash component of multiaddr: ${ma.toString()}`)
  }

  return certhash
}

/**
 * Convert a certhash into a multihash
 */
export function decodeCerthash (certhash: string): MultihashDigest {
  return digest.decode(mbdecoder.decode(certhash))
}

/**
 * Extract the fingerprint from a multiaddr
 */
export function ma2Fingerprint (ma: Multiaddr): string[] {
  const mhdecoded = decodeCerthash(certhash(ma))
  const prefix = toSupportedHashFunction(mhdecoded.code)
  const fingerprint = mhdecoded.digest.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '')
  const sdp = fingerprint.match(/.{1,2}/g)

  if (sdp == null) {
    throw new InvalidFingerprintError(fingerprint, ma.toString())
  }

  return [`${prefix} ${sdp.join(':').toUpperCase()}`, fingerprint]
}

/**
 * Normalize the hash name from a given multihash has name
 */
export function toSupportedHashFunction (code: number): 'SHA-1' | 'SHA-256' | 'SHA-512' {
  switch (code) {
    case 0x11:
      return 'SHA-1'
    case 0x12:
      return 'SHA-256'
    case 0x13:
      return 'SHA-512'
    default:
      throw new UnsupportedHashAlgorithmError(code)
  }
}

/**
 * Convert a multiaddr into a SDP
 */
function ma2sdp (ma: Multiaddr, ufrag: string): string {
  const { host, port } = ma.toOptions()
  const ipVersion = ipv(ma)
  const [CERTFP] = ma2Fingerprint(ma)

  return `v=0
o=- 0 0 IN ${ipVersion} ${host}
s=-
c=IN ${ipVersion} ${host}
t=0 0
a=ice-lite
m=application ${port} UDP/DTLS/SCTP webrtc-datachannel
a=mid:0
a=setup:passive
a=ice-ufrag:${ufrag}
a=ice-pwd:${ufrag}
a=fingerprint:${CERTFP}
a=sctp-port:5000
a=max-message-size:${MAX_MESSAGE_SIZE}
a=candidate:1467250027 1 UDP 1467250027 ${host} ${port} typ host\r\n`
}

/**
 * Create an answer SDP from a multiaddr
 */
export function fromMultiAddr (ma: Multiaddr, ufrag: string): RTCSessionDescriptionInit {
  return {
    type: 'answer',
    sdp: ma2sdp(ma, ufrag)
  }
}

/**
 * Replace (munge) the ufrag and password values in a SDP
 */
export function munge (desc: RTCSessionDescriptionInit, ufrag: string): RTCSessionDescriptionInit {
  if (desc.sdp === undefined) {
    throw new InvalidParametersError("Can't munge a missing SDP")
  }

  desc.sdp = desc.sdp
    .replace(/\na=ice-ufrag:[^\n]*\n/, '\na=ice-ufrag:' + ufrag + '\n')
    .replace(/\na=ice-pwd:[^\n]*\n/, '\na=ice-pwd:' + ufrag + '\n')
  return desc
}
