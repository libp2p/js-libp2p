export class WebRTCTransportError extends Error {
  constructor(msg: string) {
    super('WebRTC transport error: ' + msg);
    this.name = 'WebRTCTransportError';
  }
}

export class InvalidArgumentError extends WebRTCTransportError {
  constructor(msg: string) {
    super('There was a problem with a provided argument: ' + msg);
    this.name = 'WebRTC/InvalidArgumentError';
  }
}

export class UnimplementedError extends WebRTCTransportError {
  constructor(methodName: string) {
    super('A method (' + methodName + ') was called though it has been intentionally left unimplemented.');
    this.name = 'WebRTC/UnimplementedError';
  }
}

export class InappropriateMultiaddrError extends WebRTCTransportError {
  constructor(msg: string) {
    super('There was a problem with the Multiaddr which was passed in: ' + msg);
    this.name = 'WebRTC/InappropriateMultiaddrError';
  }
}

export class OperationAbortedError extends WebRTCTransportError {
  constructor(context: string, abortReason: string) {
    super(`Signalled to abort because (${abortReason}})${context}`);
    this.name = 'WebRTC/OperationAbortedError';
  }
}

export class DataChannelError extends WebRTCTransportError {
  constructor(streamLabel: string, errorMessage: string) {
    super(`[stream: ${streamLabel}] data channel error: ${errorMessage}`);
    this.name = 'WebRTC/DataChannelError';
  }
}

export class StreamingLimitationError extends WebRTCTransportError {
  constructor(msg: string) {
    super(msg);
    this.name = 'WebRTC/StreamingLimitationError';
  }
}
