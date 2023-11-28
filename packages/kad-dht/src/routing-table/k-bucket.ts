/*
index.js - Kademlia DHT K-bucket implementation as a binary tree.

The MIT License (MIT)

Copyright (c) 2013-2021 Tristan Slominski

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
*/

import { TypedEventEmitter } from '@libp2p/interface'
import type { PeerId } from '@libp2p/interface'

function arrayEquals (array1: Uint8Array, array2: Uint8Array): boolean {
  if (array1 === array2) {
    return true
  }
  if (array1.length !== array2.length) {
    return false
  }
  for (let i = 0, length = array1.length; i < length; ++i) {
    if (array1[i] !== array2[i]) {
      return false
    }
  }
  return true
}

function createNode (): Bucket {
  // @ts-expect-error loose types
  return { contacts: [], dontSplit: false, left: null, right: null }
}

function ensureInt8 (name: string, val?: Uint8Array): void {
  if (!(val instanceof Uint8Array)) {
    throw new TypeError(name + ' is not a Uint8Array')
  }
}

export interface PingEventDetails {
  oldContacts: Contact[]
  newContact: Contact
}

export interface UpdatedEventDetails {
  incumbent: Contact
  selection: Contact
}

export interface KBucketEvents {
  'ping': CustomEvent<PingEventDetails>
  'added': CustomEvent<Contact>
  'removed': CustomEvent<Contact>
  'updated': CustomEvent<UpdatedEventDetails>
}

export interface KBucketOptions {
  /**
   * A Uint8Array representing the local node id
   */
  localNodeId: Uint8Array

  /**
   * The number of nodes that a k-bucket can contain before being full or split.
   */
  numberOfNodesPerKBucket?: number

  /**
   * The number of nodes to ping when a bucket that should not be split becomes
   * full. KBucket will emit a `ping` event that contains `numberOfNodesToPing`
   * nodes that have not been contacted the longest.
   */
  numberOfNodesToPing?: number

  /**
   * An optional `distance` function that gets two `id` Uint8Arrays and return
   * distance (as number) between them.
   */
  distance?(a: Uint8Array, b: Uint8Array): number

  /**
   * An optional `arbiter` function that given two `contact` objects with the
   * same `id` returns the desired object to be used for updating the k-bucket.
   * For more details, see [arbiter function](#arbiter-function).
   */
  arbiter?(incumbent: Contact, candidate: Contact): Contact
}

export interface Contact {
  id: Uint8Array
  peer: PeerId
  vectorClock?: number
}

export interface Bucket {
  id: Uint8Array
  contacts: Contact[]
  dontSplit: boolean
  left: Bucket
  right: Bucket
}

/**
 * Implementation of a Kademlia DHT k-bucket used for storing
 * contact (peer node) information.
 */
export class KBucket extends TypedEventEmitter<KBucketEvents> {
  public localNodeId: Uint8Array
  public root: Bucket
  private readonly numberOfNodesPerKBucket: number
  private readonly numberOfNodesToPing: number
  private readonly distance: (a: Uint8Array, b: Uint8Array) => number
  private readonly arbiter: (incumbent: Contact, candidate: Contact) => Contact

  constructor (options: KBucketOptions) {
    super()

    this.localNodeId = options.localNodeId
    this.numberOfNodesPerKBucket = options.numberOfNodesPerKBucket ?? 20
    this.numberOfNodesToPing = options.numberOfNodesToPing ?? 3
    this.distance = options.distance ?? KBucket.distance
    // use an arbiter from options or vectorClock arbiter by default
    this.arbiter = options.arbiter ?? KBucket.arbiter

    ensureInt8('option.localNodeId as parameter 1', this.localNodeId)

    this.root = createNode()
  }

