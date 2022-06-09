# libp2p-pubsub <!-- omit in toc -->

[![test & maybe release](https://github.com/libp2p/js-libp2p-pubsub/actions/workflows/js-test-and-release.yml/badge.svg)](https://github.com/libp2p/js-libp2p-pubsub/actions/workflows/js-test-and-release.yml)

> Contains an implementation of the Pubsub interface

## Table of contents <!-- omit in toc -->

- [Usage](#usage)
- [License](#license)
  - [Contribution](#contribution)

## Usage

```console
npm i libp2p-pubsub
```

```javascript
import { PubSubBaseProtocol } from '@libp2p/pubsub'

class MyPubsubImplementation extends PubSubBaseProtocol {
  // .. extra methods here
}
```

## License

Licensed under either of

 * Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / http://www.apache.org/licenses/LICENSE-2.0)
 * MIT ([LICENSE-MIT](LICENSE-MIT) / http://opensource.org/licenses/MIT)

### Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
