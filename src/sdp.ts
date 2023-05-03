import { logger } from '@libp2p/logger'
import type { Multiaddr } from '@multiformats/multiaddr'
import { bases } from 'multiformats/basics'
import * as multihashes from 'multihashes'
import type { HashCode, HashName } from 'multihashes'

import { inappropriateMultiaddr, invalidArgument, invalidFingerprint, unsupportedHashAlgorithm } from './error.js'
import { CERTHASH_CODE } from './transport.js'

const log = logger('libp2p:webrtc:sdp')

/**
 * Get base2 | identity decoders
 */
// @ts-expect-error - Not easy to combine these types.
export const mbdecoder: any = Object.values(bases).map(b => b.decoder).reduce((d, b) => d.or(b))

export function getLocalFingerprint (pc: RTCPeerConnection): string | undefined {
  // try to fetch fingerprint from local certificate
  const localCert = pc.getConfiguration().certificates?.at(0)
  if (localCert == null || localCert.getFingerprints == null) {
    log.trace('fetching fingerprint from local SDP')
    const localDescription = pc.localDescription
    if (localDescription == null) {
      return undefined
    }
    return getFingerprintFromSdp(localDescription.sdp)
  }

  log.trace('fetching fingerprint from local certificate')

  if (localCert.getFingerprints().length === 0) {
    return undefined
  }

  const fingerprint = localCert.getFingerprints()[0].value
  if (fingerprint == null) {
    throw invalidFingerprint('', 'no fingerprint on local certificate')
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

  log('Warning: multiaddr does not appear to contain IP4 or IP6, defaulting to IP6', ma)

  return 'IP6'
}

// Extract the certhash from a multiaddr
export function certhash (ma: Multiaddr): string {
  const tups = ma.stringTuples()
  const certhash = tups.filter((tup) => tup[0] === CERTHASH_CODE).map((tup) => tup[1])[0]

  if (certhash === undefined || certhash === '') {
    throw inappropriateMultiaddr(`Couldn't find a certhash component of multiaddr: ${ma.toString()}`)
  }

  return certhash
}

/**
 * Convert a certhash into a multihash
 */
export function decodeCerthash (certhash: string): { code: HashCode, name: HashName, length: number, digest: Uint8Array } {
  const mbdecoded = mbdecoder.decode(certhash)
  return multihashes.decode(mbdecoded)
}

/**
 * Extract the fingerprint from a multiaddr
 */
export function ma2Fingerprint (ma: Multiaddr): string[] {
  const mhdecoded = decodeCerthash(certhash(ma))
  const prefix = toSupportedHashFunction(mhdecoded.name)
  const fingerprint = mhdecoded.digest.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '')
  const sdp = fingerprint.match(/.{1,2}/g)

  if (sdp == null) {
    throw invalidFingerprint(fingerprint, ma.toString())
  }

  return [`${prefix.toUpperCase()} ${sdp.join(':').toUpperCase()}`, fingerprint]
}

/**
 * Normalize the hash name from a given multihash has name
 */
export function toSupportedHashFunction (name: multihashes.HashName): string {
  switch (name) {
    case 'sha1':
      return 'sha-1'
    case 'sha2-256':
      return 'sha-256'
    case 'sha2-512':
      return 'sha-512'
    default:
      throw unsupportedHashAlgorithm(name)
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
a=max-message-size:100000
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
    throw invalidArgument("Can't munge a missing SDP")
  }

  desc.sdp = desc.sdp
    .replace(/\na=ice-ufrag:[^\n]*\n/, '\na=ice-ufrag:' + ufrag + '\n')
    .replace(/\na=ice-pwd:[^\n]*\n/, '\na=ice-pwd:' + ufrag + '\n')
  return desc
}
