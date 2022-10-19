# Libp2p Metrics <!-- omit in toc -->

Metrics allow you to gather run time statistics on your libp2p node.

## Table of Contents  <!-- omit in toc -->

- [Overview](#overview)
- [Tracking](#tracking)
  - [Enable metrics](#enable-metrics)
  - [Stream Metrics](#stream-metrics)
  - [Component Metrics](#component-metrics)
  - [Application metrics](#application-metrics)
  - [Integration](#integration)
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

First enable metrics tracking:

```js
import { createLibp2pNode } from 'libp2p'

const node = await createLibp2pNode({
  metrics: {
    enabled: true
  }
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

Metrics are updated by calling [`Metrics.updateComponentMetric`](https://github.com/libp2p/js-libp2p-interfaces/blob/master/packages/interface-metrics/src/index.ts#L192) and passing an object that conforms to the [`ComponentMetricsUpdate`](https://github.com/libp2p/js-libp2p-interfaces/blob/master/packages/interface-metrics/src/index.ts#L122-L152) interface:

```ts
metrics.updateComponentMetric({
  system: 'libp2p',
  component: 'connection-manager',
  metric: 'incoming-connections',
  value: 5
})
```

If several metrics should be grouped together (e.g. for graphing purposes) the `value` field can be a [`ComponentMetricsGroup`](https://github.com/libp2p/js-libp2p-interfaces/blob/master/packages/interface-metrics/src/index.ts#L159):

```ts
metrics.updateComponentMetric({
  system: 'libp2p',
  component: 'connection-manager',
  metric: 'connections',
  value: {
    incoming: 5,
    outgoing: 10
  }
})
```

If the metrics are expensive to calculate, a [`CalculateComponentMetric`](https://github.com/libp2p/js-libp2p-interfaces/blob/master/packages/interface-metrics/src/index.ts#L164) function can be set as the value instead - this will need to be invoked to collect the metrics (see [Extracting metrics](#extracting-metrics) below):

```ts
metrics.updateComponentMetric({
  system: 'libp2p',
  component: 'connection-manager',
  metric: 'something-expensive',
  value: () => {
    // valid return types are:
    // number
    // Promise<number>
    // ComponentMetricsGroup
    // Promise<ComponentMetricsGroup>
  }
})
```

### Application metrics

You can of course piggy-back your own metrics on to the lib2p metrics object, just specify a different `system` as part of your `ComponentMetricsUpdate`:

```ts
metrics.updateComponentMetric({
  system: 'my-app',
  component: 'my-component',
  metric: 'important-metric',
  value: 5
})
```

### Integration

To help with integrating with metrics gathering software, a `label` and `help` can also be added to your `ComponentMetricsUpdate`. These are expected by certain tools such as [Prometheus](https://prometheus.io/).

```ts
metrics.updateComponentMetric({
  system: 'libp2p',
  component: 'connection-manager',
  metric: 'incoming-connections',
  value: 5,
  label: 'label',
  help: 'help'
})
```

## Extracting metrics

Metrics can be extracted from the metrics object and supplied to a tracking system such as [Prometheus](https://prometheus.io/). This code is borrowed from the `js-ipfs` metrics endpoint which uses [prom-client](https://www.npmjs.com/package/prom-client) to format metrics:

```ts
import client from 'prom-client'

const libp2p = createLibp2pNode({
  metrics: {
    enabled: true
  }
  //... other config
})

// A handler invoked by express/hapi or your http framework of choice
export default async function metricsEndpoint (req, res) {
  const metrics = libp2p.metrics

  if (metrics) {
    // update the prometheus client with the recorded metrics
    for (const [system, components] of metrics.getComponentMetrics().entries()) {
      for (const [component, componentMetrics] of components.entries()) {
        for (const [metricName, trackedMetric] of componentMetrics.entries()) {
          // set the relevant gauges
          const name = `${system}-${component}-${metricName}`.replace(/-/g, '_')
          const labelName = trackedMetric.label ?? metricName.replace(/-/g, '_')
          const help = trackedMetric.help ?? metricName.replace(/-/g, '_')
          const gaugeOptions = { name, help }
          const metricValue = await trackedMetric.calculate()

          if (typeof metricValue !== 'number') {
            // metric group
            gaugeOptions.labelNames = [
              labelName
            ]
          }

          if (!gauges[name]) {
            // create metric if it's not been seen before
            gauges[name] = new client.Gauge(gaugeOptions)
          }

          if (typeof metricValue !== 'number') {
            // metric group
            Object.entries(metricValue).forEach(([key, value]) => {
              gauges[name].set({ [labelName]: key }, value)
            })
          } else {
            // metric value
            gauges[name].set(metricValue)
          }
        }
      }
    }
  }

  // done updating, write the metrics into the response
  res.send(await client.register.metrics())
}
```
