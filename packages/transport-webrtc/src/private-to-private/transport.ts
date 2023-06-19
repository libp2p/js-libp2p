import { type CreateListenerOptions, type DialOptions, type Listener, symbol, type Transport, type Upgrader, type TransportManager } from '@libp2p/interface-transport'
import { CodeError } from '@libp2p/interfaces/errors'
import { logger } from '@libp2p/logger'
import { peerIdFromString } from '@libp2p/peer-id'
import { multiaddr, type Multiaddr, protocols } from '@multiformats/multiaddr'
import { codes } from '../error.js'
import { WebRTCMultiaddrConnection } from '../maconn.js'
import { initiateConnection, handleIncomingStream } from './handler.js'
import { WebRTCPeerListener } from './listener.js'
import type { DataChannelOpts } from '../stream.js'
import type { Connection } from '@libp2p/interface-connection'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { IncomingStreamData, Registrar } from '@libp2p/interface-registrar'
import type { Startable } from '@libp2p/interfaces/startable'

const log = logger('libp2p:webrtc:peer')

const WEBRTC_TRANSPORT = '/webrtc'
const CIRCUIT_RELAY_TRANSPORT = '/p2p-circuit'
const SIGNALING_PROTO_ID = '/webrtc-signaling/0.0.1'
const WEBRTC_CODE = protocols('webrtc').code

export interface WebRTCTransportInit {
  rtcConfiguration?: RTCConfiguration
  dataChannel?: Partial<DataChannelOpts>
}

export interface WebRTCTransportComponents {
  peerId: PeerId
  registrar: Registrar
  upgrader: Upgrader
  transportManager: TransportManager
}

export class WebRTCTransport implements Transport, Startable {
  private _started = false

  constructor (
    private readonly components: WebRTCTransportComponents,
    private readonly init: WebRTCTransportInit = {}
  ) {
  }

  isStarted (): boolean {
    return this._started
  }

  async start (): Promise<void> {
    await this.components.registrar.handle(SIGNALING_PROTO_ID, (data: IncomingStreamData) => {
      this._onProtocol(data).catch(err => { log.error('failed to handle incoming connect from %p', data.connection.remotePeer, err) })
    })
    this._started = true
  }

  async stop (): Promise<void> {
    await this.components.registrar.unhandle(SIGNALING_PROTO_ID)
    this._started = false
  }

  createListener (options: CreateListenerOptions): Listener {
    return new WebRTCPeerListener(this.components)
  }

  readonly [Symbol.toStringTag] = '@libp2p/webrtc'

  readonly [symbol] = true

  filter (multiaddrs: Multiaddr[]): Multiaddr[] {
    return multiaddrs.filter((ma) => {
      const codes = ma.protoCodes()
      return codes.includes(WEBRTC_CODE)
    })
  }

  /*
   * dial connects to a remote via the circuit relay or any other protocol
   * and proceeds to upgrade to a webrtc connection.
   * multiaddr of the form: <multiaddr>/webrtc/p2p/<destination-peer>
   * For a circuit relay, this will be of the form
   * <relay address>/p2p/<relay-peer>/p2p-circuit/webrtc/p2p/<destination-peer>
  */
  async dial (ma: Multiaddr, options: DialOptions): Promise<Connection> {
    log.trace('dialing address: ', ma)
    const { baseAddr, peerId } = splitAddr(ma)

    if (options.signal == null) {
      const controller = new AbortController()
      options.signal = controller.signal
    }

    const connection = await this.components.transportManager.dial(baseAddr, options)
    const signalingStream = await connection.newStream([SIGNALING_PROTO_ID], options)

    try {
      const { pc, muxerFactory, remoteAddress } = await initiateConnection({
        stream: signalingStream,
        rtcConfiguration: this.init.rtcConfiguration,
        dataChannelOptions: this.init.dataChannel,
        signal: options.signal
      })

      const result = await options.upgrader.upgradeOutbound(
        new WebRTCMultiaddrConnection({
          peerConnection: pc,
          timeline: { open: Date.now() },
          remoteAddr: multiaddr(remoteAddress).encapsulate(`/p2p/${peerId.toString()}`)
        }),
        {
          skipProtection: true,
          skipEncryption: true,
          muxerFactory
        }
      )

      // close the stream if SDP has been exchanged successfully
      signalingStream.close()
      return result
    } catch (err) {
      // reset the stream in case of any error
      signalingStream.reset()
      throw err
    } finally {
      // Close the signaling connection
      await connection.close()
    }
  }

  async _onProtocol ({ connection, stream }: IncomingStreamData): Promise<void> {
    try {
      const { pc, muxerFactory, remoteAddress } = await handleIncomingStream({
        rtcConfiguration: this.init.rtcConfiguration,
        connection,
        stream,
        dataChannelOptions: this.init.dataChannel
      })

      await this.components.upgrader.upgradeInbound(new WebRTCMultiaddrConnection({
        peerConnection: pc,
        timeline: { open: (new Date()).getTime() },
        remoteAddr: multiaddr(remoteAddress).encapsulate(`/p2p/${connection.remotePeer.toString()}`)
      }), {
        skipEncryption: true,
        skipProtection: true,
        muxerFactory
      })
    } catch (err) {
      stream.reset()
      throw err
    } finally {
      // Close the signaling connection
      await connection.close()
    }
  }
}

export function splitAddr (ma: Multiaddr): { baseAddr: Multiaddr, peerId: PeerId } {
  const addrs = ma.toString().split(WEBRTC_TRANSPORT + '/')
  if (addrs.length !== 2) {
    throw new CodeError('webrtc protocol was not present in multiaddr', codes.ERR_INVALID_MULTIADDR)
  }

  if (!addrs[0].includes(CIRCUIT_RELAY_TRANSPORT)) {
    throw new CodeError('p2p-circuit protocol was not present in multiaddr', codes.ERR_INVALID_MULTIADDR)
  }

  // look for remote peerId
  let remoteAddr = multiaddr(addrs[0])
  const destination = multiaddr('/' + addrs[1])

  const destinationIdString = destination.getPeerId()
  if (destinationIdString == null) {
    throw new CodeError('destination peer id was missing', codes.ERR_INVALID_MULTIADDR)
  }

  const lastProtoInRemote = remoteAddr.protos().pop()
  if (lastProtoInRemote === undefined) {
    throw new CodeError('invalid multiaddr', codes.ERR_INVALID_MULTIADDR)
  }
  if (lastProtoInRemote.name !== 'p2p') {
    remoteAddr = remoteAddr.encapsulate(`/p2p/${destinationIdString}`)
  }

  return { baseAddr: remoteAddr, peerId: peerIdFromString(destinationIdString) }
}
