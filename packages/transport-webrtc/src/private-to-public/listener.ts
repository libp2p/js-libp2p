import { isIPv4 } from '@chainsafe/is-ip'
import { InvalidParametersError, TypedEventEmitter } from '@libp2p/interface'
import { getThinWaistAddresses } from '@libp2p/utils/get-thin-waist-addresses'
import { multiaddr, fromStringTuples } from '@multiformats/multiaddr'
import { WebRTCDirect } from '@multiformats/multiaddr-matcher'
import { Crypto } from '@peculiar/webcrypto'
import getPort from 'get-port'
import pWaitFor from 'p-wait-for'
import { CODEC_CERTHASH, CODEC_WEBRTC_DIRECT } from '../constants.js'
import { connect } from './utils/connect.js'
import { generateTransportCertificate } from './utils/generate-certificates.js'
import { createDialerRTCPeerConnection } from './utils/get-rtcpeerconnection.js'
import { stunListener } from './utils/stun-listener.js'
import { getStoredCertificate, generateAndStoreCertificate, DEFAULT_CERTIFICATE_VALIDITY_DAYS, DEFAULT_MIN_REMAINING_VALIDITY_DAYS } from './utils/certificate-store.js'
import type { Keychain } from '@libp2p/keychain'
import type { DataChannelOptions, TransportCertificate } from '../index.js'
import type { DirectRTCPeerConnection } from './utils/get-rtcpeerconnection.js'
import type { StunServer } from './utils/stun-listener.js'
import type { PeerId, ListenerEvents, Listener, Upgrader, ComponentLogger, Logger, CounterGroup, Metrics, PrivateKey } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

const crypto = new Crypto()

export interface WebRTCDirectListenerComponents {
  peerId: PeerId
  privateKey: PrivateKey
  logger: ComponentLogger
  upgrader: Upgrader
  metrics?: Metrics
  keychain?: Keychain
}

export interface WebRTCDirectListenerInit {
  upgrader: Upgrader
  certificates?: TransportCertificate[]
  maxInboundStreams?: number
  dataChannel?: DataChannelOptions
  rtcConfiguration?: RTCConfiguration | (() => RTCConfiguration | Promise<RTCConfiguration>)
  useLibjuice?: boolean
  certificate?: {
    /**
     * Number of days a certificate should be valid for
     * @default 365
     */
    validityDays?: number
    
    /**
     * Minimum number of days remaining before certificate regeneration
     * @default 30
     */
    minRemainingValidityDays?: number
    
    /**
     * Whether to store certificates in the keychain
     * @default true
     */
    persistInKeychain?: boolean
  }
}

export interface WebRTCListenerMetrics {
  listenerEvents: CounterGroup
}

interface UDPMuxServer {
  server: Promise<StunServer>
  isIPv4: boolean
  isIPv6: boolean
  port: number
  owner: WebRTCDirectListener
  peerId: PeerId
}

let UDP_MUX_LISTENERS: UDPMuxServer[] = []

export class WebRTCDirectListener extends TypedEventEmitter<ListenerEvents> implements Listener {
  private listeningMultiaddr?: Multiaddr
  private certificate?: TransportCertificate
  private stunServer?: StunServer
  private readonly connections: Map<string, DirectRTCPeerConnection>
  private readonly log: Logger
  private readonly init: WebRTCDirectListenerInit
  private readonly components: WebRTCDirectListenerComponents
  private readonly metrics?: WebRTCListenerMetrics
  private readonly shutdownController: AbortController

