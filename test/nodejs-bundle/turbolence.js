/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const multiaddr = require('multiaddr')
const spawn = require('child_process').spawn
const path = require('path')
// const map = require('async/map')
const pull = require('pull-stream')
const utils = require('./utils')
const createNode = utils.createNode
const echo = utils.echo

describe('Turbolence tests', () => {
  let nodeA
  let nodeSpawn

  before((done) => {
    createNode('/ip4/0.0.0.0/tcp/0', (err, node) => {
      expect(err).to.not.exist()
      nodeA = node
      node.handle('/echo/1.0.0', echo)
      node.start(done)
    })
  })

  after((done) => nodeA.stop(done))

  it('spawn a node in a different process', (done) => {
    const filePath = path.join(__dirname, './spawn-libp2p-node.js')

    nodeSpawn = spawn(filePath, { env: process.env })

    let spawned = false

    nodeSpawn.stdout.on('data', (data) => {
      // console.log(data.toString())
      if (!spawned) {
        spawned = true
        done()
      }
    })

    nodeSpawn.stderr.on('data', (data) => console.log(data.toString()))
  })

  it('connect nodeA to that node', (done) => {
    const spawnedId = require('./test-data/test-id.json')
    const maddr = multiaddr('/ip4/127.0.0.1/tcp/12345/ipfs/' + spawnedId.id)

    nodeA.dial(maddr, '/echo/1.0.0', (err, conn) => {
      expect(err).to.not.exist()
      const peers = nodeA.peerBook.getAll()

      expect(Object.keys(peers)).to.have.length(1)

      pull(
        pull.values([Buffer.from('hey')]),
        conn,
        pull.collect((err, data) => {
          expect(err).to.not.exist()
          expect(data).to.eql([Buffer.from('hey')])
          done()
        })
      )
    })
  })

  it('crash that node, ensure nodeA continues going steady', (done) => {
    // TODO investigate why CI crashes
    setTimeout(() => nodeSpawn.kill('SIGKILL'), 1000)
    // nodeSpawn.kill('SIGKILL')
    setTimeout(check, 5000)

    function check () {
      const peers = nodeA.peerBook.getAll()
      expect(Object.keys(peers)).to.have.length(1)
      expect(Object.keys(nodeA.swarm.muxedConns)).to.have.length(0)
      done()
    }
  })
})
