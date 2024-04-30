import { Fingerprint } from './fingerprint.js'
import { getRandomInt } from './utils.js'

export class Bucket {
  private readonly contents: Array<Fingerprint | null>

  constructor (size: number) {
    this.contents = new Array(size).fill(null)
  }

  has (fingerprint: Fingerprint): boolean {
    if (!(fingerprint instanceof Fingerprint)) {
      throw new TypeError('Invalid Fingerprint')
    }

    return this.contents.some((fp) => {
      return fingerprint.equals(fp)
    })
  }

  add (fingerprint: Fingerprint): boolean {
    if (!(fingerprint instanceof Fingerprint)) {
      throw new TypeError('Invalid Fingerprint')
    }

    for (let i = 0; i < this.contents.length; i++) {
      if (this.contents[i] == null) {
        this.contents[i] = fingerprint
        return true
      }
    }

    return true
  }

  swap (fingerprint: Fingerprint): Fingerprint | null {
    if (!(fingerprint instanceof Fingerprint)) {
      throw new TypeError('Invalid Fingerprint')
    }

    const i = getRandomInt(0, this.contents.length - 1)
    const current = this.contents[i]
    this.contents[i] = fingerprint

    return current
  }

  remove (fingerprint: Fingerprint): boolean {
    if (!(fingerprint instanceof Fingerprint)) {
      throw new TypeError('Invalid Fingerprint')
    }

    const found = this.contents.findIndex((fp) => {
      return fingerprint.equals(fp)
    })

    if (found > -1) {
      this.contents[found] = null
      return true
    } else {
      return false
    }
  }
}
