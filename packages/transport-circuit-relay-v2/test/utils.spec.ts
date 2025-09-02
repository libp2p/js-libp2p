/* eslint-env mocha */

import { defaultLogger } from '@libp2p/logger'
import { streamPair } from '@libp2p/utils'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import delay from 'delay'
import all from 'it-all'
import { pEvent } from 'p-event'
import { retimeableSignal } from 'retimeable-signal'
import Sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { Uint8ArrayList } from 'uint8arraylist'
import { fromString as uint8arrayFromString } from 'uint8arrays/from-string'
import { createLimitedRelay, getExpirationMilliseconds, LimitTracker, namespaceToCid } from '../src/utils.js'
import type { Limit, RelayReservation } from '../src/index.js'
import type { Logger } from '@libp2p/interface'

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
    const controller = new AbortController()
    const [localToServer, serverToLocal] = await streamPair({
      delay: 10
    })
    const [serverToRemote, remoteToServer] = await streamPair({
      delay: 10
    })
    const localStreamAbortSpy = Sinon.spy(serverToLocal, 'abort')
    const remoteStreamAbortSpy = Sinon.spy(serverToRemote, 'abort')

    createLimitedRelay(serverToLocal, serverToRemote, controller.signal, createReservation(), {
      log: stubInterface<Logger>()
    })

    const [
      received
    ] = await Promise.all([
      all(remoteToServer),
      (async () => {
        localToServer.send(uint8arrayFromString('0123'))
        localToServer.send(uint8arrayFromString('4567'))
        localToServer.send(uint8arrayFromString('8912'))
        await localToServer.close()
      })()
    ])

    expect(new Uint8ArrayList(...received)).to.have.property('byteLength', 12)
    expect(localStreamAbortSpy).to.have.property('called', false)
    expect(remoteStreamAbortSpy).to.have.property('called', false)
  })

  it('should create relay that allows sending large amounts of data', async function () {
    const timeout = 360_000
    this.timeout(timeout)

    const controller = new AbortController()
    const [localToServer, serverToLocal] = await streamPair({
      delay: 10
    })
    const [serverToRemote, remoteToServer] = await streamPair({
      delay: 10
    })
    const localStreamAbortSpy = Sinon.spy(serverToLocal, 'abort')
    const remoteStreamAbortSpy = Sinon.spy(serverToRemote, 'abort')

    createLimitedRelay(serverToLocal, serverToRemote, controller.signal, createReservation(), {
      log: stubInterface<Logger>()
    })

    const sent = new Array(100)
      .fill(0)
      .map((val, index) => new Uint8Array(1024 * 1024 * 10).fill(index))

    // send data in both directions simultaneously
    const [
      remoteReceived,
      localReceived
    ] = await Promise.all([
      all(remoteToServer),
      all(localToServer),
      (async () => {
        for (const buf of sent) {
          if (!remoteToServer.send(buf)) {
            await pEvent(remoteToServer, 'drain', {
              rejectionEvents: [
                'close'
              ]
            })
          }
        }

        await remoteToServer.close()
      })(),
      (async () => {
        for (const buf of sent) {
          if (!localToServer.send(buf)) {
            await pEvent(localToServer, 'drain', {
              rejectionEvents: [
                'close'
              ]
            })
          }
        }

        await localToServer.close()
      })()
    ])

    expect(new Uint8ArrayList(...remoteReceived)).to.have.property('byteLength', new Uint8ArrayList(...sent).byteLength)
    expect(new Uint8ArrayList(...localReceived)).to.have.property('byteLength', new Uint8ArrayList(...sent).byteLength)
    expect(localStreamAbortSpy).to.have.property('called', false)
    expect(remoteStreamAbortSpy).to.have.property('called', false)
  })

  it('should create data limited relay', async () => {
    const controller = new AbortController()
    const limit = {
      data: 5n
    }

    const [localToServer, serverToLocal] = await streamPair({
      delay: 10
    })
    const [serverToRemote, remoteToServer] = await streamPair({
      delay: 10
    })
    const localStreamAbortSpy = Sinon.spy(serverToLocal, 'abort')
    const remoteStreamAbortSpy = Sinon.spy(serverToRemote, 'abort')

    createLimitedRelay(serverToLocal, serverToRemote, controller.signal, createReservation(limit), {
      log: stubInterface<Logger>()
    })

    const received: Array<Uint8Array | Uint8ArrayList> = []

    remoteToServer.addEventListener('message', (evt) => {
      received.push(evt.data)
    })

    localToServer.send(uint8arrayFromString('0123'))
    localToServer.send(uint8arrayFromString('4567'))

    await Promise.all([
      pEvent(remoteToServer, 'close'),
      localToServer.close()
    ])

    expect(new Uint8ArrayList(...received)).to.have.property('byteLength', 4)
    expect(localStreamAbortSpy).to.have.property('called', true)
    expect(remoteStreamAbortSpy).to.have.property('called', true)
  })

  it('should create data limited relay that limits data in both directions', async () => {
    const controller = new AbortController()
    const limit = {
      data: 5n
    }

    const [localToServer, serverToLocal] = await streamPair({
      delay: 10
    })
    const [serverToRemote, remoteToServer] = await streamPair({
      delay: 10
    })

    createLimitedRelay(serverToLocal, serverToRemote, controller.signal, createReservation(limit), {
      log: stubInterface<Logger>()
    })

    const received: Array<Uint8Array | Uint8ArrayList> = []

    remoteToServer.addEventListener('message', (evt) => {
      received.push(evt.data)
    })

    localToServer.addEventListener('message', (evt) => {
      received.push(evt.data)
    })

    localToServer.send(uint8arrayFromString('0123'))
    localToServer.send(uint8arrayFromString('4567'))

    remoteToServer.send(uint8arrayFromString('8912'))
    remoteToServer.send(uint8arrayFromString('3456'))

    await Promise.all([
      pEvent(remoteToServer, 'close'),
      localToServer.close(),
      remoteToServer.close()
    ])

    expect(new Uint8ArrayList(...received)).to.have.property('byteLength', 4)
    expect(localToServer).to.have.property('status', 'reset')
    expect(remoteToServer).to.have.property('status', 'reset')
    expect(serverToLocal).to.have.property('status', 'aborted')
    expect(serverToRemote).to.have.property('status', 'aborted')
  })

  it('should create time limited relay', async () => {
    const [localToServer, serverToLocal] = await streamPair({
      delay: 10
    })
    const [serverToRemote, remoteToServer] = await streamPair({
      delay: 10
    })

    const controller = new AbortController()
    const limit = {
      duration: 500
    }

    createLimitedRelay(serverToLocal, serverToRemote, controller.signal, createReservation(limit), {
      log: defaultLogger().forComponent('test')
    })

    const received: Array<Uint8Array | Uint8ArrayList> = []

    remoteToServer.addEventListener('message', (evt) => {
      received.push(evt.data)
    })

    await Promise.all([
      pEvent(localToServer, 'close'),
      pEvent(remoteToServer, 'close'),
      (async () => {
        if (localToServer.writeStatus === 'writable') {
          localToServer.send(uint8arrayFromString('0123'))
        }

        await delay(1_000)

        if (localToServer.writeStatus === 'writable') {
          localToServer.send(uint8arrayFromString('45678'))
        }
      })()
    ])

    expect(new Uint8ArrayList(...received)).to.have.property('byteLength', 4)
    expect(localToServer).to.have.property('status', 'reset')
    expect(remoteToServer).to.have.property('status', 'reset')
    expect(serverToLocal).to.have.property('status', 'aborted')
    expect(serverToRemote).to.have.property('status', 'aborted')
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
