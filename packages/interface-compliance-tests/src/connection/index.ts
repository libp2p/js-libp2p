import { expect } from 'aegir/chai'
import sinon from 'sinon'
import { stubInterface } from 'ts-sinon'
import type { TestSetup } from '../index.js'
import type { Connection, Stream } from '@libp2p/interface/connection'

export default (test: TestSetup<Connection>): void => {
  describe('connection', () => {
    describe('open connection', () => {
      let connection: Connection

      beforeEach(async () => {
        connection = await test.setup()
      })

      afterEach(async () => {
        await connection.close()
        await test.teardown()
      })

      it('should have properties set', () => {
        expect(connection.id).to.exist()
        expect(connection.remotePeer).to.exist()
        expect(connection.remoteAddr).to.exist()
        expect(connection.status).to.equal('OPEN')
        expect(connection.timeline.open).to.exist()
        expect(connection.timeline.close).to.not.exist()
        expect(connection.direction).to.exist()
        expect(connection.streams).to.eql([])
        expect(connection.tags).to.eql([])
      })

      it('should get the metadata of an open connection', () => {
        expect(connection.status).to.equal('OPEN')
        expect(connection.direction).to.exist()
        expect(connection.timeline.open).to.exist()
        expect(connection.timeline.close).to.not.exist()
      })

      it('should return an empty array of streams', () => {
        const streams = connection.streams

        expect(streams).to.eql([])
      })

      it('should be able to create a new stream', async () => {
        expect(connection.streams).to.be.empty()

        const protocolToUse = '/echo/0.0.1'
        const stream = await connection.newStream([protocolToUse])

        expect(stream).to.have.property('protocol', protocolToUse)

        const connStreams = connection.streams

        expect(stream).to.exist()
        expect(connStreams).to.exist()
        expect(connStreams).to.have.lengthOf(1)
        expect(connStreams[0]).to.equal(stream)
      })
    })

    describe('close connection', () => {
      let connection: Connection
      let timelineProxy
      const proxyHandler = {
        set () {
          // @ts-expect-error - TS fails to infer here
          return Reflect.set(...arguments)
        }
      }

      beforeEach(async () => {
        timelineProxy = new Proxy({
          open: Date.now() - 10,
          upgraded: Date.now()
        }, proxyHandler)

        connection = await test.setup()
        connection.timeline = timelineProxy
      })

      afterEach(async () => {
        await test.teardown()
      })

      it('should be able to close the connection after being created', async () => {
        expect(connection.timeline.close).to.not.exist()
        await connection.close()

        expect(connection.timeline.close).to.exist()
        expect(connection.status).to.equal('CLOSED')
      })

      it('should be able to close the connection after opening a stream', async () => {
        // Open stream
        const protocol = '/echo/0.0.1'
        await connection.newStream([protocol])

        // Close connection
        expect(connection.timeline.close).to.not.exist()
        await connection.close()

        expect(connection.timeline.close).to.exist()
        expect(connection.status).to.equal('CLOSED')
      })

      it('should properly track streams', async () => {
        // Open stream
        const protocol = '/echo/0.0.1'
        const stream = await connection.newStream([protocol])
        expect(stream).to.have.property('protocol', protocol)

        // Close stream
        await stream.close()

        expect(connection.streams.filter(s => s.id === stream.id)).to.be.empty()
      })

      it('should track outbound streams', async () => {
        // Open stream
        const protocol = '/echo/0.0.1'
        const stream = await connection.newStream(protocol)
        expect(stream).to.have.property('direction', 'outbound')
      })

      it.skip('should track inbound streams', async () => {
        // Add an remotely opened stream
        const stream = stubInterface<Stream>()
        connection.addStream(stream)
        expect(stream).to.have.property('direction', 'inbound')
      })

      it('should support a proxy on the timeline', async () => {
        sinon.spy(proxyHandler, 'set')
        expect(connection.timeline.close).to.not.exist()

        await connection.close()
        // @ts-expect-error - fails to infer callCount
        expect(proxyHandler.set.callCount).to.equal(1)
        // @ts-expect-error - fails to infer getCall
        const [obj, key, value] = proxyHandler.set.getCall(0).args
        expect(obj).to.eql(connection.timeline)
        expect(key).to.equal('close')
        expect(value).to.be.a('number').that.equals(connection.timeline.close)
      })

      it('should fail to create a new stream if the connection is closing', async () => {
        expect(connection.timeline.close).to.not.exist()
        const p = connection.close()

        try {
          const protocol = '/echo/0.0.1'
          await connection.newStream([protocol])
        } catch (err: any) {
          expect(err).to.exist()
          return
        } finally {
          await p
        }

        throw new Error('should fail to create a new stream if the connection is closing')
      })

      it('should fail to create a new stream if the connection is closed', async () => {
        expect(connection.timeline.close).to.not.exist()
        await connection.close()

        try {
          const protocol = '/echo/0.0.1'
          await connection.newStream([protocol])
        } catch (err: any) {
          expect(err).to.exist()
          expect(err.code).to.equal('ERR_CONNECTION_CLOSED')
          return
        }

        throw new Error('should fail to create a new stream if the connection is closing')
      })
    })
  })
}
