/* eslint-env mocha */

import { generateKeyPair } from '@libp2p/crypto/keys'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { multiaddrConnectionPair, streamPair } from '@libp2p/utils'
import { expect } from 'aegir/chai'
import delay from 'delay'
import { encode } from 'it-length-prefixed'
import * as lp from 'it-length-prefixed'
import { pEvent } from 'p-event'
import { stubInterface } from 'sinon-ts'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { Upgrader } from '../../src/upgrader.js'
import { createDefaultUpgraderComponents } from './utils.js'
import type { UpgraderComponents, UpgraderInit } from '../../src/upgrader.js'
import type { ConnectionEncrypter, StreamMuxerFactory, StreamMuxer, ConnectionProtector, PeerId, SecuredConnection, Connection } from '@libp2p/interface'
import type { ConnectionManager } from '@libp2p/interface-internal'

describe('upgrader', () => {
  let components: UpgraderComponents
  let init: UpgraderInit
  const encrypterProtocol = '/test-encrypter'
  const muxerProtocol = '/test-muxer'
  let remotePeer: PeerId

  const handshake = [
    lp.encode.single(uint8ArrayFromString('/multistream/1.0.0\n')),
    lp.encode.single(uint8ArrayFromString(`${encrypterProtocol}\n`)),
    lp.encode.single(uint8ArrayFromString('/multistream/1.0.0\n')),
    lp.encode.single(uint8ArrayFromString(`${muxerProtocol}\n`))
  ]

  class BoomCrypto implements ConnectionEncrypter {
    static protocol = encrypterProtocol
    public protocol = encrypterProtocol
    async secureInbound (): Promise<SecuredConnection> { throw new Error('Boom') }
    async secureOutbound (): Promise<SecuredConnection> { throw new Error('Boom') }
  }

  beforeEach(async () => {
    remotePeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    components = await createDefaultUpgraderComponents()

    init = {
      connectionEncrypters: [
        stubInterface<ConnectionEncrypter>({
          protocol: encrypterProtocol,
          secureOutbound: async (connection) => ({
            connection,
            remotePeer
          }),
          secureInbound: async (connection) => ({
            connection,
            remotePeer
          })
        })
      ],
      streamMuxers: [
        stubInterface<StreamMuxerFactory>({
          protocol: muxerProtocol,
          createStreamMuxer: () => stubInterface<StreamMuxer>({
            protocol: muxerProtocol
          })
        })
      ]
    }
  })

  it('should upgrade outbound with valid muxers and crypto', async () => {
    const upgrader = new Upgrader(components, init)

    const [outbound, inbound] = multiaddrConnectionPair()

    handshake.forEach(buf => {
      inbound.send(buf)
    })

    const conn = await upgrader.upgradeOutbound(outbound, {
      signal: AbortSignal.timeout(5_000)
    })
    expect(conn.encryption).to.equal(encrypterProtocol)
    expect(conn.multiplexer).to.equal(muxerProtocol)
  })

  it('should upgrade outbound with only crypto', async () => {
    const upgrader = new Upgrader(components, {
      ...init,
      streamMuxers: []
    })

    const [outbound, inbound] = multiaddrConnectionPair()

    handshake.forEach(buf => {
      inbound.send(buf)
    })

    const connection = await upgrader.upgradeOutbound(outbound, {
      signal: AbortSignal.timeout(5_000)
    })

    await expect(connection.newStream('/echo/1.0.0')).to.eventually.be.rejected
      .with.property('name', 'MuxerUnavailableError')
  })

  it('should use a private connection protector when provided for inbound connections', async () => {
    const connectionProtector = stubInterface<ConnectionProtector>()
    connectionProtector.protect.callsFake(async (conn) => conn)

    const upgrader = new Upgrader({
      ...components,
      connectionProtector
    }, init)

    const [outbound, inbound] = multiaddrConnectionPair()

    await Promise.all([
      upgrader.upgradeInbound(inbound, {
        signal: AbortSignal.timeout(5_000)
      }),
      (async () => {
        await delay(10)

        handshake.forEach(buf => {
          outbound.send(buf)
        })
      })()
    ])

    expect(connectionProtector.protect.callCount).to.equal(1)
  })

  it('should use a private connection protector when provided for outbound connections', async () => {
    const connectionProtector = stubInterface<ConnectionProtector>()
    connectionProtector.protect.callsFake(async (conn) => conn)

    const upgrader = new Upgrader({
      ...components,
      connectionProtector
    }, init)

    const [outbound, inbound] = multiaddrConnectionPair()

    await Promise.all([
      upgrader.upgradeOutbound(outbound, {
        signal: AbortSignal.timeout(5_000)
      }),
      (async () => {
        await delay(10)

        handshake.forEach(buf => {
          inbound.send(buf)
        })
      })()
    ])

    expect(connectionProtector.protect.callCount).to.equal(1)
  })

  it('should fail inbound if crypto fails', async () => {
    const upgrader = new Upgrader(components, {
      ...init,
      connectionEncrypters: [
        new BoomCrypto()
      ]
    })

    const [outbound, inbound] = multiaddrConnectionPair()

    await expect(Promise.all([
      upgrader.upgradeInbound(inbound, {
        signal: AbortSignal.timeout(5_000)
      }),
      (async () => {
        await delay(10)

        handshake.forEach(buf => {
          outbound.send(buf)
        })
      })()
    ])).to.eventually.be.rejected
      .with.property('name', 'EncryptionFailedError')
  })

  it('should fail outbound if crypto fails', async () => {
    const upgrader = new Upgrader(components, {
      ...init,
      connectionEncrypters: [
        new BoomCrypto()
      ]
    })

    const [outbound, inbound] = multiaddrConnectionPair()

    handshake.forEach(buf => {
      inbound.send(buf)
    })

    await expect(Promise.all([
      upgrader.upgradeOutbound(outbound, {
        signal: AbortSignal.timeout(5_000)
      }),
      (async () => {
        await delay(10)

        handshake.forEach(buf => {
          inbound.send(buf)
        })
      })()
    ])).to.eventually.be.rejected
      .with.property('name', 'EncryptionFailedError')
  })

  it('should abort if inbound upgrade is slow', async () => {
    const upgrader = new Upgrader(components, {
      ...init,
      inboundUpgradeTimeout: 100
    })

    const [outbound, inbound] = multiaddrConnectionPair({
      delay: 2_000
    })

    handshake.forEach(buf => {
      outbound.send(buf)
    })

    await expect(upgrader.upgradeInbound(inbound, {
      signal: AbortSignal.timeout(5_000)
    })).to.eventually.be.rejected
      .with.property('message').that.include('aborted')
  })

  it('should abort by signal if inbound upgrade is slow', async () => {
    const upgrader = new Upgrader(components, {
      ...init,
      inboundUpgradeTimeout: 10000
    })

    const [outbound, inbound] = multiaddrConnectionPair({
      delay: 2_000
    })

    await expect(Promise.all([
      upgrader.upgradeOutbound(outbound, {
        signal: AbortSignal.timeout(5_000)
      }),
      (async () => {
        await delay(10)

        handshake.forEach(buf => {
          inbound.send(buf)
        })
      })()
    ])).to.eventually.be.rejected
      .with.property('message').that.include('aborted')
  })

  it('should not abort if inbound upgrade is successful', async () => {
    const components = await createDefaultUpgraderComponents()
    const upgrader = new Upgrader(components, {
      ...init,
      inboundUpgradeTimeout: 100
    })

    const connectionPromise = pEvent<'connection:open', CustomEvent<Connection>>(components.events, 'connection:open')

    const [outbound, inbound] = multiaddrConnectionPair()

    await Promise.all([
      upgrader.upgradeOutbound(outbound, {
        signal: AbortSignal.timeout(5_000)
      }),
      (async () => {
        await delay(10)

        handshake.forEach(buf => {
          inbound.send(buf)
        })
      })()
    ])

    const event = await connectionPromise

    await delay(1000)

    // connections should still be open after timeout
    expect(event.detail.status).to.equal('open')
  })

  it('should not abort if outbound upgrade is successful', async () => {
    const upgrader = new Upgrader(components, {
      ...init,
      inboundUpgradeTimeout: 100
    })

    const [outbound, inbound] = multiaddrConnectionPair()

    const [conn] = await Promise.all([
      upgrader.upgradeOutbound(outbound, {
        signal: AbortSignal.timeout(5_000)
      }),
      (async () => {
        await delay(10)

        handshake.forEach(buf => {
          inbound.send(buf)
        })
      })()
    ])

    await delay(1000)

    // connections should still be open after timeout
    expect(conn.status).to.equal('open')
  })

  it('should not abort by signal if inbound upgrade is successful', async () => {
    const components = await createDefaultUpgraderComponents()
    const upgrader = new Upgrader(components, {
      ...init,
      inboundUpgradeTimeout: 10000
    })

    const connectionPromise = pEvent<'connection:open', CustomEvent<Connection>>(components.events, 'connection:open')

    const [outbound, inbound] = multiaddrConnectionPair()
    await Promise.all([
      upgrader.upgradeInbound(inbound, {
        signal: AbortSignal.timeout(5_000)
      }),
      (async () => {
        await delay(10)

        handshake.forEach(buf => {
          outbound.send(buf)
        })
      })()
    ])

    const event = await connectionPromise

    await delay(1000)

    // connections should still be open after timeout
    expect(event.detail.status).to.equal('open')
  })

  it('should not abort by signal if outbound upgrade is successful', async () => {
    const upgrader = new Upgrader(components, {
      ...init,
      inboundUpgradeTimeout: 10000
    })

    const [outbound, inbound] = multiaddrConnectionPair()

    const [conn] = await Promise.all([
      upgrader.upgradeOutbound(outbound, {
        signal: AbortSignal.timeout(5_000)
      }),
      (async () => {
        await delay(10)

        handshake.forEach(buf => {
          inbound.send(buf)
        })
      })()
    ])

    await delay(1000)

    // connections should still be open after timeout
    expect(conn.status).to.equal('open')
  })

  it('should abort protocol selection for slow outbound stream creation', async () => {
    const [outboundStream, inboundStream] = await streamPair({
      delay: 2_000
    })

    const upgrader = new Upgrader(components, {
      ...init,
      streamMuxers: [
        stubInterface<StreamMuxerFactory>({
          protocol: muxerProtocol,
          createStreamMuxer: () => stubInterface<StreamMuxer>({
            status: 'open',
            createStream: () => {
              return outboundStream
            }
          })
        })
      ]
    })

    inboundStream.send(Uint8Array.from([0, 1, 2, 3, 4]))

    const [outbound, inbound] = multiaddrConnectionPair()

    handshake.forEach(buf => {
      inbound.send(buf)
    })

    const conn = await upgrader.upgradeOutbound(outbound, {
      signal: AbortSignal.timeout(5_000)
    })

    await expect(conn.newStream('/echo/1.0.0', {
      signal: AbortSignal.timeout(100)
    })).to.eventually.be.rejected
      .with.property('name', 'TimeoutError')
  })

  it('should abort stream when protocol negotiation fails on outbound stream', async () => {
    const [outboundStream, inboundStream] = await streamPair({
      delay: 2_000
    })

    const upgrader = new Upgrader(components, {
      ...init,
      streamMuxers: [
        stubInterface<StreamMuxerFactory>({
          protocol: muxerProtocol,
          createStreamMuxer: () => stubInterface<StreamMuxer>({
            status: 'open',
            createStream: () => {
              return outboundStream
            }
          })
        })
      ]
    })

    inboundStream.send(encode.single(uint8ArrayFromString('/multistream/1.0.0\n')))
    inboundStream.send(encode.single(uint8ArrayFromString('/different/protocol\n')))

    const [outbound, inbound] = multiaddrConnectionPair()

    handshake.forEach(buf => {
      inbound.send(buf)
    })

    const conn = await upgrader.upgradeOutbound(outbound, {
      signal: AbortSignal.timeout(5_000)
    })

    await expect(conn.newStream('/foo/1.0.0'))
      .to.eventually.be.rejected.with.property('name', 'UnsupportedProtocolError')

    // wait for remote to close
    await delay(100)

    expect(outboundStream).to.have.property('status', 'aborted')
  })

  it('should allow skipping outbound encryption and protection', async () => {
    const connectionProtector = stubInterface<ConnectionProtector>()
    const connectionEncrypter = stubInterface<ConnectionEncrypter>({
      protocol: encrypterProtocol
    })

    const upgrader = new Upgrader(await createDefaultUpgraderComponents({
      connectionProtector
    }), {
      ...init,
      connectionEncrypters: [
        connectionEncrypter
      ]
    })

    const [outbound, inbound] = multiaddrConnectionPair()

    handshake.forEach(buf => {
      inbound.send(buf)
    })

    await upgrader.upgradeOutbound(outbound, {
      skipEncryption: true,
      remotePeer,
      skipProtection: true,
      muxerFactory: stubInterface<StreamMuxerFactory>({
        createStreamMuxer: () => stubInterface<StreamMuxer>()
      }),
      signal: AbortSignal.timeout(5_000)
    })
    expect(connectionProtector.protect).to.have.property('called', false)
    expect(connectionEncrypter.secureOutbound).to.have.property('called', false)
  })

  it('should allow skipping inbound encryption and protection', async () => {
    const connectionProtector = stubInterface<ConnectionProtector>()
    const connectionEncrypter = stubInterface<ConnectionEncrypter>({
      protocol: encrypterProtocol
    })

    const upgrader = new Upgrader({
      ...components,
      connectionProtector
    }, {
      ...init,
      connectionEncrypters: [
        connectionEncrypter
      ]
    })

    const [outbound, inbound] = multiaddrConnectionPair()

    handshake.forEach(buf => {
      outbound.send(buf)
    })

    await upgrader.upgradeInbound(inbound, {
      skipEncryption: true,
      remotePeer,
      skipProtection: true,
      muxerFactory: stubInterface<StreamMuxerFactory>({
        createStreamMuxer: () => stubInterface<StreamMuxer>()
      }),
      signal: AbortSignal.timeout(5_000)
    })
    expect(connectionProtector.protect).to.have.property('called', false)
    expect(connectionEncrypter.secureOutbound).to.have.property('called', false)
  })

  it('should not decrement inbound pending connection count if the connection is denied', async () => {
    const components = await createDefaultUpgraderComponents({
      connectionManager: stubInterface<ConnectionManager>({
        acceptIncomingConnection: () => false
      })
    })
    const upgrader = new Upgrader(components, init)

    const [outbound, inbound] = multiaddrConnectionPair()

    handshake.forEach(buf => {
      outbound.send(buf)
    })

    await expect(upgrader.upgradeInbound(inbound, {
      signal: AbortSignal.timeout(5_000)
    })).to.eventually.be.rejected
      .with.property('name', 'ConnectionDeniedError')

    expect(components.connectionManager.afterUpgradeInbound).to.have.property('called', false)
  })

  describe('early muxer selection', () => {
    let earlyMuxerProtocol: string
    let streamMuxerFactory: StreamMuxerFactory
    let upgrader: Upgrader
    let encrypterProtocol: string

    beforeEach(async () => {
      encrypterProtocol = '/test-encrypt-with-early'
      earlyMuxerProtocol = '/early-muxer'
      streamMuxerFactory = stubInterface<StreamMuxerFactory>({
        protocol: earlyMuxerProtocol,
        createStreamMuxer: () => stubInterface<StreamMuxer>({
          protocol: earlyMuxerProtocol
        })
      })

      upgrader = new Upgrader(components, {
        connectionEncrypters: [
          stubInterface<ConnectionEncrypter>({
            protocol: encrypterProtocol,
            secureOutbound: async (connection) => ({
              connection,
              remotePeer,
              streamMuxer: streamMuxerFactory
            }),
            secureInbound: async (connection) => ({
              connection,
              remotePeer,
              streamMuxer: streamMuxerFactory
            })
          })
        ],
        streamMuxers: [
          stubInterface<StreamMuxerFactory>({
            protocol: '/late-muxer',
            createStreamMuxer: () => stubInterface<StreamMuxer>({
              protocol: '/late-muxer'
            })
          })
        ]
      })
    })

    it('should allow early muxer selection on inbound connection', async () => {
      const connectionPromise = pEvent<'connection:open', CustomEvent<Connection>>(components.events, 'connection:open')
      const [outbound, inbound] = multiaddrConnectionPair()

      await Promise.all([
        upgrader.upgradeInbound(inbound, {
          signal: AbortSignal.timeout(5_000)
        }),
        (async () => {
          await delay(10)

          outbound.send(encode.single(uint8ArrayFromString('/multistream/1.0.0\n')))
          outbound.send(encode.single(uint8ArrayFromString(`${encrypterProtocol}\n`)))
        })()
      ])

      const event = await connectionPromise
      const conn = event.detail

      expect(conn.multiplexer).to.equal(earlyMuxerProtocol)
    })

    it('should allow early muxer selection on outbound connection', async () => {
      const [outbound, inbound] = multiaddrConnectionPair()

      const [conn] = await Promise.all([
        upgrader.upgradeOutbound(outbound, {
          signal: AbortSignal.timeout(5_000)
        }),
        (async () => {
          await delay(10)

          inbound.send(encode.single(uint8ArrayFromString('/multistream/1.0.0\n')))
          inbound.send(encode.single(uint8ArrayFromString(`${encrypterProtocol}\n`)))
        })()
      ])

      expect(conn.multiplexer).to.equal(earlyMuxerProtocol)
    })
  })
})
