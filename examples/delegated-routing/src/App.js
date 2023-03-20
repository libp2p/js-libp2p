// eslint-disable-next-line
'use strict'

import React from 'react'
import Ipfs from 'ipfs-core'
import libp2pBundle from './libp2p-bundle'
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

  handleHashSubmit (event) {
    event.preventDefault()
    this.setState({
      isLoading: this.state.isLoading + 1
    })

    this.ipfs.cat(this.state.hash, (err, data) => {
      if (err) console.log('Error', err)

      this.setState({
        response: data.toString(),
        isLoading: this.state.isLoading - 1
      })
    })
  }
  handlePeerSubmit (event) {
    event.preventDefault()
    this.setState({
      isLoading: this.state.isLoading + 1
    })

    this.ipfs.dht.findpeer(this.state.peer, (err, results) => {
      if (err) console.log('Error', err)

      this.setState({
        response: JSON.stringify(results, null, 2),
        isLoading: this.state.isLoading - 1
      })
    })
  }

  componentDidMount () {
    window.ipfs = this.ipfs = Ipfs.create({
      config: {
        Addresses: {
          Swarm: []
        },
        Discovery: {
          MDNS: {
            Enabled: false
          },
          webRTCStar: {
            Enabled: false
          }
        },
        Bootstrap: [
          BootstrapNode
        ]
      },
      preload: {
        enabled: false
      },
      libp2p: libp2pBundle
    })
    this.ipfs.on('ready', () => {
      if (this.peerInterval) {
        clearInterval(this.peerInterval)
      }

      this.ipfs.swarm.connect(BootstrapNode, (err) => {
        if (err) {
          console.log('Error connecting to the node', err)
        }
        console.log('Connected!')
      })

      this.peerInterval = setInterval(() => {
        this.ipfs.swarm.peers((err, peers) => {
          if (err) console.log(err)
          if (peers) this.setState({peers: peers.length})
        })
      }, 2500)
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
