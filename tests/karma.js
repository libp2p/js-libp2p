const Server = require('karma').Server
const path = require('path')
const WSlibp2p = require('libp2p-websockets')
const multiaddr = require('multiaddr')
const multiplex = require('../src')

var ws

function createServer (done) {
  ws = new WSlibp2p()
  const mh = multiaddr('/ip4/127.0.0.1/tcp/9090/websockets')
  ws.createListener(mh, (socket) => {
    const listener = multiplex(socket, true)

    listener.on('stream', (connA) => {
      listener.newStream((err, connB) => {
        if (err) {
          throw err
        }

        connA.pipe(connB)
      })
    })
  }, done)
}

function stopServer (done) {
  ws.close(done)
}

function runTests (done) {
  new Server({
    configFile: path.join(__dirname, '/../karma.conf.js'),
    singleRun: true
  }, done).start()
}

createServer(() => runTests(() => stopServer(() => null)))