  constructor (components: WebRTCDirectListenerComponents, init: WebRTCDirectListenerInit) {
    super()

    this.init = init
    this.components = components
    this.connections = new Map()
    this.log = components.logger.forComponent('libp2p:webrtc-direct:listener')
    this.certificate = init.certificates?.[0]
    this.shutdownController = new AbortController()

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
    const { host, port, family } = ma.toOptions()

    let udpMuxServer: UDPMuxServer | undefined

    if (port !== 0) {
      // libjuice binds to all interfaces (IPv4/IPv6) for a given port so if we
      // want to listen on a specific port, and there's already a mux listener
      // for that port for the other family started by this node, we should
      // reuse it
      udpMuxServer = UDP_MUX_LISTENERS.find(s => s.port === port)

      // make sure the port is free for the given family
      if (udpMuxServer != null && ((udpMuxServer.isIPv4 && family === 4) || (udpMuxServer.isIPv6 && family === 6))) {
        throw new InvalidParametersError(`There is already a listener for ${host}:${port}`)
      }

      // check that we own the mux server
      if (udpMuxServer != null && !udpMuxServer.peerId.equals(this.components.peerId)) {
        throw new InvalidParametersError(`Another peer is already performing UDP mux on ${host}:${port}`)
      }
    }

    // start the mux server if we don't have one already
    if (udpMuxServer == null) {
      this.log('starting UDP mux server on %s:%p', host, port)
      udpMuxServer = this.startUDPMuxServer(host, port, family)
      UDP_MUX_LISTENERS.push(udpMuxServer)
    }

    if (family === 4) {
      udpMuxServer.isIPv4 = true
    } else if (family === 6) {
      udpMuxServer.isIPv6 = true
    }

    this.stunServer = await udpMuxServer.server
    this.listeningMultiaddr = ma
    this.safeDispatchEvent('listening')
  }

  private startUDPMuxServer (host: string, port: number, family: 4 | 6): UDPMuxServer {
    return {
      peerId: this.components.peerId,
      owner: this,
      port,
      isIPv4: family === 4,
      isIPv6: family === 6,
      server: Promise.resolve()
        .then(async (): Promise<StunServer> => {
          // ensure we have a certificate
          if (this.certificate == null) {
            // If certificates were provided in init, use the first one
            if (this.init.certificates?.length ?? 0 > 0) {
              this.log.trace('using provided TLS certificate')
              this.certificate = this.init.certificates![0]
            } else {
              this.log.trace('checking for stored TLS certificate')
              const certOptions = {
                validityDays: this.init.certificate?.validityDays ?? DEFAULT_CERTIFICATE_VALIDITY_DAYS,
                minRemainingValidityDays: this.init.certificate?.minRemainingValidityDays ?? DEFAULT_MIN_REMAINING_VALIDITY_DAYS
              }
              
              const useKeychain = this.init.certificate?.persistInKeychain !== false
              
              // Only try to use the keychain if it's available and not disabled
              if (useKeychain && this.components.keychain != null) {
                try {
                  // Try to retrieve stored certificate
                  const storedCertificate = await getStoredCertificate(
                    this.components.keychain,
                    certOptions,
                    this.log
                  )
                  
                  if (storedCertificate != null) {
                    this.log.trace('using stored TLS certificate')
                    this.certificate = storedCertificate
                  } else {
                    this.log.trace('generating new TLS certificate')
                    this.certificate = await generateAndStoreCertificate(
                      this.components.keychain,
                      certOptions,
                      this.log
                    )
                  }
                } catch (err) {
                  this.log.error('error retrieving certificate from keychain, creating new one', err)
                  this.certificate = await generateAndStoreCertificate(
                    useKeychain ? this.components.keychain : undefined,
                    certOptions,
                    this.log
                  )
                }
              } else {
                // No keychain available or disabled, create a new certificate
                this.log.trace('creating new TLS certificate (keychain disabled or unavailable)')
                this.certificate = await generateAndStoreCertificate(
                  undefined,
                  certOptions,
                  this.log
                )
              }
            }
          }
  
          if (port === 0) {
            // libjuice doesn't map 0 to a random free port so we have to do it
            // ourselves
            this.log.trace('searching for free port')
            port = await getPort()
          }
  
          return stunListener(host, port, this.log, (ufrag, remoteHost, remotePort) => {
            const signal = this.components.upgrader.createInboundAbortSignal(this.shutdownController.signal)
  
            this.incomingConnection(ufrag, remoteHost, remotePort, signal)
              .catch(err => {
                this.log.error('error processing incoming STUN request', err)
              })
              .finally(() => {
                signal.clear()
              })
          })
        })
    }
  }

