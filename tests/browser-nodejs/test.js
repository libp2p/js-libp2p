const karma = require('karma')
const path = require('path')
const WSlibp2p = require('libp2p-websockets')
const multiaddr = require('multiaddr')
const multiplex = require('./../../src')

var ws

function createListener (done) {
  ws = new WSlibp2p()
  const mh = multiaddr('/ip4/127.0.0.1/tcp/9050/websockets')
  ws.createListener(mh, (conn) => {
    const listener = multiplex(conn, true)

    listener.on('stream', (connRc) => {
      listener.newStream((err, connTx) => {
        if (err) {
          throw err
        }

        connRc.pipe(connTx)
      })
    })
  }, done)
}

function stop (done) {
  ws.close(done)
}

function run (done) {
  const karmaServer = new karma.Server({
    configFile: path.join(__dirname, './../../karma.conf.js')
  }, done)

  karmaServer.start()
}

createListener(() => run((exitCode) => stop(() => process.exit(exitCode))))
