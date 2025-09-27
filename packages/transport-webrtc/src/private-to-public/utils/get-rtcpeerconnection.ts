import { Crypto } from '@peculiar/webcrypto'
import { PeerConnection } from 'node-datachannel'
import { RTCPeerConnection } from 'node-datachannel/polyfill'
import { DEFAULT_ICE_SERVERS, MAX_MESSAGE_SIZE } from '../../constants.js'
import { DataChannelMuxerFactory } from '../../muxer.ts'
import { generateTransportCertificate } from './generate-certificates.js'
import type { DataChannelOptions, TransportCertificate } from '../../index.js'
import type { CounterGroup } from '@libp2p/interface'
import type { CertificateFingerprint } from 'node-datachannel'

const crypto = new Crypto()

interface DirectRTCPeerConnectionInit extends RTCConfiguration {
  ufrag: string
  peerConnection: PeerConnection
}

export class DirectRTCPeerConnection extends RTCPeerConnection {
  private peerConnection: PeerConnection
  private readonly ufrag: string

  constructor (init: DirectRTCPeerConnectionInit) {
    super(init)

    this.peerConnection = init.peerConnection
    this.ufrag = init.ufrag

    // make sure C++ peer connection is garbage collected
    // https://github.com/murat-dogan/node-datachannel/issues/366#issuecomment-3228453155
    this.addEventListener('connectionstatechange', () => {
      switch (this.connectionState) {
        case 'closed':
          this.peerConnection.close()
          break
        default:
          break
      }
    })
  }

  async createOffer (): Promise<globalThis.RTCSessionDescriptionInit | any> {
    // have to set ufrag before creating offer
    if (this.connectionState === 'new') {
      this.peerConnection?.setLocalDescription('offer', {
        iceUfrag: this.ufrag,
        icePwd: this.ufrag
      })
    }

    return super.createOffer()
  }

  async createAnswer (): Promise<globalThis.RTCSessionDescriptionInit | any> {
    // have to set ufrag before creating answer
    if (this.connectionState === 'new') {
      this.peerConnection?.setLocalDescription('answer', {
        iceUfrag: this.ufrag,
        icePwd: this.ufrag
      })
    }

    return super.createAnswer()
  }

  remoteFingerprint (): CertificateFingerprint {
    if (this.peerConnection == null) {
      throw new Error('Invalid state: peer connection not set')
    }

    return this.peerConnection.remoteFingerprint()
  }
}

function mapIceServers (iceServers?: RTCIceServer[]): string[] {
  return iceServers
    ?.map((server) => {
      const urls = Array.isArray(server.urls) ? server.urls : [server.urls]

      return urls.map((url) => {
        if (server.username != null && server.credential != null) {
          const [protocol, rest] = url.split(/:(.*)/)
          return `${protocol}:${server.username}:${server.credential}@${rest}`
        }
        return url
      })
    })
    .flat() ?? []
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

  const peerConnection = new DirectRTCPeerConnection({
    ...rtcConfig,
    ufrag,
    peerConnection: new PeerConnection(`${role}-${Date.now()}`, {
      disableFingerprintVerification: true,
      disableAutoNegotiation: true,
      certificatePemFile: options.certificate.pem,
      keyPemFile: options.certificate.privateKey,
      enableIceUdpMux: role === 'server',
      maxMessageSize: MAX_MESSAGE_SIZE,
      iceServers: mapIceServers(rtcConfig?.iceServers ?? DEFAULT_ICE_SERVERS.map(urls => ({ urls })))
    })
  })

  const muxerFactory = new DataChannelMuxerFactory({
    // @ts-expect-error https://github.com/murat-dogan/node-datachannel/pull/370
    peerConnection,
    metrics: options.events,
    dataChannelOptions: options.dataChannel
  })

  return {
    peerConnection,
    muxerFactory
  }
}
