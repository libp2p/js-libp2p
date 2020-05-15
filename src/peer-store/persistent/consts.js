'use strict'

module.exports.NAMESPACE_COMMON = '/peers/'

// /peers/protos/<b32 peer id no padding>
module.exports.NAMESPACE_ADDRESS = '/peers/addrs/'

// /peers/keys/<b32 peer id no padding>
module.exports.NAMESPACE_KEYS = '/peers/keys/'

// /peers/metadata/<b32 peer id no padding>/<key>
module.exports.NAMESPACE_METADATA = '/peers/metadata/'

// /peers/addrs/<b32 peer id no padding>
module.exports.NAMESPACE_PROTOCOL = '/peers/protos/'
