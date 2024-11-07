import net from 'node:net'
import { promisify } from 'node:util'
import { defaultLogger } from '@libp2p/logger'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { stubInterface } from 'sinon-ts'
import { tcp } from '../src/index.js'
import type { Connection, Upgrader } from '@libp2p/interface'

describe('maxConnections', () => {
  const afterEachCallbacks: Array<() => Promise<any> | any> = []
  let upgrader: Upgrader

  beforeEach(() => {
    upgrader = stubInterface<Upgrader>({
      upgradeInbound: async (maConn) => {
        return stubInterface<Connection>({
          remoteAddr: maConn.remoteAddr
        })
      },
      upgradeOutbound: async (maConn) => {
        return stubInterface<Connection>({
          remoteAddr: maConn.remoteAddr
        })
      }
    })
  })

  afterEach(async () => {
    await Promise.all(afterEachCallbacks.map(fn => fn()))
    afterEachCallbacks.length = 0
  })

  it('reject dial of connection above maxConnections', async () => {
    const maxConnections = 2
    const socketCount = 4
    const port = 9900

    const seenRemoteConnections = new Set<string>()
    const transport = tcp({ maxConnections })({
      logger: defaultLogger()
    })

    const listener = transport.createListener({ upgrader })
    afterEachCallbacks.push(async () => listener.close())
    await listener.listen(multiaddr(`/ip4/127.0.0.1/tcp/${port}`))

    listener.addEventListener('connection', (conn) => {
      seenRemoteConnections.add(conn.detail.remoteAddr.toString())
    })

    const sockets: net.Socket[] = []

    for (let i = 0; i < socketCount; i++) {
      const socket = net.connect({ host: '127.0.0.1', port })
      sockets.push(socket)

      afterEachCallbacks.unshift(async () => {
        if (!socket.destroyed) {
          socket.destroy()
          await new Promise((resolve) => socket.on('close', resolve))
        }
      })

      // Wait for connection so the order of sockets is stable, sockets expected to be alive are always [0,1]
      await new Promise<void>((resolve, reject) => {
        socket.on('connect', () => {
          resolve()
        })
        socket.on('error', (err) => {
          reject(err)
        })
      })
    }

    // With server.maxConnections the TCP socket is created and the initial handshake is completed
    // Then in the server handler NodeJS javascript code will call socket.emit('drop') if over the limit
    // https://github.com/nodejs/node/blob/fddc701d3c0eb4520f2af570876cc987ae6b4ba2/lib/net.js#L1706

    // Wait for some time for server to drop all sockets above limit
    await promisify(setTimeout)(250)

    expect(seenRemoteConnections.size).equals(maxConnections, 'wrong serverConnections')

    for (let i = 0; i < socketCount; i++) {
      const socket = sockets[i]

      if (i < maxConnections) {
        // Assert socket connected
        expect(socket.destroyed).equals(false, `socket ${i} under limit must not be destroyed`)
      } else {
        // Assert socket ended
        expect(socket.destroyed).equals(true, `socket ${i} above limit must be destroyed`)
      }
    }
  })
})
