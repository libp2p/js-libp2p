import { defaultLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import pRetry from 'p-retry'
import { stubInterface } from 'sinon-ts'
import { MAX_EARLY_DATA_CHANNEL_BYTES, MAX_EARLY_DATA_CHANNEL_MESSAGES, MAX_EARLY_DATA_CHANNELS } from '../src/constants.ts'
import { DataChannelMuxerFactory } from '../src/muxer.ts'
import type { DataChannelMuxerFactoryInit } from '../src/muxer.ts'
import type { CounterGroup, MultiaddrConnection } from '@libp2p/interface'

describe('muxer', () => {
  it.skip('should delay notification of early streams', async () => {
    let onIncomingStreamInvoked = false

    // @ts-expect-error incomplete implementation
    const peerConnection: RTCPeerConnection = {}

    const muxerFactory = new DataChannelMuxerFactory({
      peerConnection
    })

    // simulate early connection
    // @ts-expect-error incomplete implementation
    const event: RTCDataChannelEvent = {
      channel: stubInterface<RTCDataChannel>({
        readyState: 'connecting'
      })
    }
    peerConnection.ondatachannel?.(event)

    const muxer = muxerFactory.createStreamMuxer(stubInterface<MultiaddrConnection>({
      log: defaultLogger().forComponent('libp2p:maconn')
    }))

    muxer.addEventListener('stream', () => {
      onIncomingStreamInvoked = true
    })

    expect(onIncomingStreamInvoked).to.be.false()

    await pRetry(() => {
      if (!onIncomingStreamInvoked) {
        throw new Error('onIncomingStreamInvoked was still false')
      }
    })

    expect(onIncomingStreamInvoked).to.be.true()
  })
})

/**
 * Minimal fake RTCDataChannel that records whether it was closed and can
 * synthesise incoming `message` events of a given size.
 */
interface FakeDataChannel {
  label: string
  readyState: string
  id: number
  binaryType?: string
  onmessage: ((ev: { data: unknown }) => void) | null
  closed: boolean
  close(): void
  emit(bytes: number): void
  emitData(data: unknown): void
}

let nextChannelId = 0

function makeChannel (label = ''): FakeDataChannel {
  return {
    label,
    readyState: 'open',
    id: nextChannelId++,
    binaryType: undefined,
    onmessage: null,
    closed: false,
    close (): void {
      this.closed = true
      this.readyState = 'closed'
    },
    emit (bytes: number): void {
      this.emitData(new ArrayBuffer(bytes))
    },
    emitData (data: unknown): void {
      this.onmessage?.({ data })
    }
  }
}

function dispatchChannel (pc: EventTarget, channel: FakeDataChannel): void {
  pc.dispatchEvent(Object.assign(new Event('datachannel'), { channel }))
}

function makeFactory (pc: EventTarget, init: Partial<DataChannelMuxerFactoryInit> = {}): DataChannelMuxerFactory {
  return new DataChannelMuxerFactory({
    peerConnection: pc as unknown as RTCPeerConnection,
    ...init
  })
}

describe('muxer early data channel buffer bounds', () => {
  it('closes an early data channel that exceeds the per-channel byte cap', () => {
    const pc = new EventTarget()
    makeFactory(pc)

    const channel = makeChannel()
    dispatchChannel(pc, channel)

    // binaryType is forced to arraybuffer so message sizes are measurable in
    // browsers (where the default is blob)
    expect(channel.binaryType).to.equal('arraybuffer')

    // buffering up to the cap is fine, the channel stays open
    channel.emit(MAX_EARLY_DATA_CHANNEL_BYTES)
    expect(channel.closed).to.be.false()

    // the next message pushes it over the cap, so the channel is closed
    channel.emit(1)
    expect(channel.closed).to.be.true()
  })

  it('closes an early data channel that sends a non-ArrayBuffer message', () => {
    const pc = new EventTarget()
    makeFactory(pc)

    const channel = makeChannel()
    dispatchChannel(pc, channel)

    // a text frame has no measurable size and is not something the stream could
    // consume, so it is treated as a misbehaving remote
    channel.emitData('a text frame')
    expect(channel.closed).to.be.true()
  })

  it('closes an early data channel that buffers more than the message cap', () => {
    const pc = new EventTarget()
    makeFactory(pc)

    const channel = makeChannel()
    dispatchChannel(pc, channel)

    // a flood of tiny messages stays under the byte cap but must still be bounded
    for (let i = 0; i < MAX_EARLY_DATA_CHANNEL_MESSAGES; i++) {
      channel.emit(1)
      expect(channel.closed, `after message ${i}`).to.be.false()
    }

    channel.emit(1)
    expect(channel.closed).to.be.true()
  })

  it('rejects early data channels beyond the max count without aborting the connection', () => {
    const pc = new EventTarget()
    let pcClosed = false
    ;(pc as unknown as { close(): void }).close = () => { pcClosed = true }
    makeFactory(pc)

    const channels: FakeDataChannel[] = []
    for (let i = 0; i < MAX_EARLY_DATA_CHANNELS + 1; i++) {
      const channel = makeChannel()
      channels.push(channel)
      dispatchChannel(pc, channel)
    }

    // the first MAX_EARLY_DATA_CHANNELS are buffered and stay open
    for (let i = 0; i < MAX_EARLY_DATA_CHANNELS; i++) {
      expect(channels[i].closed, `channel ${i} should be open`).to.be.false()
    }

    // the channel beyond the cap is rejected (closed)
    expect(channels[MAX_EARLY_DATA_CHANNELS].closed).to.be.true()

    // the connection itself is not aborted
    expect(pcClosed).to.be.false()
  })

  it('frees a count slot when an over-limit channel is closed', () => {
    const pc = new EventTarget()
    makeFactory(pc)

    const buffered: FakeDataChannel[] = []
    for (let i = 0; i < MAX_EARLY_DATA_CHANNELS; i++) {
      const channel = makeChannel()
      buffered.push(channel)
      dispatchChannel(pc, channel)
    }

    // dropping a buffered channel must splice it out, not merely close it
    buffered[0].emitData('a text frame')
    expect(buffered[0].closed).to.be.true()

    // the freed slot lets a newly-arriving channel be buffered rather than
    // rejected - if the dropped channel were left in the buffer the count would
    // still be at the cap and this channel would be closed on arrival
    const late = makeChannel()
    dispatchChannel(pc, late)
    expect(late.closed, 'late channel should be accepted after a slot frees').to.be.false()
    expect(late.onmessage, 'late channel should be buffered').to.not.be.null()
  })

  it('meters a drop with the reason as the metric key', () => {
    const pc = new EventTarget()
    const increments: Array<Record<string, boolean>> = []
    makeFactory(pc, {
      metrics: {
        increment: (values: Record<string, boolean>) => { increments.push(values) }
      } as unknown as CounterGroup
    })

    const channel = makeChannel()
    dispatchChannel(pc, channel)
    channel.emitData('a text frame')

    expect(increments).to.deep.include({ early_data_channel_invalid_message: true })
  })

  it('close() detaches the datachannel listener and clears buffered early channels', () => {
    const pc = new EventTarget()
    const factory = makeFactory(pc)

    const channel = makeChannel()
    dispatchChannel(pc, channel)
    channel.emit(100)
    expect(channel.onmessage).to.not.be.null()

    factory.close()

    // buffered channels are closed, their handlers detached and buffers released
    expect(channel.closed).to.be.true()
    expect(channel.onmessage).to.be.null()

    // the datachannel listener is detached: a channel arriving after close is
    // not handled by the factory
    const late = makeChannel()
    dispatchChannel(pc, late)
    expect(late.onmessage).to.be.null()
  })

  it('close() is a no-op once the muxer has taken over the early channels', () => {
    const pc = new EventTarget()
    const factory = makeFactory(pc)

    const channel = makeChannel()
    dispatchChannel(pc, channel)

    // hand the buffered channels over to the muxer
    factory.createStreamMuxer(stubInterface<MultiaddrConnection>({
      log: defaultLogger().forComponent('libp2p:maconn')
    }))

    // the muxer owns the early channels now, so close() must not dispose them
    factory.close()

    expect(channel.closed).to.be.false()
    expect(channel.onmessage).to.not.be.null()
  })
})
