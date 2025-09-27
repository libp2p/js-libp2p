import { pbStream } from '@libp2p/utils'
import { pEvent } from 'p-event'
import { CustomProgressEvent } from 'progress-events'
import { SIGNALING_PROTOCOL } from '../constants.js'
import { SDPHandshakeFailedError } from '../error.js'
import { DataChannelMuxerFactory } from '../muxer.js'
import { RTCPeerConnection, RTCSessionDescription } from '../webrtc/index.js'
import { Message } from './pb/message.js'
import { splitAddr } from './transport.js'
import { readCandidatesUntilConnected } from './util.js'
import type { WebRTCDialEvents, WebRTCTransportMetrics } from './transport.js'
import type { DataChannelOptions } from '../index.js'
import type { LoggerOptions, Connection, ComponentLogger, AbortOptions } from '@libp2p/interface'
import type { ConnectionManager, TransportManager } from '@libp2p/interface-internal'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { ProgressOptions } from 'progress-events'

export interface IncomingStreamOptions extends AbortOptions {
  rtcConfiguration?: RTCConfiguration
  dataChannelOptions?: Partial<DataChannelOptions>
}

export interface ConnectOptions extends LoggerOptions, ProgressOptions<WebRTCDialEvents> {
  rtcConfiguration?: RTCConfiguration
  dataChannel?: DataChannelOptions
  multiaddr: Multiaddr
  connectionManager: ConnectionManager
  transportManager: TransportManager
  dataChannelOptions?: Partial<DataChannelOptions>
  signal?: AbortSignal
  metrics?: WebRTCTransportMetrics
  logger: ComponentLogger
}

