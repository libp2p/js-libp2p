'use strict'

const w = require('webrtcsupport')

require('./base')
require('./browser-bundle/websockets-only')
if (w.support) { require('./browser-bundle/webrtc-star-only') }
