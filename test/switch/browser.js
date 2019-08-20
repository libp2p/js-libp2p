/* eslint-env mocha */
'use strict'

const wrtcSupport = self.RTCPeerConnection && ('createDataChannel' in self.RTCPeerConnection.prototype)

require('./transports.browser.js')
require('./swarm-muxing+websockets.browser')

if (wrtcSupport) {
  require('./t-webrtc-star.browser')
  require('./swarm-muxing+webrtc-star.browser')
}
