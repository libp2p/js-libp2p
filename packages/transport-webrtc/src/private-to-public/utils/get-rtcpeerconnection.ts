import { Crypto } from '@peculiar/webcrypto'
import * as WebRTCNode from '@mertushka/webrtc-node'
import { DEFAULT_ICE_SERVERS, MAX_MESSAGE_SIZE } from '../../constants.ts'
import { DataChannelMuxerFactory } from '../../muxer.ts'
import { generateTransportCertificate } from './generate-certificates.ts'
import type { DataChannelOptions, TransportCertificate } from '../../index.ts'
import type { CounterGroup } from '@libp2p/interface'

const crypto = new Crypto()
const webRTCNode = (WebRTCNode as unknown as { default?: typeof WebRTCNode }).default ?? WebRTCNode
const {
  RTCPeerConnection: NodeRTCPeerConnection,
  nonstandard
} = webRTCNode
const RTCPeerConnection = NodeRTCPeerConnection as unknown as typeof globalThis.RTCPeerConnection

export interface DirectRTCPeerConnection extends globalThis.RTCPeerConnection {
  remoteFingerprint(): ReturnType<typeof nonstandard.getRemoteFingerprint>
}

export interface CreateDialerRTCPeerConnectionOptions {
  rtcConfiguration?: RTCConfiguration | (() => RTCConfiguration | Promise<RTCConfiguration>)
  certificate?: TransportCertificate
  events?: CounterGroup
  dataChannel?: DataChannelOptions
}

export async function createDialerRTCPeerConnection (role: 'client', ufrag: string, options?: CreateDialerRTCPeerConnectionOptions): Promise<{ peerConnection: globalThis.RTCPeerConnection, muxerFactory: DataChannelMuxerFactory }>
export async function createDialerRTCPeerConnection (role: 'server', ufrag: string, options?: CreateDialerRTCPeerConnectionOptions): Promise<{ peerConnection: DirectRTCPeerConnection, muxerFactory: DataChannelMuxerFactory }>
export async function createDialerRTCPeerConnection (role: 'client' | 'server', ufrag: string, options: CreateDialerRTCPeerConnectionOptions = {}): Promise<{ peerConnection: globalThis.RTCPeerConnection | DirectRTCPeerConnection, muxerFactory: DataChannelMuxerFactory }> {
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
  const certificate = nonstandard.importCertificate({
    certificatePem: options.certificate.pem,
    privateKeyPem: options.certificate.privateKey
  })

  const peerConnection = new RTCPeerConnection({
    ...(rtcConfig ?? {}),
    certificates: [certificate as unknown as globalThis.RTCCertificate],
    iceServers: rtcConfig?.iceServers ?? DEFAULT_ICE_SERVERS.map(urls => ({ urls }))
  }) as DirectRTCPeerConnection
  const nonstandardPeerConnection = peerConnection as unknown as InstanceType<typeof NodeRTCPeerConnection>

  nonstandard.configurePeerConnection(nonstandardPeerConnection, {
    disableFingerprintVerification: true,
    enableIceUdpMux: role === 'server',
    maxMessageSize: MAX_MESSAGE_SIZE
  })

  nonstandard.setLocalIceCredentials(nonstandardPeerConnection, {
    iceUfrag: ufrag,
    icePwd: ufrag
  })

  peerConnection.remoteFingerprint = () => nonstandard.getRemoteFingerprint(nonstandardPeerConnection)

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
