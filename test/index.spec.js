/* eslint-env mocha */
'use strict'

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

  it('create without new', (done) => {
    tcp = TCPlibp2p()
    expect(tcp).to.exist
    done()
  })

  it('close /wo listeners', (done) => {
    tcp = new TCPlibp2p()
    expect(tcp).to.exist
    expect(function () { tcp.close() }).to.throw(Error)
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
    }, (err, freshMultiaddrs) => {
      expect(err).to.not.exist
      expect(mh).to.deep.equal(freshMultiaddrs[0])
      const socket = net.connect({ host: '127.0.0.1', port: 9090 })
      socket.end()
    })
  })

  it('listen on addr with /ipfs/QmHASH', (done) => {
    const mh = multiaddr('/ip4/127.0.0.1/tcp/14090/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
    tcp.createListener(mh, (socket) => {
      expect(socket).to.exist
      socket.end()
      tcp.close(() => {
        done()
      })
    }, (err, freshMultiaddrs) => {
      expect(err).to.not.exist
      expect(mh).to.deep.equal(freshMultiaddrs[0])
      const socket = net.connect({ host: '127.0.0.1', port: 14090 })
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
    const mh3 = multiaddr('/ip6/::/tcp/9092')
    const tcp = new TCPlibp2p()

    tcp.createListener([mh1, mh2, mh3], (socket) => {}, () => {
      tcp.close(done)
    })
  })

  it('dial ipv6', (done) => {
    const mh = multiaddr('/ip6/::/tcp/9091')
    var dialerObsAddrs

    tcp.createListener(mh, (conn) => {
      expect(conn).to.exist
      dialerObsAddrs = conn.getObservedAddrs()
      conn.end()
    }, () => {
      const conn = tcp.dial(mh)
      conn.on('end', () => {
        expect(dialerObsAddrs.length).to.equal(1)
        tcp.close()
        done()
      })
    })
  })

  it('get observed addrs', (done) => {
    const mh = multiaddr('/ip4/127.0.0.1/tcp/9090')
    var dialerObsAddrs
    var listenerObsAddrs

    tcp.createListener(mh, (conn) => {
      expect(conn).to.exist
      dialerObsAddrs = conn.getObservedAddrs()
      conn.end()
    }, () => {
      const conn = tcp.dial(mh)
      conn.on('end', () => {
        listenerObsAddrs = conn.getObservedAddrs()
        conn.end()

        tcp.close(() => {
          expect(listenerObsAddrs[0]).to.deep.equal(mh)
          expect(dialerObsAddrs.length).to.equal(1)
          done()
        })
      })
    })
  })

  it('filter valid addrs for this transport', (done) => {
    const mh1 = multiaddr('/ip4/127.0.0.1/tcp/9090')
    const mh2 = multiaddr('/ip4/127.0.0.1/udp/9090')
    const mh3 = multiaddr('/ip4/127.0.0.1/tcp/9090/http')
    const mh4 = multiaddr('/ip4/127.0.0.1/tcp/9090/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')

    const valid = tcp.filter([mh1, mh2, mh3, mh4])
    expect(valid.length).to.equal(2)
    expect(valid[0]).to.deep.equal(mh1)
    done()
  })

  it('filter a valid addr for this transport', (done) => {
    const mh1 = multiaddr('/ip4/127.0.0.1/tcp/9090')

    const valid = tcp.filter(mh1)
    expect(valid.length).to.equal(1)
    expect(valid[0]).to.deep.equal(mh1)
    done()
  })

  it('destroys after timeout', (done) => {
    const server = new TCPlibp2p()
    const mh = multiaddr('/ip4/127.0.0.1/tcp/9090')
    server.createListener(mh, (conn) => {
      const i = setInterval(() => {
        conn.read()
        conn.write('hi\n')
      }, 100)
      i.unref()
    }, () => {
      let connected = 0
      const connectHandler = () => {
        connected++
        if (connected === 10) {
          setTimeout(() => {
            server.close(done)
          }, 1)
        }
      }
      const errorHandler = () => {}

      for (let i = 0; i < 10; i++) {
        const client = net.connect(9090)
        client.on('connect', connectHandler)

        // just ignore the resets
        client.on('error', errorHandler)
      }
    })
  })
})
