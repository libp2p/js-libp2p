import { CodeError } from '@libp2p/interface'
import { peerIdFromString } from '@libp2p/peer-id'
import { pbStream } from 'it-protobuf-stream'
import { type RTCPeerConnection, RTCSessionDescription } from '../webrtc/index.js'
import { Message } from './pb/message.js'
import { SIGNALING_PROTO_ID, splitAddr, type WebRTCTransportMetrics } from './transport.js'
import { readCandidatesUntilConnected } from './util.js'
import type { DataChannelOptions } from '../index.js'
import type { LoggerOptions, Connection } from '@libp2p/interface'
import type { ConnectionManager, IncomingStreamData, TransportManager } from '@libp2p/interface-internal'
import type { Multiaddr } from '@multiformats/multiaddr'

export interface IncomingStreamOpts extends IncomingStreamData {
  rtcConfiguration?: RTCConfiguration
  dataChannelOptions?: Partial<DataChannelOptions>
  signal: AbortSignal
}

export interface ConnectOptions extends LoggerOptions {
  peerConnection: RTCPeerConnection
  multiaddr: Multiaddr
  connectionManager: ConnectionManager
  transportManager: TransportManager
  dataChannelOptions?: Partial<DataChannelOptions>
  signal?: AbortSignal
  metrics?: WebRTCTransportMetrics
}

export async function initiateConnection ({ peerConnection, signal, metrics, multiaddr: ma, connectionManager, transportManager, log }: ConnectOptions): Promise<{ remoteAddress: Multiaddr }> {
  const { baseAddr } = splitAddr(ma)

  metrics?.dialerEvents.increment({ open: true })

  log.trace('dialing base address: %a', baseAddr)

  const relayPeer = baseAddr.getPeerId()

  if (relayPeer == null) {
    throw new CodeError('Relay peer was missing', 'ERR_INVALID_ADDRESS')
  }

  const connections = connectionManager.getConnections(peerIdFromString(relayPeer))
  let connection: Connection
  let shouldCloseConnection = false

  if (connections.length === 0) {
    // use the transport manager to open a connection. Initiating a WebRTC
    // connection takes place in the context of a dial - if we use the
    // connection manager instead we can end up joining our own dial context
    connection = await transportManager.dial(baseAddr, {
      signal
    })
    // this connection is unmanaged by the connection manager so we should
    // close it when we are done
    shouldCloseConnection = true
  } else {
    connection = connections[0]
  }

  try {
    const stream = await connection.newStream(SIGNALING_PROTO_ID, {
      signal,
      runOnTransientConnection: true
    })

    const messageStream = pbStream(stream).pb(Message)

    try {
      // we create the channel so that the RTCPeerConnection has a component for
      // which to collect candidates. The label is not relevant to connection
      // initiation but can be useful for debugging
      const channel = peerConnection.createDataChannel('init')

      // setup callback to write ICE candidates to the remote peer
      peerConnection.onicecandidate = ({ candidate }) => {
        // a null candidate means end-of-candidates, an empty string candidate
        // means end-of-candidates for this generation, otherwise this should
        // be a valid candidate object
        // see - https://www.w3.org/TR/webrtc/#rtcpeerconnectioniceevent
        const data = JSON.stringify(candidate?.toJSON() ?? null)

        log.trace('initiator sending ICE candidate %s', data)

        void messageStream.write({
          type: Message.Type.ICE_CANDIDATE,
          data
        }, {
          signal
        })
          .catch(err => {
            log.error('error sending ICE candidate', err)
          })
      }
      peerConnection.onicecandidateerror = (event) => {
        log.error('initiator ICE candidate error', event)
      }

      // create an offer
      const offerSdp = await peerConnection.createOffer().catch(err => {
        log.error('could not execute createOffer', err)
        throw new CodeError('Failed to set createOffer', 'ERR_SDP_HANDSHAKE_FAILED')
      })

      log.trace('initiator send SDP offer %s', offerSdp.sdp)

      // write the offer to the stream
      await messageStream.write({ type: Message.Type.SDP_OFFER, data: offerSdp.sdp }, {
        signal
      })

      // set offer as local description
      await peerConnection.setLocalDescription(offerSdp).catch(err => {
        log.error('could not execute setLocalDescription', err)
        throw new CodeError('Failed to set localDescription', 'ERR_SDP_HANDSHAKE_FAILED')
      })

      // read answer
      const answerMessage = await messageStream.read({
        signal
      })

      if (answerMessage.type !== Message.Type.SDP_ANSWER) {
        throw new CodeError('Remote should send an SDP answer', 'ERR_SDP_HANDSHAKE_FAILED')
      }

      log.trace('initiator receive SDP answer %s', answerMessage.data)

      const answerSdp = new RTCSessionDescription({ type: 'answer', sdp: answerMessage.data })
      await peerConnection.setRemoteDescription(answerSdp).catch(err => {
        log.error('could not execute setRemoteDescription', err)
        throw new CodeError('Failed to set remoteDescription', 'ERR_SDP_HANDSHAKE_FAILED')
      })

      log.trace('initiator read candidates until connected')

      await readCandidatesUntilConnected(peerConnection, messageStream, {
        direction: 'initiator',
        signal,
        log
      })

      log.trace('initiator connected, closing init channel')
      channel.close()

      log.trace('initiator closing signalling stream')
      await messageStream.unwrap().unwrap().close({
        signal
      })

      log.trace('initiator connected to remote address %s', ma)

      return {
        remoteAddress: ma
      }
    } catch (err: any) {
      peerConnection.close()
      stream.abort(err)
      throw err
    } finally {
      peerConnection.onicecandidate = null
      peerConnection.onicecandidateerror = null
    }
  } finally {
    // if we had to open a connection to perform the SDP handshake
    // close it because it's not tracked by the connection manager
    if (shouldCloseConnection) {
      try {
        await connection.close({
          signal
        })
      } catch (err: any) {
        connection.abort(err)
      }
    }
  }
}
