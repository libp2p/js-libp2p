import { createServer, Socket } from 'net'
import { defaultLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import defer from 'p-defer'
import Sinon from 'sinon'
import { toMultiaddrConnection } from '../src/socket-to-conn.js'
import type { Server, ServerOpts, SocketConstructorOpts } from 'net'

async function setup (opts?: { server?: ServerOpts, client?: SocketConstructorOpts }): Promise<{ server: Server, serverSocket: Socket, clientSocket: Socket }> {
  const serverListening = defer()

  const server = createServer(opts?.server)
  server.listen(0, () => {
    serverListening.resolve()
  })

  await serverListening.promise

  const serverSocket = defer<Socket>()
  const clientSocket = defer<Socket>()

  server.once('connection', (socket) => {
    serverSocket.resolve(socket)
  })

  const address = server.address()

  if (address == null || typeof address === 'string') {
    throw new Error('Wrong socket type')
  }

  const client = new Socket(opts?.client)
  client.once('connect', () => {
    clientSocket.resolve(client)
  })
  client.connect(address.port, address.address)

  return {
    server,
    serverSocket: await serverSocket.promise,
    clientSocket: await clientSocket.promise
  }
}

describe('socket-to-conn', () => {
  let server: Server
  let clientSocket: Socket
  let serverSocket: Socket

  afterEach(async () => {
    if (serverSocket != null) {
      serverSocket.destroy()
    }

    if (clientSocket != null) {
      clientSocket.destroy()
    }

    if (server != null) {
      server.close()
    }
  })

  it('should destroy a socket that is closed by the client', async () => {
    ({ server, clientSocket, serverSocket } = await setup())

    // promise that is resolved when client socket is closed
    const clientClosed = defer<boolean>()

    // promise that is resolved when client socket errors
    const clientErrored = defer<Error>()

    // promise that is resolved when our outgoing socket is closed
    const serverClosed = defer<boolean>()

    // promise that is resolved when our outgoing socket errors
    const serverErrored = defer<Error>()

    const inboundMaConn = toMultiaddrConnection(serverSocket, {
      socketInactivityTimeout: 100,
      logger: defaultLogger(),
      direction: 'inbound'
    })
    expect(inboundMaConn.timeline.open).to.be.ok()
    expect(inboundMaConn.timeline.close).to.not.be.ok()

    clientSocket.once('close', () => {
      clientClosed.resolve(true)
    })
    clientSocket.once('error', err => {
      clientErrored.resolve(err)
    })

    serverSocket.once('close', () => {
      serverClosed.resolve(true)
    })
    serverSocket.once('error', err => {
      serverErrored.resolve(err)
    })

    // send some data between the client and server
    clientSocket.write('hello')
    serverSocket.write('goodbye')

    // close the client for writing
    clientSocket.end()

    // server socket was closed for reading and writing
    await expect(serverClosed.promise).to.eventually.be.true()

    // the connection closing was recorded
    expect(inboundMaConn.timeline.close).to.be.a('number')

    // server socket is destroyed
    expect(serverSocket.destroyed).to.be.true()
  })

  it('should destroy a socket that is forcibly closed by the client', async () => {
    ({ server, clientSocket, serverSocket } = await setup())

    // promise that is resolved when our outgoing socket is closed
    const serverClosed = defer<boolean>()

    // promise that is resolved when our outgoing socket errors
    const serverErrored = defer<any>()

    const inboundMaConn = toMultiaddrConnection(serverSocket, {
      socketInactivityTimeout: 100,
      logger: defaultLogger(),
      direction: 'inbound'
    })
    expect(inboundMaConn.timeline.open).to.be.ok()
    expect(inboundMaConn.timeline.close).to.not.be.ok()

    serverSocket.once('close', () => {
      serverClosed.resolve(true)
    })
    serverSocket.once('error', err => {
      serverErrored.resolve(err)
    })

    // send some data between the client and server
    clientSocket.write('hello')
    serverSocket.write('goodbye')

    // close the client for reading and writing immediately
    clientSocket.destroy()

    const error = await serverErrored.promise

    // the error can be of either type
    if (error.name !== 'TimeoutError' && error.code !== 'ECONNRESET') {
      expect.fail('promise rejected with unknown error type')
    }

    // server socket was closed for reading and writing
    await expect(serverClosed.promise).to.eventually.be.true()

    // the connection closing was recorded
    expect(inboundMaConn.timeline.close).to.be.a('number')

    // server socket is destroyed
    expect(serverSocket.destroyed).to.be.true()
  })

  it('should destroy a socket that is half-closed by the client', async () => {
    ({ server, clientSocket, serverSocket } = await setup({
      client: {
        allowHalfOpen: true
      }
    }))

    clientSocket.setTimeout(100)

    // promise that is resolved when our outgoing socket is closed
    const serverClosed = defer<boolean>()

    // promise that is resolved when the incoming socket is closed
    const clientClosed = defer<boolean>()

    const inboundMaConn = toMultiaddrConnection(serverSocket, {
      socketInactivityTimeout: 100,
      logger: defaultLogger(),
      direction: 'inbound'
    })
    expect(inboundMaConn.timeline.open).to.be.ok()
    expect(inboundMaConn.timeline.close).to.not.be.ok()

    serverSocket.once('close', () => {
      serverClosed.resolve(true)
    })

    clientSocket.once('close', () => {
      clientClosed.resolve(true)
    })
    clientSocket.once('timeout', () => {
      clientSocket.destroy()
    })

    // send some data between the client and server
    clientSocket.write('hello')
    serverSocket.write('goodbye')

    // close the client for writing
    clientSocket.end()

    await Promise.all([
      // server socket was closed for reading and writing
      expect(serverClosed.promise).to.eventually.be.true(),

      // remote socket was closed by server
      expect(clientClosed.promise).to.eventually.be.true()
    ])

    // the connection closing was recorded
    expect(inboundMaConn.timeline.close).to.be.a('number')

    // server socket is destroyed
    expect(serverSocket.destroyed).to.be.true()
  })

  it('should destroy a socket after sinking', async () => {
    ({ server, clientSocket, serverSocket } = await setup())

    // promise that is resolved when our outgoing socket is closed
    const serverClosed = defer<boolean>()

    const inboundMaConn = toMultiaddrConnection(serverSocket, {
      socketInactivityTimeout: 100,
      logger: defaultLogger(),
      direction: 'inbound'
    })
    expect(inboundMaConn.timeline.open).to.be.ok()
    expect(inboundMaConn.timeline.close).to.not.be.ok()

    serverSocket.once('close', () => {
      serverClosed.resolve(true)
    })

    // send some data between the client and server
    await inboundMaConn.sink(async function * () {
      yield Uint8Array.from([0, 1, 2, 3])
    }())

    // server socket should no longer be writable
    expect(serverSocket.writable).to.be.false()

    // server socket was closed for reading and writing
    await expect(serverClosed.promise).to.eventually.be.true()

    // the connection closing was recorded
    expect(inboundMaConn.timeline.close).to.be.a('number')

    // server socket is destroyed
    expect(serverSocket.destroyed).to.be.true()
  })

  it('should destroy a socket when containing MultiaddrConnection is closed', async () => {
    ({ server, clientSocket, serverSocket } = await setup())

    // promise that is resolved when our outgoing socket is closed
    const serverClosed = defer<boolean>()

    const inboundMaConn = toMultiaddrConnection(serverSocket, {
      socketInactivityTimeout: 100,
      socketCloseTimeout: 10,
      logger: defaultLogger(),
      direction: 'inbound'
    })
    expect(inboundMaConn.timeline.open).to.be.ok()
    expect(inboundMaConn.timeline.close).to.not.be.ok()

    clientSocket.once('error', () => {})

    serverSocket.once('close', () => {
      serverClosed.resolve(true)
    })

    // send some data between the client and server
    clientSocket.write('hello')
    serverSocket.write('goodbye')

    await inboundMaConn.close()

    // server socket was closed for reading and writing
    await expect(serverClosed.promise).to.eventually.be.true()

    // the connection closing was recorded
    expect(inboundMaConn.timeline.close).to.be.a('number')

    // server socket is destroyed
    expect(serverSocket.destroyed).to.be.true()
  })

  it('should not close MultiaddrConnection twice', async () => {
    ({ server, clientSocket, serverSocket } = await setup())
    // proxyServerSocket.writableLength returns 100 which cause socket cannot be destroyed immediately
    const proxyServerSocket = new Proxy(serverSocket, {
      get (target, prop, receiver) {
        if (prop === 'writableLength') {
          return 100
        }
        return Reflect.get(target, prop, receiver)
      }
    })

    // promise that is resolved when our outgoing socket is closed
    const serverClosed = defer<boolean>()
    const socketCloseTimeout = 10

    const inboundMaConn = toMultiaddrConnection(proxyServerSocket, {
      socketInactivityTimeout: 100,
      socketCloseTimeout,
      logger: defaultLogger(),
      direction: 'inbound'
    })
    expect(inboundMaConn.timeline.open).to.be.ok()
    expect(inboundMaConn.timeline.close).to.not.be.ok()

    clientSocket.once('error', () => {})

    serverSocket.once('close', () => {
      serverClosed.resolve(true)
    })

    // send some data between the client and server
    clientSocket.write('hello')
    serverSocket.write('goodbye')

    const signal = AbortSignal.timeout(socketCloseTimeout)
    const addEventListenerSpy = Sinon.spy(signal, 'addEventListener')

    // the 2nd and 3rd call should return immediately
    await Promise.all([
      inboundMaConn.close({ signal }),
      inboundMaConn.close({ signal }),
      inboundMaConn.close({ signal })
    ])

    // server socket was closed for reading and writing
    await expect(serverClosed.promise).to.eventually.be.true()

    // the connection closing was recorded
    expect(inboundMaConn.timeline.close).to.be.a('number')

    // server socket is destroyed
    expect(serverSocket.destroyed).to.be.true()

    // the server socket was only closed once
    expect(addEventListenerSpy.callCount).to.equal(1)
  })

  it('should destroy a socket when incoming MultiaddrConnection is closed', async () => {
    ({ server, clientSocket, serverSocket } = await setup({
      server: {
        allowHalfOpen: true
      }
    }))

    // promise that is resolved when our outgoing socket is closed
    const serverClosed = defer<boolean>()

    const inboundMaConn = toMultiaddrConnection(serverSocket, {
      socketInactivityTimeout: 100,
      socketCloseTimeout: 10,
      logger: defaultLogger(),
      direction: 'inbound'
    })
    expect(inboundMaConn.timeline.open).to.be.ok()
    expect(inboundMaConn.timeline.close).to.not.be.ok()

    clientSocket.once('error', () => {})

    serverSocket.once('close', () => {
      serverClosed.resolve(true)
    })

    // send some data between the client and server
    clientSocket.write('hello')
    serverSocket.write('goodbye')

    await inboundMaConn.close()

    // server socket was closed for reading and writing
    await expect(serverClosed.promise).to.eventually.be.true()

    // the connection closing was recorded
    expect(inboundMaConn.timeline.close).to.be.a('number')

    // server socket is destroyed
    expect(serverSocket.destroyed).to.be.true()
  })

  it('should destroy a socket when incoming MultiaddrConnection is closed but remote keeps sending data', async () => {
    ({ server, clientSocket, serverSocket } = await setup({
      server: {
        allowHalfOpen: true
      }
    }))

    // promise that is resolved when our outgoing socket is closed
    const serverClosed = defer<boolean>()

    const inboundMaConn = toMultiaddrConnection(serverSocket, {
      socketInactivityTimeout: 500,
      socketCloseTimeout: 100,
      logger: defaultLogger(),
      direction: 'inbound'
    })
    expect(inboundMaConn.timeline.open).to.be.ok()
    expect(inboundMaConn.timeline.close).to.not.be.ok()

    clientSocket.once('error', () => {})

    serverSocket.once('close', () => {
      serverClosed.resolve(true)
    })

    // send some data between the client and server
    clientSocket.write('hello')
    serverSocket.write('goodbye')

    setInterval(() => {
      clientSocket.write(`some data ${Date.now()}`)
    }, 10).unref()

    await inboundMaConn.close()

    // server socket was closed for reading and writing
    await expect(serverClosed.promise).to.eventually.be.true()

    // the connection closing was recorded
    expect(inboundMaConn.timeline.close).to.be.a('number')

    // server socket is destroyed
    expect(serverSocket.destroyed).to.be.true()
  })

  it('should destroy a socket by inactivity timeout', async () => {
    ({ server, clientSocket, serverSocket } = await setup())

    // promise that is resolved when our outgoing socket is closed
    const serverClosed = defer<boolean>()

    // promise that resolves when reading from the outgoing socket times out
    const serverTimedOut = defer<boolean>()

    const clientError = defer<any>()

    const inboundMaConn = toMultiaddrConnection(serverSocket, {
      socketInactivityTimeout: 100,
      socketCloseTimeout: 100,
      logger: defaultLogger(),
      direction: 'inbound'
    })
    expect(inboundMaConn.timeline.open).to.be.ok()
    expect(inboundMaConn.timeline.close).to.not.be.ok()

    clientSocket.once('error', (err) => {
      clientError.resolve(err)
    })

    serverSocket.once('close', () => {
      serverClosed.resolve(true)
    })
    serverSocket.once('timeout', () => {
      serverTimedOut.resolve(true)
    })

    // send some data between the client and server
    clientSocket.write('hello')
    serverSocket.write('goodbye')

    // ...send no more data

    // wait for server to time out socket
    await Promise.all([
      // server socket timed out reading from the client
      expect(serverTimedOut.promise).to.eventually.be.true(),

      // server socket was closed for reading and writing
      expect(serverClosed.promise).to.eventually.be.true()
    ])

    const err = await clientError.promise

    // can be either error depending on platform and timing
    if (err.code !== 'ECONNRESET' && err.code !== 'EPIPE') {
      expect.fail('client connection did not close abruptly')
    }

    // server socket should no longer be writable
    expect(serverSocket.writable).to.be.false()

    // server socket is destroyed
    expect(serverSocket.destroyed).to.be.true()
  })
})
