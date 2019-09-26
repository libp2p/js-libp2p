<a name="0.2.1"></a>
## [0.2.1](https://github.com/libp2p/js-libp2p-pubsub/compare/v0.2.0...v0.2.1) (2019-09-26)


### Bug Fixes

* add gossipsub implementation in README ([2684e36](https://github.com/libp2p/js-libp2p-pubsub/commit/2684e36))
* typo in README ([929ec61](https://github.com/libp2p/js-libp2p-pubsub/commit/929ec61))


### Features

* allow inline public keys in messages ([3b3fcea](https://github.com/libp2p/js-libp2p-pubsub/commit/3b3fcea))



<a name="0.2.0"></a>
# [0.2.0](https://github.com/libp2p/js-libp2p-pubsub/compare/v0.1.0...v0.2.0) (2019-07-08)


### Bug Fixes

* use strict signing properly and fix callback issue ([ca99ce9](https://github.com/libp2p/js-libp2p-pubsub/commit/ca99ce9))


### Features

* add validate method for validating signatures ([c36fefa](https://github.com/libp2p/js-libp2p-pubsub/commit/c36fefa))



<a name="0.1.0"></a>
# [0.1.0](https://github.com/libp2p/js-libp2p-pubsub/compare/v0.0.4...v0.1.0) (2019-05-07)


### Features

* add support for message signing ([5cb17fd](https://github.com/libp2p/js-libp2p-pubsub/commit/5cb17fd))


### BREAKING CHANGES

* as .publish should now sign messages (via _buildMessage) it now requires a callback since signing is async. This also adds an options param to the pubsub constructor to allow for disabling signing. While this change shouldnt break things upstream, implementations need to be sure to call _buildMessage for each message they will publish.



<a name="0.0.4"></a>
## [0.0.4](https://github.com/libp2p/js-libp2p-pubsub/compare/v0.0.3...v0.0.4) (2019-04-22)



<a name="0.0.3"></a>
## [0.0.3](https://github.com/libp2p/js-libp2p-pubsub/compare/v0.0.2...v0.0.3) (2019-04-17)


### Bug Fixes

* align topicid protobuf variable names ([f9a27d7](https://github.com/libp2p/js-libp2p-pubsub/commit/f9a27d7))
* libp2p crypto for linting ([b654c37](https://github.com/libp2p/js-libp2p-pubsub/commit/b654c37))


### Features

* added libp2p-crypto and bs58 dependencies ([c759f38](https://github.com/libp2p/js-libp2p-pubsub/commit/c759f38))
* added utils.js from js-libp2p-floodsub ([d83e357](https://github.com/libp2p/js-libp2p-pubsub/commit/d83e357))



<a name="0.0.2"></a>
## [0.0.2](https://github.com/libp2p/js-libp2p-pubsub/compare/v0.0.1...v0.0.2) (2019-02-08)


### Features

* added a time cache and a mapping of topics to peers ([13a56a4](https://github.com/libp2p/js-libp2p-pubsub/commit/13a56a4))



<a name="0.0.1"></a>
## 0.0.1 (2019-01-25)


### Bug Fixes

* code review ([7ca7f06](https://github.com/libp2p/js-libp2p-pubsub/commit/7ca7f06))


### Features

* initial implementation ([a68dc87](https://github.com/libp2p/js-libp2p-pubsub/commit/a68dc87))



