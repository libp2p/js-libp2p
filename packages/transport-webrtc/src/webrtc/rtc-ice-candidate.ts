/**
 * @see https://developer.mozilla.org/docs/Web/API/RTCIceCandidate
 */
export class IceCandidate implements RTCIceCandidate {
  readonly address: string | null
  readonly candidate: string
  readonly component: RTCIceComponent | null
  readonly foundation: string | null
  readonly port: number | null
  readonly priority: number | null
  readonly protocol: RTCIceProtocol | null
  readonly relatedAddress: string | null
  readonly relatedPort: number | null
  readonly sdpMLineIndex: number | null
  readonly sdpMid: string | null
  readonly tcpType: RTCIceTcpCandidateType | null
  readonly type: RTCIceCandidateType | null
  readonly usernameFragment: string | null

  constructor (init: RTCIceCandidateInit) {
    if (init.candidate == null) {
      throw new DOMException('candidate must be specified')
    }

    this.candidate = init.candidate
    this.sdpMLineIndex = init.sdpMLineIndex ?? null
    this.sdpMid = init.sdpMid ?? null
    this.usernameFragment = init.usernameFragment ?? null

    this.address = null
    this.component = null
    this.foundation = null
    this.port = null
    this.priority = null
    this.protocol = null
    this.relatedAddress = null
    this.relatedPort = null
    this.tcpType = null
    this.type = null
  }

  toJSON (): RTCIceCandidateInit {
    return {
      candidate: this.candidate,
      sdpMLineIndex: this.sdpMLineIndex,
      sdpMid: this.sdpMid,
      usernameFragment: this.usernameFragment
    }
  }
}
