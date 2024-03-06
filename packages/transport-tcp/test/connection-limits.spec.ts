import net from 'node:net'
import { promisify } from 'util'
import { TypedEventEmitter } from '@libp2p/interface'
import { mockUpgrader } from '@libp2p/interface-compliance-tests/mocks'
import { defaultLogger } from '@libp2p/logger'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { tcp } from '../src/index.js'
import type { TCPListener } from '../src/listener.js'

const buildSocketAssertions = (port: number, closeCallbacks: Array<() => Promise<any> | any>): { assertConnectedSocket(i: number): Promise<net.Socket>, assertRefusedSocket(i: number): Promise<net.Socket> } => {
  function createSocket (i: number): net.Socket {
    const socket = net.connect({ host: '127.0.0.1', port })

    closeCallbacks.unshift(async function closeHandler (): Promise<void> {
      if (!socket.destroyed) {
        socket.destroy()
        await new Promise((resolve) => socket.on('close', resolve))
      }
    })
    return socket
  }

  async function assertConnectedSocket (i: number): Promise<net.Socket> {
    const socket = createSocket(i)

    await new Promise<void>((resolve, reject) => {
      socket.once('connect', () => {
        resolve()
      })
      socket.once('error', (err) => {
        err.message = `Socket[${i}] ${err.message}`
        reject(err)
      })
    })

    return socket
  }

  async function assertRefusedSocket (i: number): Promise<net.Socket> {
    const socket = createSocket(i)

    await new Promise<void>((resolve, reject) => {
      socket.once('connect', () => {
        reject(Error(`Socket[${i}] connected but was expected to reject`))
      })
      socket.once('error', (err) => {
        if (err.message.includes('ECONNREFUSED')) {
          resolve()
        } else {
          err.message = `Socket[${i}] unexpected error ${err.message}`
          reject(err)
        }
      })
    })

    return socket
  }

  return { assertConnectedSocket, assertRefusedSocket }
}

async function assertServerConnections (listener: TCPListener, connections: number): Promise<void> {
  // Expect server connections but allow time for sockets to connect or disconnect
  for (let i = 0; i < 100; i++) {
    // eslint-disable-next-line @typescript-eslint/dot-notation
    if (listener['connections'].size === connections) {
      return
    } else {
      await promisify(setTimeout)(10)
    }
  }
  // eslint-disable-next-line @typescript-eslint/dot-notation
  expect(listener['connections'].size).equals(connections, 'invalid amount of server connections')
}

describe('closeAbove/listenBelow', () => {
  const afterEachCallbacks: Array<() => Promise<any> | any> = []
  afterEach(async () => {
    await Promise.all(afterEachCallbacks.map(fn => fn()))
    afterEachCallbacks.length = 0
  })

  it('reject dial of connection above closeAbove', async () => {
    const listenBelow = 2
    const closeAbove = 3
    const port = 9900

    const trasnport = tcp({ closeServerOnMaxConnections: { listenBelow, closeAbove } })({
      logger: defaultLogger()
    })

    const upgrader = mockUpgrader({
      events: new TypedEventEmitter()
    })
    const listener = trasnport.createListener({ upgrader }) as TCPListener
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    afterEachCallbacks.push(() => listener.close())
    await listener.listen(multiaddr(`/ip4/127.0.0.1/tcp/${port}`))
    const { assertConnectedSocket, assertRefusedSocket } = buildSocketAssertions(port, afterEachCallbacks)

    await assertConnectedSocket(1)
    await assertConnectedSocket(2)
    await assertConnectedSocket(3)
    await assertServerConnections(listener, 3)

    // Limit reached, server should be closed here
    await assertRefusedSocket(4)
    await assertRefusedSocket(5)
    await assertServerConnections(listener, 3)
  })

  it('accepts dial of connection when connection drop listenBelow limit', async () => {
    const listenBelow = 2
    const closeAbove = 3
    const port = 9900

    const trasnport = tcp({ closeServerOnMaxConnections: { listenBelow, closeAbove } })({
      logger: defaultLogger()
    })

    const upgrader = mockUpgrader({
      events: new TypedEventEmitter()
    })
    const listener = trasnport.createListener({ upgrader }) as TCPListener
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    afterEachCallbacks.push(() => listener.close())
    await listener.listen(multiaddr(`/ip4/127.0.0.1/tcp/${port}`))
    const { assertConnectedSocket } = buildSocketAssertions(port, afterEachCallbacks)

    const socket1 = await assertConnectedSocket(1)
    const socket2 = await assertConnectedSocket(2)
    await assertConnectedSocket(3)
    await assertServerConnections(listener, 3)

    // Destroy sockets to be have connections < listenBelow
    socket1.destroy()
    socket2.destroy()
    // After destroying 2 sockets connections will be below "listenBelow" limit
    await assertServerConnections(listener, 1)

    // Now it should be able to accept new connections
    await assertConnectedSocket(4)
    await assertConnectedSocket(5)

    // 2 connections dropped and 2 new connections accepted
    await assertServerConnections(listener, 3)
  })

  it('should not emit "close" event when server is stopped due to "closeAbove" limit', async () => {
    const listenBelow = 2
    const closeAbove = 3
    const port = 9900

    const trasnport = tcp({ closeServerOnMaxConnections: { listenBelow, closeAbove } })({
      logger: defaultLogger()
    })

    const upgrader = mockUpgrader({
      events: new TypedEventEmitter()
    })
    const listener = trasnport.createListener({ upgrader }) as TCPListener
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    afterEachCallbacks.push(() => listener.close())

    let closeEventCallCount = 0
    listener.addEventListener('close', () => {
      closeEventCallCount += 1
    })

    await listener.listen(multiaddr(`/ip4/127.0.0.1/tcp/${port}`))
    const { assertConnectedSocket } = buildSocketAssertions(port, afterEachCallbacks)

    await assertConnectedSocket(1)
    await assertConnectedSocket(2)
    await assertConnectedSocket(3)
    await assertServerConnections(listener, 3)

    // Limit reached, server should be closed but should not emit "close" event
    expect(closeEventCallCount).equals(0)
  })

  it('should emit "listening" event when server is resumed due to "listenBelow" limit', async () => {
    const listenBelow = 2
    const closeAbove = 3
    const port = 9900

    const trasnport = tcp({ closeServerOnMaxConnections: { listenBelow, closeAbove } })({
      logger: defaultLogger()
    })

    const upgrader = mockUpgrader({
      events: new TypedEventEmitter()
    })
    const listener = trasnport.createListener({ upgrader }) as TCPListener
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    afterEachCallbacks.push(() => listener.close())

    let listeningEventCallCount = 0
    listener.addEventListener('listening', () => {
      listeningEventCallCount += 1
    })

    await listener.listen(multiaddr(`/ip4/127.0.0.1/tcp/${port}`))
    const { assertConnectedSocket } = buildSocketAssertions(port, afterEachCallbacks)

    // Server should be listening now
    expect(listeningEventCallCount).equals(1)

    const socket1 = await assertConnectedSocket(1)
    const socket2 = await assertConnectedSocket(2)
    await assertConnectedSocket(3)
    // Limit reached, server should be closed now
    await assertServerConnections(listener, 3)

    // Close some sockets to resume listening
    socket1.destroy()
    socket2.destroy()

    // Wait for listener to emit event
    await promisify(setTimeout)(50)

    // Server should emit the "listening" event again
    expect(listeningEventCallCount).equals(2)
  })
})
