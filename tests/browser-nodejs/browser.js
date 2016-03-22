/* eslint-env mocha */

const expect = require('chai').expect
const WSlibp2p = require('../../src')
const multiaddr = require('multiaddr')

describe('libp2p-websockets', function () {
  this.timeout(10000)
  var ws

  it('create', (done) => {
    ws = new WSlibp2p()
    expect(ws).to.exist
    done()
  })

  it('echo', (done) => {
    const mh = multiaddr('/ip4/127.0.0.1/tcp/9090/websockets')
    const conn = ws.dial(mh)
    const message = 'Hello World!'
    conn.write(message)
    conn.on('data', (data) => {
      expect(data.toString()).to.equal(message)
      conn.end()
      done()
    })
  })
})
