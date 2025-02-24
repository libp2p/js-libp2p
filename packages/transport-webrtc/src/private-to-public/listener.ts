import { networkInterfaces } from 'node:os'
import { isIPv4, isIPv6 } from '@chainsafe/is-ip'
import { InvalidPeerIdError, TypedEventEmitter } from '@libp2p/interface'
import { multiaddr, protocols, fromStringTuples } from '@multiformats/multiaddr'
import { IP4, WebRTCDirect } from '@multiformats/multiaddr-matcher'
import { Crypto } from '@peculiar/webcrypto'
import getPort from 'get-port'
import pWaitFor from 'p-wait-for'
import { CODEC_CERTHASH, CODEC_WEBRTC_DIRECT } from '../constants.js'
import { connect } from './utils/connect.js'
import { generateTransportCertificate } from './utils/generate-certificates.js'
import { createDialerRTCPeerConnection } from './utils/get-rtcpeerconnection.js'
import { stunListener } from './utils/stun-listener.js'
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
}

export interface WebRTCDirectListenerInit {
  upgrader: Upgrader
  certificates?: TransportCertificate[]
  maxInboundStreams?: number
  dataChannel?: DataChannelOptions
  rtcConfiguration?: RTCConfiguration | (() => RTCConfiguration | Promise<RTCConfiguration>)
  useLibjuice?: boolean
}

export interface WebRTCListenerMetrics {
  listenerEvents: CounterGroup
}

const UDP_PROTOCOL = protocols('udp')
const IP4_PROTOCOL = protocols('ip4')
const IP6_PROTOCOL = protocols('ip6')

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
  private readonly multiaddrs: Multiaddr[]
  private certificate?: TransportCertificate
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
    this.multiaddrs = []
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
    const parts = ma.stringTuples()
    const ipVersion = IP4.matches(ma) ? 4 : 6
    const host = parts
      .filter(([code]) => code === IP4_PROTOCOL.code)
      .pop()?.[1] ?? parts
      .filter(([code]) => code === IP6_PROTOCOL.code)
      .pop()?.[1]

    if (host == null) {
      throw new Error('IP4/6 host must be specified in webrtc-direct multiaddr')
    }
    const port = parseInt(parts
      .filter(([code, value]) => code === UDP_PROTOCOL.code)
      .pop()?.[1] ?? '')

    if (isNaN(port)) {
      throw new Error('UDP port must be specified in webrtc-direct multiaddr')
    }

    // have to do this before any async work happens so starting two listeners
    // for the same port concurrently (e.g. ipv4/ipv6 both port 0) results in a
    // single mux listener. This is necessary because libjuice binds to all
    // interfaces for a given port so we we need to key on just the port number
    // not the host + the port number
    let existingServer = UDP_MUX_LISTENERS.find(s => s.port === port)

    // if the server has not been started yet, or the port is a wildcard port
    // and there is already a wildcard port for this address family, start a new
    // UDP mux server
    const wildcardPorts = port === 0 && existingServer?.port === 0
    const sameAddressFamily = (existingServer?.isIPv4 === true && isIPv4(host)) || (existingServer?.isIPv6 === true && isIPv6(host))
    let createdMuxServer = false

    if (existingServer == null || (wildcardPorts && sameAddressFamily)) {
      this.log('starting UDP mux server on %s:%p', host, port)
      existingServer = this.startUDPMuxServer(host, port)
      UDP_MUX_LISTENERS.push(existingServer)
      createdMuxServer = true
    }

    if (!existingServer.peerId.equals(this.components.peerId)) {
      // this would have to be another in-process peer so we are likely in a
      // testing environment
      throw new InvalidPeerIdError(`Another peer is already performing UDP mux on ${host}:${existingServer.port}`)
    }

    const server = await existingServer.server
    const address = server.address()

    if (!createdMuxServer) {
      this.log('reused existing UDP mux server on %s:%p', host, address.port)
    }

    getNetworkAddresses(host, address.port, ipVersion).forEach((ma) => {
      this.multiaddrs.push(multiaddr(`${ma}/webrtc-direct/certhash/${this.certificate?.certhash}`))
    })

    this.safeDispatchEvent('listening')
  }

  private startUDPMuxServer (host: string, port: number): UDPMuxServer {
    return {
      peerId: this.components.peerId,
      owner: this,
      port,
      isIPv4: isIPv4(host),
      isIPv6: isIPv6(host),
      server: Promise.resolve()
        .then(async (): Promise<StunServer> => {
          // ensure we have a certificate
          if (this.certificate == null) {
            this.log.trace('creating TLS certificate')
            const keyPair = await crypto.subtle.generateKey({
              name: 'ECDSA',
              namedCurve: 'P-256'
            }, true, ['sign', 'verify'])

            const certificate = await generateTransportCertificate(keyPair, {
              days: 365 * 10
            })

            if (this.certificate == null) {
              this.certificate = certificate
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
    return this.multiaddrs
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

function getNetworkAddresses (host: string, port: number, version: 4 | 6): string[] {
  if (host === '0.0.0.0' || host === '::') {
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
      .map(address => `/ip${version}/${address}/udp/${port}`)
  }

  return [
    `/ip${version}/${host}/udp/${port}`
  ]
}
