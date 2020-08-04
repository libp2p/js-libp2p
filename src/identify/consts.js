'use strict'

const libp2pVersion = require('../../package.json').version

module.exports.PROTOCOL_VERSION = 'ipfs/0.1.0'
module.exports.AGENT_VERSION = `js-libp2p/${libp2pVersion}`
module.exports.MULTICODEC_IDENTIFY = '/ipfs/id/1.0.0'
module.exports.MULTICODEC_IDENTIFY_PUSH = '/ipfs/id/push/1.0.0'
