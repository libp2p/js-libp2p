/* eslint-env mocha */

const expect = require('chai').expect
const TCPlibp2p = require('../src')
const net = require('net')
const multiaddr = require('multiaddr')

describe('libp2p-tcp', function () {
  this.timeout(10000)
  var tcp

  it('create', (done) => {
    tcp = new TCPlibp2p()
    expect(tcp).to.exist
    done()
  })

  it('listen', (done) => {
    const mh = multiaddr('/ip4/127.0.0.1/tcp/9090')
    tcp.createListener(mh, (socket) => {
      expect(socket).to.exist
      socket.end()
      tcp.close(() => {
        done()
      })
    }, () => {
      const socket = net.connect({ host: '127.0.0.1', port: 9090 })
      socket.end()
    })
  })

  it('dial', (done) => {
    const server = net.createServer((socket) => {
      expect(socket).to.exist
      socket.end()
      server.close(done)
    })

    server.listen(9090, () => {
      const mh = multiaddr('/ip4/127.0.0.1/tcp/9090')
      const socket = tcp.dial(mh)
      socket.end()
    })
  })

  it('listen on several', (done) => {
    const mh1 = multiaddr('/ip4/127.0.0.1/tcp/9090')
    const mh2 = multiaddr('/ip4/127.0.0.1/tcp/9091')
    const tcp = new TCPlibp2p()

    tcp.createListener([mh1, mh2], (socket) => {}, () => {
      tcp.close(done)
    })
  })

  it.skip('listen on IPv6', (done) => {})
})
