const Server = require('karma').Server
const path = require('path')

const Peer = require('peer-info')
const Id = require('peer-id')
const WebSockets = require('libp2p-websockets')
const Swarm = require('./../../src')
const multiaddr = require('multiaddr')

var swarmA
var swarmB

function createListeners (done) {
  function createListenerA (cb) {
    const b58IdA = 'QmWg2L4Fucx1x4KXJTfKHGixBJvveubzcd7DdhB2Mqwfh1'
    const peerA = new Peer(Id.createFromB58String(b58IdA))
    const maA = multiaddr('/ip4/127.0.0.1/tcp/9100/websockets')

    peerA.multiaddr.add(maA)
    swarmA = new Swarm(peerA)
    swarmA.transport.add('ws', new WebSockets())
    swarmA.transport.listen('ws', {}, echo, cb)
  }

  function createListenerB (cb) {
    const b58IdB = 'QmRy1iU6BHmG5Hd8rnPhPL98cy1W1przUSTAMcGDq9yAAV'
    const maB = multiaddr('/ip4/127.0.0.1/tcp/9200/websockets')
    const peerB = new Peer(Id.createFromB58String(b58IdB))
    peerB.multiaddr.add(maB)
    swarmB = new Swarm(peerB)

    swarmB.transport.add('ws', new WebSockets())
    swarmB.transport.listen('ws', {}, null, cb)

    swarmB.handle('/echo/1.0.0', echo)
  }

  var count = 0
  const ready = () => ++count === 2 ? done() : null

  createListenerA(ready)
  createListenerB(ready)

  function echo (conn) {
    conn.pipe(conn)
  }
}

function stop (done) {
  var count = 0
  const ready = () => ++count === 2 ? done() : null

  swarmA.transport.close('ws', ready)
  swarmB.transport.close('ws', ready)
}

function run (done) {
  const karma = new Server({
    configFile: path.join(__dirname, '../../karma.conf.js')
  }, done)

  karma.start()
}

createListeners(() => run(() => stop(() => null)))
