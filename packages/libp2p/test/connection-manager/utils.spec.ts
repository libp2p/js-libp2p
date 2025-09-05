import { peerIdFromString } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { stubInterface } from 'sinon-ts'
import { findExistingConnection, safelyCloseConnectionIfUnused } from '../../src/connection-manager/utils.js'
import type { Connection, Stream } from '@libp2p/interface'

describe('closing', () => {
  describe('connections', () => {
    it('should close a connection', async () => {
      const connection = stubInterface<Connection>({
        streams: []
      })

      await safelyCloseConnectionIfUnused(connection)

      expect(connection.close.called).to.be.true()
    })

    it('should pass options to a connection when closing', async () => {
      const options = {}
      const connection = stubInterface<Connection>({
        streams: []
      })

      await safelyCloseConnectionIfUnused(connection, options)

      expect(connection.close.calledWith(options)).to.be.true()
    })

    it('should abort a connection when closing fails', async () => {
      const err = new Error('Urk!')
      const connection = stubInterface<Connection>({
        streams: [],
        close: () => {
          throw err
        }
      })

      await safelyCloseConnectionIfUnused(connection)

      expect(connection.abort.calledWith(err)).to.be.true()
    })

    it('should close a connection with an un-negotiated stream', async () => {
      const connection = stubInterface<Connection>({
        streams: [
          stubInterface<Stream>({
            protocol: undefined
          })
        ]
      })

      await safelyCloseConnectionIfUnused(connection)

      expect(connection.close.called).to.be.true()
    })

    it('should close a connection with a closable stream', async () => {
      const connection = stubInterface<Connection>({
        streams: [
          stubInterface<Stream>({
            protocol: '/ipfs/id/1.0.0'
          })
        ]
      })

      await safelyCloseConnectionIfUnused(connection)

      expect(connection.close.called).to.be.true()
    })

    it('should close a connection with a closable stream', async () => {
      const protocol = '/my/closable/protocol'

      const connection = stubInterface<Connection>({
        streams: [
          stubInterface<Stream>({
            protocol
          })
        ]
      })

      await safelyCloseConnectionIfUnused(connection, {
        closableProtocols: [
          protocol
        ]
      })

      expect(connection.close.called).to.be.true()
    })

    it('should not close a connection with a non-closable stream', async () => {
      const protocol = '/my/non-closable/protocol'

      const connection = stubInterface<Connection>({
        streams: [
          stubInterface<Stream>({
            protocol
          })
        ]
      })

      await safelyCloseConnectionIfUnused(connection)

      expect(connection.close.called).to.be.false()
      expect(connection.abort.called).to.be.false()
    })

    it('should not close a connection with a mixture of closable and non-closable streams', async () => {
      const protocol = '/my/non-closable/protocol'

      const connection = stubInterface<Connection>({
        streams: [
          stubInterface<Stream>({
            protocol: '/ipfs/id/1.0.0'
          }),
          stubInterface<Stream>({
            protocol
          })
        ]
      })

      await safelyCloseConnectionIfUnused(connection)

      expect(connection.close.called).to.be.false()
      expect(connection.abort.called).to.be.false()
    })
  })
})

