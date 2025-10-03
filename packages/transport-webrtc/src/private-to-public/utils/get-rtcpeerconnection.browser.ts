import { DataChannelMuxerFactory } from '../../muxer.ts'
import type { CreateDialerRTCPeerConnectionOptions } from './get-rtcpeerconnection.ts'

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
