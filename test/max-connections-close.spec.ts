import net from 'node:net'
import { promisify } from 'util'
import { expect } from 'aegir/chai'
import { mockUpgrader } from '@libp2p/interface-mocks'
import { multiaddr } from '@multiformats/multiaddr'
import { tcp } from '../src/index.js'
import type { TCPListener } from '../src/listener.js'
import { EventEmitter } from '@libp2p/interfaces/events'

describe('close server on maxConnections', () => {
  const afterEachCallbacks: Array<() => Promise<any> | any> = []
  afterEach(async () => {
    await Promise.all(afterEachCallbacks.map(fn => fn()))
    afterEachCallbacks.length = 0
  })

  it('reject dial of connection above closeAbove', async () => {
    const listenBelow = 2
    const closeAbove = 3
    const port = 9900

    const seenRemoteConnections = new Set<string>()
    const trasnport = tcp({ closeServerOnMaxConnections: { listenBelow, closeAbove } })()

    const upgrader = mockUpgrader({
      events: new EventEmitter()
    })
    const listener = trasnport.createListener({ upgrader }) as TCPListener
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    afterEachCallbacks.push(() => listener.close())
    await listener.listen(multiaddr(`/ip4/127.0.0.1/tcp/${port}`))

    listener.addEventListener('connection', (conn) => {
      seenRemoteConnections.add(conn.detail.remoteAddr.toString())
    })

    function createSocket (): net.Socket {
      const socket = net.connect({ host: '127.0.0.1', port })

      // eslint-disable-next-line @typescript-eslint/promise-function-async
      afterEachCallbacks.unshift(async () => {
        if (!socket.destroyed) {
          socket.destroy()
          await new Promise((resolve) => socket.on('close', resolve))
        }
      })

      return socket
    }

    async function assertConnectedSocket (i: number): Promise<net.Socket> {
      const socket = createSocket()

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

    async function assertRefusedSocket (i: number): Promise<void> {
      const socket = createSocket()

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
    }

    async function assertServerConnections (connections: number): Promise<void> {
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
      expect(listener['connections'].size).equals(connections, 'Wrong server connections')
    }

    const socket1 = await assertConnectedSocket(1)
    const socket2 = await assertConnectedSocket(2)
    const socket3 = await assertConnectedSocket(3)
    await assertServerConnections(3)
    // Limit reached, server should be closed here
    await assertRefusedSocket(4)
    await assertRefusedSocket(5)
    // Destroy sockets to be have connections < listenBelow
    socket1.destroy()
    socket2.destroy()
    await assertServerConnections(1)
    // Attempt to connect more sockets
    const socket6 = await assertConnectedSocket(6)
    const socket7 = await assertConnectedSocket(7)
    await assertServerConnections(3)
    // Limit reached, server should be closed here
    await assertRefusedSocket(8)

    expect(socket3.destroyed).equals(false, 'socket3 must not destroyed')
    expect(socket6.destroyed).equals(false, 'socket6 must not destroyed')
    expect(socket7.destroyed).equals(false, 'socket7 must not destroyed')
  })
})
