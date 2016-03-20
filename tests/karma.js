const Server = require('karma').Server
const path = require('path')

const Peer = require('peer-info')
const PeerId = require('peer-id')
const WebSockets = require('libp2p-websockets')
const Swarm = require('../src')
const multiaddr = require('multiaddr')

const PEER_ID_SERVER_A = 'QmWg2L4Fucx1x4KXJTfKHGixBJvveubzcd7DdhB2Mqwfh1'
const PEER_ID_SERVER_B = 'QmRy1iU6BHmG5Hd8rnPhPL98cy1W1przUSTAMcGDq9yAAV'
const MULTIADDR_SERVER_A = '/ip4/127.0.0.1/tcp/9888/websockets'
const MULTIADDR_SERVER_B = '/ip4/127.0.0.1/tcp/9999/websockets'

var swarmA
var peerA
var swarmB
var peerB

function createServers (done) {
  function createServerA (cb) {
    const id = PeerId.createFromB58String(PEER_ID_SERVER_A)
    peerA = new Peer(id)
    peerA.multiaddr.add(multiaddr(MULTIADDR_SERVER_A))
    swarmA = new Swarm(peerA)
    swarmA.transport.add('ws', new WebSockets())
    swarmA.transport.listen('ws', {}, (conn) => {
      conn.pipe(conn)
    }, cb)
  }

  function createServerB (cb) {
    const id = PeerId.createFromB58String(PEER_ID_SERVER_B)
    peerB = new Peer(id)
    peerB.multiaddr.add(multiaddr(MULTIADDR_SERVER_B))
    swarmB = new Swarm(peerB)
    swarmB.transport.add('ws', new WebSockets())
    swarmB.handle('/pineapple/1.0.0', (conn) => {
      conn.pipe(conn)
    })
    swarmB.transport.listen('ws', {}, null, cb)
  }

  var count = 0
  const ready = () => ++count === 2 ? done() : null

  createServerA(ready)
  createServerB(ready)
}

function stopServers (done) {
  var count = 0
  const ready = () => ++count === 2 ? done() : null

  swarmA.transport.close('ws', ready)
  swarmB.transport.close('ws', ready)
}

function runTests (done) {
  new Server({
    configFile: path.join(__dirname, '/../karma.conf.js'),
    singleRun: true
  }, done).start()
}

createServers(() => runTests(() => stopServers(() => null)))
