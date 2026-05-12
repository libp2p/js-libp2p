import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { stubInterface } from 'sinon-ts'
import { findExistingConnection, safelyCloseConnectionIfUnused } from '../../src/connection-manager/utils.js'
import type { Connection, Stream } from '@libp2p/interface'

describe('findExistingConnection', () => {
  it('should return an open unlimited connection', () => {
    const connection = stubInterface<Connection>({
      status: 'open',
      limits: undefined,
      direct: true
    })

    const result = findExistingConnection(connection.remotePeer, [connection])

    expect(result).to.equal(connection)
  })

  it('should not return a closing connection', () => {
    const connection = stubInterface<Connection>({
      status: 'closing',
      limits: undefined,
      direct: true
    })

    const result = findExistingConnection(connection.remotePeer, [connection])

    expect(result).to.be.undefined()
  })

  it('should not return a closed connection', () => {
    const connection = stubInterface<Connection>({
      status: 'closed',
      limits: undefined,
      direct: true
    })

    const result = findExistingConnection(connection.remotePeer, [connection])

    expect(result).to.be.undefined()
  })

  it('should not return a limited connection', () => {
    const connection = stubInterface<Connection>({
      status: 'open',
      limits: { seconds: 60 },
      direct: true
    })

    const result = findExistingConnection(connection.remotePeer, [connection])

    expect(result).to.be.undefined()
  })

  it('should prefer a direct open connection over a relay open connection', () => {
    const directConnection = stubInterface<Connection>({
      status: 'open',
      limits: undefined,
      direct: true
    })
    const relayConnection = stubInterface<Connection>({
      status: 'open',
      limits: undefined,
      direct: false
    })

    const result = findExistingConnection(directConnection.remotePeer, [relayConnection, directConnection])

    expect(result).to.equal(directConnection)
  })

  it('should not return a closing direct connection when an open relay connection exists', () => {
    const directConnection = stubInterface<Connection>({
      status: 'closing',
      limits: undefined,
      direct: true
    })
    const relayConnection = stubInterface<Connection>({
      status: 'open',
      limits: undefined,
      direct: false
    })

    const result = findExistingConnection(directConnection.remotePeer, [relayConnection, directConnection])

    // the closing direct connection is excluded; the relay is returned
    expect(result).to.equal(relayConnection)
  })

  it('should return undefined when no connections are provided', () => {
    const result = findExistingConnection(stubInterface<Connection>().remotePeer, [])

    expect(result).to.be.undefined()
  })

  it('should return undefined when peerId is not provided', () => {
    const connection = stubInterface<Connection>({
      status: 'open',
      limits: undefined
    })

    const result = findExistingConnection(undefined, [connection])

    expect(result).to.be.undefined()
  })

  it('should allow a direct connection upgrade when an open relay connection exists and dial addresses include a direct address', () => {
    const relayConnection = stubInterface<Connection>({
      status: 'open',
      limits: undefined,
      direct: false
    })
    // a real TCP multiaddr is not a circuit relay address, so isDirect() returns true
    const directAddr = multiaddr('/ip4/1.2.3.4/tcp/4001')

    // relay + direct dial addr → findExistingConnection allows upgrade → returns undefined
    const result = findExistingConnection(relayConnection.remotePeer, [relayConnection], [directAddr])

    expect(result).to.be.undefined()
  })
})

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