  /**
   * Default arbiter function for contacts with the same id. Uses
   * contact.vectorClock to select which contact to update the k-bucket with.
   * Contact with larger vectorClock field will be selected. If vectorClock is
   * the same, candidate will be selected.
   *
   * @param {object} incumbent - Contact currently stored in the k-bucket.
   * @param {object} candidate - Contact being added to the k-bucket.
   * @returns {object} Contact to updated the k-bucket with.
   */
  static arbiter (incumbent: Contact, candidate: Contact): Contact {
    return (incumbent.vectorClock ?? 0) > (candidate.vectorClock ?? 0) ? incumbent : candidate
  }

  /**
   * Default distance function. Finds the XOR
   * distance between firstId and secondId.
   *
   * @param  {Uint8Array} firstId -  Uint8Array containing first id.
   * @param  {Uint8Array} secondId -  Uint8Array containing second id.
   * @returns {number} Integer The XOR distance between firstId and secondId.
   */
  static distance (firstId: Uint8Array, secondId: Uint8Array): number {
    let distance = 0
    let i = 0
    const min = Math.min(firstId.length, secondId.length)
    const max = Math.max(firstId.length, secondId.length)
    for (; i < min; ++i) {
      distance = distance * 256 + (firstId[i] ^ secondId[i])
    }
    for (; i < max; ++i) distance = distance * 256 + 255
    return distance
  }

  /**
   * Adds a contact to the k-bucket.
   *
   * @param {object} contact - the contact object to add
   */
  add (contact: Contact): KBucket {
    ensureInt8('contact.id', contact?.id)

    let bitIndex = 0
    let node = this.root

    while (node.contacts === null) {
      // this is not a leaf node but an inner node with 'low' and 'high'
      // branches; we will check the appropriate bit of the identifier and
      // delegate to the appropriate node for further processing
      node = this._determineNode(node, contact.id, bitIndex++)
    }

    // check if the contact already exists
    const index = this._indexOf(node, contact.id)
    if (index >= 0) {
      this._update(node, index, contact)
      return this
    }

    if (node.contacts.length < this.numberOfNodesPerKBucket) {
      node.contacts.push(contact)
      this.safeDispatchEvent('added', { detail: contact })
      return this
    }

    // the bucket is full
    if (node.dontSplit) {
      // we are not allowed to split the bucket
      // we need to ping the first this.numberOfNodesToPing
      // in order to determine if they are alive
      // only if one of the pinged nodes does not respond, can the new contact
      // be added (this prevents DoS flodding with new invalid contacts)
      this.safeDispatchEvent('ping', {
        detail: {
          oldContacts: node.contacts.slice(0, this.numberOfNodesToPing),
          newContact: contact
        }
      })
      return this
    }

    this._split(node, bitIndex)
    return this.add(contact)
  }

