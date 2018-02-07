'use strict'

const pull = require('pull-stream')
const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

module.exports = (conn, callback) => {
  const values = [Buffer.from('echo')]

  pull(
    pull.values(values),
    conn,
    pull.collect((err, _values) => {
      expect(err).to.not.exist()
      expect(_values).to.eql(values)
      callback()
    })
  )
}
