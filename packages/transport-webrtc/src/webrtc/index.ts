import { setSctpSettings } from 'node-datachannel'

setSctpSettings({
  sendBufferSize: 8 * 1024 * 1024,
  recvBufferSize: 4 * 1024 * 1024
})

export { RTCSessionDescription, RTCIceCandidate, RTCPeerConnection } from 'node-datachannel/polyfill'
