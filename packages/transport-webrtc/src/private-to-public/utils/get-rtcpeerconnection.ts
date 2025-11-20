import { Crypto } from '@peculiar/webcrypto'
import { RTCPeerConnection } from '../../webrtc/index.js'
import { DEFAULT_ICE_SERVERS, MAX_MESSAGE_SIZE } from '../../constants.js'
import { DataChannelMuxerFactory } from '../../muxer.ts'
import { generateTransportCertificate } from './generate-certificates.js'
import type { DataChannelOptions, TransportCertificate } from '../../index.js'
import type { CounterGroup } from '@libp2p/interface'

const crypto = new Crypto()

export interface CreateDialerRTCPeerConnectionOptions {
  rtcConfiguration?: RTCConfiguration | (() => RTCConfiguration | Promise<RTCConfiguration>)
  certificate?: TransportCertificate
  events?: CounterGroup
  dataChannel?: DataChannelOptions
}

/**
 * Helper to extract remote fingerprint from RTCPeerConnection
 * Used by WebRTC Direct server to get remote certificate info
 */
export function extractRemoteFingerprint (pc: RTCPeerConnection): string | undefined {
  if (pc.remoteDescription?.sdp == null) {
    return undefined
  }
  
  const match = pc.remoteDescription.sdp.match(/a=fingerprint:(\S+)\s+(\S+)/)
  if (match != null) {
    return match[2] // Return just the fingerprint hash, not the algorithm
  }
  
  return undefined
}

export async function createDialerRTCPeerConnection (role: 'client' | 'server', ufrag: string, options: CreateDialerRTCPeerConnectionOptions = {}): Promise<{ peerConnection: RTCPeerConnection, muxerFactory: DataChannelMuxerFactory }> {
  if (options.certificate == null) {
    // ECDSA is preferred over RSA here. From our testing we find that P-256
    // elliptic curve is supported by Pion, webrtc-rs, as well as Chromium
    // (P-228 and P-384 was not supported in Chromium). We use the same hash
    // function as found in the multiaddr if it is supported.
    const keyPair = await crypto.subtle.generateKey({
      name: 'ECDSA',
      namedCurve: 'P-256'
    }, true, ['sign', 'verify'])

    options.certificate = await generateTransportCertificate(keyPair, {
      days: 365
    })
  }

  const rtcConfig = typeof options.rtcConfiguration === 'function' ? await options.rtcConfiguration() : options.rtcConfiguration

  // @roamhq/wrtc uses standard browser-like RTCPeerConnection API
  // Certificate is handled differently - wrtc auto-generates certificates
  // We'll rely on SDP manipulation for ufrag (done in connect.ts via sdp.munge)
  const peerConnection = new RTCPeerConnection({
    ...rtcConfig,
    iceServers: rtcConfig?.iceServers ?? DEFAULT_ICE_SERVERS.map(urls => ({ urls }))
  })

  const muxerFactory = new DataChannelMuxerFactory({
    peerConnection,
    metrics: options.events,
    dataChannelOptions: options.dataChannel
  })

  return {
    peerConnection,
    muxerFactory
  }
}
