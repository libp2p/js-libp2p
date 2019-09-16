/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const TCP = require('../src')
const net = require('net')
const multiaddr = require('multiaddr')
const pipe = require('it-pipe')
const { collect, map } = require('streaming-iterables')
const isCI = process.env.CI

describe('construction', () => {
  it('requires an upgrader', () => {
    expect(() => new TCP()).to.throw()
  })
})

describe('listen', () => {
  let tcp

  beforeEach(() => {
    tcp = new TCP({
      upgrader: {
        upgradeOutbound: maConn => maConn,
        upgradeInbound: maConn => maConn
      }
    })
  })

  it('close listener with connections, through timeout', async () => {
    const mh = multiaddr('/ip4/127.0.0.1/tcp/9090/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
    const listener = tcp.createListener((conn) => {
      pipe(conn, conn)
    })

    await listener.listen(mh)

    const socket1 = net.connect(9090)
    const socket2 = net.connect(9090)

    socket1.write('Some data that is never handled')
    socket1.end()
    socket1.on('error', () => {})
    socket2.on('error', () => {})

    await new Promise((resolve) => {
      socket1.on('connect', async () => {
        await listener.close({ timeout: 100 })
        resolve()
      })
    })
  })

  it('listen on port 0', async () => {
    const mh = multiaddr('/ip4/127.0.0.1/tcp/0')
    const listener = tcp.createListener((conn) => {})
    await listener.listen(mh)
    await listener.close()
  })

  it('listen on IPv6 addr', async () => {
    if (isCI) {
      return
    }
    const mh = multiaddr('/ip6/::/tcp/9090')
    const listener = tcp.createListener((conn) => {})
    await listener.listen(mh)
    await listener.close()
  })

  it('listen on any Interface', async () => {
    const mh = multiaddr('/ip4/0.0.0.0/tcp/9090')
    const listener = tcp.createListener((conn) => {})
    await listener.listen(mh)
    await listener.close()
  })

  it('getAddrs', async () => {
    const mh = multiaddr('/ip4/127.0.0.1/tcp/9090')
    const listener = tcp.createListener((conn) => {})
    await listener.listen(mh)

    const multiaddrs = listener.getAddrs()
    expect(multiaddrs.length).to.equal(1)
    expect(multiaddrs[0]).to.deep.equal(mh)

    await listener.close()
  })

  it('getAddrs on port 0 listen', async () => {
    const mh = multiaddr('/ip4/127.0.0.1/tcp/0')
    const listener = tcp.createListener((conn) => {})
    await listener.listen(mh)

    const multiaddrs = listener.getAddrs()
    expect(multiaddrs.length).to.equal(1)

    await listener.close()
  })

  it('getAddrs from listening on 0.0.0.0', async () => {
    const mh = multiaddr('/ip4/0.0.0.0/tcp/9090')
    const listener = tcp.createListener((conn) => {})
    await listener.listen(mh)

    const multiaddrs = listener.getAddrs()
    expect(multiaddrs.length > 0).to.equal(true)
    expect(multiaddrs[0].toString().indexOf('0.0.0.0')).to.equal(-1)

    await listener.close()
  })

  it('getAddrs from listening on 0.0.0.0 and port 0', async () => {
    const mh = multiaddr('/ip4/0.0.0.0/tcp/0')
    const listener = tcp.createListener((conn) => {})
    await listener.listen(mh)

    const multiaddrs = listener.getAddrs()
    expect(multiaddrs.length > 0).to.equal(true)
    expect(multiaddrs[0].toString().indexOf('0.0.0.0')).to.equal(-1)

    await listener.close()
  })

  it('getAddrs preserves IPFS Id', async () => {
    const mh = multiaddr('/ip4/127.0.0.1/tcp/9090/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
    const listener = tcp.createListener((conn) => {})
    await listener.listen(mh)

    const multiaddrs = listener.getAddrs()
    expect(multiaddrs.length).to.equal(1)
    expect(multiaddrs[0]).to.deep.equal(mh)

    await listener.close()
  })
})

describe('dial', () => {
  let tcp
  let listener
  const ma = multiaddr('/ip4/127.0.0.1/tcp/9090')

  beforeEach(async () => {
    tcp = new TCP({
      upgrader: {
        upgradeOutbound: maConn => maConn,
        upgradeInbound: maConn => maConn
      }
    })
    listener = tcp.createListener((conn) => {
      pipe(
        conn,
        map((x) => Buffer.from(x.toString() + '!')),
        conn
      )
    })
    await listener.listen(ma)
  })

  afterEach(() => listener.close())

  it('dial on IPv4', async () => {
    const values = await pipe(
      ['hey'],
      await tcp.dial(ma),
      collect
    )
    expect(values).to.eql([Buffer.from('hey!')])
  })

  it('dial on IPv6', async () => {
    if (isCI) {
      return
    }

    const ma = multiaddr('/ip6/::/tcp/9066')
    const listener = tcp.createListener((conn) => {
      pipe(conn, conn)
    })
    await listener.listen(ma)

    const values = await pipe(
      ['hey'],
      await tcp.dial(ma),
      collect
    )
    expect(values).to.be.eql([Buffer.from('hey')])

    await listener.close()
  })

  it('dial and destroy on listener', async () => {
    let handled
    const handledPromise = new Promise((resolve) => {
      handled = resolve
    })

    const ma = multiaddr('/ip6/::/tcp/0')

    const listener = tcp.createListener(async (conn) => {
      await pipe(
        [],
        conn
      )
      handled()
    })

    await listener.listen(ma)
    const addrs = listener.getAddrs()
    await pipe(await tcp.dial(addrs[0]))

    await handledPromise
    await listener.close()
  })

  it('dial and destroy on dialer', async () => {
    if (isCI) {
      return
    }

    let handled
    const handledPromise = new Promise((resolve) => {
      handled = resolve
    })

    const ma = multiaddr('/ip6/::/tcp/0')

    const listener = tcp.createListener(async (conn) => {
      // pull(conn, pull.onEnd(destroyed))
      await pipe(conn)
      handled()
    })

    await listener.listen(ma)
    const addrs = listener.getAddrs()
    await pipe(await tcp.dial(addrs[0]))

    await handledPromise
    await listener.close()
  })

  it('dial on IPv4 with IPFS Id', async () => {
    const ma = multiaddr('/ip4/127.0.0.1/tcp/9090/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
    const conn = await tcp.dial(ma)

    const res = await pipe(
      ['hey'],
      conn,
      collect
    )
    expect(res).to.be.eql([Buffer.from('hey!')])
  })
})
