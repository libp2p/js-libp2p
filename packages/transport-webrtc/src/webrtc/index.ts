import * as WebRTCNode from '@mertushka/webrtc-node'

const webRTCNode = (WebRTCNode as unknown as { default?: typeof WebRTCNode }).default ?? WebRTCNode
const {
  RTCIceCandidate: NodeRTCIceCandidate,
  RTCPeerConnection: NodeRTCPeerConnection,
  RTCSessionDescription: NodeRTCSessionDescription
} = webRTCNode

export const RTCSessionDescription = NodeRTCSessionDescription as unknown as typeof globalThis.RTCSessionDescription
export const RTCIceCandidate = NodeRTCIceCandidate as unknown as typeof globalThis.RTCIceCandidate
export const RTCPeerConnection = NodeRTCPeerConnection as unknown as typeof globalThis.RTCPeerConnection
