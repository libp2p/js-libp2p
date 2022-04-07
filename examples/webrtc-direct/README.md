### Webrtc-direct example

An example that uses [js-libp2p-webrtc-direct](https://github.com/libp2p/js-libp2p-webrtc-direct) for connecting
nodejs libp2p and browser libp2p clients. To run the example:

## 0. Run a nodejs libp2p listener

When in the root folder of this example, type `node listener.js` in terminal. You should see an address that listens for
incoming connections. Below is just an example of such address. In your case the suffix hash (`peerId`) will be different.

```bash
$ node listener.js
Listening on:
/ip4/127.0.0.1/tcp/9090/http/p2p-webrtc-direct/p2p/QmUKQCzEUhhhobcNSrXU5uzxTqbvF1BjMCGNGZzZU14Kgd
```

## 1. Prepare a browser libp2p dialer
Confirm that the above address is the same as the field `list` in `public/dialer.js`:
```js
    peerDiscovery: {
      new Bootstrap({
        // paste the address into `list`
        list: ['/ip4/127.0.0.1/tcp/9090/http/p2p-webrtc-direct/p2p/QmUKQCzEUhhhobcNSrXU5uzxTqbvF1BjMCGNGZzZU14Kgd']
      })
    }
```

## 2. Run a browser libp2p dialer
When in the root folder of this example, type `npm start` in terminal. You should see an address where you can browse
the running client. Open this address in your browser. In console
logs you should see logs about successful connection with the node client. In the output of node client you should see
a log message about successful connection as well.
