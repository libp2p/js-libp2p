import { noise } from '@chainsafe/libp2p-noise'
import { type CreateListenerOptions, transportSymbol, type Transport, type Listener, type ComponentLogger, type Logger, type Connection, type CounterGroup, type Metrics, type PeerId } from '@libp2p/interface'
import * as p from '@libp2p/peer-id'
import { protocols } from '@multiformats/multiaddr'
import { WebRTCDirect } from '@multiformats/multiaddr-matcher'
import * as multihashes from 'multihashes'
import { concat } from 'uint8arrays/concat'
import { fromString as uint8arrayFromString } from 'uint8arrays/from-string'
import { dataChannelError, inappropriateMultiaddr, unimplemented, invalidArgument } from '../error.js'
import { WebRTCMultiaddrConnection } from '../maconn.js'
import { DataChannelMuxerFactory } from '../muxer.js'
import { createStream } from '../stream.js'
import { isFirefox } from '../util.js'
import { RTCPeerConnection } from '../webrtc/index.js'
import * as sdp from './sdp.js'
import { genUfrag } from './util.js'
import type { WebRTCDialOptions } from './options.js'
import type { DataChannelOptions } from '../index.js'
import type { Multiaddr } from '@multiformats/multiaddr'

/**
 * The time to wait, in milliseconds, for the data channel handshake to complete
 */
const HANDSHAKE_TIMEOUT_MS = 10_000

/**
 * Created by converting the hexadecimal protocol code to an integer.
 *
 * {@link https://github.com/multiformats/multiaddr/blob/master/protocols.csv}
 */
export const WEBRTC_CODE: number = protocols('webrtc-direct').code

/**
 * Created by converting the hexadecimal protocol code to an integer.
 *
 * {@link https://github.com/multiformats/multiaddr/blob/master/protocols.csv}
 */
export const CERTHASH_CODE: number = protocols('certhash').code

/**
 * The peer for this transport
 */
export interface WebRTCDirectTransportComponents {
  peerId: PeerId
  metrics?: Metrics
  logger: ComponentLogger
}

export interface WebRTCMetrics {
  dialerEvents: CounterGroup
}

export interface WebRTCTransportDirectInit {
  dataChannel?: DataChannelOptions
}

export class WebRTCDirectTransport implements Transport {
  private readonly log: Logger
  private readonly metrics?: WebRTCMetrics
  private readonly components: WebRTCDirectTransportComponents
  private readonly init: WebRTCTransportDirectInit
  constructor (components: WebRTCDirectTransportComponents, init: WebRTCTransportDirectInit = {}) {
    this.log = components.logger.forComponent('libp2p:webrtc-direct')
    this.components = components
    this.init = init
    if (components.metrics != null) {
      this.metrics = {
        dialerEvents: components.metrics.registerCounterGroup('libp2p_webrtc-direct_dialer_events_total', {
          label: 'event',
          help: 'Total count of WebRTC-direct dial events by type'
        })
      }
    }
  }

  /**
   * Dial a given multiaddr
   */
  async dial (ma: Multiaddr, options: WebRTCDialOptions): Promise<Connection> {
    const rawConn = await this._connect(ma, options)
    this.log('dialing address: %a', ma)
    return rawConn
  }

  /**
   * Create transport listeners no supported by browsers
   */
  createListener (options: CreateListenerOptions): Listener {
    throw unimplemented('WebRTCTransport.createListener')
  }

  /**
   * Takes a list of `Multiaddr`s and returns only valid addresses for the transport
   */
  filter (multiaddrs: Multiaddr[]): Multiaddr[] {
    return multiaddrs.filter(WebRTCDirect.exactMatch)
  }

  /**
   * Implement toString() for WebRTCTransport
   */
  readonly [Symbol.toStringTag] = '@libp2p/webrtc-direct'

  /**
   * Symbol.for('@libp2p/transport')
   */
  readonly [transportSymbol] = true

