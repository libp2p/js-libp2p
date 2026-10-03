class NodeDataChannelUnavailableError extends Error {
  constructor () {
    super('node-datachannel is not available in browsers')
  }
}

export class PeerConnection {
  constructor () {
    throw new NodeDataChannelUnavailableError()
  }
}

export class IceUdpMuxListener {
  constructor () {
    throw new NodeDataChannelUnavailableError()
  }
}
