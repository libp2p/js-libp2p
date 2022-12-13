import { expect } from 'aegir/chai'
import { tcp } from '../src/index.js'
import os from 'os'
import path from 'path'
import { multiaddr } from '@multiformats/multiaddr'
import { pipe } from 'it-pipe'
import all from 'it-all'
import { mockRegistrar, mockUpgrader } from '@libp2p/interface-mocks'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import type { Transport, Upgrader } from '@libp2p/interface-transport'
import pDefer from 'p-defer'
import type { MultiaddrConnection } from '@libp2p/interface-connection'

const isCI = process.env.CI

describe('listen', () => {
  let transport: Transport
  let listener: any
  let upgrader: Upgrader

  beforeEach(() => {
    transport = tcp()()
    upgrader = mockUpgrader()
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

  it('listen on path', async () => {
    const mh = multiaddr(`/unix/${path.resolve(os.tmpdir(), `/tmp/p2pd-${Date.now()}.sock`)}`)

    listener = transport.createListener({
      upgrader
    })
    await listener.listen(mh)
  })

  it('listen on port 0', async () => {
    const mh = multiaddr('/ip4/127.0.0.1/tcp/0')
    listener = transport.createListener({
      upgrader
    })
    await listener.listen(mh)
  })

  it('errors when listening on busy port', async () => {
    const mh = multiaddr('/ip4/127.0.0.1/tcp/0')
    listener = transport.createListener({
      upgrader
    })
    await listener.listen(mh)

    const listener2 = transport.createListener({
      upgrader
    })

    const mh2 = listener.getAddrs()[0]
    await expect(listener2.listen(mh2)).to.eventually.be.rejected()
      .with.property('code', 'EADDRINUSE')
  })

  it('listen on IPv6 addr', async () => {
    if (isCI != null) {
      return
    }
    const mh = multiaddr('/ip6/::/tcp/9090')
    listener = transport.createListener({
      upgrader
    })
    await listener.listen(mh)
  })

  it('listen on any Interface', async () => {
    const mh = multiaddr('/ip4/0.0.0.0/tcp/9090')
    listener = transport.createListener({
      upgrader
    })
    await listener.listen(mh)
  })

  it('getAddrs', async () => {
    const mh = multiaddr('/ip4/127.0.0.1/tcp/9090')
    listener = transport.createListener({
      upgrader
    })
    await listener.listen(mh)

    const multiaddrs = listener.getAddrs()
    expect(multiaddrs.length).to.equal(1)
    expect(multiaddrs[0]).to.deep.equal(mh)
  })

  it('getAddrs on port 0 listen', async () => {
    const mh = multiaddr('/ip4/127.0.0.1/tcp/0')
    listener = transport.createListener({
      upgrader
    })
    await listener.listen(mh)

    const multiaddrs = listener.getAddrs()
    expect(multiaddrs.length).to.equal(1)
  })

  it('getAddrs from listening on 0.0.0.0', async () => {
    const mh = multiaddr('/ip4/0.0.0.0/tcp/9090')
    listener = transport.createListener({
      upgrader
    })
    await listener.listen(mh)

    const multiaddrs = listener.getAddrs()
    expect(multiaddrs.length > 0).to.equal(true)
    expect(multiaddrs[0].toString().indexOf('0.0.0.0')).to.equal(-1)
  })

  it('getAddrs from listening on 0.0.0.0 and port 0', async () => {
    const mh = multiaddr('/ip4/0.0.0.0/tcp/0')
    listener = transport.createListener({
      upgrader
    })
    await listener.listen(mh)

    const multiaddrs = listener.getAddrs()
    expect(multiaddrs.length > 0).to.equal(true)
    expect(multiaddrs[0].toString().indexOf('0.0.0.0')).to.equal(-1)
  })

  it('getAddrs from listening on ip6 \'::\'', async () => {
    const mh = multiaddr('/ip6/::/tcp/9090')
    listener = transport.createListener({
      upgrader
    })
    await listener.listen(mh)

    const multiaddrs = listener.getAddrs()
    expect(multiaddrs.length > 0).to.equal(true)
    expect(multiaddrs[0].toOptions().host).to.not.equal('::')
  })

  it('getAddrs preserves IPFS Id', async () => {
    const mh = multiaddr('/ip4/127.0.0.1/tcp/9090/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
    listener = transport.createListener({
      upgrader
    })
    await listener.listen(mh)

    const multiaddrs = listener.getAddrs()
    expect(multiaddrs.length).to.equal(1)
    expect(multiaddrs[0]).to.deep.equal(mh)
  })
})

describe('dial', () => {
  const protocol = '/echo/1.0.0'
  let transport: Transport
  let upgrader: Upgrader

  beforeEach(async () => {
    const registrar = mockRegistrar()
    void registrar.handle(protocol, (evt) => {
      void pipe(
        evt.stream,
        evt.stream
      )
    })
    upgrader = mockUpgrader({
      registrar
    })

    transport = tcp()()
  })

  it('dial on IPv4', async () => {
    const ma = multiaddr('/ip4/127.0.0.1/tcp/9090')
    const listener = transport.createListener({
      upgrader
    })
    await listener.listen(ma)

    const conn = await transport.dial(ma, {
      upgrader
    })
    const stream = await conn.newStream([protocol])

    const values = await pipe(
      [uint8ArrayFromString('hey')],
      stream,
      async (source) => await all(source)
    )

    expect(values[0].subarray()).to.equalBytes(uint8ArrayFromString('hey'))
    await conn.close()
    await listener.close()
  })

  it('dial on IPv6', async () => {
    if (isCI != null) {
      return
    }

    const ma = multiaddr('/ip6/::/tcp/9090')
    const listener = transport.createListener({
      upgrader
    })
    await listener.listen(ma)
    const conn = await transport.dial(ma, {
      upgrader
    })
    const stream = await conn.newStream([protocol])

    const values = await pipe(
      [uint8ArrayFromString('hey')],
      stream,
      async (source) => await all(source)
    )
    expect(values[0].subarray()).to.equalBytes(uint8ArrayFromString('hey'))
    await conn.close()
    await listener.close()
  })

  it('dial on path', async () => {
    const ma = multiaddr(`/unix/${path.resolve(os.tmpdir(), `/tmp/p2pd-${Date.now()}.sock`)}`)

    const listener = transport.createListener({
      upgrader
    })
    await listener.listen(ma)
    const conn = await transport.dial(ma, {
      upgrader
    })
    const stream = await conn.newStream([protocol])

    const values = await pipe(
      [uint8ArrayFromString('hey')],
      stream,
      async (source) => await all(source)
    )

    expect(values[0].subarray()).to.equalBytes(uint8ArrayFromString('hey'))
    await conn.close()
    await listener.close()
  })

  it('dial and destroy on listener', async () => {
    let handled: () => void
    const handledPromise = new Promise<void>(resolve => { handled = resolve })

    const ma = multiaddr('/ip6/::/tcp/9090')

    const listener = transport.createListener({
      handler: (conn) => {
        // let multistream select finish before closing
        setTimeout(() => {
          void conn.close()
            .then(() => handled())
        }, 100)
      },
      upgrader
    })

    await listener.listen(ma)
    const addrs = listener.getAddrs()

    const conn = await transport.dial(addrs[0], {
      upgrader
    })
    const stream = await conn.newStream([protocol])
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

    const ma = multiaddr('/ip6/::/tcp/9090')

    const listener = transport.createListener({
      handler: () => {
        handled()
      },
      upgrader
    })

    await listener.listen(ma)
    const addrs = listener.getAddrs()
    const conn = await transport.dial(addrs[0], {
      upgrader
    })

    await conn.close()
    await handledPromise
    await listener.close()
  })

  it('dials on IPv4 with IPFS Id', async () => {
    const ma = multiaddr('/ip4/127.0.0.1/tcp/9090/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
    const listener = transport.createListener({
      upgrader
    })
    await listener.listen(ma)

    const conn = await transport.dial(ma, {
      upgrader
    })
    const stream = await conn.newStream([protocol])

    const values = await pipe(
      [uint8ArrayFromString('hey')],
      stream,
      async (source) => await all(source)
    )
    expect(values[0].subarray()).to.equalBytes(uint8ArrayFromString('hey'))

    await conn.close()
    await listener.close()
  })

  it('aborts during dial', async () => {
    const ma = multiaddr('/ip4/127.0.0.1/tcp/9090/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
    const maConnPromise = pDefer<MultiaddrConnection>()

    // @ts-expect-error missing return value
    upgrader.upgradeOutbound = async (maConn) => {
      maConnPromise.resolve(maConn)

      // take a long time to give us time to abort the dial
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 100)
      })
    }

    const listener = transport.createListener({
      upgrader
    })
    await listener.listen(ma)

    const abortController = new AbortController()

    // abort once the upgrade process has started
    void maConnPromise.promise.then(() => abortController.abort())

    await expect(transport.dial(ma, {
      upgrader,
      signal: abortController.signal
    })).to.eventually.be.rejected('The operation was aborted')

    await expect(maConnPromise.promise).to.eventually.have.nested.property('timeline.close')
      .that.is.ok('did not gracefully close maConn')

    await listener.close()
  })

  it('aborts before dial', async () => {
    const ma = multiaddr('/ip4/127.0.0.1/tcp/9090/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
    const listener = transport.createListener({
      upgrader
    })
    await listener.listen(ma)

    const abortController = new AbortController()
    abortController.abort()

    await expect(transport.dial(ma, {
      upgrader,
      signal: abortController.signal
    })).to.eventually.be.rejected('The operation was aborted')

    await listener.close()
  })
})
