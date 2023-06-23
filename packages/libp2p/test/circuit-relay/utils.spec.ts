/* eslint-env mocha */

import { mockStream } from '@libp2p/interface-compliance-tests/mocks'
import { writeableStreamToDrain, readableStreamFromGenerator, readableStreamFromArray, writeableStreamToArray } from '@libp2p/utils/stream'
import { expect } from 'aegir/chai'
import delay from 'delay'
import toBuffer from 'it-to-buffer'
import Sinon from 'sinon'
import { fromString as uint8arrayFromString } from 'uint8arrays/from-string'
import { createLimitedRelay, getExpirationMilliseconds, namespaceToCid } from '../../src/circuit-relay/utils.js'
import type { ByteStream } from '@libp2p/interface/src/connection/index.js'

describe('circuit-relay utils', () => {
  it('should create relay', async () => {
    const received: Uint8Array[] = []

    const local: ByteStream = {
      readable: readableStreamFromGenerator(async function * () {
        await delay(10)
        yield uint8arrayFromString('0123')
        await delay(10)
        yield uint8arrayFromString('4567')
        await delay(10)
        yield uint8arrayFromString('8912')
      }()),
      writable: writeableStreamToDrain()
    }
    const remote: ByteStream = {
      readable: readableStreamFromArray([]),
      writable: writeableStreamToArray(received)
    }

    const controller = new AbortController()
    const localStream = mockStream(local)
    const remoteStream = mockStream(remote)

    const localStreamAbortSpy = Sinon.spy(localStream, 'abort')
    const remoteStreamAbortSpy = Sinon.spy(remoteStream, 'abort')

    createLimitedRelay(localStream, remoteStream, controller.signal)

    expect(toBuffer(received)).to.have.property('byteLength', 12)
    expect(localStreamAbortSpy).to.have.property('called', false)
    expect(remoteStreamAbortSpy).to.have.property('called', false)
  })

  it('should create data limited relay', async () => {
    const received: Uint8Array[] = []

    const local: ByteStream = {
      readable: readableStreamFromGenerator(async function * () {
        await delay(10)
        yield uint8arrayFromString('0123')
        await delay(10)
        yield uint8arrayFromString('4567')
        await delay(10)
      }()),
      writable: writeableStreamToDrain()
    }
    const remote: ByteStream = {
      readable: readableStreamFromArray([]),
      writable: writeableStreamToArray(received)
    }

    const controller = new AbortController()
    const limit = {
      data: 5n
    }

    const localStream = mockStream(local)
    const remoteStream = mockStream(remote)

    const localStreamAbortSpy = Sinon.spy(localStream, 'abort')
    const remoteStreamAbortSpy = Sinon.spy(remoteStream, 'abort')

    createLimitedRelay(localStream, remoteStream, controller.signal, limit)

    expect(toBuffer(received)).to.have.property('byteLength', 5)
    expect(localStreamAbortSpy).to.have.property('called', true)
    expect(remoteStreamAbortSpy).to.have.property('called', true)
  })

  it('should create data limited relay that limits data in both directions', async () => {
    const received: Uint8Array[] = []

    const local: ByteStream = {
      readable: readableStreamFromGenerator(async function * () {
        await delay(10)
        yield uint8arrayFromString('0123')
        await delay(10)
        yield uint8arrayFromString('4567')
        await delay(10)
      }()),
      writable: writeableStreamToArray(received)
    }
    const remote: ByteStream = {
      readable: readableStreamFromGenerator(async function * () {
        await delay(10)
        yield uint8arrayFromString('8912')
        await delay(10)
        yield uint8arrayFromString('3456')
        await delay(10)
      }()),
      writable: writeableStreamToArray(received)
    }

    const controller = new AbortController()
    const limit = {
      data: 5n
    }

    const localStream = mockStream(local)
    const remoteStream = mockStream(remote)

    const localStreamAbortSpy = Sinon.spy(localStream, 'abort')
    const remoteStreamAbortSpy = Sinon.spy(remoteStream, 'abort')

    createLimitedRelay(localStream, remoteStream, controller.signal, limit)

    expect(toBuffer(received)).to.have.property('byteLength', 5)
    expect(localStreamAbortSpy).to.have.property('called', true)
    expect(remoteStreamAbortSpy).to.have.property('called', true)
  })

  it('should create time limited relay', async () => {
    const received: Uint8Array[] = []

    const local: ByteStream = {
      readable: readableStreamFromGenerator(async function * () {
        await delay(10)
        yield uint8arrayFromString('0123')
        await delay(10)
        yield uint8arrayFromString('4567')
        await delay(5000)
        yield uint8arrayFromString('8912')
      }()),
      writable: writeableStreamToDrain()
    }
    const remote: ByteStream = {
      readable: readableStreamFromArray([]),
      writable: writeableStreamToArray(received)
    }

    const controller = new AbortController()
    const limit = {
      duration: 100
    }

    const localStream = mockStream(local)
    const remoteStream = mockStream(remote)

    const localStreamAbortSpy = Sinon.spy(localStream, 'abort')
    const remoteStreamAbortSpy = Sinon.spy(remoteStream, 'abort')

    createLimitedRelay(localStream, remoteStream, controller.signal, limit)

    expect(toBuffer(received)).to.have.property('byteLength', 8)
    expect(localStreamAbortSpy).to.have.property('called', true)
    expect(remoteStreamAbortSpy).to.have.property('called', true)
  })

  it('should get expiration time', () => {
    const delta = 10
    const time = BigInt(Date.now() + delta)
    const expiration = getExpirationMilliseconds(time)

    expect(expiration).to.be.above(delta / 2)
  })

  it('should create cid from namespace', async () => {
    const cid = await namespaceToCid('/foo/bar')

    expect(cid.toString()).to.equal('QmZ8eiDPqQqWR17EPxiwCDgrKPVhCHLcyn6xSCNpFAdAZb')
  })
})
