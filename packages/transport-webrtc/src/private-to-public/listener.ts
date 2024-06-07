import { createSocket } from 'node:dgram'
import { networkInterfaces } from 'node:os'
import { isIPv4, isIPv6 } from '@chainsafe/is-ip'
import { noise } from '@chainsafe/libp2p-noise'
import { TypedEventEmitter } from '@libp2p/interface'
import { multiaddr, protocols } from '@multiformats/multiaddr'
import { IP4 } from '@multiformats/multiaddr-matcher'
import { sha256 } from 'multiformats/hashes/sha2'
import { pEvent } from 'p-event'
// @ts-expect-error no types
import stun from 'stun'
import { dataChannelError } from '../error.js'
import { WebRTCMultiaddrConnection } from '../maconn.js'
import { DataChannelMuxerFactory } from '../muxer.js'
import { createStream } from '../stream.js'
import { isFirefox } from '../util.js'
import { RTCPeerConnection } from '../webrtc/index.js'
import { UFRAG_PREFIX } from './constants.js'
import { generateTransportCertificate, type TransportCertificate } from './utils/generate-certificates.js'
import { generateNoisePrologue } from './utils/generate-noise-prologue.js'
import * as sdp from './utils/sdp.js'
import type { DataChannelOptions } from '../index.js'
import type { PeerId, ListenerEvents, Listener, Connection, Upgrader, ComponentLogger, Logger, CounterGroup, Metrics } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { Socket, RemoteInfo } from 'node:dgram'
import type { AddressInfo } from 'node:net'

/**
 * The time to wait, in milliseconds, for the data channel handshake to complete
 */
const HANDSHAKE_TIMEOUT_MS = 10_000

export interface WebRTCDirectListenerComponents {
  peerId: PeerId
  logger: ComponentLogger
  metrics?: Metrics
}

export interface WebRTCDirectListenerInit {
  shutdownController: AbortController
  handler?(conn: Connection): void
  upgrader: Upgrader
  certificates?: TransportCertificate[]
  maxInboundStreams?: number
  dataChannel?: DataChannelOptions
}

export interface WebRTCListenerMetrics {
  listenerEvents: CounterGroup
}

const UDP_PROTOCOL = protocols('udp')
const IP4_PROTOCOL = protocols('ip4')
const IP6_PROTOCOL = protocols('ip6')

export class WebRTCDirectListener extends TypedEventEmitter<ListenerEvents> implements Listener {
  private socket?: Socket
  private readonly shutdownController: AbortController
  private readonly multiaddrs: Multiaddr[]
  private certificate?: TransportCertificate
  private readonly connections: Map<string, RTCPeerConnection>
  private readonly log: Logger
  private readonly init: WebRTCDirectListenerInit
  private readonly components: WebRTCDirectListenerComponents
  private readonly metrics?: WebRTCListenerMetrics

  constructor (components: WebRTCDirectListenerComponents, init: WebRTCDirectListenerInit) {
    super()

    this.init = init
    this.components = components
    this.shutdownController = init.shutdownController
    this.multiaddrs = []
    this.connections = new Map()
    this.log = components.logger.forComponent('libp2p:webrtc-direct')

    if (components.metrics != null) {
      this.metrics = {
        listenerEvents: components.metrics.registerCounterGroup('libp2p_webrtc-direct_listener_events_total', {
          label: 'event',
          help: 'Total count of WebRTC-direct listen events by type'
        })
      }
    }
  }

  async listen (ma: Multiaddr): Promise<void> {
    const parts = ma.stringTuples()

    const ipVersion = IP4.matches(ma) ? 4 : 6

    const host = parts
      .filter(([code]) => code === IP4_PROTOCOL.code)
      .pop()?.[1] ?? parts
      .filter(([code]) => code === IP6_PROTOCOL.code)
      .pop()?.[1]

    if (host == null) {
      throw new Error('IP4/6 host must be specified in webrtc-direct mulitaddr')
    }

    const port = parseInt(parts
      .filter(([code, value]) => code === UDP_PROTOCOL.code)
      .pop()?.[1] ?? '')

    if (isNaN(port)) {
      throw new Error('UDP port must be specified in webrtc-direct mulitaddr')
    }

    this.socket = createSocket({
      type: `udp${ipVersion}`,
      reuseAddr: true
    })

    try {
      this.socket.bind(port, host)
      await pEvent(this.socket, 'listening')
    } catch (err) {
      this.socket.close()
      throw err
    }

    let certificate = this.certificate

    if (certificate == null) {
      const keyPair = await crypto.subtle.generateKey({
        name: 'ECDSA',
        namedCurve: 'P-256'
      }, true, ['sign', 'verify'])

      certificate = this.certificate = await generateTransportCertificate(keyPair, {
        days: 365
      })
    }

    const address = this.socket.address()

    getNetworkAddresses(address, ipVersion).forEach((ma) => {
      this.multiaddrs.push(multiaddr(`${ma}/webrtc-direct/certhash/${certificate.certhash}`))
    })

    this.socket.on('message', (msg, rinfo) => {
      try {
        const response = stun.decode(msg)

        // TODO: this needs to be rate limited keyed by the remote host to
        // prevent a DOS attack
        this.incomingConnection(response, rinfo, certificate).catch(err => {
          this.log.error('could not process incoming STUN data', err)
        })
      } catch (err) {
        this.log.error('could not process incoming STUN data', err)
      }
    })
  }

