<a name="0.5.2"></a>
## [0.5.2](https://github.com/libp2p/js-libp2p-pubsub/compare/v0.5.1...v0.5.2) (2020-06-04)


### Bug Fixes

* use unidirectional streams ([#45](https://github.com/libp2p/js-libp2p-pubsub/issues/45)) ([c6ba48d](https://github.com/libp2p/js-libp2p-pubsub/commit/c6ba48d))



<a name="0.5.1"></a>
## [0.5.1](https://github.com/libp2p/js-libp2p-pubsub/compare/v0.5.0...v0.5.1) (2020-04-23)


### Bug Fixes

* remove node globals ([#42](https://github.com/libp2p/js-libp2p-pubsub/issues/42)) ([636041b](https://github.com/libp2p/js-libp2p-pubsub/commit/636041b))



<a name="0.5.0"></a>
# [0.5.0](https://github.com/libp2p/js-libp2p-pubsub/compare/v0.4.3...v0.5.0) (2020-04-22)


### Chores

* remove peer-info usage ([21a63cb](https://github.com/libp2p/js-libp2p-pubsub/commit/21a63cb))


### BREAKING CHANGES

* pubsub internal peer does not have info propery anymore and use the new topology api with peer-id instead of peer-info



<a name="0.4.3"></a>
## [0.4.3](https://github.com/libp2p/js-libp2p-pubsub/compare/v0.4.1...v0.4.3) (2020-02-14)


### Bug Fixes

* remove use of assert module ([#37](https://github.com/libp2p/js-libp2p-pubsub/issues/37)) ([d452054](https://github.com/libp2p/js-libp2p-pubsub/commit/d452054))



<a name="0.4.2"></a>
## [0.4.2](https://github.com/libp2p/js-libp2p-pubsub/compare/v0.4.1...v0.4.2) (2020-02-02)



<a name="0.4.1"></a>
## [0.4.1](https://github.com/libp2p/js-libp2p-pubsub/compare/v0.4.0...v0.4.1) (2020-01-07)


### Bug Fixes

* catch newStream errors ([#34](https://github.com/libp2p/js-libp2p-pubsub/issues/34)) ([57453d4](https://github.com/libp2p/js-libp2p-pubsub/commit/57453d4))



<a name="0.4.0"></a>
# [0.4.0](https://github.com/libp2p/js-libp2p-pubsub/compare/v0.3.2...v0.4.0) (2019-12-01)


### Chores

* getSubscribers ([#32](https://github.com/libp2p/js-libp2p-pubsub/issues/32)) ([b76451e](https://github.com/libp2p/js-libp2p-pubsub/commit/b76451e))


### BREAKING CHANGES

* getPeersSubscribed renamed to getSubscribers to remove redundant wording



<a name="0.3.2"></a>
## [0.3.2](https://github.com/libp2p/js-libp2p-pubsub/compare/v0.3.1...v0.3.2) (2019-11-28)


### Bug Fixes

* reduce seqno to 8 bytes ([#31](https://github.com/libp2p/js-libp2p-pubsub/issues/31)) ([d26a19c](https://github.com/libp2p/js-libp2p-pubsub/commit/d26a19c))



<a name="0.3.1"></a>
## [0.3.1](https://github.com/libp2p/js-libp2p-pubsub/compare/v0.3.0...v0.3.1) (2019-11-15)


### Bug Fixes

* incoming stream conn ([#30](https://github.com/libp2p/js-libp2p-pubsub/issues/30)) ([1b2af2c](https://github.com/libp2p/js-libp2p-pubsub/commit/1b2af2c))



<a name="0.3.0"></a>
# [0.3.0](https://github.com/libp2p/js-libp2p-pubsub/compare/v0.2.1...v0.3.0) (2019-11-14)


### Code Refactoring

* async ([#26](https://github.com/libp2p/js-libp2p-pubsub/issues/26)) ([c690b29](https://github.com/libp2p/js-libp2p-pubsub/commit/c690b29))


### BREAKING CHANGES

* Switch to using async/await and async iterators.



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



