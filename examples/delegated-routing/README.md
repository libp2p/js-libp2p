# Delegated Routing with Libp2p and IPFS

This example shows how to use delegated peer and content routing. The [Peer and Content Routing Example](../peer-and-content-routing) focuses
on the DHT implementation. This example takes that a step further and introduces delegated routing. Delegated routing is
especially useful when your libp2p node will have limited resources, making running a DHT impractical. It's
also highly useful if your node is generating content, but can't reliably be on the network. You can use delegate nodes
to provide content on your behalf.

The starting [Libp2p Bundle](./src/libp2p-bundle.js) in this example starts by disabling the DHT and adding the Delegated Peer and Content Routers.
Once you've completed the example, you should try enabled the DHT and see what kind of results you get! You can also enable the
various Peer Discovery modules and see the impact it has on your Peer count.


## Running this example

1. Install go-ipfs locally if you dont already have it. [Install Guide](https://docs.ipfs.io/introduction/install/).
1. Run the IPFS daemon: `ipfs daemon`.
1. The daemon will output a line about its API address, like `API server listening on /ip4/127.0.0.1/tcp/8080`.
1. In another window, while the daemon is running, Configure the IPFS Gateway to support delegate routing `ipfs config Gateway.APICommands --json '["dht/findprovs", "dht/findpeer", "refs", "swarm/connect"]'`.
1. In the same window, output the addresses of the node: `ipfs id`. Make note of the websocket address, it will contain `/ws` in the address, like `/ip4/127.0.0.1/tcp/8081/ws`.
1. In `./src/libp2p-bundle.js` check if the host and port of your node are correct, according to the previous step. If they are different, replace them.
1. In `./src/App.js` replace `BootstrapNode` with your nodes Websocket address from step 3. **Also**, in `./src/App.js` set BootstrapNodeID to your nodes id, which is displayed when running `ipfs id` in the `ID` property.
1. Start this example:

```sh
npm install
npm start
```

This should open your browser to http://localhost:3000. If it does not, go ahead and do that now.

8. Your browser should show you connected to at least 1 peer.

### Finding Content via the Delegate
1. Add a file to your IPFS node. From this example root you can do `ipfs add ./README.md` to add the example readme.
2. Copy the hash from line 5, it will look something like *Qmf33vz4HJFkqgH7XPP1uA6atYKTX1BWQEQthzpKcAdeyZ*.
3. In the browser, paste the hash into the *Hash* field and hit `Find`. The readme contents should display.

This will do a few things:
* The delegate nodes api will be queried to find providers of the content
* The content will be fetched from the providers
* Since we now have the content, we tell the delegate node to fetch the content from us and become a provider

### Finding Peers via the Delegate
1. Get a list of your delegate nodes peer by querying the IPFS daemon: `ipfs swarm peers`
2. Copy one of the CIDs from the list of peer addresses, this will be the last portion of the address and will look something like `QmdoG8DpzYUZMVP5dGmgmigZwR1RE8Cf6SxMPg1SBXJAQ8`.
3. In your browser, paste the CID into the *Peer* field and hit `Find`.
4. You should see information about the peer including its addresses.

### Adding Content via the Delegate
1. In one browser, such as Firefox, enter some text in the `Add Data` field and click `Add`.
2. Once added, JSON will be printed in the browser. Copy the value of `"hash"`.
3. Close your Firefox tab. Open a new browser window in a **different** browser, such as Chrome.
4. In the new window, copy the hash from step 2 into the `Hash` field and click `Find`.
5. The text you entered in step 1 should display.

**Note**: By closing the first window before fetching the content, you are ensuring that data cannot be retrieved from it, and instead the delegate must be relied on.
