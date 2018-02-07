/* eslint-env mocha */
'use strict'

const pull = require('pull-stream')
const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const TCP = require('../src')
const net = require('net')
const multiaddr = require('multiaddr')
const isCI = process.env.CI

describe('instantiate the transport', () => {
  it('create', () => {
    const tcp = new TCP()
    expect(tcp).to.exist()
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
    if (isCI) { return done() }
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
        expect(err).to.not.exist()
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
        expect(err).to.not.exist()
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
        expect(err).to.not.exist()
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
        expect(err).to.not.exist()
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
        expect(err).to.not.exist()
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
        pull.map((x) => Buffer.from(x.toString() + '!')),
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
        expect(err).to.not.exist()
        expect(values).to.eql([Buffer.from('hey!')])
        done()
      })
    )
  })

  it('dial to non existent listener', (done) => {
    const ma = multiaddr('/ip4/127.0.0.1/tcp/8989')
    pull(
      tcp.dial(ma),
      pull.onEnd((err) => {
        expect(err).to.exist()
        done()
      })
    )
  })

  it('dial on IPv6', (done) => {
    if (isCI) { return done() }

    const ma = multiaddr('/ip6/::/tcp/9066')
    const listener = tcp.createListener((conn) => {
      pull(conn, conn)
    })
    listener.listen(ma, () => {
      pull(
        pull.values(['hey']),
        tcp.dial(ma),
        pull.collect((err, values) => {
          expect(err).to.not.exist()

          expect(values).to.be.eql([Buffer.from('hey')])

          listener.close(done)
        })
      )
    })
  })

  // TODO: figure out why is this failing
  it.skip('dial and destroy on listener', (done) => {
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
    if (isCI) { return done() }

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
        expect(err).to.not.exist()
        expect(res).to.be.eql([Buffer.from('hey!')])
        done()
      })
    )
  })
})

describe.skip('turbolence', () => {
  it('dialer - emits error on the other end is terminated abruptly', (done) => {})
  it('listener - emits error on the other end is terminated abruptly', (done) => {})
})
