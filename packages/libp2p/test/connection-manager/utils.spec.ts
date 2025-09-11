import { expect } from 'aegir/chai'
import { stubInterface } from 'sinon-ts'
import { safelyCloseConnectionIfUnused } from '../../src/connection-manager/utils.js'
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
