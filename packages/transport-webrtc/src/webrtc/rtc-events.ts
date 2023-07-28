export class PeerConnectionIceEvent extends Event implements RTCPeerConnectionIceEvent {
  readonly candidate: RTCIceCandidate | null

  constructor (candidate: RTCIceCandidate) {
    super('icecandidate')

    this.candidate = candidate
  }
}

export class DataChannelEvent extends Event implements RTCDataChannelEvent {
  readonly channel: RTCDataChannel

  constructor (channel: RTCDataChannel) {
    super('datachannel')

    this.channel = channel
  }
}
