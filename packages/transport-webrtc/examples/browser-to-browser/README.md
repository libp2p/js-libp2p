# js-libp2p-webrtc Browser to Browser

This example leverages the [vite bundler](https://vitejs.dev/) to compile and serve the libp2p code in the browser. You can use other bundlers such as Webpack, but we will not be covering them here.

## Build the `@libp2p/webrtc` package

Build the `@libp2p/webrtc` package by calling `npm i && npm run build` in the repository root.

## Running the Relay Server

For browsers to communicate, we first need to run the LibP2P relay server:

```shell
npm run relay
```

Copy one of the multiaddresses in the output.

## Running the Example

In a separate console tab, install dependencies and start the Vite server:

```shell
npm i && npm run start
```

The browser window will automatically open.  Let's call this `Browser A`.
Using the copied multiaddress from the Go or NodeJS relay server, paste it into the `Remote MultiAddress` input and click the `Connect` button.
`Browser A` is now connected to the relay server.
Copy the multiaddress located after the `Listening on` message.

Now open a second browser with the url `http://localhost:5173/`.  Let's call this `Browser B`.
Using the copied multiaddress from `Listening on` section in `Browser A`, paste it into the `Remote MultiAddress` input and click the `Connect` button.
`Browser B` is now connected to `Browser A`.
Copy the multiaddress located after the `Listening on` message.

Using the copied multiaddress from `Listening on` section in `Browser B`, paste it into the `Remote MultiAddress` input in `Browser A` and click the `Connect` button.
`Browser A` is now connected to `Browser B`.

The peers are now connected to each other.  Enter a message and click the `Send` button in either/both browsers and see the echo'd messages.

The output should look like:

`Browser A`
```text
Dialing '/ip4/127.0.0.1/tcp/57708/ws/p2p/12D3KooWRqAUEzPwKMoGstpfJVqr3aoinwKVPu4DLo9nQncbnuLk'
Listening on /ip4/127.0.0.1/tcp/57708/ws/p2p/12D3KooWRqAUEzPwKMoGstpfJVqr3aoinwKVPu4DLo9nQncbnuLk/p2p-circuit/p2p/12D3KooW9wFiWFELqGJTbzEwtByXsPiHJdHB8n7Kin71VMYyERmC/p2p-webrtc-direct/p2p/12D3KooW9wFiWFELqGJTbzEwtByXsPiHJdHB8n7Kin71VMYyERmC
Dialing '/ip4/127.0.0.1/tcp/57708/ws/p2p/12D3KooWRqAUEzPwKMoGstpfJVqr3aoinwKVPu4DLo9nQncbnuLk/p2p-circuit/p2p/12D3KooWBZyVLJfQkofqLK4op9TPkHuUumCZt1ybQrPvNm7TVQV9/p2p-webrtc-direct/p2p/12D3KooWBZyVLJfQkofqLK4op9TPkHuUumCZt1ybQrPvNm7TVQV9'
Sending message 'helloa'
Received message 'helloa'
Received message 'hellob'
```

`Browser B`
```text
Dialing '/ip4/127.0.0.1/tcp/57708/ws/p2p/12D3KooWRqAUEzPwKMoGstpfJVqr3aoinwKVPu4DLo9nQncbnuLk/p2p-circuit/p2p/12D3KooW9wFiWFELqGJTbzEwtByXsPiHJdHB8n7Kin71VMYyERmC/p2p-webrtc-direct/p2p/12D3KooW9wFiWFELqGJTbzEwtByXsPiHJdHB8n7Kin71VMYyERmC'
Listening on /ip4/127.0.0.1/tcp/57708/ws/p2p/12D3KooWRqAUEzPwKMoGstpfJVqr3aoinwKVPu4DLo9nQncbnuLk/p2p-circuit/p2p/12D3KooWBZyVLJfQkofqLK4op9TPkHuUumCZt1ybQrPvNm7TVQV9/p2p-webrtc-direct/p2p/12D3KooWBZyVLJfQkofqLK4op9TPkHuUumCZt1ybQrPvNm7TVQV9
Received message 'helloa'
Sending message 'hellob'
Received message 'hellob'
```
