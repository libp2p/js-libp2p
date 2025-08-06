import { createServer, Socket } from 'net'
import { defaultLogger } from '@libp2p/logger'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import delay from 'delay'
import { pEvent } from 'p-event'
import { toMultiaddrConnection } from '../src/socket-to-conn.js'
import type { Server, ServerOpts, SocketConstructorOpts } from 'node:net'

interface TestOptions {
  server?: ServerOpts
  client?: SocketConstructorOpts
}

interface TestFixture {
  server: Server
  serverSocket: Socket
  clientSocket: Socket
}

async function setup (opts?: TestOptions): Promise<TestFixture> {
  const server = createServer(opts?.server)
  server.listen(0)
  await pEvent(server, 'listening')

  const address = server.address()
  if (address == null || typeof address === 'string') {
    throw new Error('Wrong socket type')
  }

  const client = new Socket(opts?.client)
  client.connect(address.port, address.address)

  const [
    serverSocket
  ] = await Promise.all([
    pEvent(server, 'connection'),
    pEvent(client, 'connect')
  ])

  return {
    server,
    serverSocket,
    clientSocket: client
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
    const clientClosed = Promise.withResolvers<boolean>()

    // promise that is resolved when client socket errors
    const clientErrored = Promise.withResolvers<Error>()

    // promise that is resolved when our outgoing socket is closed
    const serverClosed = Promise.withResolvers<boolean>()

    // promise that is resolved when our outgoing socket errors
    const serverErrored = Promise.withResolvers<Error>()

    const inboundMaConn = toMultiaddrConnection({
      socket: serverSocket,
      inactivityTimeout: 100,
      direction: 'inbound',
      remoteAddr: multiaddr('/ip4/123.123.123.123/tcp/1234'),
      log: defaultLogger().forComponent('libp2p:test-maconn')
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
    const serverClosed = Promise.withResolvers<boolean>()

    // promise that is resolved when our outgoing socket errors
    const serverErrored = Promise.withResolvers<any | undefined>()

    const inboundMaConn = toMultiaddrConnection({
      socket: serverSocket,
      inactivityTimeout: 100,
      direction: 'inbound',
      log: defaultLogger().forComponent('libp2p:test-maconn')
    })
    expect(inboundMaConn.timeline.open).to.be.ok()
    expect(inboundMaConn.timeline.close).to.not.be.ok()

    serverSocket.once('close', () => {
      serverClosed.resolve(true)

      // it's possible for the server socket to close cleanly in response to the
      // client destroy if no data was being sent/read at the time
      serverErrored.resolve(undefined)
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

    // if the error occurred, it can be of either type
    if (error != null && (error.name !== 'TimeoutError' && error.code !== 'ECONNRESET')) {
      expect.fail(`Promise rejected with unknown error type - ${error}`)
    }

    // server socket was closed for reading and writing
    await expect(serverClosed.promise).to.eventually.be.true()

    // the connection closing or aborting was recorded
    if (error == null) {
      expect(inboundMaConn.timeline.close).to.be.a('number')
    } else {
      expect(inboundMaConn.timeline.abort).to.be.a('number')
    }

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
    const serverClosed = Promise.withResolvers<boolean>()

    // promise that is resolved when the incoming socket is closed
    const clientClosed = Promise.withResolvers<boolean>()

    const inboundMaConn = toMultiaddrConnection({
      socket: serverSocket,
      inactivityTimeout: 100,
      direction: 'inbound',
      log: defaultLogger().forComponent('libp2p:test-maconn:inbound')
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

  it('should destroy a socket after closing', async () => {
    ({ server, clientSocket, serverSocket } = await setup())

    // promise that is resolved when our outgoing socket is closed
    const serverClosed = Promise.withResolvers<boolean>()

    const inboundMaConn = toMultiaddrConnection({
      socket: serverSocket,
      inactivityTimeout: 100,
      direction: 'inbound',
      log: defaultLogger().forComponent('libp2p:test-maconn:inbound')
    })
    expect(inboundMaConn.timeline.open).to.be.ok()
    expect(inboundMaConn.timeline.close).to.not.be.ok()

    serverSocket.once('close', () => {
      serverClosed.resolve(true)
    })

    // send some data between the client and server
    inboundMaConn.send(Uint8Array.from([0, 1, 2, 3]))
    await inboundMaConn.close()

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
    const serverClosed = Promise.withResolvers<boolean>()

    const inboundMaConn = toMultiaddrConnection({
      socket: serverSocket,
      inactivityTimeout: 100,
      direction: 'inbound',
      log: defaultLogger().forComponent('libp2p:test-maconn')
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
    const serverClosed = Promise.withResolvers<boolean>()

    const inboundMaConn = toMultiaddrConnection({
      socket: proxyServerSocket,
      inactivityTimeout: 100,
      direction: 'inbound',
      log: defaultLogger().forComponent('libp2p:test-maconn')
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

    // the 2nd and 3rd call should return immediately
    inboundMaConn.close()
    inboundMaConn.close()
    inboundMaConn.close()

    // server socket was closed for reading and writing
    await expect(serverClosed.promise).to.eventually.be.true()

    // the connection closing was recorded
    expect(inboundMaConn.timeline.close).to.be.a('number')

    // server socket is destroyed
    expect(serverSocket.destroyed).to.be.true()
  })

  it('should destroy a socket when incoming MultiaddrConnection is closed', async () => {
    ({ server, clientSocket, serverSocket } = await setup({
      server: {
        allowHalfOpen: true
      }
    }))

    // promise that is resolved when our outgoing socket is closed
    const serverClosed = Promise.withResolvers<boolean>()

    const inboundMaConn = toMultiaddrConnection({
      socket: serverSocket,
      inactivityTimeout: 100,
      direction: 'inbound',
      log: defaultLogger().forComponent('libp2p:test-maconn')
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
    const serverClosed = Promise.withResolvers<boolean>()

    const inboundMaConn = toMultiaddrConnection({
      socket: serverSocket,
      inactivityTimeout: 500,
      direction: 'inbound',
      log: defaultLogger().forComponent('libp2p:test-maconn')
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

    const interval = setInterval(() => {
      clientSocket.write(`some data ${Date.now()}`)
    }, 10)

    // ensure the sockets are open fully
    await delay(1_000)

    await inboundMaConn.close()

    // server socket was closed for reading and writing
    await expect(serverClosed.promise).to.eventually.be.true()

    // the connection closing was recorded
    expect(inboundMaConn.timeline.close).to.be.a('number')

    // server socket is destroyed
    expect(serverSocket.destroyed).to.be.true()

    clearInterval(interval)
  })

  it('should destroy a socket by inactivity timeout', async () => {
    ({ server, clientSocket, serverSocket } = await setup())

    // promise that is resolved when our outgoing socket is closed
    const serverClosed = Promise.withResolvers<boolean>()

    // promise that resolves when reading from the outgoing socket times out
    const serverTimedOut = Promise.withResolvers<boolean>()

    const clientError = Promise.withResolvers<any>()

    const inboundMaConn = toMultiaddrConnection({
      socket: serverSocket,
      inactivityTimeout: 100,
      direction: 'inbound',
      log: defaultLogger().forComponent('libp2p:test-maconn')
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
