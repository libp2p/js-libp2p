import { noise } from '@chainsafe/libp2p-noise'
import { raceEvent } from 'race-event'
import { WebRTCTransportError } from '../../error.js'
import { WebRTCMultiaddrConnection } from '../../maconn.js'
import { DataChannelMuxerFactory } from '../../muxer.js'
import { createStream } from '../../stream.js'
import { isFirefox } from '../../util.js'
import { generateNoisePrologue } from './generate-noise-prologue.js'
import * as sdp from './sdp.js'
import type { DirectRTCPeerConnection } from './get-rtcpeerconnection.js'
import type { DataChannelOptions } from '../../index.js'
import type { ComponentLogger, Connection, ConnectionHandler, CounterGroup, Logger, Metrics, PeerId, Upgrader } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { HashCode } from 'multihashes'

export interface ConnectOptions {
  log: Logger
  logger: ComponentLogger
  metrics?: Metrics
  events?: CounterGroup
  remoteAddr: Multiaddr
  role: 'initiator' | 'responder'
  hashCode: HashCode
  dataChannel?: DataChannelOptions
  upgrader: Upgrader
  peerId: PeerId
  remotePeerId?: PeerId
  handler?: ConnectionHandler
  signal: AbortSignal
}

const CONNECTION_STATE_CHANGE_EVENT = isFirefox ? 'iceconnectionstatechange' : 'connectionstatechange'

export async function connect (peerConnection: DirectRTCPeerConnection, ufrag: string, options: ConnectOptions): Promise<Connection> {
  // create data channel for running the noise handshake. Once the data
  // channel is opened, the remote will initiate the noise handshake. This
  // is used to confirm the identity of the peer.
  const handshakeDataChannel = peerConnection.createDataChannel('', { negotiated: true, id: 0 })

  // Create offer and munge sdp with ufrag == pwd. This allows the remote to
  // respond to STUN messages without performing an actual SDP exchange.
  // This is because it can infer the passwd field by reading the USERNAME
  // attribute of the STUN message.
  options.log.trace('creating local offer')
  const offerSdp = await peerConnection.createOffer()
  const mungedOfferSdp = sdp.munge(offerSdp, ufrag)
  options.log.trace('setting local description')
  await peerConnection.setLocalDescription(mungedOfferSdp)

  // construct answer sdp from multiaddr and ufrag
  let answerSdp: RTCSessionDescriptionInit

  if (options.role === 'initiator') {
    options.log.trace('deriving client offer')
    answerSdp = sdp.clientOfferFromMultiaddr(options.remoteAddr, ufrag)
  } else {
    options.log.trace('deriving server offer')
    answerSdp = sdp.serverOfferFromMultiAddr(options.remoteAddr, ufrag)
  }

  options.log.trace('setting remote description')
  await peerConnection.setRemoteDescription(answerSdp)

  options.log.trace('wait for handshake channel to open')
  await raceEvent(handshakeDataChannel, 'open', options.signal)

  if (options.role === 'initiator') {
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
    throw new WebRTCTransportError('Could not get fingerprint from local description sdp', 'ERR_MISSING_FINGERPRINT')
  }

  options.log.trace('performing noise handshake')
  const noisePrologue = generateNoisePrologue(localFingerprint, options.hashCode, options.remoteAddr, options.role)

  // Since we use the default crypto interface and do not use a static key
  // or early data, we pass in undefined for these parameters.
  const connectionEncrypter = noise({ prologueBytes: noisePrologue })(options)

  const wrappedChannel = createStream({
    channel: handshakeDataChannel,
    direction: 'inbound',
    logger: options.logger,
    ...(options.dataChannel ?? {})
  })
  const wrappedDuplex = {
    ...wrappedChannel,
    sink: wrappedChannel.sink.bind(wrappedChannel),
    source: (async function * () {
      for await (const list of wrappedChannel.source) {
        for (const buf of list) {
          yield buf
        }
      }
    }())
  }

  // Creating the connection before completion of the noise
  // handshake ensures that the stream opening callback is set up
  const maConn = new WebRTCMultiaddrConnection(options, {
    peerConnection,
    remoteAddr: options.remoteAddr,
    timeline: {
      open: Date.now()
    },
    metrics: options.events
  })

  peerConnection.addEventListener(CONNECTION_STATE_CHANGE_EVENT, () => {
    switch (peerConnection.connectionState) {
      case 'failed':
      case 'disconnected':
      case 'closed':
        maConn.close().catch((err) => {
          options.log.error('error closing connection', err)
        })
        break
      default:
        break
    }
  })

  // Track opened peer connection
  options.events?.increment({ peer_connection: true })

  const muxerFactory = new DataChannelMuxerFactory(options, {
    peerConnection,
    metrics: options.events,
    dataChannelOptions: options.dataChannel
  })

  if (options.role === 'responder') {
    // For outbound connections, the remote is expected to start the noise handshake.
    // Therefore, we need to secure an inbound noise connection from the remote.
    options.log.trace('secure inbound')
    await connectionEncrypter.secureInbound(options.peerId, wrappedDuplex, options.remotePeerId)

    options.log.trace('upgrade outbound')
    return options.upgrader.upgradeOutbound(maConn, { skipProtection: true, skipEncryption: true, muxerFactory })
  }

  // For inbound connections, we are expected to start the noise handshake.
  // Therefore, we need to secure an outbound noise connection from the remote.
  options.log.trace('secure outbound')
  const result = await connectionEncrypter.secureOutbound(options.peerId, wrappedDuplex)
  maConn.remoteAddr = maConn.remoteAddr.encapsulate(`/p2p/${result.remotePeer}`)

  options.log.trace('upgrade inbound')
  const connection = await options.upgrader.upgradeInbound(maConn, { skipProtection: true, skipEncryption: true, muxerFactory })

  // pass to handler
  options.handler?.(connection)

  return connection
}