  private async incomingConnection (ufrag: string, remoteHost: string, remotePort: number, signal: AbortSignal): Promise<void> {
    const key = `${remoteHost}:${remotePort}:${ufrag}`
    let peerConnection = this.connections.get(key)

    if (peerConnection != null) {
      this.log.trace('already got peer connection for %s', key)
      return
    }

    this.log('create peer connection for %s', key)

    // do not create RTCPeerConnection objects if the signal has aborted already
    signal.throwIfAborted()

    // https://github.com/libp2p/specs/blob/master/webrtc/webrtc-direct.md#browser-to-public-server
    peerConnection = await createDialerRTCPeerConnection('server', ufrag, this.init.rtcConfiguration, this.certificate)

    this.connections.set(key, peerConnection)

    peerConnection.addEventListener('connectionstatechange', () => {
      switch (peerConnection.connectionState) {
        case 'failed':
        case 'disconnected':
        case 'closed':
          this.connections.delete(key)
          break
        default:
          break
      }
    })

    try {
      await connect(peerConnection, ufrag, {
        role: 'server',
        log: this.log,
        logger: this.components.logger,
        metrics: this.components.metrics,
        events: this.metrics?.listenerEvents,
        signal,
        remoteAddr: multiaddr(`/ip${isIPv4(remoteHost) ? 4 : 6}/${remoteHost}/udp/${remotePort}`),
        dataChannel: this.init.dataChannel,
        upgrader: this.init.upgrader,
        peerId: this.components.peerId,
        privateKey: this.components.privateKey
      })
    } catch (err) {
      peerConnection.close()
      throw err
    }
  }

  getAddrs (): Multiaddr[] {
    if (this.stunServer == null) {
      return []
    }

    const address = this.stunServer.address()

    return getThinWaistAddresses(this.listeningMultiaddr, address.port).map(ma => {
      return ma.encapsulate(`/webrtc-direct/certhash/${this.certificate?.certhash}`)
    })
  }

  updateAnnounceAddrs (multiaddrs: Multiaddr[]): void {
    for (let i = 0; i < multiaddrs.length; i++) {
      let ma = multiaddrs[i]

      if (!WebRTCDirect.exactMatch(ma)) {
        continue
      }

      // add the certhash if it is missing
      const tuples = ma.stringTuples()

      for (let j = 0; j < tuples.length; j++) {
        if (tuples[j][0] !== CODEC_WEBRTC_DIRECT) {
          continue
        }

        const certhashIndex = j + 1

        if (tuples[certhashIndex] == null || tuples[certhashIndex][0] !== CODEC_CERTHASH) {
          tuples.splice(certhashIndex, 0, [CODEC_CERTHASH, this.certificate?.certhash])

          ma = fromStringTuples(tuples)
          multiaddrs[i] = ma
        }
      }
    }
  }

  async close (): Promise<void> {
    // stop our UDP mux listeners
    await Promise.all(
      UDP_MUX_LISTENERS
        .filter(listener => listener.owner === this)
        .map(async listener => {
          const server = await listener.server
          await server.close()
        })
    )

    // remove our stopped UDP mux listeners
    UDP_MUX_LISTENERS = UDP_MUX_LISTENERS.filter(listener => listener.owner !== this)

    // close existing connections
    for (const connection of this.connections.values()) {
      connection.close()
    }

    // stop any in-progress incoming dials
    this.shutdownController.abort()

    // RTCPeerConnections will be removed from the connections map when their
    // connection state changes to 'closed'/'disconnected'/'failed
    await pWaitFor(() => {
      return this.connections.size === 0
    })

    this.safeDispatchEvent('close')
  }
}
