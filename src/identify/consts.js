'use strict'

const libp2pVersion = require('../../package.json').version

module.exports.PROTOCOL_VERSION = 'ipfs/0.1.0'
module.exports.AGENT_VERSION = `js-libp2p/${libp2pVersion}`
module.exports.MULTICODEC_IDENTIFY = '/p2p/id/1.1.0'
module.exports.MULTICODEC_IDENTIFY_PUSH = '/p2p/id/push/1.1.0'

// Legacy
module.exports.MULTICODEC_IDENTIFY_LEGACY = '/ipfs/id/1.0.0'
module.exports.MULTICODEC_IDENTIFY_PUSH_LEGACY = '/ipfs/id/push/1.0.0'