export async function initiateConnection ({ rtcConfiguration, dataChannel, signal, metrics, multiaddr: ma, connectionManager, transportManager, log, logger, onProgress }: ConnectOptions): Promise<{ remoteAddress: Multiaddr, peerConnection: globalThis.RTCPeerConnection, muxerFactory: DataChannelMuxerFactory }> {
  const { circuitAddress, targetPeer } = splitAddr(ma)

  metrics?.dialerEvents.increment({ open: true })

  log.trace('dialing circuit address: %a', circuitAddress)

  const connections = connectionManager.getConnections(targetPeer)
  let connection: Connection

  if (connections.length === 0) {
    onProgress?.(new CustomProgressEvent('webrtc:dial-relay'))

    // use the transport manager to open a connection. Initiating a WebRTC
    // connection takes place in the context of a dial - if we use the
    // connection manager instead we can end up joining our own dial context
    connection = await transportManager.dial(circuitAddress, {
      signal,
      onProgress
    })
  } else {
    onProgress?.(new CustomProgressEvent('webrtc:reuse-relay-connection'))

    connection = connections[0]
  }

  onProgress?.(new CustomProgressEvent('webrtc:open-signaling-stream'))

  const stream = await connection.newStream(SIGNALING_PROTOCOL, {
    signal,
    runOnLimitedConnection: true
  })

  const messageStream = pbStream(stream).pb(Message)
  const peerConnection = new RTCPeerConnection(rtcConfiguration)

  // make sure C++ peer connection is garbage collected
  // https://github.com/murat-dogan/node-datachannel/issues/366#issuecomment-3228453155
  peerConnection.addEventListener('connectionstatechange', () => {
    switch (peerConnection.connectionState) {
      case 'closed':
        peerConnection.close()
        break
      default:
        break
    }
  })

  const muxerFactory = new DataChannelMuxerFactory({
    // @ts-expect-error https://github.com/murat-dogan/node-datachannel/pull/370
    peerConnection,
    dataChannelOptions: dataChannel
  })

  try {
    // we create the channel so that the RTCPeerConnection has a component for
    // which to collect candidates. The label is not relevant to connection
    // initiation but can be useful for debugging
    const channel = peerConnection.createDataChannel('init')

    // setup callback to write ICE candidates to the remote peer
    peerConnection.onicecandidate = ({ candidate }) => {
      if (peerConnection.connectionState === 'connected') {
        log.trace('ignore new ice candidate as peer connection is already connected')
        return
      }

      // a null candidate means end-of-candidates, an empty string candidate
      // means end-of-candidates for this generation, otherwise this should
      // be a valid candidate object
      // see - https://www.w3.org/TR/webrtc/#rtcpeerconnectioniceevent
      if (candidate == null || candidate?.candidate === '') {
        log.trace('initiator detected end of ICE candidates')
        return
      }

      const data = JSON.stringify(candidate?.toJSON() ?? null)

      log.trace('initiator sending ICE candidate %o', candidate)

      void messageStream.write({
        type: Message.Type.ICE_CANDIDATE,
        data
      }, {
        signal
      })
        .catch(err => {
          log.error('error sending ICE candidate - %e', err)
        })
    }
    peerConnection.onicecandidateerror = (event) => {
      log.error('initiator ICE candidate error', event)
    }

    // create an offer
    const offerSdp = await peerConnection.createOffer().catch(err => {
      log.error('could not execute createOffer - %e', err)
      throw new SDPHandshakeFailedError('Failed to set createOffer')
    })

    log.trace('initiator send SDP offer %s', offerSdp.sdp)

    onProgress?.(new CustomProgressEvent('webrtc:send-sdp-offer'))

    // write the offer to the stream
    await messageStream.write({ type: Message.Type.SDP_OFFER, data: offerSdp.sdp }, {
      signal
    })

    // set offer as local description
    await peerConnection.setLocalDescription(offerSdp).catch(err => {
      log.error('could not execute setLocalDescription - %e', err)
      throw new SDPHandshakeFailedError('Failed to set localDescription')
    })

    onProgress?.(new CustomProgressEvent('webrtc:read-sdp-answer'))

    log.trace('initiator read SDP answer')

    // read answer
    const answerMessage = await messageStream.read({
      signal
    })

    if (answerMessage.type !== Message.Type.SDP_ANSWER) {
      throw new SDPHandshakeFailedError('Remote should send an SDP answer')
    }

    log.trace('initiator received SDP answer %s', answerMessage.data)

    const answerSdp = new RTCSessionDescription({ type: 'answer', sdp: answerMessage.data })
    await peerConnection.setRemoteDescription(answerSdp).catch(err => {
      log.error('could not execute setRemoteDescription - %e', err)
      throw new SDPHandshakeFailedError('Failed to set remoteDescription')
    })

    log.trace('initiator read candidates until connected')

    onProgress?.(new CustomProgressEvent('webrtc:read-ice-candidates'))

    await readCandidatesUntilConnected(peerConnection, messageStream, {
      direction: 'initiator',
      signal,
      log,
      onProgress
    })

    log.trace('initiator connected')

    if (channel.readyState !== 'open') {
      log.trace('wait for init channel to open')
      await pEvent(channel, 'open', {
        signal
      })
    }

    log.trace('closing init channel')
    channel.close()

    // wait for init channel to close before proceeding, otherwise the channel
    // id can be reused before both sides have seen the channel close
    log.trace('waiting for init channel to close')
    await pEvent(channel, 'close', {
      signal
    })

    onProgress?.(new CustomProgressEvent('webrtc:close-signaling-stream'))

    log.trace('closing signaling channel')
    await stream.close({
      signal
    })

    log.trace('initiator connected to remote address %s', ma)

    return {
      remoteAddress: ma,
      // @ts-expect-error https://github.com/murat-dogan/node-datachannel/pull/370
      peerConnection,
      muxerFactory
    }
  } catch (err: any) {
    log.error('outgoing signaling error - %e', err)

    peerConnection.close()
    stream.abort(err)
    throw err
  } finally {
    peerConnection.onicecandidate = null
    peerConnection.onicecandidateerror = null
  }
}
