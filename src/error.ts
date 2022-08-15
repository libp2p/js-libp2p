export class WebRTCTransportError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'WebRTCTransportError';
  }
}

export class InvalidArgumentError extends WebRTCTransportError {
  constructor(msg: string) {
    super(msg);
    this.name = 'WebRTC/InvalidArgumentError';
  }
}

export class UnsupportedHashAlgorithmError extends WebRTCTransportError {
  constructor(algo: string) {
    let msg = `unsupported hash algorithm: ${algo}`;
    super(msg);
    this.name = 'WebRTC/UnsupportedHashAlgorithmError';
  }
}
