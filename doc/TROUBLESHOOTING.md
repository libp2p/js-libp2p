# Troubleshooting

This guide lists common issues you may encounter when running `js-libp2p`, along with steps to diagnose and resolve them using existing logs, events and configuration.

## Enable debug logging

- Node:

```bash
# all libp2p debug logs
DEBUG="libp2p:*" node my-script.js

# focus on connection dialing and common network components
DEBUG="libp2p:connection-manager:dial-queue,libp2p:tcp,libp2p:websockets,libp2p:webtransport,libp2p:kad-dht" node my-script.js
```

- Browser:

```js
// all libp2p debug logs
localStorage.setItem('debug', 'libp2p:*')

// focus on connection dialing and common network components
localStorage.setItem('debug', 'libp2p:connection-manager:dial-queue,libp2p:websockets,libp2p:webtransport,libp2p:kad-dht')
// then refresh the page
```

Logger namespaces used by components include:

- `libp2p:tcp` (`@libp2p/tcp`)
- `libp2p:websockets` (`@libp2p/websockets`)
- `libp2p:webtransport` (`@libp2p/webtransport`)
- `libp2p:kad-dht` (`@libp2p/kad-dht`)
- `libp2p:connection-manager:dial-queue`

## Common issues

### No transport available for address

Symptoms:

- Error originating from the transport manager similar to:

```text
No transport available for address /<proto>/...
```

This occurs when you try to listen on or dial a Multiaddr for which no transport is configured. For example, `/ip4/127.0.0.1/tcp/0` requires `@libp2p/tcp`, `/ws` requires `@libp2p/websockets`, and `/webtransport` requires `@libp2p/webtransport`.

Actions:

- Ensure the corresponding transport is added to `transports` when creating the node.
- Verify the Multiaddr protocol matches an enabled transport.
- Enable component logs to see selection and listen errors:

```bash
DEBUG="libp2p:tcp,libp2p:websockets,libp2p:webtransport" node my-script.js
```

### Address reported as not dialable / dial failed

Symptoms:

- Dial attempts fail with logs like:

```text
libp2p:connection-manager:dial-queue dial failed to <multiaddr>
```

- Downstream components may log messages such as "could not dial".

Actions:

- Check that the peer’s addresses include a protocol supported by your configured transports.
- Verify the address formatting (see next section) and that any required intermediaries (e.g. relays) are reachable.
- Increase dial logs:

```bash
DEBUG="libp2p:connection-manager:dial-queue,libp2p:tcp,libp2p:websockets,libp2p:webtransport" node my-script.js
```

### Invalid Multiaddr format

Symptoms:

- Errors like:

```text
Can't convert to IpNet, Invalid multiaddr format: <addr>
```

Actions:

- Validate that the string is a correct Multiaddr. Construct addresses using `@multiformats/multiaddr` where possible to avoid typos.
- Ensure all required protocol parts are present (e.g. `/ip4/.../tcp/...`, `/dns4/.../tcp/.../ws`).

### WebTransport cannot listen in Node.js

Symptoms:

- Attempting to listen using WebTransport fails.

Context:

- The WebTransport transport currently only supports dialing to other nodes. Listening requires QUIC support to land in Node.js first.

Actions:

- Use WebTransport for dialing only. For listening in Node.js, use supported server-side transports such as TCP or WebSockets.

### Peer discovery does not emit events

Symptoms:

- You do not see `peer:discovery` or subsequent `peer:connect` events.

Actions:

- Ensure at least one discovery module is configured (e.g. `@libp2p/bootstrap`, `@libp2p/mdns`).
- Listen for events to verify activity:

```ts
node.addEventListener('peer:discovery', (evt) => {
	console.log('Discovered', evt.detail.id.toString())
})

node.addEventListener('peer:connect', (evt) => {
	console.log('Connected to', evt.detail.toString())
})
```

- Enable discovery-related logs (for example, DHT and transports) to see find/dial attempts:

```bash
DEBUG="libp2p:kad-dht,libp2p:tcp,libp2p:websockets,libp2p:webtransport" node my-script.js
```

## See also

- `doc/GETTING_STARTED.md` Debugging section for quick debug setup
- `doc/CONFIGURATION.md` for full configuration options
- `doc/API.md` Events section (`peer:discovery`, `peer:connect`) 
