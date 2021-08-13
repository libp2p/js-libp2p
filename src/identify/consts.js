'use strict'

// @ts-ignore file not listed within the file list of projects
const libp2pVersion = require('../../package.json').version

module.exports.PROTOCOL_VERSION = 'ipfs/0.1.0' // deprecated
module.exports.AGENT_VERSION = `js-libp2p/${libp2pVersion}`
module.exports.MULTICODEC_IDENTIFY = '/ipfs/id/1.0.0' // deprecated
module.exports.MULTICODEC_IDENTIFY_PUSH = '/ipfs/id/push/1.0.0' // deprecated

module.exports.IDENTIFY_PROTOCOL_VERSION = '0.1.0'
module.exports.MULTICODEC_IDENTIFY_PROTOCOL_NAME = 'id'
module.exports.MULTICODEC_IDENTIFY_PUSH_PROTOCOL_NAME = 'id/push'
module.exports.MULTICODEC_IDENTIFY_PROTOCOL_VERSION = '1.0.0'
module.exports.MULTICODEC_IDENTIFY_PUSH_PROTOCOL_VERSION = '1.0.0'
