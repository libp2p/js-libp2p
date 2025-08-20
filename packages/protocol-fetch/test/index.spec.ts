/* eslint-env mocha */

import { generateKeyPair } from '@libp2p/crypto/keys'
import { start, stop } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import { duplexPair } from 'it-pair/duplex'
import { pbStream } from 'it-protobuf-stream'
import sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { fromString as uint8arrayFromString } from 'uint8arrays/from-string'
import { toString as uint8arrayToString } from 'uint8arrays/to-string'
import { Fetch } from '../src/fetch.js'
import { FetchRequest, FetchResponse } from '../src/pb/proto.js'
import type { Connection, Stream, PeerId } from '@libp2p/interface'
import type { ConnectionManager, Registrar } from '@libp2p/interface-internal'
import type { StubbedInstance } from 'sinon-ts'

interface StubbedFetchComponents {
  registrar: StubbedInstance<Registrar>
  connectionManager: StubbedInstance<ConnectionManager>
}

async function createComponents (): Promise<StubbedFetchComponents> {
  return {
    registrar: stubInterface<Registrar>(),
    connectionManager: stubInterface<ConnectionManager>()
  }
}

function createStreams (components: StubbedFetchComponents, remotePeer?: PeerId): { incomingStream: StubbedInstance<Stream>, outgoingStream: StubbedInstance<Stream>, connection: StubbedInstance<Connection> } {
  const duplex = duplexPair<any>()
  const outgoingStream = stubInterface<Stream>()
  outgoingStream.source = duplex[0].source
  outgoingStream.sink.callsFake(async source => duplex[0].sink(source))

  const incomingStream = stubInterface<Stream>()
  incomingStream.source = duplex[1].source
  incomingStream.sink.callsFake(async source => duplex[1].sink(source))

  const connection = stubInterface<Connection>({
    log: defaultLogger().forComponent('connection')
  })

  if (remotePeer != null) {
    connection.newStream.withArgs('/libp2p/fetch/0.0.1').resolves(outgoingStream)
    components.connectionManager.openConnection.withArgs(remotePeer).resolves(connection)
  }

  return {
    incomingStream,
    outgoingStream,
    connection
  }
}

describe('fetch', () => {
  let components: StubbedFetchComponents
  let fetch: Fetch

  beforeEach(async () => {
    components = await createComponents()
    fetch = new Fetch(components)
  })

  afterEach(async () => {
    sinon.restore()

    await stop(fetch)
  })

  it('should register for fetch protocol on startup', async () => {
    await start(fetch)

    expect(components.registrar.handle.called).to.be.true('handle was not called')
    expect(components.registrar.handle.getCall(0).args[0]).to.equal('/libp2p/fetch/0.0.1')
  })

  describe('outgoing', () => {
    it('should be able to fetch from another peer', async () => {
      const remotePeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
      const key = 'key'
      const value = Uint8Array.from([0, 1, 2, 3, 4])

      const {
        incomingStream
      } = createStreams(components, remotePeer)

      const result = fetch.fetch(remotePeer, key)

      const pb = pbStream(incomingStream)
      const request = await pb.read(FetchRequest)

      expect(uint8arrayToString(request.identifier)).to.equal(key)

      await pb.write({
        status: FetchResponse.StatusCode.OK,
        data: value
      }, FetchResponse)

      await expect(result).to.eventually.deep.equal(value)
    })

    it('should be handle NOT_FOUND from the other peer', async () => {
      const remotePeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
      const key = 'key'

      const {
        incomingStream
      } = createStreams(components, remotePeer)

      const result = fetch.fetch(remotePeer, key)

      const pb = pbStream(incomingStream)
      const request = await pb.read(FetchRequest)

      expect(uint8arrayToString(request.identifier)).to.equal(key)

      await pb.write({
        status: FetchResponse.StatusCode.NOT_FOUND
      }, FetchResponse)

      await expect(result).to.eventually.be.undefined()
    })

    it('should be handle ERROR from the other peer', async () => {
      const remotePeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
      const key = 'key'

      const {
        incomingStream
      } = createStreams(components, remotePeer)

      const result = fetch.fetch(remotePeer, key)

      const pb = pbStream(incomingStream)
      const request = await pb.read(FetchRequest)

      expect(uint8arrayToString(request.identifier)).to.equal(key)

      await pb.write({
        status: FetchResponse.StatusCode.ERROR
      }, FetchResponse)

      await expect(result).to.eventually.be.rejected
        .with.property('name', 'ProtocolError')
    })

    it('should time out fetching from another peer when waiting for the record', async () => {
      const remotePeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
      const key = 'key'

      const {
        outgoingStream
      } = createStreams(components, remotePeer)

      outgoingStream.abort.callsFake((err) => {
        void outgoingStream.source.throw(err)
      })

      await expect(fetch.fetch(remotePeer, key, {
        signal: AbortSignal.timeout(10)
      })).to.eventually.be.rejected
        .with.property('name', 'AbortError')

      expect(outgoingStream.abort.called).to.be.true()
    })
  })

  describe('incoming', () => {
    it('should be able to send to another peer', async () => {
      const key = '/test/key'
      const value = Uint8Array.from([0, 1, 2, 3, 4])

      const {
        incomingStream,
        outgoingStream,
        connection
      } = createStreams(components)

      fetch.registerLookupFunction('/test', async (k) => {
        expect(k).to.equalBytes(uint8arrayFromString(key))
        return value
      })

      void fetch.handleMessage({
        stream: incomingStream,
        connection
      })

      const pb = pbStream(outgoingStream)

      await pb.write({
        identifier: uint8arrayFromString(key)
      }, FetchRequest)

      const response = await pb.read(FetchResponse)
      expect(response.status).to.equal(FetchResponse.StatusCode.OK)
      expect(response.data).to.equalBytes(value)
    })

    it('should handle not having the requested data', async () => {
      const key = '/test/key'

      const {
        incomingStream,
        outgoingStream,
        connection
      } = createStreams(components)

      fetch.registerLookupFunction('/test', async (k) => {
        return undefined
      })

      void fetch.handleMessage({
        stream: incomingStream,
        connection
      })

      const pb = pbStream(outgoingStream)

      await pb.write({
        identifier: uint8arrayFromString(key)
      }, FetchRequest)

      const response = await pb.read(FetchResponse)
      expect(response.status).to.equal(FetchResponse.StatusCode.NOT_FOUND)
    })

    it('should handle not having a handler for the key', async () => {
      const key = '/test/key'

      const {
        incomingStream,
        outgoingStream,
        connection
      } = createStreams(components)

      void fetch.handleMessage({
        stream: incomingStream,
        connection
      })

      const pb = pbStream(outgoingStream)

      await pb.write({
        identifier: uint8arrayFromString(key)
      }, FetchRequest)

      const response = await pb.read(FetchResponse)
      expect(response.status).to.equal(FetchResponse.StatusCode.ERROR)
    })

    it('should time out sending data to another peer waiting for the request', async () => {
      fetch = new Fetch(components, {
        timeout: 10
      })

      const {
        incomingStream,
        connection
      } = createStreams(components)

      await fetch.handleMessage({
        stream: incomingStream,
        connection
      })

      expect(incomingStream.abort.called).to.be.true()
      expect(incomingStream.abort.getCall(0).args[0]).to.have.property('name', 'AbortError')
    })
  })
})