  /**
   * Connect to a peer using a multiaddr
   */
  async _connect (ma: Multiaddr, options: WebRTCDialOptions): Promise<Connection> {
    const controller = new AbortController()
    const signal = controller.signal

    const remotePeerString = ma.getPeerId()
    if (remotePeerString === null) {
      throw inappropriateMultiaddr("we need to have the remote's PeerId")
    }
    const theirPeerId = p.peerIdFromString(remotePeerString)

    const remoteCerthash = sdp.decodeCerthash(sdp.certhash(ma))

    // ECDSA is preferred over RSA here. From our testing we find that P-256 elliptic
    // curve is supported by Pion, webrtc-rs, as well as Chromium (P-228 and P-384
    // was not supported in Chromium). We use the same hash function as found in the
    // multiaddr if it is supported.
    const certificate = await RTCPeerConnection.generateCertificate({
      name: 'ECDSA',
      namedCurve: 'P-256',
      hash: sdp.toSupportedHashFunction(remoteCerthash.name)
    } as any)

    const peerConnection = new RTCPeerConnection({ certificates: [certificate] })

    try {
      // create data channel for running the noise handshake. Once the data channel is opened,
      // the remote will initiate the noise handshake. This is used to confirm the identity of
      // the peer.
      const dataChannelOpenPromise = new Promise<RTCDataChannel>((resolve, reject) => {
        const handshakeDataChannel = peerConnection.createDataChannel('', { negotiated: true, id: 0 })
        const handshakeTimeout = setTimeout(() => {
          const error = `Data channel was never opened: state: ${handshakeDataChannel.readyState}`
          this.log.error(error)
          this.metrics?.dialerEvents.increment({ open_error: true })
          reject(dataChannelError('data', error))
        }, HANDSHAKE_TIMEOUT_MS)

        handshakeDataChannel.onopen = (_) => {
          clearTimeout(handshakeTimeout)
          resolve(handshakeDataChannel)
        }

        // ref: https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel/error_event
        handshakeDataChannel.onerror = (event: Event) => {
          clearTimeout(handshakeTimeout)
          const errorTarget = event.target?.toString() ?? 'not specified'
          const error = `Error opening a data channel for handshaking: ${errorTarget}`
          this.log.error(error)
          // NOTE: We use unknown error here but this could potentially be considered a reset by some standards.
          this.metrics?.dialerEvents.increment({ unknown_error: true })
          reject(dataChannelError('data', error))
        }
      })

      const ufrag = 'libp2p+webrtc+v1/' + genUfrag(32)

      // Create offer and munge sdp with ufrag == pwd. This allows the remote to
      // respond to STUN messages without performing an actual SDP exchange.
      // This is because it can infer the passwd field by reading the USERNAME
      // attribute of the STUN message.
      const offerSdp = await peerConnection.createOffer()
      const mungedOfferSdp = sdp.munge(offerSdp, ufrag)
      await peerConnection.setLocalDescription(mungedOfferSdp)

      // construct answer sdp from multiaddr and ufrag
      const answerSdp = sdp.fromMultiAddr(ma, ufrag)
      await peerConnection.setRemoteDescription(answerSdp)

      // wait for peerconnection.onopen to fire, or for the datachannel to open
      const handshakeDataChannel = await dataChannelOpenPromise

      const myPeerId = this.components.peerId

      // Do noise handshake.
      // Set the Noise Prologue to libp2p-webrtc-noise:<FINGERPRINTS> before starting the actual Noise handshake.
      // <FINGERPRINTS> is the concatenation of the of the two TLS fingerprints of A and B in their multihash byte representation, sorted in ascending order.
      const fingerprintsPrologue = this.generateNoisePrologue(peerConnection, remoteCerthash.code, ma)

      // Since we use the default crypto interface and do not use a static key or early data,
      // we pass in undefined for these parameters.
      const connectionEncrypter = noise({ prologueBytes: fingerprintsPrologue })(this.components)

      const wrappedChannel = createStream({
        channel: handshakeDataChannel,
        direction: 'inbound',
        logger: this.components.logger,
        ...(this.init.dataChannel ?? {})
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
      const maConn = new WebRTCMultiaddrConnection(this.components, {
        peerConnection,
        remoteAddr: ma,
        timeline: {
          open: Date.now()
        },
        metrics: this.metrics?.dialerEvents
      })

      const eventListeningName = isFirefox ? 'iceconnectionstatechange' : 'connectionstatechange'

      peerConnection.addEventListener(eventListeningName, () => {
        switch (peerConnection.connectionState) {
          case 'failed':
          case 'disconnected':
          case 'closed':
            maConn.close().catch((err) => {
              this.log.error('error closing connection', err)
            }).finally(() => {
              // Remove the event listener once the connection is closed
              controller.abort()
            })
            break
          default:
            break
        }
      }, { signal })

      // Track opened peer connection
      this.metrics?.dialerEvents.increment({ peer_connection: true })

      const muxerFactory = new DataChannelMuxerFactory(this.components, {
        peerConnection,
        metrics: this.metrics?.dialerEvents,
        dataChannelOptions: this.init.dataChannel
      })

      // For outbound connections, the remote is expected to start the noise handshake.
      // Therefore, we need to secure an inbound noise connection from the remote.
      await connectionEncrypter.secureInbound(myPeerId, wrappedDuplex, theirPeerId)

      return await options.upgrader.upgradeOutbound(maConn, { skipProtection: true, skipEncryption: true, muxerFactory })
    } catch (err) {
      peerConnection.close()
      throw err
    }
  }

  /**
   * Generate a noise prologue from the peer connection's certificate.
   * noise prologue = bytes('libp2p-webrtc-noise:') + noise-responder fingerprint + noise-initiator fingerprint
   */
  private generateNoisePrologue (pc: RTCPeerConnection, hashCode: multihashes.HashCode, ma: Multiaddr): Uint8Array {
    if (pc.getConfiguration().certificates?.length === 0) {
      throw invalidArgument('no local certificate')
    }

    const localFingerprint = sdp.getLocalFingerprint(pc, {
      log: this.log
    })
    if (localFingerprint == null) {
      throw invalidArgument('no local fingerprint found')
    }

    const localFpString = localFingerprint.trim().toLowerCase().replaceAll(':', '')
    const localFpArray = uint8arrayFromString(localFpString, 'hex')
    const local = multihashes.encode(localFpArray, hashCode)
    const remote: Uint8Array = sdp.mbdecoder.decode(sdp.certhash(ma))
    const prefix = uint8arrayFromString('libp2p-webrtc-noise:')

    return concat([prefix, local, remote])
  }
}
