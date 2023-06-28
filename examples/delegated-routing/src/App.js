// eslint-disable-next-line
'use strict'

import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { bootstrap } from '@libp2p/bootstrap'
import { delegatedContentRouting } from '@libp2p/delegated-content-routing'
import { delegatedPeerRouting } from '@libp2p/delegated-peer-routing'
import { mplex } from '@libp2p/mplex'
import { webSockets } from '@libp2p/websockets'
import { create as createKuboRpcClient } from 'kubo-rpc-client'
import { createLibp2p } from 'libp2p'
import { circuitRelayTransport } from 'libp2p/circuit-relay'
import { CID } from 'multiformats/cid'
import React from 'react'

const Component = React.Component

const BootstrapNode = '/ip4/127.0.0.1/tcp/8081/ws/p2p/QmdoG8DpzYUZMVP5dGmgmigZwR1RE8Cf6SxMPg1SBXJAQ8'

class App extends Component {
  constructor (props) {
    super(props)
    this.state = {
      peers: 0,
      // This hash is the IPFS readme
      hash: 'QmPZ9gcCEpqKTo6aq61g2nXGUhM4iCL3ewB6LDXZCtioEB',
      // This peer is one of the Bootstrap nodes for IPFS
      peer: 'QmV6kA2fB8kTr6jc3pL5zbNsjKbmPUHAPKKHRBYe1kDEyc',
      isLoading: 0
    }
    this.peerInterval = null

    this.handleHashChange = this.handleHashChange.bind(this)
    this.handleHashSubmit = this.handleHashSubmit.bind(this)
    this.handlePeerChange = this.handlePeerChange.bind(this)
    this.handlePeerSubmit = this.handlePeerSubmit.bind(this)
  }

  handleHashChange (event) {
    this.setState({
      hash: event.target.value
    })
  }

  handlePeerChange (event) {
    this.setState({
      peer: event.target.value
    })
  }

  async handleHashSubmit (event) {
    event.preventDefault()
    this.setState({
      isLoading: this.state.isLoading + 1
    })

    const providers = []

    for await (const provider of this.libp2p.contentRouting.findProviders(CID.parse(this.state.hash))) {
      providers.push(provider)

      this.setState({
        response: providers.toString(),
        isLoading: this.state.isLoading - 1
      })
    }
  }

  async handlePeerSubmit (event) {
    event.preventDefault()
    this.setState({
      isLoading: this.state.isLoading + 1
    })

    const peerInfo = await this.libp2p.peerRouting.findPeer(this.state.peer)

    this.setState({
      response: JSON.stringify(peerInfo, null, 2),
      isLoading: this.state.isLoading - 1
    })
  }

  async componentDidMount () {
    const client = createKuboRpcClient({
      host: '0.0.0.0',
      protocol: 'http',
      port: '8080'
    })

    window.libp2p = this.libp2p = await createLibp2p({
      contentRouting: [
        delegatedPeerRouting(client)
      ],
      peerRouting: [
        delegatedContentRouting(client)
      ],
      peerDiscovery: [
        bootstrap({
          list: {
            BootstrapNode
          }
        })
      ],
      transports: [
        webSockets(),
        circuitRelayTransport()
      ],
      streamMuxers: [
        yamux(), mplex()
      ],
      connectionEncryption: [
        noise()
      ]
    })
  }

  render () {
    return (
      <div>
        <header className="center">
          <h1>Delegated Routing</h1>
          <h2>There are currently {this.state.peers} peers.</h2>
        </header>
        <section className="center">
          <form onSubmit={this.handleHashSubmit}>
            <label>
              Hash:
              <input type="text" value={this.state.hash} onChange={this.handleHashChange} />
              <input type="submit" value="Find" />
            </label>
          </form>
          <form onSubmit={this.handlePeerSubmit}>
            <label>
              Peer:
              <input type="text" value={this.state.peer} onChange={this.handlePeerChange} />
              <input type="submit" value="Find" />
            </label>
          </form>
        </section>
        <section className={[this.state.isLoading > 0 ? 'loading' : '', 'loader'].join(' ')}>
          <div className="lds-ripple"><div></div><div></div></div>
        </section>
        <section>
          <pre>
            {this.state.response}
          </pre>
        </section>
      </div>
    )
  }
}

export default App
