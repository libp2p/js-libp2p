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

function myService () {
  return () => {
    return {
      saySomething: () => {
        return 'Hello'
      }
    }
  }
}

const node = await createLibp2p({
  //.. other config here
  services: {
    myService: myService()
  }
})

console.info(node.services.myService.saySomething()) // 'Hello'
```

### Init args

Your service can take arguments that allow for custom config:

> [!TIP]
> Make all arguments optional with sensible defaults

```ts
import { createLibp2p } from 'libp2p'

interface MyServiceInit {
  message?: string
}

function myService (init: MyServiceInit = {}) {
  return () => {
    return {
      saySomething: () => {
        return init.message ?? 'Hello'
      }
    }
  }
}

const node = await createLibp2p({
  //.. other config here
  services: {
    myService: myService({
      message: 'World'
    })
  }
})

console.info(node.services.myService.saySomething()) // 'World'
```

### Accessing libp2p components

Services can access internal libp2p components such as the address manger and connection manager by accepting an argument to the returned function.

> [!TIP]
> Use an interface to limit the scope of your service's component requirements

```ts
import { createLibp2p } from 'libp2p'
import type { PeerId } from '@libp2p/interface'

interface MyServiceInit {
  message?: string
}

interface MyServiceComponents {
  peerId: PeerId
}

function myService (init: MyServiceInit = {}) {
  return (components: MyServiceComponents) => {
    return {
      saySomething: () => {
        return `${init.message ?? 'Hello, my peer id is'} ${components.peerId}`
      }
    }
  }
}

const node = await createLibp2p({
  //.. other config here
  services: {
    myService: myService()
  }
})

console.info(node.services.myService.saySomething()) // 'Hello, my peer id is 123Koo....'
```

### Using classes

Use a class for your service and returning an instance will allow you to keep your code manageable.

> [!TIP]
> Some components may not be available when your service is constructed. It's best to defer property access of the `components` argument until the components are needed.

```ts
import { createLibp2p } from 'libp2p'
import type { PeerId } from '@libp2p/interface'

interface MyServiceInit {
  message?: string
}

interface MyServiceComponents {
  peerId: PeerId
}

class MyService {
  private readonly components: MyServiceComponents
  private readonly init: MyServiceInit

  constructor (components: MyServiceComponents, init: MyServiceInit = {}) {
    this.components = components
    this.init = init
  }

  saySomething (): string {
    return `${this.init.message ?? 'Hello, my peer id is'} ${this.components.peerId}`
  }
}

function myService (init: MyServiceInit = {}) {
  return (components: MyServiceComponents) => {
    return new MyService(components, init)
  }
}

const node = await createLibp2p({
  //.. other config here
  services: {
    myService: myService()
  }
})

console.info(node.services.myService.saySomething()) // 'Hello, my peer id is 123Koo....'
```

### Depending on other services

All configured services will be added to the `components` object, so you are able to access other custom services as well as libp2p internals.

```ts
import { createLibp2p } from 'libp2p'

// first service

interface MyServiceComponents {
  peerId: PeerId
}

class MyService {
  private readonly components: MyServiceComponents

  constructor (components: MyServiceComponents) {
    this.components = components
  }

  saySomething (): string {
    return 'Hello from myService'
  }
}

function myService () {
  return (components: MyServiceComponents) => {
    return new MyService(components)
  }
}

// second service

interface MyOtherServiceComponents {
  myService: MyService
}

class MyOtherService {
  private readonly components: MyOtherServiceComponents

  constructor (components: MyServiceComponents, init: MyServiceInit = {}) {
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
  //.. other config here
  services: {
    myService: myService(),
    myOtherService: myOtherService()
  }
})

console.info(node.services.myOtherService.speakToMyService()) // 'Hello from myService'
```
