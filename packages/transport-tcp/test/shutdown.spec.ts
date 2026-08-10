import net from 'node:net'
import { stop } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import Sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { tcp } from '../src/index.ts'
import type { Connection, Transport, Upgrader } from '@libp2p/interface'

class TestSocket extends net.Socket {
  destroyCalls = 0

  override destroy (error?: Error): this {
    this.destroyCalls++

    if (error != null) {
      this.emit('error', error)
    }

    return this
  }

  close (): void {
    this.emit('close', false)
  }
}

describe('shutdown', () => {
  afterEach(() => {
    Sinon.restore()
  })

  it('should destroy pending outbound sockets and await close', async () => {
    const socket = new TestSocket()
    const connect = Sinon.stub(net, 'connect').returns(socket)
    const transport = tcp()({
      logger: defaultLogger()
    })
    const upgrader = stubInterface<Upgrader>()
    const addr = multiaddr('/ip4/127.0.0.1/tcp/9000')
    const dialPromise = transport.dial(addr, {
      upgrader,
      signal: AbortSignal.timeout(5_000)
    })

    let stopped = false
    const stopPromise = stop(transport).then(() => {
      stopped = true
    })

    await Promise.resolve()

    expect(connect.calledOnce).to.be.true()
    expect(socket.destroyCalls).to.be.greaterThan(0)
    expect(stopped).to.be.false()

    socket.close()
    await stopPromise

    expect(stopped).to.be.true()
    await expect(dialPromise)
      .to.eventually.be.rejected()
      .and.to.have.property('name', 'AbortError')

    await expect(transport.dial(addr, {
      upgrader,
      signal: AbortSignal.timeout(5_000)
    }))
      .to.eventually.be.rejected()
      .and.to.have.property('name', 'NotStartedError')
    expect(connect.calledOnce).to.be.true()
  })

  it('should drain a dial created during reentrant shutdown', async () => {
    const socket = new TestSocket()
    const connect = Sinon.stub(net, 'connect').returns(socket)
    const transport = tcp()({
      logger: defaultLogger()
    })
    const upgrader = stubInterface<Upgrader>()
    const addr = multiaddr('/ip4/127.0.0.1/tcp/9000')
    let stopPromise: Promise<void> | undefined
    let stopped = false

    const dialPromise = transport.dial(addr, {
      upgrader,
      signal: AbortSignal.timeout(5_000),
      onProgress: () => {
        stopPromise = stop(transport).then(() => {
          stopped = true
        })
      }
    })

    if (stopPromise == null) {
      throw new Error('onProgress did not start transport shutdown')
    }

    try {
      await Promise.resolve()
      await Promise.resolve()

      expect(connect.calledOnce).to.be.true()
      expect(socket.destroyCalls).to.be.greaterThan(0)
      expect(stopped).to.be.false()

      socket.close()
      await stopPromise

      expect(stopped).to.be.true()
      await expect(dialPromise)
        .to.eventually.be.rejected()
        .and.to.have.property('name', 'AbortError')
    } finally {
      if (socket.destroyCalls === 0) {
        socket.emit('error', new Error('test cleanup'))
      }
      socket.close()
      await dialPromise.catch(() => {})
    }
  })

  it('should release dials that fail before creating a socket', async () => {
    const transport = tcp()({
      logger: defaultLogger()
    })
    const options = Object.freeze({
      upgrader: stubInterface<Upgrader>(),
      signal: AbortSignal.timeout(5_000)
    })

    await expect(transport.dial(multiaddr('/ip4/127.0.0.1/tcp/9000'), options))
      .to.eventually.be.rejected()
      .and.to.have.property('name', 'TypeError')
    await stop(transport)
  })

  it('should drain a dial when shutdown starts during DNS lookup', async () => {
    let stopPromise: Promise<void> | undefined
    const dialOpts: Omit<net.TcpSocketConnectOpts, 'port'> & { noDelay: boolean } = {
      noDelay: true
    }
    const transport: Transport = tcp({ dialOpts })({
      logger: defaultLogger()
    })
    dialOpts.lookup = (_hostname, _options, callback) => {
      stopPromise = stop(transport)
      callback(null, '127.0.0.1', 4)
    }
    const dialPromise = transport.dial(multiaddr('/dns4/example.com/tcp/9000'), {
      upgrader: stubInterface<Upgrader>(),
      signal: AbortSignal.timeout(5_000)
    })
    const dialErrorPromise = dialPromise.then(
      () => { throw new Error('dial unexpectedly succeeded') },
      (err: Error) => err
    )

    if (stopPromise == null) {
      throw new Error('DNS lookup did not start transport shutdown')
    }

    await stopPromise
    expect(await dialErrorPromise).to.have.property('name', 'AbortError')
  })

  it('should not close successfully upgraded sockets', async () => {
    const socket = new TestSocket()
    Sinon.stub(net, 'connect').returns(socket)
    const transport = tcp()({
      logger: defaultLogger()
    })
    const connection = stubInterface<Connection>()
    const upgrader = stubInterface<Upgrader>({
      upgradeOutbound: Sinon.stub().resolves(connection)
    })
    const dialPromise = transport.dial(multiaddr('/ip4/127.0.0.1/tcp/9000'), {
      upgrader,
      signal: AbortSignal.timeout(5_000)
    })

    socket.emit('connect')

    await expect(dialPromise).to.eventually.equal(connection)
    await stop(transport)

    expect(socket.destroyCalls).to.equal(0)
  })
})
