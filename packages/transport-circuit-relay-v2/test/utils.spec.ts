/* eslint-env mocha */

import { mockStream } from '@libp2p/interface-compliance-tests/mocks'
import { defaultLogger } from '@libp2p/logger'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import delay from 'delay'
import drain from 'it-drain'
import { pushable } from 'it-pushable'
import toBuffer from 'it-to-buffer'
import { raceSignal } from 'race-signal'
import { retimeableSignal } from 'retimeable-signal'
import Sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { Uint8ArrayList } from 'uint8arraylist'
import { fromString as uint8arrayFromString } from 'uint8arrays/from-string'
import { createLimitedRelay, getExpirationMilliseconds, LimitTracker, namespaceToCid } from '../src/utils.js'
import type { Limit, RelayReservation } from '../src/index.js'
import type { Logger } from '@libp2p/interface'
import type { Duplex, Source } from 'it-stream-types'

describe('circuit-relay utils', () => {
  function createReservation (limit?: Limit): RelayReservation {
    return {
      addr: multiaddr('/ip4/123.123.123.123/tcp/443/tls/wss'),
      expiry: new Date(Date.now() + 60000),
      signal: retimeableSignal(60000),
      limit
    }
  }

  it('should create relay', async () => {
    const received = pushable<Uint8Array>()

    const local: Duplex<any, Source<any>, any> = {
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
    const remote: Duplex<any, Source<any>, any> = {
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

    createLimitedRelay(localStream, remoteStream, controller.signal, createReservation(), {
      log: stubInterface<Logger>()
    })

    expect(await toBuffer(received)).to.have.property('byteLength', 12)
    expect(localStreamAbortSpy).to.have.property('called', false)
    expect(remoteStreamAbortSpy).to.have.property('called', false)
  })

  it('should create data limited relay', async () => {
    const received = pushable<Uint8Array>()

    const local: Duplex<any, Source<any>, any> = {
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
    const remote: Duplex<any, Source<any>, any> = {
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

    createLimitedRelay(localStream, remoteStream, controller.signal, createReservation(limit), {
      log: stubInterface<Logger>()
    })

    expect(await toBuffer(received)).to.have.property('byteLength', 5)
    expect(localStreamAbortSpy).to.have.property('called', true)
    expect(remoteStreamAbortSpy).to.have.property('called', true)
  })

  it('should create data limited relay that limits data in both directions', async () => {
    const received = pushable<Uint8Array>()

    const local: Duplex<any, Source<any>, any> = {
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
    const remote: Duplex<any, Source<any>, any> = {
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

    createLimitedRelay(localStream, remoteStream, controller.signal, createReservation(limit), {
      log: stubInterface<Logger>()
    })

    expect(await toBuffer(received)).to.have.property('byteLength', 5)
    expect(localStreamAbortSpy).to.have.property('called', true)
    expect(remoteStreamAbortSpy).to.have.property('called', true)
  })

  it('should create time limited relay', async () => {
    const received = pushable<Uint8Array>()
    const abortController = new AbortController()

    const local = {
      source: (async function * () {
        await raceSignal(delay(10), abortController.signal)
        yield new Uint8ArrayList(Uint8Array.from([0, 1, 2, 3]))
        await raceSignal(delay(5000), abortController.signal)
        yield new Uint8ArrayList(Uint8Array.from([4, 5, 6, 7]))
      }()),
      sink: async (source: Source<Uint8Array | Uint8ArrayList>) => {
        await drain(source)
      }
    }
    const remote = {
      source: (async function * () {}()),
      sink: async (source: Source<Uint8Array | Uint8ArrayList>) => {
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
    localStream.abort = () => {
      abortController.abort()
    }

    const remoteStream = mockStream(remote)

    const localStreamAbortSpy = Sinon.spy(localStream, 'abort')
    const remoteStreamAbortSpy = Sinon.spy(remoteStream, 'abort')

    createLimitedRelay(localStream, remoteStream, controller.signal, createReservation(limit), {
      log: defaultLogger().forComponent('test')
    })

    expect(await toBuffer(received)).to.have.property('byteLength', 4)
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

  it('should not track limits when there are none', () => {
    const tracker = new LimitTracker()

    expect(tracker.getLimits()).to.be.undefined()
  })

  it('should not track limits when they are unlimited', () => {
    const tracker = new LimitTracker({
      data: 0n,
      duration: 0
    })

    expect(tracker.getLimits()).to.be.undefined()
  })

  it('should track duration limit', async () => {
    const tracker = new LimitTracker({
      // two minutes
      duration: 120
    })

    expect(tracker.getLimits()).to.have.property('seconds', 120)

    const start = tracker.getLimits()?.seconds

    if (start == null) {
      throw new Error('No seconds property found')
    }

    await delay(2000)
    expect(tracker.getLimits()).to.have.property('seconds').that.is.lessThan(start)
  })

  it('should track data limit', () => {
    const tracker = new LimitTracker({
      data: 100n
    })

    expect(tracker.getLimits()).to.have.property('bytes', 100n)

    tracker.onData(new Uint8Array(1))

    expect(tracker.getLimits()).to.have.property('bytes', 99n)
  })
})
