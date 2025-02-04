export class WebRTCTransportError extends Error {
  constructor (msg: string) {
    super(`WebRTC transport error: ${msg}`)
    this.name = 'WebRTCTransportError'
  }
}

export class SDPHandshakeFailedError extends WebRTCTransportError {
  constructor (message = 'SDP handshake failed') {
    super(message)
    this.name = 'SDPHandshakeFailedError'
  }
}

export class ConnectionClosedError extends WebRTCTransportError {
  constructor (state: RTCPeerConnectionState, msg: string) {
    super(`peerconnection moved to state: ${state}: ${msg}`)
    this.name = 'WebRTC/ConnectionClosed'
  }
}

export class DataChannelError extends WebRTCTransportError {
  constructor (streamLabel: string, msg: string) {
    super(`[stream: ${streamLabel}] data channel error: ${msg}`)
    this.name = 'WebRTC/DataChannelError'
  }
}

export class InappropriateMultiaddrError extends WebRTCTransportError {
  constructor (msg: string) {
    super(`There was a problem with the Multiaddr which was passed in: ${msg}`)
    this.name = 'WebRTC/InappropriateMultiaddrError'
  }
}

export class InvalidArgumentError extends WebRTCTransportError {
  constructor (msg: string) {
    super(`There was a problem with a provided argument: ${msg}`)
    this.name = 'WebRTC/InvalidArgumentError'
  }
}

export class InvalidFingerprintError extends WebRTCTransportError {
  constructor (fingerprint: string, source: string) {
    super(`Invalid fingerprint "${fingerprint}" within ${source}`)
    this.name = 'WebRTC/InvalidFingerprintError'
  }
}

export class OperationAbortedError extends WebRTCTransportError {
  constructor (context: string, abortReason: string) {
    super(`Signalled to abort because (${abortReason}}) ${context}`)
    this.name = 'WebRTC/OperationAbortedError'
  }
}

export class OverStreamLimitError extends WebRTCTransportError {
  constructor (msg: string) {
    super(msg)
    this.name = 'WebRTC/OverStreamLimitError'
  }
}

export class UnimplementedError extends WebRTCTransportError {
  constructor (methodName: string) {
    super(`A method (${methodName}) was called though it has been intentionally left unimplemented.`)
    this.name = 'WebRTC/UnimplementedError'
  }
}

export class UnsupportedHashAlgorithmError extends WebRTCTransportError {
  constructor (algo: number) {
    super(`unsupported hash algorithm code: ${algo} please see the codes at https://github.com/multiformats/multicodec/blob/master/table.csv `)
    this.name = 'WebRTC/UnsupportedHashAlgorithmError'
  }
}
