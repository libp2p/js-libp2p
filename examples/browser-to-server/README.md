# js-libp2p-webrtc Browser to Server

This example leverages the [vite bundler](https://vitejs.dev/) to compile and serve the libp2p code in the browser. You can use other bundlers such as Webpack, but we will not be covering them here.

## Running the Go Server

To run the Go LibP2P WebRTC server:

```shell
npm run go-libp2p-server
```

Copy the multiaddress in the output.

## Running the Example

In a separate console tab, install dependencies and start the Vite server:

```shell
npm i && npm run start
```

The browser window will automatically open.
Using the copied multiaddress from the Go server, paste it into the `Server MultiAddress` input and click the `Connect` button.
Once the peer is connected, click the message section will appear.  Enter a message and click the `Send` button.

The output should look like:

```text
Dialing /ip4/10.0.1.5/udp/54375/webrtc/certhash/uEiADy8JubdWrAzseyzfXFyCpdRN02eWZg86tjCrTCA5dbQ/p2p/12D3KooWEG7N4bnZfFBNZE7WG6xm2P4Sr6sonMwyD4HCAqApEthb
Peer connected '/ip4/10.0.1.5/udp/54375/webrtc/certhash/uEiADy8JubdWrAzseyzfXFyCpdRN02eWZg86tjCrTCA5dbQ/p2p/12D3KooWEG7N4bnZfFBNZE7WG6xm2P4Sr6sonMwyD4HCAqApEthb'
Sending message 'hello'
Received message 'hello'
```