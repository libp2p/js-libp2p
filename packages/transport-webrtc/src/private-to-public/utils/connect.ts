import { noise } from '@libp2p/noise'
import { pEvent } from 'p-event'
import { WebRTCTransportError } from '../../error.ts'
import { DataChannelMuxerFactory } from '../../muxer.ts'
import { toMultiaddrConnection } from '../../rtcpeerconnection-to-conn.ts'
import { createStream } from '../../stream.ts'
import { generateNoisePrologue } from './generate-noise-prologue.ts'
import * as sdp from './sdp.ts'
import { isIcePwd, isIceUfrag, serverUfragV2 } from './stun.ts'
import type { DirectRTCPeerConnection } from './get-rtcpeerconnection.ts'
import type { DataChannelOptions } from '../../index.ts'
import type { ComponentLogger, Connection, CounterGroup, Logger, PeerId, PrivateKey, Upgrader } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

export interface ConnectOptions {
  log: Logger
  logger: ComponentLogger
  events?: CounterGroup
  remoteAddr: Multiaddr
  role: 'client' | 'server'
  dataChannel?: DataChannelOptions
  upgrader: Upgrader
  peerId: PeerId
  remotePeer?: PeerId
  signal: AbortSignal
  privateKey: PrivateKey
  remoteUfrag?: string
  remotePwd?: string
}

export interface ClientOptions extends ConnectOptions {
  role: 'client'

  /**
   * Which version of the connection flow to dial with
   */
  version: 1 | 2

  /**
   * Continue as v2 when the runtime does not apply the munged ICE credentials
   * a v1 dial needs
   */
  fallback?: boolean

  /**
   * Called once a v1 attempt shows whether the runtime applies munged ICE
   * credentials, even if the dial later fails
   */
  onMungeable?(mungeable: boolean): void
}

export interface ServerOptions extends ConnectOptions {
  role: 'server'
}

function isServer (options: ClientOptions | ServerOptions, peerConnection: any): peerConnection is DirectRTCPeerConnection {
  return options.role === 'server'
}

/**
 * Set `offer` as the local description with its ICE ufrag and password munged
 * to `ufrag`, as WebRTC Direct v1 requires, and report whether the runtime
 * applied them. Browsers are removing support for this, in which case
 * setLocalDescription either rejects the offer with an InvalidModificationError
 * or keeps the generated credentials.
 */
async function setMungedLocalOffer (peerConnection: RTCPeerConnection | DirectRTCPeerConnection, offer: RTCSessionDescriptionInit, ufrag: string, log: Logger): Promise<boolean> {
  const mungedOffer = sdp.munge({ type: offer.type, sdp: offer.sdp }, ufrag)

  try {
    log.trace('client setting munged local offer %s', mungedOffer.sdp)
    await peerConnection.setLocalDescription(mungedOffer)
  } catch (err: any) {
    // any other rejection is a real failure, not the runtime refusing the munge
    if (err.name !== 'InvalidModificationError') {
      throw err
    }

    log('runtime rejected the munged local offer - %e', err)
    return false
  }

  const localSdp = peerConnection.localDescription?.sdp

  return sdp.getIceUfragFromSdp(localSdp) === ufrag && sdp.getIcePwdFromSdp(localSdp) === ufrag
}

/**
 * Set the local offer for the requested version and return the ufrag for the
 * synthetic server answer.
 *
 * v1 munges the offer so ice-ufrag and ice-pwd both equal `ufrag`, letting the
 * server infer the client's credentials from the STUN USERNAME alone. v2 keeps
 * the credentials the runtime generated and carries the client's ICE password
 * in the server ufrag instead. When a v1 attempt does not stick and fallback
 * is allowed, the dial continues as v2.
 */
