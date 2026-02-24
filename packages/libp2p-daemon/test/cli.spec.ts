import { expect } from 'aegir/chai'
import sinon from 'sinon'
import cli from '../src/index.js'

describe.skip('cli', () => {
  const daemon = { createDaemon: (options: any) => {} }

  afterEach(() => {
    sinon.restore()
  })

  it('should create a daemon with default options', async () => {
    sinon.stub(daemon, 'createDaemon').callsFake((options) => {
      expect(options).to.include({
        b: false,
        bootstrap: false,
        'bootstrap-peers': '',
        bootstrapPeers: '',
        hostAddrs: '',
        announceAddrs: '',
        'conn-mgr': false,
        connMgr: false,
        dht: false,
        'dht-client': false,
        dhtClient: false,
        id: '',
        q: false,
        quiet: false,
        listen: '/unix/tmp/p2pd.sock'
      })
      return {
        start: () => {},
        stop: () => {}
      }
    })

    await cli([
      '/bin/node',
      '/daemon/src/cli/bin.js'
    ])
  })

  it('should be able to specify options', async () => {
    sinon.stub(daemon, 'createDaemon').callsFake((options) => {
      expect(options).to.include({
        b: true,
        bootstrap: true,
        'bootstrap-peers': '/p2p/Qm1,/p2p/Qm2',
        bootstrapPeers: '/p2p/Qm1,/p2p/Qm2',
        hostAddrs: '/ip4/0.0.0.0/tcp/0,/ip4/0.0.0.0/tcp/0/wss',
        announceAddrs: '/ip4/0.0.0.0/tcp/8080',
        'conn-mgr': true,
        connMgr: true,
        dht: true,
        'dht-client': true,
        dhtClient: true,
        id: '/path/to/key',
        q: true,
        quiet: true,
        listen: '/unix/tmp/d.sock'
      })
      return {
        start: () => {},
        stop: () => {}
      }
    })

    await cli([
      '/bin/node',
      '/daemon/src/cli/bin.js',
      '--dht=true',
      '--b=true',
      '--bootstrapPeers=/p2p/Qm1,/p2p/Qm2',
      '--hostAddrs=/ip4/0.0.0.0/tcp/0,/ip4/0.0.0.0/tcp/0/wss',
      '--announceAddrs=/ip4/0.0.0.0/tcp/8080',
      '--connMgr=true',
      '--dhtClient=true',
      '--quiet=true',
      '--id=/path/to/key',
      '--listen=/unix/tmp/d.sock'
    ])
  })
})
