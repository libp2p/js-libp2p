# Services

Libp2p ships with very little functionality by default, this is to allow the greatest amount of flexibility and to ensure, for example, if you are deploying to web browsers you only pull in the code that your application needs.

The functionality of your Libp2p node can be extended by configuring additional services.

```ts
import { createLibp2p } from 'libp2p'
import { identify } from '@libp2p/identify'

const node = await createLibp2p({
  //.. other config here
  services: {
    identify: identify()
  }
})
```

You can extend the capabilities of your node to suit your needs by writing custom services.

## Writing custom services

At it's simplest a service might look like this:

```ts
import { createLibp2p } from 'libp2p'

// the service implementation
class MyService {
  saySomething (): string {
    return 'Hello'
  }
}

// a function that returns a factory function
function myService () {
  return () => {
    return new MyService()
  }
}

// create the libp2p node
const node = await createLibp2p({
  //.. other config here
  services: {
    myService: myService()
  }
})

// invoke the service function
console.info(node.services.myService.saySomething()) // 'Hello'
```

### Accessing libp2p components

Services can access internal libp2p components such as the address manger and connection manager by accepting an argument to the returned function.

> [!IMPORTANT]
> The key names of the `components` argument must match the field names of the internal [Components](https://github.com/libp2p/js-libp2p/blob/d1f1c2be78bd195f404e62627c2c9f545845e5f5/packages/libp2p/src/components.ts#L8-L28) class

```ts
import { createLibp2p } from 'libp2p'
import type { ConnectionManager } from '@libp2p/interface-internal'

// an interface that defines the minimal set of components the service requires
interface MyServiceComponents {
  connectionManager: ConnectionManager
}

// the service implementation
class MyService {
  private readonly components: MyServiceComponents

  constructor (components: MyServiceComponents) {
    this.components = components
  }

  saySomething (): string {
    return `There are ${this.components.connectionManager.getDialQueue().length} pending dials`
  }
}

// a function that returns a factory function
function myService () {
  return (components: MyServiceComponents) => {
    return new MyService(components)
  }
}

// create the libp2p node
const node = await createLibp2p({
  //.. other config here
  services: {
    myService: myService()
  }
})

// invoke the service function
console.info(node.services.myService.saySomething()) // 'There are 0 pending dials'
```

### Init args

Your service can take arguments that allow for custom config.

> [!TIP]
> Make all arguments optional with sensible defaults

```ts
import { createLibp2p } from 'libp2p'
import type { ConnectionManager } from '@libp2p/interface-internal'

// an interface that defines the minimal set of components the service requires
interface MyServiceComponents {
  connectionManager: ConnectionManager
}

// this interface defines the options this service supports
interface MyServiceInit {
  message?: string
}

// the service implementation
class MyService {
  private readonly components: MyServiceComponents
  private readonly message: string

  constructor (components: MyServiceComponents, init: MyServiceInit = {}) {
    this.components = components
    this.message = init.message ?? 'There are {} pending dials'
  }

  saySomething (): string {
    return this.message.replace('{}', `${this.components.connectionManager.getDialQueue().length}`)
  }
}

// a function that returns a factory function
function myService (init: MyServiceInit) {
  return (components: MyServiceComponents) => {
    return new MyService(components, init)
  }
}

// create the libp2p node
const node = await createLibp2p({
  //.. other config here
  services: {
    myService: myService({
      message: 'The queue is {} dials long'
    })
  }
})

// invoke the service function
console.info(node.services.myService.saySomething()) // 'The queue is 0 dials long'
```

## Service life cycle

Services that need to do async work during startup/shutdown can implement the [Startable](https://libp2p.github.io/js-libp2p/interfaces/_libp2p_interface.Startable.html) interface.

It defines several methods that if defined, will be invoked when starting/stopping the node.

All methods may return either `void` or `Promise<void>`.

> [!WARNING]
> If your functions are async, libp2p will wait for the returned promise to resolve before continuing which can increase startup/shutdown duration

```ts
import type { Startable } from '@libp2p/interface'

class MyService implements Startable {
  async beforeStart (): Promise<void> {
    // optional, can be sync or async
  }

  async start (): Promise<void> {
    // can be sync or async
  }

  async afterStart (): Promise<void> {
    // optional, can be sync or async
  }

  async beforeStop (): Promise<void> {
    // optional, can be sync or async
  }

  async stop (): Promise<void> {
    // can be sync or async
  }

  async afterStop (): Promise<void> {
    // optional, can be sync or async
  }
}
```

### Depending on other services

All configured services will be added to the `components` object, so you are able to access other custom services as well as libp2p internals.

Defining it as part of your service components interface will cause TypeScript compilation errors if an instance is not present at the expected key in the service map. This should prevent misconfigurations if you are using TypeScript.

If you do not depend on another service directly but still require it to be configured, see the next section on expressing service capabilities and dependencies.

```ts
import { createLibp2p } from 'libp2p'

// first service
class MyService {
  saySomething (): string {
    return 'Hello from myService'
  }
}

function myService () {
  return () => {
    return new MyService()
  }
}

// second service
interface MyOtherServiceComponents {
  myService: MyService
}

class MyOtherService {
  private readonly components: MyOtherServiceComponents

  constructor (components: MyOtherServiceComponents) {
    this.components = components
  }

  speakToMyService (): string {
    return this.components.myService.saySomething()
  }
}

function myOtherService () {
  return (components: MyOtherServiceComponents) => {
    return new MyOtherService(components)
  }
}

// configure the node with both services
const node = await createLibp2p({
  // .. other config here
  services: {
    myService: myService(),
    myOtherService: myOtherService()
  }
})

console.info(node.services.myOtherService.speakToMyService()) // 'Hello from myService'
```

## Expressing service capabilities and dependencies

If you have a dependency on the capabilities provided by another service without needing to directly invoke methods on it, you can inform libp2p by using symbol properties.

libp2p will throw on construction if the dependencies of your service cannot be satisfied.

This is useful if, for example, you configure a service that reacts to peer discovery in some way - you can define a requirement to have at least one peer discovery method configured.

Similarly, if your service registers a network topology, these work by notifying topologies after [Identify](https://github.com/libp2p/specs/blob/master/identify/README.md) has run, so any service using topologies has an indirect dependency on `@libp2p/identify`.

```ts
import { createLibp2p } from 'libp2p'
import { serviceCapabilities, serviceDependencies } from '@libp2p/interface'
import type { Startable } from '@libp2p/interface'
import type { Registrar } from '@libp2p/interface-internal'

interface MyServiceComponents {
  registrar: Registrar
}

// This service registers a network topology. This functionality will not work
// without the Identify protocol present, so it's defined as a dependency
class MyService implements Startable {
  private readonly components: MyServiceComponents
  private topologyId?: string

  constructor (components: MyServiceComponents) {
    this.components = components
  }

  // this property is used as a human-friendly name for the service
  readonly [Symbol.toStringTag] = 'ServiceA'

  // this service provides these capabilities to the node
  readonly [serviceCapabilities]: string[] = [
    '@my-org/my-capability'
  ]

  // this service requires Identify to be configured on the current node
  readonly [serviceDependencies]: string[] = [
    '@libp2p/identify'
  ]

  async start (): Promise<void> {
    this.topologyId = await this.components.registrar.register('/my/protocol', {
      onConnect (peer, connection) {
        // handle connect
      }
    })
  }

  stop (): void {
    if (this.topologyId != null) {
      this.components.registrar.unregister(this.topologyId)
    }
  }
}

function myService () {
  return (components: MyServiceComponents) => {
    return new MyService(components)
  }
}

// configure the node but omit identify
const node = await createLibp2p({
  // .. other config here
  services: {
    myService: myService()
  }
}) // throws error because identify is not present
```

### Frequently used dependencies

These capabilities are provided by commonly used libp2p modules such as `@libp2p/identify`, `@chainsafe/libp2p-noise`, `@libp2p/webrtc` etc.

Adding these strings to your service dependencies will cause starting libp2p to throw unless a service is configured to provide these capabilities.

| Dependency | Implementations | Notes |
| -------- | ------- | ------- |
| `@libp2p/identify` | `@libp2p/identify` | You should declare this a as a dependency if your service uses the [Registrar](https://libp2p.github.io/js-libp2p/interfaces/_libp2p_interface_internal.Registrar.html) to register a network topology. |
| `@libp2p/identify-push` | `@libp2p/identify` | |
| `@libp2p/connection-encryption` | `@chainsafe/libp2p-noise`, `@libp2p/tls`, `@libp2p/plaintext` |  |
| `@libp2p/stream-multiplexing` | `@chainsafe/libp2p-yamux` | |
| `@libp2p/content-routing` | `@libp2p/kad-dht` | |
| `@libp2p/peer-routing` | `@libp2p/kad-dht` | |
| `@libp2p/peer-discovery` | `@libp2p/kad-dht`, `@libp2p/bootstrap`, `@libp2p/mdns` |  |
| `@libp2p/keychain` | `@libp2p/keychain` | |
| `@libp2p/metrics` | `@libp2p/prometheus-metrics`, `@libp2p/simple-metrics`, `@libp2p/devtool-metrics` |  |
| `@libp2p/transport` | `@libp2p/tcp`, `@libp2p/websockets`, `@libp2p/webrtc`, `@libp2p/webtransport`, `@libp2p/circuit-relay-v2` |  |
| `@libp2p/circuit-relay-v2-transport` | `@libp2p/circuit-relay-v2` | |
| `@libp2p/nat-traversal` | `@libp2p/upnp-nat` | |