describe('find existing connection', () => {
  it('should find an existing connection by peer id', async () => {
    const remotePeer = peerIdFromString('12D3KooWJRSrypvnpHgc6ZAgyCni4KcSmbV7uGRaMw5LgMKT18fq')
    const remoteAddr = multiaddr(`/ip4/123.123.123.123/tcp/123/p2p/${remotePeer}`)
    const dialAddrs = [
      remoteAddr
    ]

    const existingConnection = stubInterface<Connection>({
      direct: true,
      limits: undefined,
      remotePeer,
      remoteAddr
    })

    const existingConnections = [
      stubInterface<Connection>({
        direct: true,
        limits: undefined,
        remotePeer: peerIdFromString('16Uiu2HAm2dSCBFxuge46aEt7U1oejtYuBUZXxASHqmcfVmk4gsbx'),
        remoteAddr: multiaddr('/ip4/125.125.125.125/tcp/123/p2p/16Uiu2HAm2dSCBFxuge46aEt7U1oejtYuBUZXxASHqmcfVmk4gsbx')
      }),
      existingConnection
    ]

    expect(
      findExistingConnection(existingConnections, dialAddrs, remotePeer)
    ).to.equal(existingConnection)
  })

  it('should find an existing connection by multiaddr', async () => {
    const remotePeer = peerIdFromString('12D3KooWJRSrypvnpHgc6ZAgyCni4KcSmbV7uGRaMw5LgMKT18fq')
    const remoteAddr = multiaddr('/ip4/123.123.123.123/tcp/123')
    const dialAddrs = [
      remoteAddr
    ]

    const existingConnection = stubInterface<Connection>({
      direct: true,
      limits: undefined,
      remotePeer,
      remoteAddr: remoteAddr.encapsulate(`/p2p/${remotePeer}`)
    })

    const existingConnections = [
      stubInterface<Connection>({
        direct: true,
        limits: undefined,
        remotePeer: peerIdFromString('16Uiu2HAm2dSCBFxuge46aEt7U1oejtYuBUZXxASHqmcfVmk4gsbx'),
        remoteAddr: multiaddr('/ip4/125.125.125.125/tcp/123/p2p/16Uiu2HAm2dSCBFxuge46aEt7U1oejtYuBUZXxASHqmcfVmk4gsbx')
      }),
      existingConnection
    ]

    expect(
      findExistingConnection(existingConnections, dialAddrs)
    ).to.equal(existingConnection)
  })

  it('should not find an existing limited connection when the new address would allow a direct connection', async () => {
    const remotePeer = peerIdFromString('12D3KooWJRSrypvnpHgc6ZAgyCni4KcSmbV7uGRaMw5LgMKT18fq')
    const remoteAddr = multiaddr(`/ip4/123.123.123.123/tcp/123/p2p/${remotePeer}`)
    const dialAddrs = [
      remoteAddr
    ]

    const existingConnections = [
      stubInterface<Connection>({
        direct: false,
        limits: {
          bytes: 100n
        },
        remotePeer,
        remoteAddr: multiaddr(`/ip4/125.125.125.125/tcp/123/p2p/16Uiu2HAm2dSCBFxuge46aEt7U1oejtYuBUZXxASHqmcfVmk4gsbx/p2p-circuit/p2p/${remotePeer}`)
      })
    ]

    expect(
      findExistingConnection(existingConnections, dialAddrs, remotePeer)
    ).to.be.undefined()
  })

  it('should not find an existing limited connection when the new address would allow a direct connection established via the existing connection', async () => {
    const remotePeer = peerIdFromString('12D3KooWJRSrypvnpHgc6ZAgyCni4KcSmbV7uGRaMw5LgMKT18fq')
    const remoteAddr = multiaddr(`/ip4/125.125.125.125/tcp/123/p2p/16Uiu2HAm2dSCBFxuge46aEt7U1oejtYuBUZXxASHqmcfVmk4gsbx/p2p-circuit/webrtc/p2p/${remotePeer}`)
    const dialAddrs = [
      remoteAddr
    ]

    const existingConnections = [
      stubInterface<Connection>({
        direct: false,
        limits: {
          bytes: 100n
        },
        remotePeer,
        remoteAddr: multiaddr(`/ip4/125.125.125.125/tcp/123/p2p/16Uiu2HAm2dSCBFxuge46aEt7U1oejtYuBUZXxASHqmcfVmk4gsbx/p2p-circuit/p2p/${remotePeer}`)
      })
    ]

    expect(
      findExistingConnection(existingConnections, dialAddrs, remotePeer)
    ).to.be.undefined()
  })
})
