'use strict'

const tap = fn => it => {
  return (async function * () {
    let c = 0
    for await (const val of it) {
      await fn(val, c++)
      yield val
    }
  })()
}

const _consume = async (it) => {
  // eslint-disable-next-line no-unused-vars
  for await (const val of it) {
    // do nothing
  }
}
const consume = it => {
  if (it[Symbol.asyncIterator]) {
    return _consume(it)
  }
  // eslint-disable-next-line no-unused-vars
  for (const val of it) {
    // do nothing
  }
}

const _take = async function * (count, it) {
  let taken = 0
  for await (const val of it) {
    yield await val
    taken++
    if (taken >= count) {
      return
    }
  }
}
const _syncTake = function * (count, it) {
  let taken = 0
  for (const val of it) {
    yield val
    taken++
    if (taken >= count) {
      return
    }
  }
}
const take = (count, it) => {
  if (it === undefined) {
    return c => take(count, c)
  }
  if (it[Symbol.asyncIterator]) {
    return _take(count, it)
  }
  return _syncTake(count, it)
}

async function _collect (it) {
  const values = []
  for await (const value of it) {
    values.push(value)
  }
  return values
}
const collect = (it) => {
  if (it[Symbol.asyncIterator]) {
    return _collect(it)
  }
  return Array.from(it)
}

module.exports = {
  collect,
  consume,
  tap,
  take
}
