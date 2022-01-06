import { expect } from 'aegir/utils/chai.js'
import { TCP } from '../src/index.js'
import os from 'os'
import path from 'path'
import { Multiaddr } from '@multiformats/multiaddr'
import pipe from 'it-pipe'
import { collect } from 'streaming-iterables'
import { mockUpgrader } from '@libp2p/interface-compliance-tests/transport/utils'

const isCI = process.env.CI

describe('construction', () => {
  it('requires an upgrader', () => {
    // @ts-expect-error missing args
    expect(() => new TCP()).to.throw()
  })
})

describe('listen', () => {
  let tcp: TCP
  let listener: any

  beforeEach(() => {
    tcp = new TCP({
      upgrader: mockUpgrader()
    })
  })
  afterEach(async () => {
    try {
      if (listener != null) {
        await listener.close()
      }
    } catch {
      // some tests close the listener so ignore errors
    }
  })

  // TCP doesn't support unix paths
  it.skip('listen on path', async () => {
    const mh = new Multiaddr(`/unix${path.resolve(os.tmpdir(), `/tmp/p2pd-${Date.now()}.sock`)}`)

    listener = tcp.createListener({})
    await listener.listen(mh)
  })

  it('listen on port 0', async () => {
    const mh = new Multiaddr('/ip4/127.0.0.1/tcp/0')
    listener = tcp.createListener({})
    await listener.listen(mh)
  })

  it('listen on IPv6 addr', async () => {
    if (isCI != null) {
      return
    }
    const mh = new Multiaddr('/ip6/::/tcp/9090')
    listener = tcp.createListener({})
    await listener.listen(mh)
  })

  it('listen on any Interface', async () => {
    const mh = new Multiaddr('/ip4/0.0.0.0/tcp/9090')
    listener = tcp.createListener({})
    await listener.listen(mh)
  })

  it('getAddrs', async () => {
    const mh = new Multiaddr('/ip4/127.0.0.1/tcp/9090')
    listener = tcp.createListener({})
    await listener.listen(mh)

    const multiaddrs = listener.getAddrs()
    expect(multiaddrs.length).to.equal(1)
    expect(multiaddrs[0]).to.deep.equal(mh)
  })

  it('getAddrs on port 0 listen', async () => {
    const mh = new Multiaddr('/ip4/127.0.0.1/tcp/0')
    listener = tcp.createListener({})
    await listener.listen(mh)

    const multiaddrs = listener.getAddrs()
    expect(multiaddrs.length).to.equal(1)
  })

  it('getAddrs from listening on 0.0.0.0', async () => {
    const mh = new Multiaddr('/ip4/0.0.0.0/tcp/9090')
    listener = tcp.createListener({})
    await listener.listen(mh)

    const multiaddrs = listener.getAddrs()
    expect(multiaddrs.length > 0).to.equal(true)
    expect(multiaddrs[0].toString().indexOf('0.0.0.0')).to.equal(-1)
  })

  it('getAddrs from listening on 0.0.0.0 and port 0', async () => {
    const mh = new Multiaddr('/ip4/0.0.0.0/tcp/0')
    listener = tcp.createListener({})
    await listener.listen(mh)

    const multiaddrs = listener.getAddrs()
    expect(multiaddrs.length > 0).to.equal(true)
    expect(multiaddrs[0].toString().indexOf('0.0.0.0')).to.equal(-1)
  })

  it('getAddrs preserves IPFS Id', async () => {
    const mh = new Multiaddr('/ip4/127.0.0.1/tcp/9090/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
    listener = tcp.createListener({})
    await listener.listen(mh)

    const multiaddrs = listener.getAddrs()
    expect(multiaddrs.length).to.equal(1)
    expect(multiaddrs[0]).to.deep.equal(mh)
  })
})

describe('dial', () => {
  let tcp: TCP

  beforeEach(async () => {
    tcp = new TCP({
      upgrader: mockUpgrader()
    })
  })

  it('dial on IPv4', async () => {
    const ma = new Multiaddr('/ip4/127.0.0.1/tcp/9090')
    const listener = tcp.createListener({})
    await listener.listen(ma)

    const conn = await tcp.dial(ma)
    const { stream } = await conn.newStream(['/test/stream'])

    const values = await pipe(
      ['hey'],
      stream,
      collect
    )

    expect(values).to.deep.equal(['hey'])
    await conn.close()
    await listener.close()
  })

  it('dial on IPv6', async () => {
    if (isCI != null) {
      return
    }

    const ma = new Multiaddr('/ip6/::/tcp/9090')
    const listener = tcp.createListener({})
    await listener.listen(ma)
    const conn = await tcp.dial(ma)
    const { stream } = await conn.newStream(['/test/stream'])

    const values = await pipe(
      ['hey'],
      stream,
      collect
    )
    expect(values).to.deep.equal(['hey'])
    await conn.close()
    await listener.close()
  })

  // TCP doesn't support unix paths
  it.skip('dial on path', async () => {
    const ma = new Multiaddr(`/unix${path.resolve(os.tmpdir(), `/tmp/p2pd-${Date.now()}.sock`)}`)

    const listener = tcp.createListener({})
    await listener.listen(ma)
    const conn = await tcp.dial(ma)
    const { stream } = await conn.newStream(['/test/stream'])

    const values = await pipe(
      ['hey'],
      stream,
      collect
    )

    expect(values).to.deep.equal(['hey'])
    await conn.close()
    await listener.close()
  })

  it('dial and destroy on listener', async () => {
    let handled: () => void
    const handledPromise = new Promise<void>(resolve => { handled = resolve })

    const ma = new Multiaddr('/ip6/::/tcp/9090')

    const listener = tcp.createListener({}, (conn) => {
      conn.close().then(() => handled()).catch(() => {})
    })

    await listener.listen(ma)
    const addrs = listener.getAddrs()

    const conn = await tcp.dial(addrs[0])
    const { stream } = await conn.newStream(['/test/stream'])
    await pipe(stream)

    await handledPromise
    await conn.close()
    await listener.close()
  })

  it('dial and destroy on dialer', async () => {
    if (isCI != null) {
      return
    }

    let handled: () => void
    const handledPromise = new Promise<void>(resolve => { handled = resolve })

    const ma = new Multiaddr('/ip6/::/tcp/9090')

    const listener = tcp.createListener({}, () => {
      handled()
    })

    await listener.listen(ma)
    const addrs = listener.getAddrs()
    const conn = await tcp.dial(addrs[0])

    await conn.close()
    await handledPromise
    await listener.close()
  })

  it('dials on IPv4 with IPFS Id', async () => {
    const ma = new Multiaddr('/ip4/127.0.0.1/tcp/9090/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
    const listener = tcp.createListener({})
    await listener.listen(ma)

    const conn = await tcp.dial(ma)
    const { stream } = await conn.newStream(['/test/stream'])

    const values = await pipe(
      ['hey'],
      stream,
      collect
    )
    expect(values).to.deep.equal(['hey'])

    await conn.close()
    await listener.close()
  })
})
