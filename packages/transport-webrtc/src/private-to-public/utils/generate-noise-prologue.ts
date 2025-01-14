import { sha256 } from 'multiformats/hashes/sha2'
import { concat } from 'uint8arrays/concat'
import { fromString as uint8arrayFromString } from 'uint8arrays/from-string'
import * as sdp from './sdp.js'
import type { Multiaddr } from '@multiformats/multiaddr'

/**
 * Generate a noise prologue from the peer connection's certificate.
 * noise prologue = bytes('libp2p-webrtc-noise:') + noise-responder fingerprint + noise-initiator fingerprint
 */
export async function generateNoisePrologue (localFingerprint: string, remoteAddr: Multiaddr, role: 'initiator' | 'responder'): Promise<Uint8Array> {
  const localFpString = localFingerprint.trim().toLowerCase().replaceAll(':', '')
  const localFpArray = uint8arrayFromString(localFpString, 'hex')
  const local = await sha256.digest(localFpArray)
  const remote: Uint8Array = sdp.mbdecoder.decode(sdp.certhash(remoteAddr))
  const prefix = uint8arrayFromString('libp2p-webrtc-noise:')
  const byteLength = prefix.byteLength + local.digest.byteLength + remote.byteLength

  if (role === 'responder') {
    return concat([prefix, local.digest, remote], byteLength)
  }

  return concat([prefix, remote, local.digest], byteLength)
}
