const Server = require('karma').Server
const path = require('path')

const Peer = require('peer-info')
const WebSockets = require('libp2p-websockets')
const Swarm = require('../src')
const multiaddr = require('multiaddr')

var swarmA
var peerA

function createServer (done) {
  peerA = new Peer()
  peerA.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9888/websockets'))
  swarmA = new Swarm(peerA)
  swarmA.transport.add('ws', new WebSockets())
  swarmA.transport.listen('ws', {}, (conn) => {
    conn.pipe(conn)
  }, done)
}

function stopServer (done) {
  swarmA.transport.close('ws', done)
}

function runTests (done) {
  new Server({
    configFile: path.join(__dirname, '/../karma.conf.js'),
    singleRun: true
  }, done).start()
}

createServer(() => runTests(() => stopServer(() => null)))
