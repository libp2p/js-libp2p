/**
 * @see https://developer.mozilla.org/docs/Web/API/RTCSessionDescription
 */
export class SessionDescription implements RTCSessionDescription {
  readonly sdp: string
  readonly type: RTCSdpType

  constructor (init: RTCSessionDescriptionInit) {
    this.sdp = init.sdp ?? ''
    this.type = init.type
  }

  toJSON (): RTCSessionDescriptionInit {
    return {
      sdp: this.sdp,
      type: this.type
    }
  }
}
