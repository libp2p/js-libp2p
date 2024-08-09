/* eslint-disable no-unused-expressions */
import { expect } from 'aegir/chai'
import delay from 'delay'
import { RateLimiter } from '../src/rate-limiter.js'

describe('RateLimiter with fixed window', function () {
  this.timeout(5000)

  it('consume 1 point', async () => {
    const testKey = 'consume1'
    const rateLimiterMemory = new RateLimiter({ points: 2, duration: 5 })
    await rateLimiterMemory.consume(testKey)
    const res = rateLimiterMemory.memoryStorage.get(rateLimiterMemory.getKey(testKey))

    expect(res).to.have.property('consumedPoints', 1)
  })

  it('can not consume more than maximum points', async () => {
    const testKey = 'consume2'
    const rateLimiterMemory = new RateLimiter({ points: 1, duration: 5 })

    await expect(rateLimiterMemory.consume(testKey, 2)).to.eventually.be.rejected
      .with.property('msBeforeNext').that.is.gte(0)
  })

  it('execute evenly over duration with minimum delay 20 ms', async () => {
    const testKey = 'consumeEvenlyMinDelay'
    const rateLimiterMemory = new RateLimiter({
      points: 100, duration: 1, execEvenly: true, execEvenlyMinDelayMs: 20
    })

    await rateLimiterMemory.consume(testKey)

    const timeFirstConsume = Date.now()

    await rateLimiterMemory.consume(testKey)

    expect(Date.now() - timeFirstConsume >= 20).to.equal(true)
  })

  it('execute evenly over duration', async () => {
    const testKey = 'consumeEvenly'
    const rateLimiterMemory = new RateLimiter({
      points: 2, duration: 5, execEvenly: true, execEvenlyMinDelayMs: 1
    })
    await rateLimiterMemory.consume(testKey)

    const timeFirstConsume = Date.now()

    await rateLimiterMemory.consume(testKey)

    // Second consume should be delayed more than 2 seconds
    // Explanation:
    // 1) consume at 0ms, remaining duration = 5000ms
    // 2) delayed consume for (4999 / (0 + 2)) ~= 2500ms, where 2 is a fixed value
    // , because it mustn't delay in the beginning and in the end of duration
    // 3) consume after 2500ms by timeout

    const diff = Date.now() - timeFirstConsume
    expect(diff > 2400 && diff < 2600).to.equal(true)
  })

  it('makes penalty', async () => {
    const testKey = 'penalty1'
    const rateLimiterMemory = new RateLimiter({ points: 3, duration: 5 })
    await rateLimiterMemory.consume(testKey)

    rateLimiterMemory.penalty(testKey)

    const res = rateLimiterMemory.memoryStorage.get(rateLimiterMemory.getKey(testKey))

    expect(res).to.have.property('consumedPoints', 2)
  })

  it('reward points', async () => {
    const testKey = 'reward1'
    const rateLimiterMemory = new RateLimiter({ points: 1, duration: 5 })

    await rateLimiterMemory.consume(testKey)

    rateLimiterMemory.reward(testKey)

    const res = rateLimiterMemory.memoryStorage.get(rateLimiterMemory.getKey(testKey))

    expect(res).to.have.property('consumedPoints', 0)
  })

  it('use keyPrefix from options', () => {
    const testKey = 'key'
    const keyPrefix = 'test'
    const rateLimiterMemory = new RateLimiter({ keyPrefix, points: 1, duration: 5 })

    expect(rateLimiterMemory.getKey(testKey)).to.equal('test:key')
  })

  it('blocks key for block duration when consumed more than points', async () => {
    const testKey = 'block'
    const rateLimiterMemory = new RateLimiter({ points: 1, duration: 1, blockDuration: 2 })

    await expect(rateLimiterMemory.consume(testKey, 2)).to.eventually.be.rejected
      .with.property('msBeforeNext').that.is.greaterThan(1000)
  })

  it('do not block key second time until block expires no matter how many points consumed', async () => {
    const testKey = 'donotblocktwice'
    const rateLimiterMemory = new RateLimiter({ points: 1, duration: 1, blockDuration: 2 })

    await expect(rateLimiterMemory.consume(testKey, 2)).to.eventually.be.rejected()

    await delay(1201)

    await expect(rateLimiterMemory.consume(testKey)).to.eventually.be.rejected()
      .with.property('msBeforeNext').that.is.lessThan(1000)
  })

  it('block expires in blockDuration seconds', async () => {
    const testKey = 'blockexpires'
    const rateLimiterMemory = new RateLimiter({ points: 1, duration: 1, blockDuration: 2 })

    await expect(rateLimiterMemory.consume(testKey, 2)).to.eventually.be.rejected()

    await delay(2000)

    const res = await rateLimiterMemory.consume(testKey)

    expect(res).to.have.property('consumedPoints', 1)
  })

  it('block custom key', async () => {
    const testKey = 'blockcustom'
    const rateLimiterMemory = new RateLimiter({ points: 1, duration: 1 })
    rateLimiterMemory.block(testKey, 2)

    await expect(rateLimiterMemory.consume(testKey)).to.eventually.be.rejected()
      .with.property('msBeforeNext').that.is.within(1000, 2000)
  })

  it('get by key', async () => {
    const testKey = 'get'
    const rateLimiterMemory = new RateLimiter({ points: 2, duration: 5 })

    await rateLimiterMemory.consume(testKey)

    const res = rateLimiterMemory.get(testKey)

    expect(res).to.have.property('remainingPoints', 1)
  })

  it('get resolves null if key is not set', () => {
    const testKey = 'getbynotexistingkey'
    const rateLimiterMemory = new RateLimiter({ points: 2, duration: 5 })

    expect(rateLimiterMemory.get(testKey)).to.be.undefined()
  })

  it('delete resolves true if key is set', async () => {
    const testKey = 'deletekey'
    const rateLimiterMemory = new RateLimiter({ points: 2, duration: 5 })
    await rateLimiterMemory.consume(testKey)

    rateLimiterMemory.delete(testKey)

    expect(rateLimiterMemory.get(testKey)).to.be.undefined()
  })

  it('delete resolves false if key is not set', () => {
    const testKey = 'deletekey2'
    const rateLimiterMemory = new RateLimiter({ points: 2, duration: 5 })
    rateLimiterMemory.delete(testKey)

    expect(rateLimiterMemory.get(testKey)).to.be.undefined()
  })

  it('consume applies options.customDuration to set expire', async () => {
    const testKey = 'options.customDuration'
    const rateLimiterMemory = new RateLimiter({ points: 1, duration: 5 })

    const res = await rateLimiterMemory.consume(testKey, 1, { customDuration: 1 })
    expect(res.msBeforeNext).to.be.lte(1000)
  })

  it('consume applies options.customDuration to set not expiring key', async () => {
    const testKey = 'options.customDuration.forever'
    const rateLimiterMemory = new RateLimiter({ points: 1, duration: 5 })

    const res = await rateLimiterMemory.consume(testKey, 1, { customDuration: 0 })
    expect(res).to.have.property('msBeforeNext', -1)
  })

  it('penalty applies options.customDuration to set expire', () => {
    const testKey = 'options.customDuration'
    const rateLimiterMemory = new RateLimiter({ points: 1, duration: 5 })

    const res = rateLimiterMemory.penalty(testKey, 1, { customDuration: 1 })
    expect(res).to.have.property('msBeforeNext').that.is.lte(1000)
  })

  it('reward applies options.customDuration to set expire', () => {
    const testKey = 'options.customDuration'
    const rateLimiterMemory = new RateLimiter({ points: 1, duration: 5 })

    const res = rateLimiterMemory.reward(testKey, 1, { customDuration: 1 })
    expect(res).to.have.property('msBeforeNext').that.is.lte(1000)
  })

  it('does not expire key if duration set to 0', async () => {
    const testKey = 'neverexpire'
    const rateLimiterMemory = new RateLimiter({ points: 2, duration: 0 })
    await rateLimiterMemory.consume(testKey, 1)
    await rateLimiterMemory.consume(testKey, 1)

    const res = rateLimiterMemory.get(testKey)
    expect(res).to.have.property('consumedPoints', 2)
    expect(res).to.have.property('msBeforeNext', -1)
  })

  it('block key forever, if secDuration is 0', async () => {
    const testKey = 'neverexpire'
    const rateLimiter = new RateLimiter({ points: 1, duration: 1 })
    rateLimiter.block(testKey, 0)

    await delay(1000)

    const res = rateLimiter.get(testKey)
    expect(res).to.have.property('consumedPoints', 2)
    expect(res).to.have.property('msBeforeNext', -1)
  })

  it('set points by key', () => {
    const testKey = 'set'
    const rateLimiter = new RateLimiter({ points: 10, duration: 1 })
    rateLimiter.set(testKey, 12)

    const res = rateLimiter.get(testKey)
    expect(res).to.have.property('consumedPoints', 12)
    expect(res).to.have.property('remainingPoints', 0)
  })

  it('set points by key forever', async () => {
    const testKey = 'setforever'
    const rateLimiter = new RateLimiter({ points: 10, duration: 1 })
    rateLimiter.set(testKey, 12, 0)

    await delay(1100)

    const res = rateLimiter.get(testKey)
    expect(res).to.have.property('consumedPoints', 12)
    expect(res).to.have.property('msBeforeNext', -1)
  })

  it('consume should start new time window if previous already expired (msBeforeNext is negative)', async () => {
    const keyPrefix = 'test'
    const testKey = 'consume-negative-before-next'
    const rateLimiterMemory = new RateLimiter({ points: 2, duration: 5, keyPrefix })
    await rateLimiterMemory.consume(testKey)

    const rec = rateLimiterMemory.memoryStorage.storage.get(`${keyPrefix}:${testKey}`)
    expect(rec).to.be.ok()

    if (rec == null) {
      throw new Error('No record for key')
    }

    rec.expiresAt = new Date(Date.now() - 1000)

    const res = await rateLimiterMemory.consume(testKey)
    expect(res).to.have.property('consumedPoints', 1)
    expect(res).to.have.property('remainingPoints', 1)
    expect(res).to.have.property('msBeforeNext', 5000)
  })
})
