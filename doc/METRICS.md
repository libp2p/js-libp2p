# Libp2p Metrics <!-- omit in toc -->

Metrics allow you to gather run time statistics on your libp2p node.

## Table of Contents  <!-- omit in toc -->

- [Overview](#overview)
- [Tracking](#tracking)
  - [Enable metrics](#enable-metrics)
  - [Stream Metrics](#stream-metrics)
  - [Component Metrics](#component-metrics)
- [Extracting metrics](#extracting-metrics)

## Overview

- Metrics gathering is optional, as there is a performance hit to using it
- See the [API](./API.md) for Metrics usage. Metrics in libp2p do not emit events, as such applications wishing to read Metrics will need to do so actively. This ensures that the system is not unnecessarily firing update notifications.
- For large installations you may wish to combine the statistics with a visualizer such as [Graphana](https://grafana.com/)

There are two types of metrics [`StreamMetrics`](https://github.com/libp2p/js-libp2p-interfaces/blob/master/packages/interface-metrics/src/index.ts#L66-L115) and [`ComponentMetrics`](https://github.com/libp2p/js-libp2p-interfaces/blob/master/packages/interface-metrics/src/index.ts#L183-L193). `StreamMetrics` track data in and out of streams, `ComponentMetrics` allow system components to record metrics that are of interest to the observer.

Although designed to primarily integrate with tools such as [Prometheus](https://prometheus.io/) it does not introduce any dependencies that require you to use any particular tool to store or graph metrics.

## Tracking

- When a transport hands off a connection for upgrading, Metrics are hooked up if enabled.
- When a stream is created, Metrics will be tracked on that stream and associated to that streams protocol.
- Tracked Metrics are associated to a specific peer, and count towards global bandwidth Metrics.

### Enable metrics

First enable metrics tracking by supplying a [Metrics](https://www.npmjs.com/package/@libp2p/interface-metrics) implementation:

```js
import { createLibp2p } from 'libp2p'
import { prometheusMetrics } from '@libp2p/prometheus-metrics'

const node = await createLibp2p({
  metrics: prometheusMetrics()
  //... other config
})
```

### Stream Metrics

- The main Metrics object consists of individual `Stats` objects
- The following categories are tracked:
  - Global stats; every byte in and out
  - Peer stats; every byte in and out, per peer
  - Protocol stats; every byte in and out, per protocol
- When a message goes through Metrics:
  - It is added to the global stat
  - It is added to the stats for the remote peer
  - It is added to the protocol stats if there is one
- When data is pushed onto a `Stat` it is added to a queue
  - The queue is processed at the earliest of either (configurable):
    - every 2 seconds after the last item was added to the queue
    - or once 1000 items have been queued
  - When the queue is processed:
    - The data length is added to either the `in` or `out` stat
    - The moving averages is calculated since the last queue processing (based on most recently processed item timestamp)

### Component Metrics

To define component metrics first get a reference to the metrics object:

```ts
import type { Metrics } from '@libp2p/interface-metrics'

interface MyClassComponents {
  metrics: Metrics
}

class MyClass {
  private readonly components: MyClassComponents

  constructor (components: MyClassComponents) {
    this.components = components
  }

  myMethod () {
    // here we will set metrics
  }
}
```

A tracked metric can be created by calling either `registerMetric` on the metrics object:

```ts
const metric = metrics.registerMetric('my_metric', {
  // an optional label
  label: 'label',
  // optional help text
  help: 'help'
})

// set a value
metric.update(5)

// increment by one, optionally pass a number to increment by
metric.increment()

// decrement by one, optionally pass a number to increment by
metric.decrement()

// reset to the default value
metric.reset()

// use the metric to time something
const stopTimer = metric.timer()
// later
stopTimer()
```

A metric that is expensive to calculate can be created by passing a `calculate` function that will only be invoked when metrics are being scraped:

```ts
metrics.registerMetric('my_metric', {
  async calculate () {
    return 5
  }
})
```

If several metrics should be grouped together (e.g. for graphing purposes) `registerMetricGroup` can be used instead:

```ts
const metric = metrics.registerMetricGroup('my_metric', {
  // an optional label
  label: 'label',
  // optional help text
  help: 'help'
})

metric.update({
  key1: 1,
  key2: 1
})

// increment one or more keys in the group
metric.increment({
  key1: true
})

// increment one or more keys by passed value
metric.increment({
  key1: 5
})

// reset to the default value
metric.reset()

// use the metric to time something as one of the keys
const stopTimer = metric.timer('key1')
// later
stopTimer()
```

## Extracting metrics

Metrics implementations will allow extracting the values for presentation in an external system. For example here is how to use the metrics implementation from `@libp2p/prometheus-metrics` to enable scraping stats to display in [Prometheus](https://prometheus.io/) or a [Graphana](https://grafana.com/) dashboard:

```ts
import { prometheusMetrics } from '@libp2p/prometheus-metrics'
import client from 'prom-client'

const libp2p = createLibp2p({
  metrics: prometheusMetrics()
  //... other config
})

// A handler invoked by express/hapi or your http framework of choice
export default async function metricsEndpoint (req, res) {
  // prom-client metrics are global so extract them from the client
  res.send(await client.register.metrics())
}
```