async function setClientOffer (peerConnection: RTCPeerConnection | DirectRTCPeerConnection, offer: RTCSessionDescriptionInit, ufrag: string, options: ClientOptions): Promise<string> {
  if (options.version === 1) {
    const mungeable = await setMungedLocalOffer(peerConnection, offer, ufrag, options.log)
    options.onMungeable?.(mungeable)

    if (mungeable) {
      return ufrag
    }

    if (options.fallback !== true) {
      throw new WebRTCTransportError('SDP munging is not available in this runtime so WebRTC Direct v1 cannot be used')
    }

    options.log('SDP munging is not available in this runtime, continuing as WebRTC Direct v2')
  }

  // a rejected munged offer leaves no local description, an ignored one leaves
  // the runtime's own credentials in place, which is what v2 needs
  if (peerConnection.localDescription == null) {
    options.log.trace('client setting local offer %s', offer.sdp)
    await peerConnection.setLocalDescription(offer)
  }

  // encode the client's ICE password in the synthetic server ufrag
  const localPwd = sdp.getIcePwdFromSdp(peerConnection.localDescription?.sdp)

  if (localPwd == null || !isIcePwd(localPwd)) {
    // without a valid local ICE password we cannot build a valid v2 server
    // ufrag; fail loudly instead of dialing with a ufrag the server would reject
    throw new WebRTCTransportError('Could not read a valid local ICE password from local description for v2 dial')
  }

  const serverUfrag = serverUfragV2(localPwd)

  if (!isIceUfrag(serverUfrag)) {
    // the prefix counts towards the 256 character ufrag limit
    throw new WebRTCTransportError('Local ICE password is too long to encode in a v2 server ufrag')
  }

  return serverUfrag
}