  /**
   * Get the n closest contacts to the provided node id. "Closest" here means:
   * closest according to the XOR metric of the contact node id.
   *
   * @param {Uint8Array} id - Contact node id
   * @param {number} n - Integer (Default: Infinity) The maximum number of closest contacts to return
   * @returns {Array} Array Maximum of n closest contacts to the node id
   */
  closest (id: Uint8Array, n = Infinity): Contact[] {
    ensureInt8('id', id)

    if ((!Number.isInteger(n) && n !== Infinity) || n <= 0) {
      throw new TypeError('n is not positive number')
    }

    let contacts: Contact[] = []

    for (let nodes = [this.root], bitIndex = 0; nodes.length > 0 && contacts.length < n;) {
      const node = nodes.pop()

      if (node == null) {
        continue
      }

      if (node.contacts === null) {
        const detNode = this._determineNode(node, id, bitIndex++)
        nodes.push(node.left === detNode ? node.right : node.left)
        nodes.push(detNode)
      } else {
        contacts = contacts.concat(node.contacts)
      }
    }

    return contacts
      .map(a => ({
        distance: this.distance(a.id, id),
        contact: a
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, n)
      .map(a => a.contact)
  }

  /**
   * Counts the total number of contacts in the tree.
   *
   * @returns {number} The number of contacts held in the tree
   */
  count (): number {
    // return this.toArray().length
    let count = 0
    for (const nodes = [this.root]; nodes.length > 0;) {
      const node = nodes.pop()

      if (node == null) {
        continue
      }

      if (node.contacts === null) {
        nodes.push(node.right, node.left)
      } else {
        count += node.contacts.length
      }
    }

    return count
  }

  /**
   * Determines whether the id at the bitIndex is 0 or 1.
   * Return left leaf if `id` at `bitIndex` is 0, right leaf otherwise
   *
   * @param {object} node - internal object that has 2 leafs: left and right
   * @param {Uint8Array} id - Id to compare localNodeId with.
   * @param {number} bitIndex - Integer (Default: 0) The bit index to which bit to check in the id Uint8Array.
   * @returns {object} left leaf if id at bitIndex is 0, right leaf otherwise.
   */
  _determineNode (node: any, id: Uint8Array, bitIndex: number): Bucket {
    // **NOTE** remember that id is a Uint8Array and has granularity of
    // bytes (8 bits), whereas the bitIndex is the _bit_ index (not byte)

    // id's that are too short are put in low bucket (1 byte = 8 bits)
    // (bitIndex >> 3) finds how many bytes the bitIndex describes
    // bitIndex % 8 checks if we have extra bits beyond byte multiples
    // if number of bytes is <= no. of bytes described by bitIndex and there
    // are extra bits to consider, this means id has less bits than what
    // bitIndex describes, id therefore is too short, and will be put in low
    // bucket
    const bytesDescribedByBitIndex = bitIndex >> 3
    const bitIndexWithinByte = bitIndex % 8
    if ((id.length <= bytesDescribedByBitIndex) && (bitIndexWithinByte !== 0)) {
      return node.left
    }

    const byteUnderConsideration = id[bytesDescribedByBitIndex]

    // byteUnderConsideration is an integer from 0 to 255 represented by 8 bits
    // where 255 is 11111111 and 0 is 00000000
    // in order to find out whether the bit at bitIndexWithinByte is set
    // we construct (1 << (7 - bitIndexWithinByte)) which will consist
    // of all bits being 0, with only one bit set to 1
    // for example, if bitIndexWithinByte is 3, we will construct 00010000 by
    // (1 << (7 - 3)) -> (1 << 4) -> 16
    if ((byteUnderConsideration & (1 << (7 - bitIndexWithinByte))) !== 0) {
      return node.right
    }

    return node.left
  }

  /**
   * Get a contact by its exact ID.
   * If this is a leaf, loop through the bucket contents and return the correct
   * contact if we have it or null if not. If this is an inner node, determine
   * which branch of the tree to traverse and repeat.
   *
   * @param {Uint8Array} id - The ID of the contact to fetch.
   * @returns {object | null} The contact if available, otherwise null
   */
  get (id: Uint8Array): Contact | undefined {
    ensureInt8('id', id)

    let bitIndex = 0

    let node: Bucket = this.root
    while (node.contacts === null) {
      node = this._determineNode(node, id, bitIndex++)
    }

    // index of uses contact id for matching
    const index = this._indexOf(node, id)
    return index >= 0 ? node.contacts[index] : undefined
  }

  /**
   * Returns the index of the contact with provided
   * id if it exists, returns -1 otherwise.
   *
   * @param {object} node - internal object that has 2 leafs: left and right
   * @param {Uint8Array} id - Contact node id.
   * @returns {number} Integer Index of contact with provided id if it exists, -1 otherwise.
   */
  _indexOf (node: Bucket, id: Uint8Array): number {
    for (let i = 0; i < node.contacts.length; ++i) {
      if (arrayEquals(node.contacts[i].id, id)) return i
    }

    return -1
  }

  /**
   * Removes contact with the provided id.
   *
   * @param {Uint8Array} id - The ID of the contact to remove
   * @returns {object} The k-bucket itself
   */
  remove (id: Uint8Array): KBucket {
    ensureInt8('the id as parameter 1', id)

    let bitIndex = 0
    let node = this.root

    while (node.contacts === null) {
      node = this._determineNode(node, id, bitIndex++)
    }

    const index = this._indexOf(node, id)
    if (index >= 0) {
      const contact = node.contacts.splice(index, 1)[0]
      this.safeDispatchEvent('removed', {
        detail: contact
      })
    }

    return this
  }

  /**
   * Splits the node, redistributes contacts to the new nodes, and marks the
   * node that was split as an inner node of the binary tree of nodes by
   * setting this.root.contacts = null
   *
   * @param {object} node - node for splitting
   * @param {number} bitIndex - the bitIndex to which byte to check in the Uint8Array for navigating the binary tree
   */
  _split (node: Bucket, bitIndex: number): void {
    node.left = createNode()
    node.right = createNode()

    // redistribute existing contacts amongst the two newly created nodes
    for (const contact of node.contacts) {
      this._determineNode(node, contact.id, bitIndex).contacts.push(contact)
    }

    // @ts-expect-error loose types
    node.contacts = null // mark as inner tree node

    // don't split the "far away" node
    // we check where the local node would end up and mark the other one as
    // "dontSplit" (i.e. "far away")
    const detNode = this._determineNode(node, this.localNodeId, bitIndex)
    const otherNode = node.left === detNode ? node.right : node.left
    otherNode.dontSplit = true
  }

  /**
   * Returns all the contacts contained in the tree as an array.
   * If this is a leaf, return a copy of the bucket. If this is not a leaf,
   * return the union of the low and high branches (themselves also as arrays).
   *
   * @returns {Array} All of the contacts in the tree, as an array
   */
  toArray (): Contact[] {
    let result: Contact[] = []
    for (const nodes = [this.root]; nodes.length > 0;) {
      const node = nodes.pop()

      if (node == null) {
        continue
      }

      if (node.contacts === null) {
        nodes.push(node.right, node.left)
      } else {
        result = result.concat(node.contacts)
      }
    }
    return result
  }

  /**
   * Similar to `toArray()` but instead of buffering everything up into an
   * array before returning it, yields contacts as they are encountered while
   * walking the tree.
   *
   * @returns {Iterable} All of the contacts in the tree, as an iterable
   */
  * toIterable (): Iterable<Contact> {
    for (const nodes = [this.root]; nodes.length > 0;) {
      const node = nodes.pop()

      if (node == null) {
        continue
      }

      if (node.contacts === null) {
        nodes.push(node.right, node.left)
      } else {
        yield * node.contacts
      }
    }
  }

  /**
   * Updates the contact selected by the arbiter.
   * If the selection is our old contact and the candidate is some new contact
   * then the new contact is abandoned (not added).
   * If the selection is our old contact and the candidate is our old contact
   * then we are refreshing the contact and it is marked as most recently
   * contacted (by being moved to the right/end of the bucket array).
   * If the selection is our new contact, the old contact is removed and the new
   * contact is marked as most recently contacted.
   *
   * @param {object} node - internal object that has 2 leafs: left and right
   * @param {number} index - the index in the bucket where contact exists (index has already been computed in a previous calculation)
   * @param {object} contact - The contact object to update
   */
  _update (node: Bucket, index: number, contact: Contact): void {
    // sanity check
    if (!arrayEquals(node.contacts[index].id, contact.id)) {
      throw new Error('wrong index for _update')
    }

    const incumbent = node.contacts[index]
    const selection = this.arbiter(incumbent, contact)
    // if the selection is our old contact and the candidate is some new
    // contact, then there is nothing to do
    if (selection === incumbent && incumbent !== contact) return

    node.contacts.splice(index, 1) // remove old contact
    node.contacts.push(selection) // add more recent contact version
    this.safeDispatchEvent('updated', {
      detail: {
        incumbent, selection
      }
    })
  }
}
