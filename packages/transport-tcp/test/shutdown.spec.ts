import net from 'node:net'
import { stop } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import Sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { tcp } from '../src/index.ts'
import type { Connection, Upgrader } from '@libp2p/interface'

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

  it('should drain a dial created reentrantly during shutdown', async () => {
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
