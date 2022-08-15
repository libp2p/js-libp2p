import { default as createError } from 'err-code';
import { Direction } from '@libp2p/interface-connection';

export class WebRTCTransportError extends Error {
  constructor(msg: string) {
    super('WebRTC transport error: ' + msg);
    this.name = 'WebRTCTransportError';
  }
}

export enum codes {
  ERR_ALREADY_ABORTED = 'ERR_ALREADY_ABORTED',
  ERR_DATA_CHANNEL = 'ERR_DATA_CHANNEL',
  ERR_INVALID_MULTIADDR = 'ERR_INVALID_MULTIADDR',
  ERR_INVALID_PARAMETERS = 'ERR_INVALID_PARAMETERS',
  ERR_NOT_IMPLEMENTED = 'ERR_NOT_IMPLEMENTED',
  ERR_TOO_MANY_INBOUND_PROTOCOL_STREAMS = 'ERR_TOO_MANY_INBOUND_PROTOCOL_STREAMS',
  ERR_TOO_MANY_OUTBOUND_PROTOCOL_STREAMS = 'ERR_TOO_MANY_OUTBOUND_PROTOCOL_STREAMS',
}

export class InvalidArgumentError extends WebRTCTransportError {
  constructor(msg: string) {
    super('There was a problem with a provided argument: ' + msg);
    this.name = 'WebRTC/InvalidArgumentError';
  }
}

export function invalidArgument(msg: string) {
  return createError(new InvalidArgumentError(msg), codes.ERR_INVALID_PARAMETERS);
}

export class UnimplementedError extends WebRTCTransportError {
  constructor(methodName: string) {
    super('A method (' + methodName + ') was called though it has been intentionally left unimplemented.');
    this.name = 'WebRTC/UnimplementedError';
  }
}

export function unimplemented(methodName: string) {
  return createError(new UnimplementedError(methodName), codes.ERR_NOT_IMPLEMENTED);
}

export class InappropriateMultiaddrError extends WebRTCTransportError {
  constructor(msg: string) {
    super('There was a problem with the Multiaddr which was passed in: ' + msg);
    this.name = 'WebRTC/InappropriateMultiaddrError';
  }
}

export function inappropriateMultiaddr(msg: string) {
  return createError(new InappropriateMultiaddrError(msg), codes.ERR_INVALID_MULTIADDR);
}

export class OperationAbortedError extends WebRTCTransportError {
  constructor(context: string, abortReason: string) {
    super(`Signalled to abort because (${abortReason}})${context}`);
    this.name = 'WebRTC/OperationAbortedError';
  }
}

export function operationAborted(context: string, reason: string) {
  return createError(new OperationAbortedError(context, reason), codes.ERR_ALREADY_ABORTED);
}

export class DataChannelError extends WebRTCTransportError {
  constructor(streamLabel: string, errorMessage: string) {
    super(`[stream: ${streamLabel}] data channel error: ${errorMessage}`);
    this.name = 'WebRTC/DataChannelError';
  }
}

export function dataChannelError(streamLabel: string, msg: string) {
  return createError(new OperationAbortedError(streamLabel, msg), codes.ERR_DATA_CHANNEL);
}

export class StreamingLimitationError extends WebRTCTransportError {
  constructor(msg: string) {
    super(msg);
    this.name = 'WebRTC/StreamingLimitationError';
  }
}

export function overStreamLimit(dir: Direction, proto: string) {
  let code = dir == 'inbound' ? codes.ERR_TOO_MANY_INBOUND_PROTOCOL_STREAMS : codes.ERR_TOO_MANY_OUTBOUND_PROTOCOL_STREAMS;
  return createError(new StreamingLimitationError(`${dir} stream limit reached for protocol - ${proto}`), code);
}
