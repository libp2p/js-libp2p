[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=main\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/main.yml?query=branch%3Amain)

> Collect libp2p metrics for scraping by Prometheus or Graphana

# About

Configure your libp2p node with Prometheus metrics:

```js
import { createLibp2p } from 'libp2p'
import { prometheusMetrics } from '@libp2p/prometheus-metrics'

const node = await createLibp2p({
  metrics: prometheusMetrics()
})
```

Then use the `prom-client` module to supply metrics to the Prometheus/Graphana client using your http framework:

```js
import client from 'prom-client'

async handler (request, h) {
  return h.response(await client.register.metrics())
    .type(client.register.contentType)
}
```

All Prometheus metrics are global so there's no other work required to extract them.

### Queries

Some useful queries are:

#### Data sent/received

```
rate(libp2p_data_transfer_bytes_total[30s])
```

#### CPU usage

```
rate(process_cpu_user_seconds_total[30s]) * 100
```

#### Memory usage

```
nodejs_memory_usage_bytes
```

#### DHT query time

```
libp2p_kad_dht_wan_query_time_seconds
```

or

```
libp2p_kad_dht_lan_query_time_seconds
```

#### TCP transport dialer errors

```
rate(libp2p_tcp_dialer_errors_total[30s])
```

## Example

```typescript
import { prometheusMetrics } from '@libp2p/prometheus-metrics'

const metrics = prometheusMetrics()()
const myMetric = metrics.registerMetric({
 name: 'my_metric',
 label: 'my_label',
 help: 'my help text'
})

myMetric.update(1)
```

## Example

A metric that is expensive to calculate can be created by passing a `calculate` function that will only be invoked when metrics are being scraped:

```typescript
import { prometheusMetrics } from '@libp2p/prometheus-metrics'

const metrics = prometheusMetrics()()
const myMetric = metrics.registerMetric({
 name: 'my_metric',
 label: 'my_label',
 help: 'my help text',
 calculate: async () => {
  // do something expensive
   return 1
 }
})
```

## Example

If several metrics should be grouped together (e.g. for graphing purposes) `registerMetricGroup` can be used instead:

```typescript
import { prometheusMetrics } from '@libp2p/prometheus-metrics'

const metrics = prometheusMetrics()()
const myMetricGroup = metrics.registerMetricGroup({
 name: 'my_metric_group',
 label: 'my_label',
 help: 'my help text'
})

myMetricGroup.increment({ my_label: 'my_value' })
```

There are specific metric groups for tracking libp2p connections and streams:

## Example

Track a newly opened multiaddr connection:

```typescript
import { prometheusMetrics } from '@libp2p/prometheus-metrics'
import { createLibp2p } from 'libp2p'

const metrics = prometheusMetrics()()

const libp2p = await createLibp2p({
   metrics: metrics,
  })
// set up a multiaddr connection
const connection = await libp2p.dial('multiaddr')
const connections = metrics.trackMultiaddrConnection(connection)
```

## Example

Track a newly opened stream:

```typescript
import { prometheusMetrics } from '@libp2p/prometheus-metrics'
import { createLibp2p } from 'libp2p'

const metrics = prometheusMetrics()()

const libp2p = await createLibp2p({
  metrics: metrics,
})

const stream = await connection.newStream('/my/protocol')
const streams = metrics.trackProtocolStream(stream)
```

# Install

```console
$ npm i @libp2p/prometheus-metrics
```

# API Docs

- <https://libp2p.github.io/js-libp2p/modules/_libp2p_prometheus_metrics.html>

# License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

# Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
