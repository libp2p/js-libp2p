var Lab = require('lab')
var Code = require('code')
var lab = exports.lab = Lab.script()

var experiment = lab.experiment
var test = lab.test
var beforeEach = lab.beforeEach
var afterEach = lab.afterEach
var expect = Code.expect

var Muxer = require('./../src/stream-muxer.js')
var multistream = require('multistream-select')
var Interactive = multistream.Interactive
var Select = multistream.Select
var streamPair = require('stream-pair')

beforeEach(function (done) {
  done()
})

afterEach(function (done) {
  done()
})

experiment('MULTISTREAM AND STREAM MUXER', function () {
  test('Open a socket and multistream-select it into spdy', function (done) {
    var pair = streamPair.create()

    var msI = new Interactive()
    var msS = new Select()

    var dialerMuxer = new Muxer()
    var listenerMuxer = new Muxer()

    msS.handle(pair.other)

    msS.addHandler('/spdy/0.3.1', function (stream) {
      var listenerConn = listenerMuxer.attach(stream, true)
      expect(typeof listenerConn).to.be.equal('object')
      done()
    })

    msI.handle(pair, function () {
      msI.select('/spdy/0.3.1', function (err, stream) {
        expect(err).to.not.be.instanceof(Error)
        var dialerConn = dialerMuxer.attach(stream, false)
        expect(typeof dialerConn).to.be.equal('object')
      })
    })
  })

  test('socket->ms-select into spdy->stream from dialer->ms-select into other protocol', function (done) {
    var pair = streamPair.create()

    var msI = new Interactive()
    var msS = new Select()

    var dialerMuxer = new Muxer()
    var listenerMuxer = new Muxer()

    msS.handle(pair.other)

    msS.addHandler('/spdy/0.3.1', function (stream) {
      var listenerConn = listenerMuxer.attach(stream, true)
      listenerConn.on('stream', function (stream) {
        stream.on('data', function (chunk) {
          expect(chunk.toString()).to.equal('mux all the streams')
          done()
        })
      })
    })

    msI.handle(pair, function () {
      msI.select('/spdy/0.3.1', function (err, stream) {
        expect(err).to.not.be.instanceof(Error)
        var dialerConn = dialerMuxer.attach(stream, false)
        dialerConn.dialStream(function (err, stream) {
          expect(err).to.not.be.instanceof(Error)
          stream.write('mux all the streams')
        })
      })
    })
  })

  test('socket->ms-select into spdy->stream from listener->ms-select into another protocol', function (done) {
    var pair = streamPair.create()

    var msI = new Interactive()
    var msS = new Select()

    var dialerMuxer = new Muxer()
    var listenerMuxer = new Muxer()

    msS.handle(pair.other)

    msS.addHandler('/spdy/0.3.1', function (stream) {
      var listenerConn = listenerMuxer.attach(stream, true)
      listenerConn.on('stream', function (stream) {
        stream.on('data', function (chunk) {
          expect(chunk.toString()).to.equal('mux all the streams')

          listenerConn.dialStream(function (err, stream) {
            expect(err).to.not.be.instanceof(Error)
            var msI2 = new Interactive()
            msI2.handle(stream, function () {
              msI2.select('/other/protocol', function (err, stream) {
                expect(err).to.not.be.instanceof(Error)
                stream.write('the other protocol')
              })
            })
          })
        })
      })
    })

    msI.handle(pair, function () {
      msI.select('/spdy/0.3.1', function (err, stream) {
        expect(err).to.not.be.instanceof(Error)
        var dialerConn = dialerMuxer.attach(stream, false)
        dialerConn.dialStream(function (err, stream) {
          expect(err).to.not.be.instanceof(Error)
          stream.write('mux all the streams')
        })

        dialerConn.on('stream', function (stream) {
          var msS2 = new Select()
          msS2.handle(stream)
          msS2.addHandler('/other/protocol', function (stream) {
            stream.on('data', function (chunk) {
              expect(chunk.toString()).to.equal('the other protocol')
              done()
            })
          })
        })
      })
    })

  })
})
