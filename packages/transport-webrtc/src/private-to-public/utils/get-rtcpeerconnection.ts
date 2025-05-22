import { Crypto } from '@peculiar/webcrypto'
import pkg from '@roamhq/wrtc'
import sdpTransform from 'sdp-transform'
import { DEFAULT_ICE_SERVERS } from '../../constants.js'
import { getRTCFingerprint } from '../../util.js'
import { generateTransportCertificate } from './generate-certificates.js'
import type { TransportCertificate } from '../../index.js'
import type { CertificateFingerprint } from '@ipshipyard/node-datachannel'
const { RTCPeerConnection } = pkg

const crypto = new Crypto()

interface DirectRTCPeerConnectionInit extends RTCConfiguration {
  ufrag: string
}

export class DirectRTCPeerConnection extends RTCPeerConnection {
  private readonly ufrag: string

  constructor (init: DirectRTCPeerConnectionInit) {
    super(init)

    this.ufrag = init.ufrag
  }

  async createOffer (): Promise<globalThis.RTCSessionDescriptionInit | any> {
    // Get current local description
    let localDescription = this.localDescription

    // Generate an empty local SDP first to modify
    if (localDescription == null) {
      localDescription = this.currentLocalDescription
    }

    if (localDescription == null) {
      throw new Error('Invalid State Error: Expected local description to be non null')
    }

    const localSDP = sdpTransform.parse(localDescription.sdp)

    // have to set ufrag before creating offer
    localSDP.iceUfrag = this.ufrag
    localSDP.icePwd = this.ufrag

    if (this.connectionState === 'new') {
      await this.setLocalDescription({
        sdp: sdpTransform.write(localSDP),
        type: 'offer'
      })
    }

    return this.createOffer()
  }

  async createAnswer (): Promise<globalThis.RTCSessionDescriptionInit | any> {
    let localDescription = this.localDescription

    // Generate an empty local SDP first to modify
    if (localDescription == null) {
      localDescription = this.currentLocalDescription
    }

    if (localDescription == null) {
      throw new Error('Invalid State Error: Expected local description to be non null')
    }

    const localSDP = sdpTransform.parse(localDescription.sdp)

    // have to set ufrag before creating offer
    localSDP.iceUfrag = this.ufrag
    localSDP.icePwd = this.ufrag

    if (this.connectionState === 'new') {
      await this.setLocalDescription({
        sdp: sdpTransform.write(localSDP),
        type: 'answer'
      })
    }

    return this.createAnswer()
  }

  remoteFingerprint (): CertificateFingerprint {
    const remoteDescription = this.remoteDescription

    if (remoteDescription == null) {
      throw new Error('Invalid state: remote sdp not found')
    }

    return getRTCFingerprint(remoteDescription)
  }
}

export async function createDialerRTCPeerConnection (role: 'client' | 'server', ufrag: string, rtcConfiguration?: RTCConfiguration | (() => RTCConfiguration | Promise<RTCConfiguration>), certificate?: TransportCertificate): Promise<DirectRTCPeerConnection> {
  if (certificate == null) {
    // ECDSA is preferred over RSA here. From our testing we find that P-256
    // elliptic curve is supported by Pion, webrtc-rs, as well as Chromium
    // (P-228 and P-384 was not supported in Chromium). We use the same hash
    // function as found in the multiaddr if it is supported.
    const keyPair = await crypto.subtle.generateKey({
      name: 'ECDSA',
      namedCurve: 'P-256'
    }, true, ['sign', 'verify'])

    certificate = await generateTransportCertificate(keyPair, {
      days: 365
    })
  }

  const rtcConfig = typeof rtcConfiguration === 'function' ? await rtcConfiguration() : rtcConfiguration

  return new DirectRTCPeerConnection({
    ...rtcConfig,
    ufrag,
    iceServers: (rtcConfig?.iceServers ?? DEFAULT_ICE_SERVERS.map(urls => ({ urls })))
  })
}
