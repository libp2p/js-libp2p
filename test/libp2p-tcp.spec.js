/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const TCP = require('../src')
const net = require('net')
const multiaddr = require('multiaddr')
const Connection = require('interface-connection').Connection

describe('instantiate the transport', () => {
  it('create', (done) => {
    const tcp = new TCP()
    expect(tcp).to.exist
    done()
  })

  it('create without new', (done) => {
    const tcp = TCP()
    expect(tcp).to.exist
    done()
  })
})

describe('listen', () => {
  let tcp

  beforeEach(() => {
    tcp = new TCP()
  })

  it('listen, check for callback', (done) => {
    const mh = multiaddr('/ip4/127.0.0.1/tcp/9090')
    const listener = tcp.createListener((conn) => {})
    listener.listen(mh, () => {
      listener.close(done)
    })
  })

  it('listen, check for listening event', (done) => {
    const mh = multiaddr('/ip4/127.0.0.1/tcp/9090')
    const listener = tcp.createListener((conn) => {})
    listener.on('listening', () => {
      listener.close(done)
    })
    listener.listen(mh)
  })

  it('listen, check for the close event', (done) => {
    const mh = multiaddr('/ip4/127.0.0.1/tcp/9090')
    const listener = tcp.createListener((conn) => {})
    listener.on('close', done)
    listener.on('listening', () => {
      listener.close()
    })
    listener.listen(mh)
  })

  it('listen on addr with /ipfs/QmHASH', (done) => {
    const mh = multiaddr('/ip4/127.0.0.1/tcp/9090/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
    const listener = tcp.createListener((conn) => {})
    listener.listen(mh, () => {
      listener.close(done)
    })
  })

  it('close listener with connections, through timeout', (done) => {
    const mh = multiaddr('/ip4/127.0.0.1/tcp/9091/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
    const listener = tcp.createListener((conn) => {
      conn.pipe(conn)
    })
    listener.listen(mh, () => {
      const socket1 = net.connect(9091)
      const socket2 = net.connect(9091)
      socket1.write('Some data that is never handled')
      socket1.end()
      socket1.on('error', () => {})
      socket2.on('error', () => {})
      socket1.on('connect', () => {
        listener.close(done)
      })
    })
  })

  it('listen on port 0', (done) => {
    const mh = multiaddr('/ip4/127.0.0.1/tcp/0')
    const listener = tcp.createListener((conn) => {})
    listener.listen(mh, () => {
      listener.close(done)
    })
  })

  it('listen on IPv6 addr', (done) => {
    const mh = multiaddr('/ip6/::/tcp/9090')
    const listener = tcp.createListener((conn) => {})
    listener.listen(mh, () => {
      listener.close(done)
    })
  })

  it('listen on any Interface', (done) => {
    const mh = multiaddr('/ip4/0.0.0.0/tcp/9090')
    const listener = tcp.createListener((conn) => {})
    listener.listen(mh, () => {
      listener.close(done)
    })
  })

  it('getAddrs', (done) => {
    const mh = multiaddr('/ip4/127.0.0.1/tcp/9090')
    const listener = tcp.createListener((conn) => {})
    listener.listen(mh, () => {
      listener.getAddrs((err, multiaddrs) => {
        expect(err).to.not.exist
        expect(multiaddrs.length).to.equal(1)
        // multiaddrs.forEach((ma) => {
        //  console.log(ma.toString())
        // })
        expect(multiaddrs[0]).to.deep.equal(mh)
        listener.close(done)
      })
    })
  })

  it('getAddrs on port 0 listen', (done) => {
    const mh = multiaddr('/ip4/127.0.0.1/tcp/0')
    const listener = tcp.createListener((conn) => {})
    listener.listen(mh, () => {
      listener.getAddrs((err, multiaddrs) => {
        expect(err).to.not.exist
        expect(multiaddrs.length).to.equal(1)
        // multiaddrs.forEach((ma) => {
        //  console.log(ma.toString())
        // })

        listener.close(done)
      })
    })
  })

  it('getAddrs from listening on 0.0.0.0', (done) => {
    const mh = multiaddr('/ip4/0.0.0.0/tcp/9090')
    const listener = tcp.createListener((conn) => {})
    listener.listen(mh, () => {
      listener.getAddrs((err, multiaddrs) => {
        expect(err).to.not.exist
        expect(multiaddrs.length > 0).to.equal(true)
        expect(multiaddrs[0].toString().indexOf('0.0.0.0')).to.equal(-1)
        // multiaddrs.forEach((ma) => {
        //  console.log(ma.toString())
        // })
        listener.close(done)
      })
    })
  })

  it('getAddrs from listening on 0.0.0.0 and port 0', (done) => {
    const mh = multiaddr('/ip4/0.0.0.0/tcp/0')
    const listener = tcp.createListener((conn) => {})
    listener.listen(mh, () => {
      listener.getAddrs((err, multiaddrs) => {
        expect(err).to.not.exist
        expect(multiaddrs.length > 0).to.equal(true)
        expect(multiaddrs[0].toString().indexOf('0.0.0.0')).to.equal(-1)
        // multiaddrs.forEach((ma) => {
        //  console.log(ma.toString())
        // })
        listener.close(done)
      })
    })
  })

  it('getAddrs preserves IPFS Id', (done) => {
    const mh = multiaddr('/ip4/127.0.0.1/tcp/9090/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
    const listener = tcp.createListener((conn) => {})
    listener.listen(mh, () => {
      listener.getAddrs((err, multiaddrs) => {
        expect(err).to.not.exist
        expect(multiaddrs.length).to.equal(1)
        // multiaddrs.forEach((ma) => {
        //  console.log(ma.toString())
        // })
        expect(multiaddrs[0]).to.deep.equal(mh)
        listener.close(done)
      })
    })
  })
})

describe('dial', () => {
  let tcp
  let listener
  const ma = multiaddr('/ip4/127.0.0.1/tcp/9090')

  beforeEach((done) => {
    tcp = new TCP()
    listener = tcp.createListener((conn) => {
      conn.pipe(conn)
    })
    listener.on('listening', done)
    listener.listen(ma)
  })

  afterEach((done) => {
    listener.close(done)
  })

  it('dial on IPv4', (done) => {
    const conn = tcp.dial(ma)
    conn.write('hey')
    conn.end()
    conn.on('data', (chunk) => {
      expect(chunk.toString()).to.equal('hey')
    })
    conn.on('end', done)
  })

  it('dial to non existent listener', (done) => {
    const ma = multiaddr('/ip4/127.0.0.1/tcp/8989')
    const conn = tcp.dial(ma)
    conn.on('error', (err) => {
      expect(err).to.exist
      done()
    })
  })

  it('dial on IPv6', (done) => {
    const ma = multiaddr('/ip6/::/tcp/9066')
    const listener = tcp.createListener((conn) => {
      conn.pipe(conn)
    })
    listener.listen(ma, dialStep)

    function dialStep () {
      const conn = tcp.dial(ma)
      conn.write('hey')
      conn.end()
      conn.on('data', (chunk) => {
        expect(chunk.toString()).to.equal('hey')
      })
      conn.on('end', () => {
        listener.close(done)
      })
    }
  })

  it('dial and destroy on listener', (done) => {
    let count = 0
    const closed = () => ++count === 2 ? finish() : null

    const ma = multiaddr('/ip6/::/tcp/9067')

    const listener = tcp.createListener((conn) => {
      conn.on('close', closed)
      conn.destroy()
    })

    listener.listen(ma, dialStep)

    function dialStep () {
      const conn = tcp.dial(ma)
      conn.on('close', closed)
    }

    function finish () {
      listener.close(done)
    }
  })

  it('dial and destroy on dialer', (done) => {
    let count = 0
    const destroyed = () => ++count === 2 ? finish() : null

    const ma = multiaddr('/ip6/::/tcp/9068')

    const listener = tcp.createListener((conn) => {
      conn.on('close', () => {
        console.log('closed on the listener socket')
        destroyed()
      })
    })

    listener.listen(ma, dialStep)

    function dialStep () {
      const conn = tcp.dial(ma)
      conn.on('close', () => {
        console.log('closed on the dialer socket')
        destroyed()
      })
      conn.resume()
      setTimeout(() => {
        conn.destroy()
      }, 10)
    }

    function finish () {
      listener.close(done)
    }
  })

  it('dial on IPv4 with IPFS Id', (done) => {
    const ma = multiaddr('/ip4/127.0.0.1/tcp/9090/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
    const conn = tcp.dial(ma)
    conn.write('hey')
    conn.end()
    conn.on('data', (chunk) => {
      expect(chunk.toString()).to.equal('hey')
    })
    conn.on('end', done)
  })
})

describe('filter addrs', () => {
  let tcp

  before(() => {
    tcp = new TCP()
  })

  it('filter valid addrs for this transport', (done) => {
    const mh1 = multiaddr('/ip4/127.0.0.1/tcp/9090')
    const mh2 = multiaddr('/ip4/127.0.0.1/udp/9090')
    const mh3 = multiaddr('/ip4/127.0.0.1/tcp/9090/http')
    const mh4 = multiaddr('/ip4/127.0.0.1/tcp/9090/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')

    const valid = tcp.filter([mh1, mh2, mh3, mh4])
    expect(valid.length).to.equal(2)
    expect(valid[0]).to.deep.equal(mh1)
    expect(valid[1]).to.deep.equal(mh4)
    done()
  })

  it('filter a single addr for this transport', (done) => {
    const mh1 = multiaddr('/ip4/127.0.0.1/tcp/9090')

    const valid = tcp.filter(mh1)
    expect(valid.length).to.equal(1)
    expect(valid[0]).to.deep.equal(mh1)
    done()
  })
})

describe('valid Connection', () => {
  let tcp

  beforeEach(() => {
    tcp = new TCP()
  })

  const ma = multiaddr('/ip4/127.0.0.1/tcp/9090')

  it('get observed addrs', (done) => {
    var dialerObsAddrs
    var listenerObsAddrs

    const listener = tcp.createListener((conn) => {
      expect(conn).to.exist
      conn.getObservedAddrs((err, addrs) => {
        expect(err).to.not.exist
        dialerObsAddrs = addrs
        conn.end()
      })
    })

    listener.listen(ma, () => {
      const conn = tcp.dial(ma)

      conn.resume()
      conn.on('end', () => {
        conn.getObservedAddrs((err, addrs) => {
          expect(err).to.not.exist
          listenerObsAddrs = addrs
          conn.end()

          listener.close(() => {
            expect(listenerObsAddrs[0]).to.deep.equal(ma)
            expect(dialerObsAddrs.length).to.equal(1)
            done()
          })
        })
      })
    })
  })

  it('get Peer Info', (done) => {
    const listener = tcp.createListener((conn) => {
      expect(conn).to.exist
      conn.getPeerInfo((err, peerInfo) => {
        expect(err).to.exist
        expect(peerInfo).to.not.exist
        conn.end()
      })
    })

    listener.listen(ma, () => {
      const conn = tcp.dial(ma)

      conn.resume()
      conn.on('end', () => {
        conn.getPeerInfo((err, peerInfo) => {
          expect(err).to.exist
          expect(peerInfo).to.not.exist
          conn.end()

          listener.close(done)
        })
      })
    })
  })

  it('set Peer Info', (done) => {
    const listener = tcp.createListener((conn) => {
      expect(conn).to.exist
      conn.setPeerInfo('batatas')
      conn.getPeerInfo((err, peerInfo) => {
        expect(err).to.not.exist
        expect(peerInfo).to.equal('batatas')
        conn.end()
      })
    })

    listener.listen(ma, () => {
      const conn = tcp.dial(ma)

      conn.resume()
      conn.on('end', () => {
        conn.setPeerInfo('arroz')
        conn.getPeerInfo((err, peerInfo) => {
          expect(err).to.not.exist
          expect(peerInfo).to.equal('arroz')
          conn.end()

          listener.close(done)
        })
      })
    })
  })
})

describe.skip('turbolence', () => {
  it('dialer - emits error on the other end is terminated abruptly', (done) => {})
  it('listener - emits error on the other end is terminated abruptly', (done) => {})
})

describe('Connection wrap', () => {
  let tcp
  let listener
  const ma = multiaddr('/ip4/127.0.0.1/tcp/9090')

  beforeEach((done) => {
    tcp = new TCP()
    listener = tcp.createListener((conn) => {
      conn.pipe(conn)
    })
    listener.on('listening', done)
    listener.listen(ma)
  })

  afterEach((done) => {
    listener.close(done)
  })

  it('simple wrap', (done) => {
    const conn = tcp.dial(ma)
    conn.setPeerInfo('peerInfo')
    const connWrap = new Connection(conn)
    connWrap.write('hey')
    connWrap.end()
    connWrap.on('data', (chunk) => {
      expect(chunk.toString()).to.equal('hey')
    })
    connWrap.on('end', () => {
      connWrap.getPeerInfo((err, peerInfo) => {
        expect(err).to.not.exist
        expect(peerInfo).to.equal('peerInfo')
        done()
      })
    })
  })

  it('buffer wrap', (done) => {
    const conn = tcp.dial(ma)
    const connWrap = new Connection()
    connWrap.write('hey')
    connWrap.end()
    connWrap.on('data', (chunk) => {
      expect(chunk.toString()).to.equal('hey')
    })
    connWrap.on('end', done)

    connWrap.setInnerConn(conn)
  })

  it('overload wrap', (done) => {
    const conn = tcp.dial(ma)
    const connWrap = new Connection(conn)
    connWrap.getPeerInfo = (callback) => {
      callback(null, 'none')
    }
    conn.getPeerInfo((err, peerInfo) => {
      expect(err).to.exist
    })
    connWrap.getPeerInfo((err, peerInfo) => {
      expect(err).to.not.exist
      expect(peerInfo).to.equal('none')
    })
    connWrap.write('hey')
    connWrap.end()
    connWrap.on('data', (chunk) => {
      expect(chunk.toString()).to.equal('hey')
    })
    connWrap.on('end', done)
  })

  it('matryoshka wrap', (done) => {
    const conn = tcp.dial(ma)
    const connWrap1 = new Connection(conn)
    const connWrap2 = new Connection(connWrap1)
    const connWrap3 = new Connection(connWrap2)

    conn.getPeerInfo = (callback) => {
      callback(null, 'inner doll')
    }

    connWrap3.write('hey')
    connWrap3.end()
    connWrap3.on('data', (chunk) => {
      expect(chunk.toString()).to.equal('hey')
    })
    connWrap3.on('end', () => {
      connWrap3.getPeerInfo((err, peerInfo) => {
        expect(err).to.not.exist
        expect(peerInfo).to.equal('inner doll')
        done()
      })
    })
  })
})
