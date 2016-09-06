/* eslint-env mocha */
'use strict'

const pull = require('pull-stream')
const expect = require('chai').expect
const TCP = require('../src')
const net = require('net')
const multiaddr = require('multiaddr')
const Connection = require('interface-connection').Connection

describe('instantiate the transport', () => {
  it('create', () => {
    const tcp = new TCP()
    expect(tcp).to.exist
  })
})

describe('listen', () => {
  let tcp

  beforeEach(() => {
    tcp = new TCP()
  })

  it('close listener with connections, through timeout', (done) => {
    const mh = multiaddr('/ip4/127.0.0.1/tcp/9090/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
    const listener = tcp.createListener((conn) => {
      pull(conn, conn)
    })

    listener.listen(mh, () => {
      const socket1 = net.connect(9090)
      const socket2 = net.connect(9090)

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
      pull(
        conn,
        pull.map((x) => new Buffer(x.toString() + '!')),
        conn
      )
    })
    listener.listen(ma, done)
  })

  afterEach((done) => {
    listener.close(done)
  })

  it('dial on IPv4', (done) => {
    pull(
      pull.values(['hey']),
      tcp.dial(ma),
      pull.collect((err, values) => {
        expect(err).to.not.exist
        expect(
          values
        ).to.be.eql(
          [new Buffer('hey!')]
        )
        done()
      })
    )
  })

  it('dial to non existent listener', (done) => {
    const ma = multiaddr('/ip4/127.0.0.1/tcp/8989')
    pull(
      tcp.dial(ma),
      pull.onEnd((err) => {
        expect(err).to.exist
        done()
      })
    )
  })

  it('dial on IPv6', (done) => {
    const ma = multiaddr('/ip6/::/tcp/9066')
    const listener = tcp.createListener((conn) => {
      pull(conn, conn)
    })
    listener.listen(ma, () => {
      pull(
        pull.values(['hey']),
        tcp.dial(ma),
        pull.collect((err, values) => {
          expect(err).to.not.exist

          expect(
            values
          ).to.be.eql([
            new Buffer('hey')
          ])

          listener.close(done)
        })
      )
    })
  })

  it.skip('dial and destroy on listener', (done) => {
    // TODO: why is this failing
    let count = 0
    const closed = ++count === 2 ? finish() : null

    const ma = multiaddr('/ip6/::/tcp/9067')

    const listener = tcp.createListener((conn) => {
      pull(
        pull.empty(),
        conn,
        pull.onEnd(closed)
      )
    })

    listener.listen(ma, () => {
      pull(tcp.dial(ma), pull.onEnd(closed))
    })

    function finish () {
      listener.close(done)
    }
  })

  it('dial and destroy on dialer', (done) => {
    let count = 0
    const destroyed = () => ++count === 2 ? finish() : null

    const ma = multiaddr('/ip6/::/tcp/9068')

    const listener = tcp.createListener((conn) => {
      pull(conn, pull.onEnd(destroyed))
    })

    listener.listen(ma, () => {
      pull(
        pull.empty(),
        tcp.dial(ma),
        pull.onEnd(destroyed)
      )
    })

    function finish () {
      listener.close(done)
    }
  })

  it('dial on IPv4 with IPFS Id', (done) => {
    const ma = multiaddr('/ip4/127.0.0.1/tcp/9090/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
    const conn = tcp.dial(ma)

    pull(
      pull.values(['hey']),
      conn,
      pull.collect((err, res) => {
        expect(err).to.not.exist
        expect(res).to.be.eql([new Buffer('hey!')])
        done()
      })
    )
  })
})

describe('filter addrs', () => {
  let tcp

  before(() => {
    tcp = new TCP()
  })

  it('filter valid addrs for this transport', () => {
    const mh1 = multiaddr('/ip4/127.0.0.1/tcp/9090')
    const mh2 = multiaddr('/ip4/127.0.0.1/udp/9090')
    const mh3 = multiaddr('/ip4/127.0.0.1/tcp/9090/http')
    const mh4 = multiaddr('/ip4/127.0.0.1/tcp/9090/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')

    const valid = tcp.filter([mh1, mh2, mh3, mh4])
    expect(valid.length).to.equal(2)
    expect(valid[0]).to.deep.equal(mh1)
    expect(valid[1]).to.deep.equal(mh4)
  })

  it('filter a single addr for this transport', () => {
    const mh1 = multiaddr('/ip4/127.0.0.1/tcp/9090')

    const valid = tcp.filter(mh1)
    expect(valid.length).to.equal(1)
    expect(valid[0]).to.deep.equal(mh1)
  })
})

describe('valid Connection', () => {
  let tcp

  beforeEach(() => {
    tcp = new TCP()
  })

  const ma = multiaddr('/ip4/127.0.0.1/tcp/9090')

  it('get observed addrs', (done) => {
    let dialerObsAddrs

    const listener = tcp.createListener((conn) => {
      expect(conn).to.exist
      conn.getObservedAddrs((err, addrs) => {
        expect(err).to.not.exist
        dialerObsAddrs = addrs
        pull(pull.empty(), conn)
      })
    })

    listener.listen(ma, () => {
      const conn = tcp.dial(ma)
      pull(
        conn,
        pull.onEnd(endHandler)
      )

      function endHandler () {
        conn.getObservedAddrs((err, addrs) => {
          expect(err).to.not.exist
          pull(pull.empty(), conn)
          closeAndAssert(listener, addrs)
        })
      }

      function closeAndAssert (listener, addrs) {
        listener.close(() => {
          expect(addrs[0]).to.deep.equal(ma)
          expect(dialerObsAddrs.length).to.equal(1)
          done()
        })
      }
    })
  })

  it('get Peer Info', (done) => {
    const listener = tcp.createListener((conn) => {
      expect(conn).to.exist
      conn.getPeerInfo((err, peerInfo) => {
        expect(err).to.exist
        expect(peerInfo).to.not.exist
        pull(pull.empty(), conn)
      })
    })

    listener.listen(ma, () => {
      const conn = tcp.dial(ma)

      pull(conn, pull.onEnd(endHandler))
      function endHandler () {
        conn.getPeerInfo((err, peerInfo) => {
          expect(err).to.exist
          expect(peerInfo).to.not.exist

          listener.close(done)
        })
      }
    })
  })

  it('set Peer Info', (done) => {
    const listener = tcp.createListener((conn) => {
      expect(conn).to.exist
      conn.setPeerInfo('batatas')
      conn.getPeerInfo((err, peerInfo) => {
        expect(err).to.not.exist
        expect(peerInfo).to.equal('batatas')
        pull(pull.empty(), conn)
      })
    })

    listener.listen(ma, () => {
      const conn = tcp.dial(ma)

      pull(conn, pull.onEnd(endHandler))
      function endHandler () {
        conn.setPeerInfo('arroz')
        conn.getPeerInfo((err, peerInfo) => {
          expect(err).to.not.exist
          expect(peerInfo).to.equal('arroz')

          listener.close(done)
        })
      }
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
      pull(conn, conn)
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
    pull(
      pull.values(['hey']),
      connWrap,
      pull.collect((err, chunks) => {
        expect(err).to.not.exist
        expect(chunks).to.be.eql([new Buffer('hey')])

        connWrap.getPeerInfo((err, peerInfo) => {
          expect(err).to.not.exist
          expect(peerInfo).to.equal('peerInfo')
          done()
        })
      })
    )
  })

  it('buffer wrap', (done) => {
    const conn = tcp.dial(ma)
    const connWrap = new Connection()
    pull(
      pull.values(['hey']),
      connWrap,
      pull.collect((err, chunks) => {
        expect(err).to.not.exist
        expect(chunks).to.be.eql([new Buffer('hey')])
        done()
      })
    )

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
    pull(
      pull.values(['hey']),
      connWrap,
      pull.collect((err, chunks) => {
        expect(err).to.not.exist
        expect(chunks).to.be.eql([new Buffer('hey')])
        done()
      })
    )
  })

  it('matryoshka wrap', (done) => {
    const conn = tcp.dial(ma)
    const connWrap1 = new Connection(conn)
    const connWrap2 = new Connection(connWrap1)
    const connWrap3 = new Connection(connWrap2)

    conn.getPeerInfo = (callback) => {
      callback(null, 'inner doll')
    }
    pull(
      pull.values(['hey']),
      connWrap3,
      pull.collect((err, chunks) => {
        expect(err).to.not.exist
        expect(chunks).to.be.eql([new Buffer('hey')])
        connWrap3.getPeerInfo((err, peerInfo) => {
          expect(err).to.not.exist
          expect(peerInfo).to.equal('inner doll')
          done()
        })
      })
    )
  })
})
