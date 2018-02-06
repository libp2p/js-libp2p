'use strict'

const PeerInfo = require('peer-info')
const PeerId = require('peer-id')
const parallel = require('async/parallel')
const pull = require('pull-stream')
const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const fixtures = require('./test-data/ids.json').infos

exports.createInfos = (num, callback) => {
  const tasks = []

  for (let i = 0; i < num; i++) {
    tasks.push((cb) => {
      if (fixtures[i]) {
        PeerId.createFromJSON(fixtures[i].id, (err, id) => {
          if (err) {
            return cb(err)
          }

          cb(null, new PeerInfo(id))
        })
        return
      }

      PeerInfo.create(cb)
    })
  }

  parallel(tasks, callback)
}

exports.tryEcho = (conn, callback) => {
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
