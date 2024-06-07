import * as multihashes from 'multihashes'
import { concat } from 'uint8arrays/concat'
import { fromString as uint8arrayFromString } from 'uint8arrays/from-string'
import { invalidArgument } from '../../error.js'
import * as sdp from './sdp.js'
import type { Logger } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { HashCode } from 'multihashes'

/**
 * Generate a noise prologue from the peer connection's certificate.
 * noise prologue = bytes('libp2p-webrtc-noise:') + noise-responder fingerprint + noise-initiator fingerprint
 */
export function generateNoisePrologue (pc: RTCPeerConnection, hashCode: HashCode, remoteAddr: Multiaddr, log: Logger, role: 'initiator' | 'responder'): Uint8Array {
  if (pc.getConfiguration().certificates?.length === 0) {
    throw invalidArgument('no local certificate')
  }

  const localFingerprint = sdp.getLocalFingerprint(pc, {
    log
  })

  if (localFingerprint == null) {
    throw invalidArgument('no local fingerprint found')
  }

  const localFpString = localFingerprint.trim().toLowerCase().replaceAll(':', '')
  const localFpArray = uint8arrayFromString(localFpString, 'hex')
  const local = multihashes.encode(localFpArray, hashCode)
  const remote: Uint8Array = sdp.mbdecoder.decode(sdp.certhash(remoteAddr))
  const prefix = uint8arrayFromString('libp2p-webrtc-noise:')

  if (role === 'responder') {
    return concat([prefix, local, remote], 88)
  }

  return concat([prefix, remote, local], 88)
}
