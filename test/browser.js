/* eslint-env mocha */
'use strict'

const w = require('webrtcsupport')

require('./transports.browser.js')
require('./swarm-muxing+websockets.browser')

if (w.support) {
  require('./t-webrtc-star.browser')
  require('./swarm-muxing+webrtc-star.browser')
}
