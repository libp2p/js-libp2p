var multiplex = require('libp2p-multiplex')
var net = require('net')

var client = net.connect(9000, 'localhost', function () {
  var multi = multiplex(client, true)

  multi.on('stream', function (conn) {
    console.log('got a new stream')

    conn.on('data', function (data) {
      console.log('message', data.toString())
    })
  })
})
