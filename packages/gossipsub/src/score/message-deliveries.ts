import Denque from 'denque'
import { TimeCacheDuration } from '../constants.js'

export enum DeliveryRecordStatus {
  /**
   * we don't know (yet) if the message is valid
   */
  unknown,
  /**
   * we know the message is valid
   */
  valid,
  /**
   * we know the message is invalid
   */
  invalid,
  /**
   * we were instructed by the validator to ignore the message
   */
  ignored
}

export interface DeliveryRecord {
  status: DeliveryRecordStatus
  firstSeenTsMs: number
  validated: number
  peers: Set<string>
}

interface DeliveryQueueEntry {
  msgId: string
  expire: number
}

/**
 * Map of canonical message ID to DeliveryRecord
 *
 * Maintains an internal queue for efficient gc of old messages
 */
export class MessageDeliveries {
  private readonly records: Map<string, DeliveryRecord>
  public queue: Denque<DeliveryQueueEntry>

  constructor () {
    this.records = new Map()
    this.queue = new Denque()
  }

  getRecord (msgIdStr: string): DeliveryRecord | undefined {
    return this.records.get(msgIdStr)
  }

  ensureRecord (msgIdStr: string): DeliveryRecord {
    let drec = this.records.get(msgIdStr)
    if (drec != null) {
      return drec
    }

    // record doesn't exist yet
    // create record
    drec = {
      status: DeliveryRecordStatus.unknown,
      firstSeenTsMs: Date.now(),
      validated: 0,
      peers: new Set()
    }
    this.records.set(msgIdStr, drec)

    // and add msgId to the queue
    const entry: DeliveryQueueEntry = {
      msgId: msgIdStr,
      expire: Date.now() + TimeCacheDuration
    }
    this.queue.push(entry)

    return drec
  }

  gc (): void {
    const now = Date.now()
    // queue is sorted by expiry time
    // remove expired messages, remove from queue until first un-expired message found
    let head = this.queue.peekFront()
    while ((head != null) && head.expire < now) {
      this.records.delete(head.msgId)
      this.queue.shift()
      head = this.queue.peekFront()
    }
  }

  clear (): void {
    this.records.clear()
    this.queue.clear()
  }
}
