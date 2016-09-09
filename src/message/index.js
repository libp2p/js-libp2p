'use strict'

const fs = require('fs')
const path = require('path')
const protobuf = require('protocol-buffers')

const rpcSchema = fs.readFileSync(
    path.join(__dirname, 'rpc.proto'))

const topicDescriptorSchema = fs.readFileSync(
    path.join(__dirname, 'topic-descriptor.proto'))

exports = module.exports
exports.rpc = protobuf(rpcSchema)
exports.td = protobuf(topicDescriptorSchema)
