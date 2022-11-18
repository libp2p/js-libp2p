import errCode from 'err-code'
import { Direction } from '@libp2p/interface-connection'

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

export class WebRTCTransportError extends Error {
  constructor (msg: string) {
    super('WebRTC transport error: ' + msg)
    this.name = 'WebRTCTransportError'
  }
}

export class ConnectionClosedError extends WebRTCTransportError {
  constructor (state: RTCPeerConnectionState, msg: string) {
    super(`peerconnection moved to state: ${state}:` + msg)
    this.name = 'WebRTC/ConnectionClosed'
  }
}

export function connectionClosedError (state: RTCPeerConnectionState, msg: string) {
  return errCode(new ConnectionClosedError(state, msg), codes.ERR_CONNECTION_CLOSED)
}

export class DataChannelError extends WebRTCTransportError {
  constructor (streamLabel: string, errorMessage: string) {
    super(`[stream: ${streamLabel}] data channel error: ${errorMessage}`)
    this.name = 'WebRTC/DataChannelError'
  }
}

export function dataChannelError (streamLabel: string, msg: string) {
  return errCode(new DataChannelError(streamLabel, msg), codes.ERR_DATA_CHANNEL)
}

export class InappropriateMultiaddrError extends WebRTCTransportError {
  constructor (msg: string) {
    super('There was a problem with the Multiaddr which was passed in: ' + msg)
    this.name = 'WebRTC/InappropriateMultiaddrError'
  }
}

export function inappropriateMultiaddr (msg: string) {
  return errCode(new InappropriateMultiaddrError(msg), codes.ERR_INVALID_MULTIADDR)
}

export class InvalidArgumentError extends WebRTCTransportError {
  constructor (msg: string) {
    super('There was a problem with a provided argument: ' + msg)
    this.name = 'WebRTC/InvalidArgumentError'
  }
}

export function invalidArgument (msg: string) {
  return errCode(new InvalidArgumentError(msg), codes.ERR_INVALID_PARAMETERS)
}

export class InvalidFingerprintError extends WebRTCTransportError {
  constructor (fingerprint: string, source: string) {
    super(`Invalid fingerprint "${fingerprint}" within ${source}`)
    this.name = 'WebRTC/InvalidFingerprintError'
  }
}

export function invalidFingerprint (fingerprint: string, source: string) {
  return errCode(new InvalidFingerprintError(fingerprint, source), codes.ERR_INVALID_FINGERPRINT)
}

export class OperationAbortedError extends WebRTCTransportError {
  constructor (context: string, abortReason: string) {
    super(`Signalled to abort because (${abortReason}})${context}`)
    this.name = 'WebRTC/OperationAbortedError'
  }
}

export function operationAborted (context: string, reason: string) {
  return errCode(new OperationAbortedError(context, reason), codes.ERR_ALREADY_ABORTED)
}

export class OverStreamLimitError extends WebRTCTransportError {
  constructor (msg: string) {
    super(msg)
    this.name = 'WebRTC/OverStreamLimitError'
  }
}

export function overStreamLimit (dir: Direction, proto: string) {
  const code = dir === 'inbound' ? codes.ERR_TOO_MANY_INBOUND_PROTOCOL_STREAMS : codes.ERR_TOO_MANY_OUTBOUND_PROTOCOL_STREAMS
  return errCode(new OverStreamLimitError(`${dir} stream limit reached for protocol - ${proto}`), code)
}

export class UnimplementedError extends WebRTCTransportError {
  constructor (methodName: string) {
    super('A method (' + methodName + ') was called though it has been intentionally left unimplemented.')
    this.name = 'WebRTC/UnimplementedError'
  }
}

export function unimplemented (methodName: string) {
  return errCode(new UnimplementedError(methodName), codes.ERR_NOT_IMPLEMENTED)
}

export class UnsupportedHashAlgorithmError extends WebRTCTransportError {
  constructor (algo: string) {
    const msg = `unsupported hash algorithm: ${algo}`
    super(msg)
    this.name = 'WebRTC/UnsupportedHashAlgorithmError'
  }
}

export function unsupportedHashAlgorithm (algorithm: string) {
  return errCode(new UnsupportedHashAlgorithmError(algorithm), codes.ERR_HASH_NOT_SUPPORTED)
}
