import { expect } from 'aegir/chai'
import { TCP } from '../src/index.js'
import os from 'os'
import path from 'path'
import { Multiaddr } from '@multiformats/multiaddr'
import { pipe } from 'it-pipe'
import all from 'it-all'
import { mockRegistrar, mockUpgrader } from '@libp2p/interface-compliance-tests/mocks'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import type { Upgrader } from '@libp2p/interfaces/transport'

const isCI = process.env.CI

describe('listen', () => {
  let tcp: TCP
  let listener: any
  let upgrader: Upgrader

  beforeEach(() => {
    tcp = new TCP()
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

  // TCP doesn't support unix paths
  it.skip('listen on path', async () => {
    const mh = new Multiaddr(`/unix${path.resolve(os.tmpdir(), `/tmp/p2pd-${Date.now()}.sock`)}`)

    listener = tcp.createListener({
      upgrader
    })
    await listener.listen(mh)
  })

  it('listen on port 0', async () => {
    const mh = new Multiaddr('/ip4/127.0.0.1/tcp/0')
    listener = tcp.createListener({
      upgrader
    })
    await listener.listen(mh)
  })

  it('listen on IPv6 addr', async () => {
    if (isCI != null) {
      return
    }
    const mh = new Multiaddr('/ip6/::/tcp/9090')
    listener = tcp.createListener({
      upgrader
    })
    await listener.listen(mh)
  })

  it('listen on any Interface', async () => {
    const mh = new Multiaddr('/ip4/0.0.0.0/tcp/9090')
    listener = tcp.createListener({
      upgrader
    })
    await listener.listen(mh)
  })

  it('getAddrs', async () => {
    const mh = new Multiaddr('/ip4/127.0.0.1/tcp/9090')
    listener = tcp.createListener({
      upgrader
    })
    await listener.listen(mh)

    const multiaddrs = listener.getAddrs()
    expect(multiaddrs.length).to.equal(1)
    expect(multiaddrs[0]).to.deep.equal(mh)
  })

  it('getAddrs on port 0 listen', async () => {
    const mh = new Multiaddr('/ip4/127.0.0.1/tcp/0')
    listener = tcp.createListener({
      upgrader
    })
    await listener.listen(mh)

    const multiaddrs = listener.getAddrs()
    expect(multiaddrs.length).to.equal(1)
  })

  it('getAddrs from listening on 0.0.0.0', async () => {
    const mh = new Multiaddr('/ip4/0.0.0.0/tcp/9090')
    listener = tcp.createListener({
      upgrader
    })
    await listener.listen(mh)

    const multiaddrs = listener.getAddrs()
    expect(multiaddrs.length > 0).to.equal(true)
    expect(multiaddrs[0].toString().indexOf('0.0.0.0')).to.equal(-1)
  })

  it('getAddrs from listening on 0.0.0.0 and port 0', async () => {
    const mh = new Multiaddr('/ip4/0.0.0.0/tcp/0')
    listener = tcp.createListener({
      upgrader
    })
    await listener.listen(mh)

    const multiaddrs = listener.getAddrs()
    expect(multiaddrs.length > 0).to.equal(true)
    expect(multiaddrs[0].toString().indexOf('0.0.0.0')).to.equal(-1)
  })

  it('getAddrs preserves IPFS Id', async () => {
    const mh = new Multiaddr('/ip4/127.0.0.1/tcp/9090/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
    listener = tcp.createListener({
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
  let tcp: TCP
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

    tcp = new TCP()
  })

  it('dial on IPv4', async () => {
    const ma = new Multiaddr('/ip4/127.0.0.1/tcp/9090')
    const listener = tcp.createListener({
      upgrader
    })
    await listener.listen(ma)

    const conn = await tcp.dial(ma, {
      upgrader
    })
    const { stream } = await conn.newStream([protocol])

    const values = await pipe(
      [uint8ArrayFromString('hey')],
      stream,
      async (source) => await all(source)
    )

    expect(values[0]).to.equalBytes(uint8ArrayFromString('hey'))
    await conn.close()
    await listener.close()
  })

  it('dial on IPv6', async () => {
    if (isCI != null) {
      return
    }

    const ma = new Multiaddr('/ip6/::/tcp/9090')
    const listener = tcp.createListener({
      upgrader
    })
    await listener.listen(ma)
    const conn = await tcp.dial(ma, {
      upgrader
    })
    const { stream } = await conn.newStream([protocol])

    const values = await pipe(
      [uint8ArrayFromString('hey')],
      stream,
      async (source) => await all(source)
    )
    expect(values[0]).to.equalBytes(uint8ArrayFromString('hey'))
    await conn.close()
    await listener.close()
  })

  // TCP doesn't support unix paths
  it.skip('dial on path', async () => {
    const ma = new Multiaddr(`/unix${path.resolve(os.tmpdir(), `/tmp/p2pd-${Date.now()}.sock`)}`)

    const listener = tcp.createListener({
      upgrader
    })
    await listener.listen(ma)
    const conn = await tcp.dial(ma, {
      upgrader
    })
    const { stream } = await conn.newStream([protocol])

    const values = await pipe(
      [uint8ArrayFromString('hey')],
      stream,
      async (source) => await all(source)
    )

    expect(values).to.deep.equal(['hey'])
    await conn.close()
    await listener.close()
  })

  it('dial and destroy on listener', async () => {
    let handled: () => void
    const handledPromise = new Promise<void>(resolve => { handled = resolve })

    const ma = new Multiaddr('/ip6/::/tcp/9090')

    const listener = tcp.createListener({
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

    const conn = await tcp.dial(addrs[0], {
      upgrader
    })
    const { stream } = await conn.newStream([protocol])
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

    const listener = tcp.createListener({
      handler: () => {
        handled()
      },
      upgrader
    })

    await listener.listen(ma)
    const addrs = listener.getAddrs()
    const conn = await tcp.dial(addrs[0], {
      upgrader
    })

    await conn.close()
    await handledPromise
    await listener.close()
  })

  it('dials on IPv4 with IPFS Id', async () => {
    const ma = new Multiaddr('/ip4/127.0.0.1/tcp/9090/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
    const listener = tcp.createListener({
      upgrader
    })
    await listener.listen(ma)

    const conn = await tcp.dial(ma, {
      upgrader
    })
    const { stream } = await conn.newStream([protocol])

    const values = await pipe(
      [uint8ArrayFromString('hey')],
      stream,
      async (source) => await all(source)
    )
    expect(values[0]).to.equalBytes(uint8ArrayFromString('hey'))

    await conn.close()
    await listener.close()
  })
})