  private async incomingConnection (stunMessage: any, rinfo: RemoteInfo, certificate: TransportCertificate): Promise<void> {
    const usernameAttribute = stunMessage.getAttribute(stun.constants.STUN_ATTR_USERNAME)
    const username: string | undefined = usernameAttribute?.value?.toString()

    if (username == null || !username.startsWith(UFRAG_PREFIX)) {
      this.log.trace('ufrag missing from incoming STUN message from %s:%s', rinfo.address, rinfo.port)
      return
    }

    const ufrag = username.split(':')[0]
    const key = `${rinfo.address}:${rinfo.port}:${ufrag}`
    let peerConnection = this.connections.get(key)

    if (peerConnection != null) {
      return
    }

    peerConnection = new RTCPeerConnection({
      // @ts-expect-error missing argument
      iceUfrag: ufrag,
      icePwd: ufrag,
      disableFingerprintVerification: true,
      certificatePemFile: certificate.pem,
      keyPemFile: certificate.privateKey,
      maxMessageSize: 16384
    })

    this.connections.set(key, peerConnection)

    const eventListeningName = isFirefox ? 'iceconnectionstatechange' : 'connectionstatechange'
    peerConnection.addEventListener(eventListeningName, () => {
      switch (peerConnection?.connectionState) {
        case 'failed':
        case 'disconnected':
        case 'closed':
          this.connections.delete(key)
          break
        default:
          break
      }
    })

    const controller = new AbortController()
    const signal = controller.signal

    try {
      // create data channel for running the noise handshake. Once the data
      // channel is opened, we will initiate the noise handshake. This is used
      // to confirm the identity of the peer.
      const dataChannelOpenPromise = new Promise<RTCDataChannel>((resolve, reject) => {
        const handshakeDataChannel = peerConnection.createDataChannel('', { negotiated: true, id: 0 })
        const handshakeTimeout = setTimeout(() => {
          const error = `Data channel was never opened: state: ${handshakeDataChannel.readyState}`
          this.log.error(error)
          this.metrics?.listenerEvents.increment({ open_error: true })
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
          // NOTE: We use unknown error here but this could potentially be
          // considered a reset by some standards.
          this.metrics?.listenerEvents.increment({ unknown_error: true })
          reject(dataChannelError('data', error))
        }
      })

      // Create offer and munge sdp with ufrag == pwd. This allows the remote to
      // respond to STUN messages without performing an actual SDP exchange.
      // This is because it can infer the passwd field by reading the USERNAME
      // attribute of the STUN message.
      // uses dummy certhash
      let remoteAddr = multiaddr(`/${rinfo.family === 'IPv4' ? 'ip4' : 'ip6'}/${rinfo.address}/udp/${rinfo.port}`)
      const offerSdp = sdp.clientOfferFromMultiaddr(remoteAddr, ufrag)
      await peerConnection.setRemoteDescription(offerSdp)

      const answerSdp = await peerConnection.createAnswer()
      const mungedAnswerSdp = sdp.munge(answerSdp, ufrag)
      await peerConnection.setLocalDescription(mungedAnswerSdp)

      // wait for peerconnection.onopen to fire, or for the datachannel to open
      const handshakeDataChannel = await dataChannelOpenPromise

      // now that the connection has been opened, add the remote's certhash to
      // it's multiaddr so we can complete the noise handshake
      const remoteFingerprint = sdp.getFingerprintFromSdp(peerConnection.currentRemoteDescription?.sdp ?? '') ?? ''
      remoteAddr = remoteAddr.encapsulate(sdp.fingerprint2Ma(remoteFingerprint))

      // Do noise handshake.
      // Set the Noise Prologue to libp2p-webrtc-noise:<FINGERPRINTS> before
      // starting the actual Noise handshake.
      // <FINGERPRINTS> is the concatenation of the of the two TLS fingerprints
      // of A (responder) and B (initiator) in their byte representation.
      const fingerprintsPrologue = generateNoisePrologue(peerConnection, sha256.code, remoteAddr, this.log, 'initiator')

      // Since we use the default crypto interface and do not use a static key
      // or early data, we pass in undefined for these parameters.
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
        remoteAddr,
        timeline: {
          open: Date.now()
        },
        metrics: this.metrics?.listenerEvents
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
      this.metrics?.listenerEvents.increment({ peer_connection: true })

      const muxerFactory = new DataChannelMuxerFactory(this.components, {
        peerConnection,
        metrics: this.metrics?.listenerEvents,
        dataChannelOptions: this.init.dataChannel
      })

      // For inbound connections, we are expected to start the noise handshake.
      // Therefore, we need to secure an outbound noise connection from the remote.
      const result = await connectionEncrypter.secureOutbound(this.components.peerId, wrappedDuplex)
      maConn.remoteAddr = maConn.remoteAddr.encapsulate(`/p2p/${result.remotePeer}`)

      await this.init.upgrader.upgradeInbound(maConn, { skipProtection: true, skipEncryption: true, muxerFactory })
    } catch (err) {
      peerConnection.close()
      throw err
    }
  }

  getAddrs (): Multiaddr[] {
    return this.multiaddrs
  }

  async close (): Promise<void> {
    this.shutdownController.abort()
    this.safeDispatchEvent('close', {})

    await new Promise<void>((resolve) => {
      if (this.socket == null) {
        resolve()
        return
      }

      this.socket.close(() => {
        resolve()
      })
    })
  }
}

function getNetworkAddresses (host: AddressInfo, version: 4 | 6): string[] {
  if (host.address === '0.0.0.0' || host.address === '::1') {
    // return all ip4 interfaces
    return Object.entries(networkInterfaces())
      .flatMap(([_, addresses]) => addresses)
      .map(address => address?.address)
      .filter(address => {
        if (address == null) {
          return false
        }

        if (version === 4) {
          return isIPv4(address)
        }

        if (version === 6) {
          return isIPv6(address)
        }

        return false
      })
      .map(address => `/ip${version}/${address}/udp/${host.port}`)
  }

  return [
    `/ip${version}/${host.address}/udp/${host.port}`
  ]
}
