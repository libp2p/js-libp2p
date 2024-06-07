import { RTCPeerConnection } from '../../webrtc/index.js'
import { generateTransportCertificate } from './generate-certificates.js'
import type { HashName } from 'multihashes'

export async function createDialerRTCPeerConnection (ufrag: string, hashName: HashName): Promise<RTCPeerConnection> {
  const keyPair = await crypto.subtle.generateKey({
    name: 'ECDSA',
    namedCurve: 'P-256'
  }, true, ['sign', 'verify'])

  const certificate = await generateTransportCertificate(keyPair, {
    days: 365
  })

  return new RTCPeerConnection({
    // @ts-expect-error non-standard arguments accepted by node-datachannel and
    // passed on to libdatachannel/libjuice
    iceUfrag: ufrag,
    icePwd: ufrag,
    disableFingerprintVerification: true,
    certificatePemFile: certificate.pem,
    keyPemFile: certificate.privateKey,
    maxMessageSize: 16384
  })
}
