/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const multiaddr = require('multiaddr')
const WSlibp2p = require('../src')

describe('libp2p-websockets', function () {
  this.timeout(10000)
  var ws

  it('create', (done) => {
    ws = new WSlibp2p()
    expect(ws).to.exist
    done()
  })

  it('listen and dial', (done) => {
    const mh = multiaddr('/ip4/127.0.0.1/tcp/9090/ws')
    ws.createListener(mh, (socket) => {
      expect(socket).to.exist
      socket.end()
      ws.close(done)
    }, () => {
      const conn = ws.dial(mh)
      conn.end()
    })
  })

  it('listen on several', (done) => {
    const mh1 = multiaddr('/ip4/127.0.0.1/tcp/9090/ws')
    const mh2 = multiaddr('/ip4/127.0.0.1/tcp/9091/ws')
    const ws = new WSlibp2p()

    ws.createListener([mh1, mh2], (socket) => {}, () => {
      ws.close(done)
    })
  })

  it('get observed addrs', (done) => {
    const mh = multiaddr('/ip4/127.0.0.1/tcp/9090/ws')
    ws.createListener(mh, (socket) => {
      expect(socket).to.exist
      socket.end()
      expect(socket.getObservedAddrs()).to.deep.equal([])
      ws.close(done)
    }, () => {
      const conn = ws.dial(mh)
      conn.end()
    })
  })

  it('filter', (done) => {
    const mh1 = multiaddr('/ip4/127.0.0.1/tcp/9090')
    const mh2 = multiaddr('/ip4/127.0.0.1/udp/9090')
    const mh3 = multiaddr('/ip4/127.0.0.1/tcp/9090/ws')

    const valid = ws.filter([mh1, mh2, mh3])
    expect(valid.length).to.equal(1)
    expect(valid[0]).to.deep.equal(mh3)
    done()
  })

  it('echo', (done) => {
    const mh = multiaddr('/ip4/127.0.0.1/tcp/9090/ws')
    ws.createListener(mh, (conn) => {
      conn.pipe(conn)
    }, () => {
      const conn = ws.dial(mh)
      const message = 'Hello World!'
      conn.write(message)
      conn.on('data', (data) => {
        expect(data.toString()).to.equal(message)
        conn.end()
        ws.close(done)
      })
    })
  })

  it('echo with connect event and send', (done) => {
    const mh = multiaddr('/ip4/127.0.0.1/tcp/9090/ws')
    ws.createListener(mh, (conn) => {
      conn.pipe(conn)
    }, () => {
      const message = 'Hello World!'

      const conn = ws.dial(mh, {
        ready: () => {
          conn.send(message)
        }
      })

      conn.on('data', (data) => {
        expect(data.toString()).to.equal(message)
        conn.end()
        ws.close(done)
      })
    })
  })
})
