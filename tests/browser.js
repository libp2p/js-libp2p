/* eslint-env mocha */

const expect = require('chai').expect
const WSlibp2p = require('libp2p-websockets')
const multiplex = require('../src')
const multiaddr = require('multiaddr')

describe('browser + server', () => {
  var ws
  before((done) => {
    ws = new WSlibp2p()
    done()
  })

  it('create a stream and wait for server to create another', (done) => {
    const mh = multiaddr('/ip4/127.0.0.1/tcp/9090/websockets')
    const dialerSocket = ws.dial(mh)

    const dialer = multiplex(dialerSocket, false)
    dialer.on('stream', (conn) => {
      conn.on('data', (data) => {
        expect(data.toString()).to.equal('hey')
        conn.end()
        done()
      })
    })

    const conn = dialer.newStream()
    conn.write('hey')

    conn.on('error', (err) => {
      expect(err).to.not.exist
    })
  })
})
