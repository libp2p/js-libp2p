# libp2p in the browser

This example leverages the [Parcel.js bundler](https://parceljs.org/) to compile and serve the libp2p code in the browser. Parcel uses [Babel](https://babeljs.io/) to handle transpilation of the code. You can use other bundlers such as Webpack or Browserify, but we will not be covering them here.

## Setup

In order to run the example, first install the dependencies from same directory as this README:

```
cd ./examples/libp2p-in-the-browser
npm install
```

## Signaling Server

This example uses the `libp2p-webrtc-star` module, which enables libp2p browser nodes to establish direct connections to one another via a central signaling server. For this example, we are using the signaling server that ships with `libp2p-webrtc-star`.

You can start the **webrtc-star** server by running `npm run webrtc-star`. This will start a signaling server locally on port `9090`. If you'd like to run a signaling server outside of this example, you can see instructions on how to do so in the [`libp2p-webrtc-star` README](https://github.com/libp2p/js-libp2p-webrtc-star).

When you run the server, you should see output that looks something like this:

```log
$ npm run webrtc-star

> libp2p-in-browser@1.0.0 server
> webrtc-star

Listening on: http://0.0.0.0:9090
```

Although `libp2p-webrtc-star` is being used by default, we have this example set up in a way that you can also use `libp2p-stardust` (you can replace `libp2p-webrtc-star` with it, but it's recommended to use multiple transports if you want to increase the potential peers you can communicate with).

You can start the **stardust** server by running `npm run stardust`. This will start a signaling server locally on port `5892`. If you'd like to run a signaling server outside of this example, you can see instructions on how to do so in the [`libp2p-stardust` README](https://github.com/libp2p/js-libp2p-stardust).

```log
$ npm run stardust

> libp2p-in-browser@1.0.0 server
> stardust-server

server peerID:  QmRGWToWJE1JoR6m62W7Cb4Pfg7S3iqHJcLjwaJBHPyp9o
listening on: /ip6/::/tcp/5892/ws
```

Please note that you will need to use the server `peerID` in this case.

## Setup the example with stardust

Once you have started the signaling server, you need to make a few modifications to the `index.js` file. You will find the following lines:

```js
// const stardustServerId = 'QmRGWToWJE1JoR6m62W7Cb4Pfg7S3iqHJcLjwaJBHPyp9o'
// const stardustAddr = `/ip4/0.0.0.0/tcp/5892/ws/p2p-stardust/p2p/${stardustServerId}/p2p/${libp2p.peerInfo.id.toB58String()}`
// libp2p.peerInfo.multiaddrs.add(stardustAddr)
```

You will just need to uncomment the lines above and replace the `stardustServerId` value for your server peerID. Moreover, if you want to only use `stardust`, you can comment the `webrtcAddr` definition above `stardust`. Once you save the file parcel should automatically reload the browser tabs.

## Setup the example with webrtc-star

You don't need further configuration to have `webrtc-star` running.

## Run the example

Once you have started the signaling server, you can run the Parcel server.

```
npm start
```

The output should look something like this:

```log
$ npm start

> libp2p-in-browser@1.0.0 start
> parcel index.html

Server running at http://localhost:1234
✨  Built in 1000ms.
```

This will compile the code and start a server listening on port [http://localhost:1234](http://localhost:1234). Now open your browser to `http://localhost:1234`. You should see a log of your node's Peer ID, the discovered peers from the Bootstrap module, and connections to those peers as they are created.

Now, if you open a second browser tab to `http://localhost:1234`, you should discover your node from the previous tab. This is due to the fact that the `libp2p-webrtc-star` transport also acts as a Peer Discovery interface. Your node will be notified of any peer that connects to the same signaling server you are connected to. Once libp2p discovers this new peer, it will attempt to establish a direct WebRTC connection.

**Note**: In the example we assign libp2p to `window.libp2p`, in case you would like to play around with the API directly in the browser. You can of course make changes to `index.js` and Parcel will automatically rebuild and reload the browser tabs.