export async function connect (peerConnection: RTCPeerConnection, muxerFactory: DataChannelMuxerFactory, ufrag: string, options: ClientOptions): Promise<Connection>
export async function connect (peerConnection: DirectRTCPeerConnection, muxerFactory: DataChannelMuxerFactory, ufrag: string, options: ServerOptions): Promise<void>
export async function connect (peerConnection: RTCPeerConnection | DirectRTCPeerConnection, muxerFactory: DataChannelMuxerFactory, ufrag: string, options: ClientOptions | ServerOptions): Promise<any> {
  // create data channel for running the noise handshake. Once the data
  // channel is opened, the listener will initiate the noise handshake. This
  // is used to confirm the identity of the peer.
  const handshakeDataChannel = peerConnection.createDataChannel('', { negotiated: true, id: 0 })

  try {
    if (options.role === 'client') {
      // the client has to set the local offer before the remote answer
      options.log.trace('client creating local offer')
      const offerSdp = await peerConnection.createOffer()
      options.log.trace('client created local offer %s', offerSdp.sdp)

      const serverUfrag = await setClientOffer(peerConnection, offerSdp, ufrag, options)
      const answerSdp = sdp.serverAnswerFromMultiaddr(options.remoteAddr, serverUfrag)
      options.log.trace('client setting server description %s', answerSdp.sdp)
      await peerConnection.setRemoteDescription(answerSdp)
    } else {
      // the server has to set the remote offer before the local answer
      const remoteUfrag = options.remoteUfrag ?? ufrag
      const remotePwd = options.remotePwd ?? remoteUfrag
      const offerSdp = sdp.clientOfferFromMultiAddr(options.remoteAddr, remoteUfrag, remotePwd)
      options.log.trace('server setting client %s %s', offerSdp.type, offerSdp.sdp)
      await peerConnection.setRemoteDescription(offerSdp)

      options.log.trace('server creating local answer')
      const answerSdp = await peerConnection.createAnswer()
      options.log.trace('server created local answer')

      // the answer credentials were pinned to the server ufrag when the peer
      // connection was created, so it needs no munging for either version
      options.log.trace('server setting local description %s', answerSdp.sdp)
      await peerConnection.setLocalDescription(answerSdp)
    }

    if (handshakeDataChannel.readyState !== 'open') {
      options.log.trace('%s wait for handshake channel to open, starting status %s', options.role, handshakeDataChannel.readyState)
      await pEvent(handshakeDataChannel, 'open', options)
    }

    options.log.trace('%s handshake channel opened', options.role)

    if (isServer(options, peerConnection)) {
      // now that the connection has been opened, add the remote's certhash to
      // it's multiaddr so we can complete the noise handshake
      const remoteFingerprint = peerConnection.remoteFingerprint()?.value ?? ''
      options.remoteAddr = options.remoteAddr.encapsulate(sdp.fingerprint2Ma(remoteFingerprint))
    }

    // Do noise handshake.
    // Set the Noise Prologue to libp2p-webrtc-noise:<FINGERPRINTS> before
    // starting the actual Noise handshake.
    // <FINGERPRINTS> is the concatenation of the of the two TLS fingerprints
    // of A (responder) and B (initiator) in their byte representation.
    const localFingerprint = sdp.getFingerprintFromSdp(peerConnection.localDescription?.sdp)

    if (localFingerprint == null) {
      throw new WebRTCTransportError('Could not get fingerprint from local description sdp')
    }

    options.log.trace('%s performing noise handshake', options.role)
    const noisePrologue = generateNoisePrologue(localFingerprint, options.remoteAddr, options.role)

    // Since we use the default crypto interface and do not use a static key
    // or early data, we pass in undefined for these parameters.
    const connectionEncrypter = noise({ prologueBytes: noisePrologue })(options)

    const handshakeStream = createStream({
      channel: handshakeDataChannel,
      direction: 'outbound',
      isHandshake: true,
      log: options.log,
      ...(options.dataChannel ?? {})
    })

    // Creating the connection before completion of the noise
    // handshake ensures that the stream opening callback is set up
    const maConn = toMultiaddrConnection({
      // @ts-expect-error types are broken
      peerConnection,
      remoteAddr: options.remoteAddr,
      metrics: options.events,
      direction: options.role === 'client' ? 'outbound' : 'inbound',
      log: options.logger.forComponent('libp2p:webrtc-direct:connection')
    })

    peerConnection.addEventListener('connectionstatechange', () => {
      switch (peerConnection.connectionState) {
        case 'failed':
        case 'disconnected':
        case 'closed':
          maConn.close().catch((err) => {
            options.log.error('error closing connection - %e', err)
            maConn.abort(err)
          })
          break
        default:
          break
      }
    })

    // Track opened peer connection
    options.events?.increment({ peer_connection: true })

    if (options.role === 'client') {
      // For outbound connections, the remote is expected to start the noise
      // handshake. Therefore, we need to secure an inbound noise connection
      // from the server.
      options.log.trace('%s secure inbound', options.role)
      const result = await connectionEncrypter.secureInbound(handshakeStream, {
        remotePeer: options.remotePeer,
        signal: options.signal,
        skipStreamMuxerNegotiation: true
      })

      options.log.trace('%s upgrade outbound', options.role)
      const connection = await options.upgrader.upgradeOutbound(maConn, {
        skipProtection: true,
        skipEncryption: true,
        remotePeer: result.remotePeer,
        muxerFactory,
        signal: options.signal
      })

      return connection
    }

    // For inbound connections, the server is are expected to start the noise
    // handshake. Therefore, we need to secure an outbound noise connection from
    // the client.
    options.log.trace('%s secure outbound', options.role)
    const result = await connectionEncrypter.secureOutbound(handshakeStream, {
      remotePeer: options.remotePeer,
      signal: options.signal,
      skipStreamMuxerNegotiation: true
    })

    maConn.remoteAddr = maConn.remoteAddr.encapsulate(`/p2p/${result.remotePeer}`)

    options.log.trace('%s upgrade inbound', options.role)

    await options.upgrader.upgradeInbound(maConn, {
      skipProtection: true,
      skipEncryption: true,
      remotePeer: result.remotePeer,
      muxerFactory,
      signal: options.signal
    })
  } catch (err) {
    // discard any early data channels buffered before the upgrade failed
    muxerFactory.close()
    handshakeDataChannel.close()
    peerConnection.close()

    throw err
  }
}
