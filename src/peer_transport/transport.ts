import type { Connection } from '@libp2p/interface-connection'
import { CreateListenerOptions, DialOptions, Listener, symbol, Transport } from '@libp2p/interface-transport'
import type { TransportManager, Upgrader } from '@libp2p/interface-transport'
import { multiaddr, Multiaddr, protocols } from '@multiformats/multiaddr'
import type { IncomingStreamData, Registrar } from '@libp2p/interface-registrar'
import type { PeerId } from '@libp2p/interface-peer-id'
import { peerIdFromString } from '@libp2p/peer-id'
import { WebRTCMultiaddrConnection } from '../maconn.js'
import type { Startable } from '@libp2p/interfaces/startable'
import { WebRTCPeerListener } from './listener.js'
import type { PeerStore } from '@libp2p/interface-peer-store'
import { logger } from '@libp2p/logger'
import { initiateConnection, handleIncomingStream } from './handler.js'
import { CodeError } from '@libp2p/interfaces/errors'
import { codes } from '../error.js'

const log = logger('libp2p:webrtc:peer')

export const TRANSPORT = '/webrtc'
export const SIGNALING_PROTO_ID = '/webrtc-signaling/0.0.1'
export const CODE = protocols('webrtc').code

export interface WebRTCTransportInit {
  rtcConfiguration?: RTCConfiguration
}

export interface WebRTCTransportComponents {
  peerId: PeerId
  registrar: Registrar
  upgrader: Upgrader
  transportManager: TransportManager
  peerStore: PeerStore
}

export class WebRTCTransport implements Transport, Startable {
  private _started = false

  constructor (
    private readonly components: WebRTCTransportComponents,
    private readonly init: WebRTCTransportInit
  ) {
  }

  isStarted (): boolean {
    return this._started
  }

  async start (): Promise<void> {
    await this.components.registrar.handle(SIGNALING_PROTO_ID, (data) => {
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

  get [Symbol.toStringTag] (): string {
    return '@libp2p/webrtc'
  }

  get [symbol] (): true {
    return true
  }

  filter (multiaddrs: Multiaddr[]): Multiaddr[] {
    return multiaddrs.filter((ma) => {
      const codes = ma.protoCodes()
      return codes.includes(CODE)
    })
  }

  private splitAddr (ma: Multiaddr): { baseAddr: Multiaddr, peerId: PeerId } {
    const addrs = ma.toString().split(`${TRANSPORT}/`)
    if (addrs.length !== 2) {
      throw new CodeError('invalid multiaddr', codes.ERR_INVALID_MULTIADDR)
    }
    // look for remote peerId
    let remoteAddr = multiaddr(addrs[0])
    const destination = multiaddr('/' + addrs[1])

    const destinationIdString = destination.getPeerId()
    if (destinationIdString == null) {
      throw new CodeError('bad destination', codes.ERR_INVALID_MULTIADDR)
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

  /*
   * dial connects to a remote via the circuit relay or any other protocol
   * and proceeds to upgrade to a webrtc connection.
   * multiaddr of the form: <multiaddr>/webrtc/p2p/<destination-peer>
   * For a circuit relay, this will be of the form
   * <relay address>/p2p/<relay-peer>/p2p-circuit/webrtc/p2p/<destination-peer>
  */
  async dial (ma: Multiaddr, options: DialOptions): Promise<Connection> {
    log.trace('dialing address: ', ma)
    const { baseAddr, peerId } = this.splitAddr(ma)

    if (options.signal == null) {
      const controller = new AbortController()
      options.signal = controller.signal
    }

    const connection = await this.components.transportManager.dial(baseAddr)

    const rawStream = await connection.newStream([SIGNALING_PROTO_ID], options)

    try {
      const [pc, muxerFactory] = await initiateConnection({
        stream: rawStream,
        rtcConfiguration: this.init.rtcConfiguration,
        signal: options.signal
      })
      const webrtcMultiaddr = baseAddr.encapsulate(`${TRANSPORT}/p2p/${peerId.toString()}`)
      const result = await options.upgrader.upgradeOutbound(
        new WebRTCMultiaddrConnection({
          peerConnection: pc,
          timeline: { open: (new Date()).getTime() },
          remoteAddr: webrtcMultiaddr
        }),
        {
          skipProtection: true,
          skipEncryption: true,
          muxerFactory
        }
      )

      // close the stream if SDP has been exchanged successfully
      rawStream.close()
      return result
    } catch (err) {
      // reset the stream in case of any error
      rawStream.reset()
      throw err
    }
  }

  async _onProtocol ({ connection, stream }: IncomingStreamData): Promise<void> {
    try {
      const [pc, muxerFactory] = await handleIncomingStream({
        rtcConfiguration: this.init.rtcConfiguration,
        connection,
        stream
      })
      const remotePeerId = connection.remoteAddr.getPeerId()
      const webrtcMultiaddr = connection.remoteAddr.encapsulate(`${TRANSPORT}/p2p/${remotePeerId}`)
      await this.components.upgrader.upgradeInbound(new WebRTCMultiaddrConnection({
        peerConnection: pc,
        timeline: { open: (new Date()).getTime() },
        remoteAddr: webrtcMultiaddr
      }), {
        skipEncryption: true,
        skipProtection: true,
        muxerFactory
      })
    } catch (err) {
      stream.reset()
      throw err
    }
  }
}
