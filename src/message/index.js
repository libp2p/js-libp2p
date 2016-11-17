'use strict'

const protobuf = require('protocol-buffers')

const rpcProto = protobuf(require('./rpc.proto.js'))
const topicDescriptorProto = protobuf(require('./topic-descriptor.proto.js'))

exports = module.exports
exports.rpc = rpcProto
exports.td = topicDescriptorProto
