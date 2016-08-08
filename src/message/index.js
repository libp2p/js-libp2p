'use strict'

const fs = require('fs')
const path = require('path')
const protobuf = require('protocol-buffers')
const schema = fs.readFileSync(path.join(__dirname, 'identify.proto'))

module.exports = protobuf(schema).Identify
