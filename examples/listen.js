var multiplex = require('libp2p-multiplex')
var net = require('net')

var server = net.createServer(function (conn) {
  var multi = multiplex(conn, false)

  multi.newStream(echoService)
  multi.newStream(lengthService)
}).listen(9000)


function echoService (err, conn) {
  if (err) throw err
  conn.on('data', function (data) {
    conn.write(data)
  })
}

function lengthService (err, conn) {
  if (err) throw err
  conn.on('data', function (data) {
    conn.write(data.length+'\n')
  })
}
