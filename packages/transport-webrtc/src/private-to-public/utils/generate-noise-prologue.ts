import * as multihashes from 'multihashes'
import { concat } from 'uint8arrays/concat'
import { fromString as uint8arrayFromString } from 'uint8arrays/from-string'
import * as sdp from './sdp.js'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { HashCode } from 'multihashes'

/**
 * Generate a noise prologue from the peer connection's certificate.
 * noise prologue = bytes('libp2p-webrtc-noise:') + noise-responder fingerprint + noise-initiator fingerprint
 */
export function generateNoisePrologue (localFingerprint: string, hashCode: HashCode, remoteAddr: Multiaddr, role: 'initiator' | 'responder'): Uint8Array {
  const localFpString = localFingerprint.trim().toLowerCase().replaceAll(':', '')
  const localFpArray = uint8arrayFromString(localFpString, 'hex')
  const local = multihashes.encode(localFpArray, hashCode)
  const remote: Uint8Array = sdp.mbdecoder.decode(sdp.certhash(remoteAddr))
  const prefix = uint8arrayFromString('libp2p-webrtc-noise:')
  const byteLength = prefix.byteLength + local.byteLength + remote.byteLength

  if (role === 'responder') {
    return concat([prefix, local, remote], byteLength)
  }

  return concat([prefix, remote, local], byteLength)
}
