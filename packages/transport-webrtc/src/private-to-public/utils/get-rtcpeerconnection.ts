import { DescriptionType, PeerConnection } from 'node-datachannel'
import { RTCPeerConnection } from '../../webrtc/index.js'
import { DEFAULT_STUN_SERVERS } from '../constants.js'
import { generateTransportCertificate } from './generate-certificates.js'
import type { TransportCertificate } from '../../index.js'
import type { CertificateFingerprint, IceServer } from 'node-datachannel'

/**
 * Convert the lib.dom.d.ts RTCIceServer type into a libdatachannel IceServer
 */
export function toLibdatachannelIceServers (arg?: RTCIceServer[]): IceServer[] | undefined {
  if (arg == null) {
    return
  }

  if (arg.length === 0) {
    return []
  }

  function toLibdatachannelIceServer <T> (arg: string, init: T): T & { hostname: string, port: number } {
    const url = new URL(arg)

    return {
      ...init,
      hostname: url.hostname,
      port: parseInt(url.port)
    }
  }

  const output: IceServer[] = []

  for (const server of arg) {
    if (typeof server.urls === 'string') {
      output.push(toLibdatachannelIceServer(server.urls, server))
      continue
    }

    for (const url of server.urls) {
      output.push(toLibdatachannelIceServer(url, server))
    }
  }

  return output
}

interface DirectRTCPeerConnectionInit extends RTCConfiguration {
  peerConnection: PeerConnection
  ufrag: string
}

export class DirectRTCPeerConnection extends RTCPeerConnection {
  private readonly peerConnection: PeerConnection
  private readonly ufrag: string

  constructor (init: DirectRTCPeerConnectionInit) {
    super(init)

    this.peerConnection = init.peerConnection
    this.ufrag = init.ufrag
  }

  createDataChannel (label: string, dataChannelDict?: RTCDataChannelInit): RTCDataChannel {
    const channel = super.createDataChannel(label, dataChannelDict)

    // have to set ufrag after first datachannel is created
    if (this.connectionState === 'new') {
      this.peerConnection.setLocalDescription(DescriptionType.Offer, {
        iceUfrag: this.ufrag,
        icePwd: this.ufrag
      })
    }

    return channel
  }

  remoteFingerprint (): CertificateFingerprint {
    return this.peerConnection.remoteFingerprint()
  }
}

export async function createDialerRTCPeerConnection (name: string, ufrag: string, rtcConfiguration?: RTCConfiguration, certificate?: TransportCertificate): Promise<DirectRTCPeerConnection> {
  if (certificate == null) {
    const keyPair = await crypto.subtle.generateKey({
      name: 'ECDSA',
      namedCurve: 'P-256'
    }, true, ['sign', 'verify'])

    certificate = await generateTransportCertificate(keyPair, {
      days: 365
    })
  }

  // https://github.com/libp2p/specs/blob/master/webrtc/webrtc-direct.md#browser-to-public-server
  const peerConnection = new PeerConnection(name, {
    disableFingerprintVerification: true,
    disableAutoNegotiation: true,
    certificatePemFile: certificate.pem,
    keyPemFile: certificate.privateKey,
    maxMessageSize: 16384,
    iceServers: toLibdatachannelIceServers(rtcConfiguration?.iceServers) ?? DEFAULT_STUN_SERVERS
  })

  return new DirectRTCPeerConnection({
    peerConnection,
    ufrag
  })
}
