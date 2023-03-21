/* eslint-env mocha */

import { mockStream } from '@libp2p/interface-mocks'
import { expect } from 'aegir/chai'
import { createLimitedRelay, getExpirationMilliseconds, namespaceToCid } from '../../src/circuit/utils.js'
import { fromString as uint8arrayFromString } from 'uint8arrays/from-string'
import delay from 'delay'
import drain from 'it-drain'
import type { Duplex } from 'it-stream-types'
import { pushable } from 'it-pushable'
import Sinon from 'sinon'
import toBuffer from 'it-to-buffer'

describe('circuit-relay utils', () => {
  it('should create relay', async () => {
    const received = pushable()

    const local: Duplex<any> = {
      source: (async function * () {
        await delay(10)
        yield uint8arrayFromString('0123')
        await delay(10)
        yield uint8arrayFromString('4567')
        await delay(10)
        yield uint8arrayFromString('8912')
      }()),
      sink: async (source) => {
        await drain(source)
      }
    }
    const remote: Duplex<any> = {
      source: [],
      sink: async (source) => {
        try {
          for await (const buf of source) {
            received.push(buf.subarray())
          }
        } finally {
          received.end()
        }
      }
    }

    const controller = new AbortController()
    const localStream = mockStream(local)
    const remoteStream = mockStream(remote)

    const localStreamAbortSpy = Sinon.spy(localStream, 'abort')
    const remoteStreamAbortSpy = Sinon.spy(remoteStream, 'abort')

    createLimitedRelay(localStream, remoteStream, controller.signal)

    expect(await toBuffer(received)).to.have.property('byteLength', 12)
    expect(localStreamAbortSpy).to.have.property('called', false)
    expect(remoteStreamAbortSpy).to.have.property('called', false)
  })

  it('should create data limited relay', async () => {
    const received = pushable()

    const local: Duplex<any> = {
      source: (async function * () {
        await delay(10)
        yield uint8arrayFromString('0123')
        await delay(10)
        yield uint8arrayFromString('4567')
        await delay(10)
      }()),
      sink: async (source) => {
        await drain(source)
      }
    }
    const remote: Duplex<any> = {
      source: [],
      sink: async (source) => {
        try {
          for await (const buf of source) {
            received.push(buf.subarray())
          }
        } finally {
          received.end()
        }
      }
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

    expect(await toBuffer(received)).to.have.property('byteLength', 5)
    expect(localStreamAbortSpy).to.have.property('called', true)
    expect(remoteStreamAbortSpy).to.have.property('called', true)
  })

  it('should create data limited relay that limits data in both directions', async () => {
    const received = pushable()

    const local: Duplex<any> = {
      source: (async function * () {
        await delay(10)
        yield uint8arrayFromString('0123')
        await delay(10)
        yield uint8arrayFromString('4567')
        await delay(10)
      }()),
      sink: async (source) => {
        try {
          for await (const buf of source) {
            received.push(buf.subarray())
          }
        } finally {
          received.end()
        }
      }
    }
    const remote: Duplex<any> = {
      source: (async function * () {
        await delay(10)
        yield uint8arrayFromString('8912')
        await delay(10)
        yield uint8arrayFromString('3456')
        await delay(10)
      }()),
      sink: async (source) => {
        try {
          for await (const buf of source) {
            received.push(buf.subarray())
          }
        } finally {
          received.end()
        }
      }
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

    expect(await toBuffer(received)).to.have.property('byteLength', 5)
    expect(localStreamAbortSpy).to.have.property('called', true)
    expect(remoteStreamAbortSpy).to.have.property('called', true)
  })

  it('should create time limited relay', async () => {
    const received = pushable()

    const local: Duplex<any> = {
      source: (async function * () {
        await delay(10)
        yield uint8arrayFromString('0123')
        await delay(10)
        yield uint8arrayFromString('4567')
        await delay(5000)
        yield uint8arrayFromString('8912')
      }()),
      sink: async (source) => {
        await drain(source)
      }
    }
    const remote: Duplex<any> = {
      source: [],
      sink: async (source) => {
        try {
          for await (const buf of source) {
            received.push(buf.subarray())
          }
        } finally {
          received.end()
        }
      }
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

    expect(await toBuffer(received)).to.have.property('byteLength', 8)
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
