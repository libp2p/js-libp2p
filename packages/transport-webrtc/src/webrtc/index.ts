import node from 'node-datachannel'
import { IceCandidate } from './rtc-ice-candidate.js'
import { PeerConnection } from './rtc-peer-connection.js'
import { SessionDescription } from './rtc-session-description.js'

export { SessionDescription as RTCSessionDescription }
export { IceCandidate as RTCIceCandidate }
export { PeerConnection as RTCPeerConnection }

export function cleanup (): void {
  node.cleanup()
}
