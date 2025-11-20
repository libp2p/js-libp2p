import { DataChannelMuxerFactory } from '../../muxer.ts'
import type { CreateDialerRTCPeerConnectionOptions } from './get-rtcpeerconnection.ts'

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
  // @ts-expect-error options type is wrong
  let certificate: RTCCertificate = options.certificate

  if (certificate == null) {
    // ECDSA is preferred over RSA here. From our testing we find that P-256 elliptic
    // curve is supported by Pion, webrtc-rs, as well as Chromium (P-228 and P-384
    // was not supported in Chromium). We use the same hash function as found in the
    // multiaddr if it is supported.
    certificate = await RTCPeerConnection.generateCertificate({
      name: 'ECDSA',

      // @ts-expect-error missing from lib.dom.d.ts but required by chrome
      namedCurve: 'P-256'
      // hash: sdp.toSupportedHashFunction(hashName)
    })
  }

  const rtcConfig = typeof options.rtcConfiguration === 'function' ? await options.rtcConfiguration() : options.rtcConfiguration

  const peerConnection = new RTCPeerConnection({
    ...(rtcConfig ?? {}),
    certificates: [certificate]
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
