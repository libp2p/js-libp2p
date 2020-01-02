# libp2p running in the Browser

One of the primary goals with libp2p P2P was to get it fully working in the browser and interopable with the versions running in Go and in Node.js.

# 0. Use a signalling server

In this example we are using the `libp2p-webrtc-star` transport. Nodes using this transport need to connect to a known point in the network, a rendezvous point, where they can learn about other nodes (Discovery) and exchange their SDP offers (signaling data).

You can connect to a public signaling server (if you know one), or you can setup your own server as described at [libp2p/js-libp2p-webrtc-star#rendezvous-server-aka-signalling-server](https://github.com/libp2p/js-libp2p-webrtc-star#rendezvous-server-aka-signalling-server), which we will be using for this example.

# 1. Setting up a simple app that lists connections to other nodes

Start by installing libp2p's dependencies.

```bash
> cd ../../
> npm install
> cd examples/libp2p-in-the-browser
```

Then simply go into the folder [1](./1) and update the address of the signaling server, `webrtcAddr`, in the `create-node.js` file. If you use the default address and port, this address should already be correct.

Finally, execute the following

```bash
> npm install
> npm start
# open your browser in port :8080
```
