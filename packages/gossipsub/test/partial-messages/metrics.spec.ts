import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import { createComponents, connectPubsubNodes } from '../utils/create-pubsub.js'
import { waitForPartialPeer } from './utils.js'
import type { MetricsRegister } from '../../src/metrics.js'
import type { GossipSubAndComponents } from '../utils/create-pubsub.js'

/**
 * A metrics register that just records what was incremented, so tests can
 * assert on observability without depending on a Prometheus client.
 */
function recordingRegister (): { register: MetricsRegister, values: Map<string, number> } {
  const values = new Map<string, number>()

  const key = (name: string, labels?: Record<string, string | number>): string => {
    if (labels == null || Object.keys(labels).length === 0) {
      return name
    }
    const suffix = Object.entries(labels).map(([k, v]) => `${k}=${String(v)}`).sort().join(',')
    return `${name}{${suffix}}`
  }

  const bump = (name: string) => (labelsOrValue?: any, maybeValue?: number): void => {
    const hasLabels = typeof labelsOrValue === 'object' && labelsOrValue !== null
    const labels = hasLabels ? labelsOrValue : undefined
    const value = (hasLabels ? maybeValue : labelsOrValue) ?? 1
    const k = key(name, labels)
    values.set(k, (values.get(k) ?? 0) + value)
  }

  const assign = (name: string) => (labelsOrValue?: any, maybeValue?: number): void => {
    const hasLabels = typeof labelsOrValue === 'object' && labelsOrValue !== null
    const labels = hasLabels ? labelsOrValue : undefined
    const value = (hasLabels ? maybeValue : labelsOrValue) ?? 0
    values.set(key(name, labels), value)
  }

  const register: MetricsRegister = {
    gauge: ({ name }: any) => ({ inc: bump(name), set: assign(name), addCollect: () => {} }) as any,
    histogram: ({ name }: any) => ({ startTimer: () => () => {}, observe: bump(name), reset: () => {} }) as any,
    avgMinMax: ({ name }: any) => ({ set: assign(name) }) as any
  }

  return { register, values }
}

describe('partial messages - metrics', () => {
  let nodeA: GossipSubAndComponents
  let nodeB: GossipSubAndComponents
  let values: Map<string, number>

  beforeEach(async () => {
    const recording = recordingRegister()
    values = recording.values

    nodeA = await createComponents({
      init: {
        emitSelf: false,
        metricsRegister: recording.register,
        metricsTopicStrToLabel: new Map([['test-topic', 'test-topic']])
      }
    })
    nodeB = await createComponents({ init: { emitSelf: false } })
    await connectPubsubNodes(nodeA, nodeB)
  })

  afterEach(async () => {
    await stop(nodeA.pubsub, ...Object.entries(nodeA.components))
    await stop(nodeB.pubsub, ...Object.entries(nodeB.components))
  })

  it('counts partial messages sent with data separately from metadata-only', async () => {
    const topic = 'test-topic'

    nodeA.pubsub.subscribePartial(topic, { requestsPartial: true, supportsSendingPartial: true })
    nodeB.pubsub.subscribePartial(topic, { requestsPartial: true, supportsSendingPartial: true })

    await waitForPartialPeer(nodeA, nodeB, topic)

    nodeA.pubsub.publishPartial({
      topic,
      groupID: Uint8Array.from([1]),
      partialMessage: Uint8Array.from([2]),
      partsMetadata: Uint8Array.from([0b1010])
    })

    expect(values.get('gossipsub_partial_msg_sent_total{kind=data}')).to.equal(1)
    expect(values.get('gossipsub_partial_msg_sent_total{kind=metadata}')).to.be.undefined()
  })

  it('counts received partials and records a reason for rejected ones', () => {
    const topic = 'test-topic'
    const gsA = nodeA.pubsub as any

    nodeA.pubsub.subscribePartial(topic, { requestsPartial: true, supportsSendingPartial: true })

    const topicIDBytes = new TextEncoder().encode(topic)

    gsA.handleReceivedRpc(nodeB.components.peerId, {
      subscriptions: [],
      messages: [],
      partial: { topicID: topicIDBytes, groupID: Uint8Array.from([1]), partsMetadata: Uint8Array.from([1]) }
    })

    // Oversized metadata is rejected with a distinguishable reason.
    gsA.handleReceivedRpc(nodeB.components.peerId, {
      subscriptions: [],
      messages: [],
      partial: {
        topicID: topicIDBytes,
        groupID: Uint8Array.from([2]),
        partsMetadata: new Uint8Array(64 * 1024)
      }
    })

    // A topic we hold no partial subscription for is rejected for another.
    gsA.handleReceivedRpc(nodeB.components.peerId, {
      subscriptions: [],
      messages: [],
      partial: {
        topicID: new TextEncoder().encode('other-topic'),
        groupID: Uint8Array.from([3]),
        partsMetadata: Uint8Array.from([1])
      }
    })

    expect(values.get('gossipsub_partial_msg_received_total')).to.equal(1)
    expect(values.get('gossipsub_partial_msg_rejected_total{reason=metadata_too_large}')).to.equal(1)
    expect(values.get('gossipsub_partial_msg_rejected_total{reason=topic_not_subscribed}')).to.equal(1)
  })

  it('reports tracked and pruned group counts from the heartbeat', async () => {
    const topic = 'test-topic'
    const gsA = nodeA.pubsub as any

    nodeA.pubsub.subscribePartial(topic, { requestsPartial: true, supportsSendingPartial: true })

    const state = gsA.partialMessageState.get(topic)
    state.updateMetadata(Uint8Array.from([1]), 'peer1', Uint8Array.from([0b1010]))
    state.updateMetadata(Uint8Array.from([2]), 'peer1', Uint8Array.from([0b0101]))

    await gsA.heartbeat()

    // Nothing has expired yet, so the gauge reports both groups still tracked.
    expect(values.get('gossipsub_partial_groups_tracked')).to.equal(2)
    expect(values.get('gossipsub_partial_groups_pruned_total')).to.be.undefined()
  })
})
