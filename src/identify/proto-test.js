var protobufs = require('protocol-buffers-stream')
var fs = require('fs')
var schema = fs.readFileSync(__dirname + '/identify.proto')

var createProtoStream = protobufs(schema)

var ps = createProtoStream()

ps.on('identify', function (msg) {
  console.log('RECEIVED PROTOBUF - ', msg)
// self.emit('peer-update', {})
})

ps.identify({
  protocolVersion: 'nop',
  agentVersion: 'nop'
// publicKey: new Buffer(),
// listenAddrs: new Buffer([buf1, buf2])
// observedAddr: new Buffer()
})

ps.pipe(ps)

ps.end()
