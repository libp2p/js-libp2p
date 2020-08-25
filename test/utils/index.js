'use strict'

const { expect } = require('chai')

exports.first = (map) => map.values().next().value

exports.expectSet = (set, subs) => {
  expect(Array.from(set.values())).to.eql(subs)
}

exports.defOptions = {
  emitSelf: true
}
