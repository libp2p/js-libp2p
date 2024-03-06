import node from 'node-datachannel'

export { RTCSessionDescription, RTCIceCandidate, RTCPeerConnection } from 'node-datachannel/polyfill'

export function cleanup (): void {
  node.cleanup()
}
