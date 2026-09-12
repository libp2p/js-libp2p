import { createSocket, Socket } from 'node:dgram'
import { once } from 'node:events'
import net from 'node:net'
import { generateKeyPair } from '@libp2p/crypto/keys'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { getNetConfig } from '@libp2p/utils'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { MemoryDatastore } from 'datastore-core'
import { TypedEventEmitter } from 'main-event'
import Sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { WebRTCDirectListener } from '../src/private-to-public/listener.ts'
import type { TransportCertificate } from '../src/index.ts'
import type { WebRTCDirectListenerComponents } from '../src/private-to-public/listener.ts'
import type { Upgrader } from '@libp2p/interface'

describe('WebRTC Direct UDP listener lifecycle', () => {
  const listeners: WebRTCDirectListener[] = []
  const sockets: Socket[] = []
  let components: WebRTCDirectListenerComponents

  beforeEach(async () => {
    const privateKey = await generateKeyPair('Ed25519')
    components = {
      privateKey,
      peerId: peerIdFromPrivateKey(privateKey),
      logger: defaultLogger(),
      upgrader: stubInterface<Upgrader>(),
      datastore: new MemoryDatastore()
    }
  })

  afterEach(async () => {
    Sinon.restore()
    const results = await Promise.allSettled(listeners.splice(0).map(listener => listener.close()))
    await Promise.all(sockets.splice(0).map(socket => socket[Symbol.asyncDispose]()))
    expect(results.filter(result => result.status === 'rejected')).to.be.empty()
  })

  function createListener (): WebRTCDirectListener {
    const listener = new WebRTCDirectListener(components, {
      upgrader: components.upgrader,
      emitter: new TypedEventEmitter(),
      certificate: stubInterface<TransportCertificate>({
        certhash: 'uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ'
      })
    })
    listeners.push(listener)
    return listener
  }

  async function occupyUDPPort (port = 0): Promise<Socket> {
    const socket = createSocket('udp4')
    sockets.push(socket)
    const listening = once(socket, 'listening')
    socket.bind(port)
    await listening
    return socket
  }

  it('allocates an ephemeral UDP port without a TCP probe', async () => {
    const blocker = await occupyUDPPort()
    Sinon.stub(net, 'createServer').throws(new Error('TCP cannot establish UDP availability'))
    const listener = createListener()

    await listener.listen(multiaddr('/ip4/127.0.0.1/udp/0/webrtc-direct'))

    const port = getNetConfig(listener.getAddrs()[0]).port
    expect(port).to.be.greaterThan(0)
    expect(port).to.not.equal(blocker.address().port)
  })

  it('removes a failed bind so the requested port can be reused', async () => {
    const blocker = await occupyUDPPort()
    const addr = multiaddr(`/ip4/127.0.0.1/udp/${blocker.address().port}/webrtc-direct`)
    const listener = createListener()

    await expect(listener.listen(addr)).to.be.rejectedWith('Failed to register ICE UDP mux listener')
    expect(listener.getAddrs()).to.be.empty()
    await blocker[Symbol.asyncDispose]()

    // Do not close the failed listener first: failed startup must unregister it.
    const replacement = createListener()
    await replacement.listen(addr)
    expect(replacement.getAddrs()).to.have.lengthOf(1)
    await expect(listener.close()).to.be.fulfilled()
  })

  it('can close while a pending bind fails', async () => {
    const blocker = await occupyUDPPort()
    const listener = createListener()
    const listening = listener.listen(multiaddr(`/ip4/127.0.0.1/udp/${blocker.address().port}/webrtc-direct`))
    const closing = listener.close()

    await Promise.all([
      expect(listening).to.be.rejectedWith('Failed to register ICE UDP mux listener'),
      expect(closing).to.be.fulfilled()
    ])
  })

  it('registers the actual ephemeral port before admitting another listener', async () => {
    const listener = createListener()
    await listener.listen(multiaddr('/ip4/127.0.0.1/udp/0/webrtc-direct'))
    const port = getNetConfig(listener.getAddrs()[0]).port

    await expect(createListener().listen(multiaddr(`/ip4/127.0.0.1/udp/${port}/webrtc-direct`)))
      .to.be.rejectedWith('There is already a listener')
  })

  for (const collisions of [1, 5]) {
    it(collisions === 1 ? 'reselects after an ephemeral bind collision' : 'bounds ephemeral bind reselection', async () => {
      const dispose = Socket.prototype[Symbol.asyncDispose]
      let probes = 0
      Sinon.stub(Socket.prototype, Symbol.asyncDispose).callsFake(async function (this: Socket) {
        const port = this.address().port
        await dispose.call(this)
        probes++

        // Claim the port after the UDP probe releases it but before native bind.
        if (probes <= collisions) {
          await occupyUDPPort(port)
        }
      })

      const listener = createListener()
      const listening = listener.listen(multiaddr('/ip4/127.0.0.1/udp/0/webrtc-direct'))

      if (collisions === 1) {
        await listening
        expect(probes).to.equal(2)
        expect(getNetConfig(listener.getAddrs()[0]).port).to.not.equal(sockets[0].address().port)
      } else {
        await expect(listening).to.be.rejectedWith('Failed to register ICE UDP mux listener')
        expect(probes).to.equal(5)
      }
    })
  }
})
