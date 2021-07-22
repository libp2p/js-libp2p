'use strict'

// @ts-ignore file not listed within the file list of projects
const libp2pVersion = require('../../package.json').version

module.exports.PROTOCOL_VERSION = '0.1.0'
module.exports.AGENT_VERSION = `js-libp2p/${libp2pVersion}`
module.exports.MULTICODEC_IDENTIFY = 'id/1.0.0'
module.exports.MULTICODEC_IDENTIFY_PUSH = 'id/push/1.0.0'
