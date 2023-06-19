# @libp2p/prometheus-metrics <!-- omit in toc -->

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p-prometheus-metrics.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-prometheus-metrics)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p-prometheus-metrics/js-test-and-release.yml?branch=main\&style=flat-square)](https://github.com/libp2p/js-libp2p-prometheus-metrics/actions/workflows/js-test-and-release.yml?query=branch%3Amain)

> Collect libp2p metrics for scraping by Prometheus or Graphana

## Table of contents <!-- omit in toc -->

- [Install](#install)
- [Usage](#usage)
  - [Queries](#queries)
    - [Data sent/received](#data-sentreceived)
    - [CPU usage](#cpu-usage)
    - [Memory usage](#memory-usage)
    - [DHT query time](#dht-query-time)
    - [TCP transport dialer errors](#tcp-transport-dialer-errors)
- [API Docs](#api-docs)
- [License](#license)
- [Contribution](#contribution)

## Install

```console
$ npm i @libp2p/prometheus-metrics
```

## Usage

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

    rate(libp2p_data_transfer_bytes_total[30s])

#### CPU usage

    rate(process_cpu_user_seconds_total[30s]) * 100

#### Memory usage

    nodejs_memory_usage_bytes

#### DHT query time

    libp2p_kad_dht_wan_query_time_seconds

or

    libp2p_kad_dht_lan_query_time_seconds

#### TCP transport dialer errors

    rate(libp2p_tcp_dialer_errors_total[30s])

## API Docs

- <https://libp2p.github.io/js-libp2p-prometheus-metrics>

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
