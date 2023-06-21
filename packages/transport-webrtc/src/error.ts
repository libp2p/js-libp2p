import { CodeError } from '@libp2p/interfaces/errors'
import type { Direction } from '@libp2p/interface-connection'

export enum codes {
  ERR_ALREADY_ABORTED = 'ERR_ALREADY_ABORTED',
  ERR_DATA_CHANNEL = 'ERR_DATA_CHANNEL',
  ERR_CONNECTION_CLOSED = 'ERR_CONNECTION_CLOSED',
  ERR_HASH_NOT_SUPPORTED = 'ERR_HASH_NOT_SUPPORTED',
  ERR_INVALID_MULTIADDR = 'ERR_INVALID_MULTIADDR',
  ERR_INVALID_FINGERPRINT = 'ERR_INVALID_FINGERPRINT',
  ERR_INVALID_PARAMETERS = 'ERR_INVALID_PARAMETERS',
  ERR_NOT_IMPLEMENTED = 'ERR_NOT_IMPLEMENTED',
  ERR_TOO_MANY_INBOUND_PROTOCOL_STREAMS = 'ERR_TOO_MANY_INBOUND_PROTOCOL_STREAMS',
  ERR_TOO_MANY_OUTBOUND_PROTOCOL_STREAMS = 'ERR_TOO_MANY_OUTBOUND_PROTOCOL_STREAMS',
}

export class WebRTCTransportError extends CodeError {
  constructor (msg: string, code?: string) {
    super(`WebRTC transport error: ${msg}`, code ?? '')
    this.name = 'WebRTCTransportError'
  }
}

export class ConnectionClosedError extends WebRTCTransportError {
  constructor (state: RTCPeerConnectionState, msg: string) {
    super(`peerconnection moved to state: ${state}: ${msg}`, codes.ERR_CONNECTION_CLOSED)
    this.name = 'WebRTC/ConnectionClosed'
  }
}

export function connectionClosedError (state: RTCPeerConnectionState, msg: string): ConnectionClosedError {
  return new ConnectionClosedError(state, msg)
}

export class DataChannelError extends WebRTCTransportError {
  constructor (streamLabel: string, msg: string) {
    super(`[stream: ${streamLabel}] data channel error: ${msg}`, codes.ERR_DATA_CHANNEL)
    this.name = 'WebRTC/DataChannelError'
  }
}

export function dataChannelError (streamLabel: string, msg: string): DataChannelError {
  return new DataChannelError(streamLabel, msg)
}

export class InappropriateMultiaddrError extends WebRTCTransportError {
  constructor (msg: string) {
    super(`There was a problem with the Multiaddr which was passed in: ${msg}`, codes.ERR_INVALID_MULTIADDR)
    this.name = 'WebRTC/InappropriateMultiaddrError'
  }
}

export function inappropriateMultiaddr (msg: string): InappropriateMultiaddrError {
  return new InappropriateMultiaddrError(msg)
}

export class InvalidArgumentError extends WebRTCTransportError {
  constructor (msg: string) {
    super(`There was a problem with a provided argument: ${msg}`, codes.ERR_INVALID_PARAMETERS)
    this.name = 'WebRTC/InvalidArgumentError'
  }
}

export function invalidArgument (msg: string): InvalidArgumentError {
  return new InvalidArgumentError(msg)
}

export class InvalidFingerprintError extends WebRTCTransportError {
  constructor (fingerprint: string, source: string) {
    super(`Invalid fingerprint "${fingerprint}" within ${source}`, codes.ERR_INVALID_FINGERPRINT)
    this.name = 'WebRTC/InvalidFingerprintError'
  }
}

export function invalidFingerprint (fingerprint: string, source: string): InvalidFingerprintError {
  return new InvalidFingerprintError(fingerprint, source)
}

export class OperationAbortedError extends WebRTCTransportError {
  constructor (context: string, abortReason: string) {
    super(`Signalled to abort because (${abortReason}}) ${context}`, codes.ERR_ALREADY_ABORTED)
    this.name = 'WebRTC/OperationAbortedError'
  }
}

export function operationAborted (context: string, reason: string): OperationAbortedError {
  return new OperationAbortedError(context, reason)
}

export class OverStreamLimitError extends WebRTCTransportError {
  constructor (msg: string) {
    const code = msg.startsWith('inbound') ? codes.ERR_TOO_MANY_INBOUND_PROTOCOL_STREAMS : codes.ERR_TOO_MANY_OUTBOUND_PROTOCOL_STREAMS
    super(msg, code)
    this.name = 'WebRTC/OverStreamLimitError'
  }
}

export function overStreamLimit (dir: Direction, proto: string): OverStreamLimitError {
  return new OverStreamLimitError(`${dir} stream limit reached for protocol - ${proto}`)
}

export class UnimplementedError extends WebRTCTransportError {
  constructor (methodName: string) {
    super(`A method (${methodName}) was called though it has been intentionally left unimplemented.`, codes.ERR_NOT_IMPLEMENTED)
    this.name = 'WebRTC/UnimplementedError'
  }
}

export function unimplemented (methodName: string): UnimplementedError {
  return new UnimplementedError(methodName)
}

export class UnsupportedHashAlgorithmError extends WebRTCTransportError {
  constructor (algo: string) {
    super(`unsupported hash algorithm: ${algo}`, codes.ERR_HASH_NOT_SUPPORTED)
    this.name = 'WebRTC/UnsupportedHashAlgorithmError'
  }
}

export function unsupportedHashAlgorithm (algorithm: string): UnsupportedHashAlgorithmError {
  return new UnsupportedHashAlgorithmError(algorithm)
}
