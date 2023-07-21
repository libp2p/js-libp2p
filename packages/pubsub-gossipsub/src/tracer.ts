import { MsgIdStr, MsgIdToStrFn, PeerIdStr, RejectReason } from './types.js'
import type { Metrics } from './metrics.js'

/**
 * IWantTracer is an internal tracer that tracks IWANT requests in order to penalize
 * peers who don't follow up on IWANT requests after an IHAVE advertisement.
 * The tracking of promises is probabilistic to avoid using too much memory.
 *
 * Note: Do not confuse these 'promises' with JS Promise objects.
 * These 'promises' are merely expectations of a peer's behavior.
 */
export class IWantTracer {
  /**
   * Promises to deliver a message
   * Map per message id, per peer, promise expiration time
   */
  private readonly promises = new Map<MsgIdStr, Map<PeerIdStr, number>>()
  /**
   * First request time by msgId. Used for metrics to track expire times.
   * Necessary to know if peers are actually breaking promises or simply sending them a bit later
   */
  private readonly requestMsByMsg = new Map<MsgIdStr, number>()
  private readonly requestMsByMsgExpire: number

  constructor(
    private readonly gossipsubIWantFollowupMs: number,
    private readonly msgIdToStrFn: MsgIdToStrFn,
    private readonly metrics: Metrics | null
  ) {
    this.requestMsByMsgExpire = 10 * gossipsubIWantFollowupMs
  }

  get size(): number {
    return this.promises.size
  }

  get requestMsByMsgSize(): number {
    return this.requestMsByMsg.size
  }

  /**
   * Track a promise to deliver a message from a list of msgIds we are requesting
   */
  addPromise(from: PeerIdStr, msgIds: Uint8Array[]): void {
    // pick msgId randomly from the list
    const ix = Math.floor(Math.random() * msgIds.length)
    const msgId = msgIds[ix]
    const msgIdStr = this.msgIdToStrFn(msgId)

    let expireByPeer = this.promises.get(msgIdStr)
    if (!expireByPeer) {
      expireByPeer = new Map()
      this.promises.set(msgIdStr, expireByPeer)
    }

    const now = Date.now()

    // If a promise for this message id and peer already exists we don't update the expiry
    if (!expireByPeer.has(from)) {
      expireByPeer.set(from, now + this.gossipsubIWantFollowupMs)

      if (this.metrics) {
        this.metrics.iwantPromiseStarted.inc(1)
        if (!this.requestMsByMsg.has(msgIdStr)) {
          this.requestMsByMsg.set(msgIdStr, now)
        }
      }
    }
  }

  /**
   * Returns the number of broken promises for each peer who didn't follow up on an IWANT request.
   *
   * This should be called not too often relative to the expire times, since it iterates over the whole data.
   */
  getBrokenPromises(): Map<PeerIdStr, number> {
    const now = Date.now()
    const result = new Map<PeerIdStr, number>()

    let brokenPromises = 0

    this.promises.forEach((expireByPeer, msgId) => {
      expireByPeer.forEach((expire, p) => {
        // the promise has been broken
        if (expire < now) {
          // add 1 to result
          result.set(p, (result.get(p) ?? 0) + 1)
          // delete from tracked promises
          expireByPeer.delete(p)
          // for metrics
          brokenPromises++
        }
      })
      // clean up empty promises for a msgId
      if (!expireByPeer.size) {
        this.promises.delete(msgId)
      }
    })

    this.metrics?.iwantPromiseBroken.inc(brokenPromises)

    return result
  }

  /**
   * Someone delivered a message, stop tracking promises for it
   */
  deliverMessage(msgIdStr: MsgIdStr, isDuplicate = false): void {
    this.trackMessage(msgIdStr)

    const expireByPeer = this.promises.get(msgIdStr)

    // Expired promise, check requestMsByMsg
    if (expireByPeer) {
      this.promises.delete(msgIdStr)

      if (this.metrics) {
        this.metrics.iwantPromiseResolved.inc(1)
        if (isDuplicate) this.metrics.iwantPromiseResolvedFromDuplicate.inc(1)
        this.metrics.iwantPromiseResolvedPeers.inc(expireByPeer.size)
      }
    }
  }

  /**
   * A message got rejected, so we can stop tracking promises and let the score penalty apply from invalid message delivery,
   * unless its an obviously invalid message.
   */
  rejectMessage(msgIdStr: MsgIdStr, reason: RejectReason): void {
    this.trackMessage(msgIdStr)

    // A message got rejected, so we can stop tracking promises and let the score penalty apply.
    // With the expection of obvious invalid messages
    switch (reason) {
      case RejectReason.Error:
        return
    }

    this.promises.delete(msgIdStr)
  }

  clear(): void {
    this.promises.clear()
  }

  prune(): void {
    const maxMs = Date.now() - this.requestMsByMsgExpire
    let count = 0

    for (const [k, v] of this.requestMsByMsg.entries()) {
      if (v < maxMs) {
        // messages that stay too long in the requestMsByMsg map, delete
        this.requestMsByMsg.delete(k)
        count++
      } else {
        // recent messages, keep them
        // sort by insertion order
        break
      }
    }

    this.metrics?.iwantMessagePruned.inc(count)
  }

  private trackMessage(msgIdStr: MsgIdStr): void {
    if (this.metrics) {
      const requestMs = this.requestMsByMsg.get(msgIdStr)
      if (requestMs !== undefined) {
        this.metrics.iwantPromiseDeliveryTime.observe((Date.now() - requestMs) / 1000)
        this.requestMsByMsg.delete(msgIdStr)
      }
    }
  }
}
