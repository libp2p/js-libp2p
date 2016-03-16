/* eslint-env mocha */

const expect = require('chai').expect
// const async = require('async')

const multiaddr = require('multiaddr')
// const Id = require('peer-id')
const Peer = require('peer-info')
const Swarm = require('../src')
const WebSockets = require('libp2p-websockets')
const bl = require('bl')

describe('basics', () => {
  it('throws on missing peerInfo', (done) => {
    expect(Swarm).to.throw(Error)
    done()
  })
})

describe('transport - websockets', function () {
  this.timeout(10000)

  var swarmB
  var peerB = new Peer()

  before((done) => {
    peerB.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9999/websockets'))
    swarmB = new Swarm(peerB)
    done()
  })

  it('add', (done) => {
    swarmB.transport.add('ws', new WebSockets(), () => {
      expect(Object.keys(swarmB.transports).length).to.equal(1)
      done()
    })
  })

  it('dial', (done) => {
    const conn = swarmB.transport.dial('ws', multiaddr('/ip4/127.0.0.1/tcp/9888/websockets'), (err, conn) => {
      expect(err).to.not.exist
    })
    conn.pipe(bl((err, data) => {
      expect(err).to.not.exist
      expect(data.toString()).to.equal('hey')
      done()
    }))
    conn.write('hey')
    conn.end()
  })
})
