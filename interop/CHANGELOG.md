# Changelog

## [2.0.0](https://github.com/libp2p/js-libp2p/compare/transport-interop-libp2p-main-v1.0.0...transport-interop-libp2p-main-v2.0.0) (2025-09-23)


### ⚠ BREAKING CHANGES

* requires @mulitformats/multiaddr 13.x.x or later
* - Stream handlers accept `stream, connection`, not `{ stream, connection }`
* The `discoverRelays` option has been removed, instead add one or more instances of `"/p2p-circuit"` to the libp2p config under the `addresses.listen` key
* the `connectionEncryption` option has been renamed `connectionEncrypters`
* - `@libp2p/peer-id-factory` has been removed, use `generateKeyPair` and `peerIdFromPrivateKey` instead
* the autodialer has been removed as well as the corresponding config keys

### Features

* select muxer early ([#3026](https://github.com/libp2p/js-libp2p/issues/3026)) ([c4b6a37](https://github.com/libp2p/js-libp2p/commit/c4b6a37173bbf4bfd127bdc524c2c00a1a9749e6))
* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)
* WebRTC-Direct support for Node.js ([#2583](https://github.com/libp2p/js-libp2p/issues/2583)) ([200c2bd](https://github.com/libp2p/js-libp2p/commit/200c2bd22e4db2e74c4533c12bc52085ecf7296b))


### Bug Fixes

* make circuit relay listen on addresses like other transports ([#2776](https://github.com/libp2p/js-libp2p/issues/2776)) ([3244ed0](https://github.com/libp2p/js-libp2p/commit/3244ed08625516b25716485c936c26a34b69466a))
* remove autodialer ([#2639](https://github.com/libp2p/js-libp2p/issues/2639)) ([ab90179](https://github.com/libp2p/js-libp2p/commit/ab901790810d8ce59724af1706c9a9e74341b8ee))
* remove deprecated multihashes library ([#2522](https://github.com/libp2p/js-libp2p/issues/2522)) ([e9b6a24](https://github.com/libp2p/js-libp2p/commit/e9b6a242ac8b485f5fe9c33710e100c660c308aa))
* remove patches for gossipsub, noise and the daemon modules ([#2694](https://github.com/libp2p/js-libp2p/issues/2694)) ([7cd9845](https://github.com/libp2p/js-libp2p/commit/7cd984569dbf0046861ec84e8e030ef62725fd14))
* remove private key field from peer id ([#2660](https://github.com/libp2p/js-libp2p/issues/2660)) ([3eeb0c7](https://github.com/libp2p/js-libp2p/commit/3eeb0c705bd58285a6e1ec9fcbb6987c5959d504)), closes [#2659](https://github.com/libp2p/js-libp2p/issues/2659)
* remove ws filters ([#2983](https://github.com/libp2p/js-libp2p/issues/2983)) ([2b49a5f](https://github.com/libp2p/js-libp2p/commit/2b49a5f74e8c79d571396e8a6a70f904b73763f2))
* rename connectionEncryption option to connectionEncrypters ([#2691](https://github.com/libp2p/js-libp2p/issues/2691)) ([6d72709](https://github.com/libp2p/js-libp2p/commit/6d72709ba5959388777610e2f71b8ba9522139b6))
* update multiaddr ([#3184](https://github.com/libp2p/js-libp2p/issues/3184)) ([6c42ea6](https://github.com/libp2p/js-libp2p/commit/6c42ea64a6e22028a87ecb3422e418e99ff09279))
* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))


### Documentation

* add spellcheck to gh actions ([#2994](https://github.com/libp2p/js-libp2p/issues/2994)) ([5b084e9](https://github.com/libp2p/js-libp2p/commit/5b084e9682a572e82f7907714d7807b3b9856326))
* fix broken links ([#3282](https://github.com/libp2p/js-libp2p/issues/3282)) ([71b4c41](https://github.com/libp2p/js-libp2p/commit/71b4c41e5990db2b65067663120b14de1ad72f9d))
* remove mplex from docs ([b6681bd](https://github.com/libp2p/js-libp2p/commit/b6681bd2505ac2749192042c3f16b14a88a8656d))
* update spell check ([#2999](https://github.com/libp2p/js-libp2p/issues/2999)) ([6f8cfea](https://github.com/libp2p/js-libp2p/commit/6f8cfeafb2f6ddc231a85ca369fb33cf759940f7))
* update typedoc config ([#3146](https://github.com/libp2p/js-libp2p/issues/3146)) ([14dbebe](https://github.com/libp2p/js-libp2p/commit/14dbebea8bd17addadac730afec0fa3b1cc6334a))


### Dependencies

* bump aegir from 43.0.3 to 44.0.1 ([#2603](https://github.com/libp2p/js-libp2p/issues/2603)) ([944935f](https://github.com/libp2p/js-libp2p/commit/944935f8dbcc1083e4cb4a02b49a0aab3083d3d9))
* update @multiformats/multiaddr to 13.x.x ([#3268](https://github.com/libp2p/js-libp2p/issues/3268)) ([b8ecade](https://github.com/libp2p/js-libp2p/commit/b8ecade2a725d38d11dd8df888c5abb22e14f26b))
* update aegir, fix all linting issues ([#3110](https://github.com/libp2p/js-libp2p/issues/3110)) ([510b033](https://github.com/libp2p/js-libp2p/commit/510b033f6b15358c7fae21486c3b09e730aa26cd))
* The following workspace dependencies were updated
  * devDependencies
    * @libp2p/noise bumped from ^1.0.0 to ^2.0.0
    * @libp2p/yamux bumped from ^8.0.0 to ^9.0.0
    * @libp2p/circuit-relay-v2 bumped from ^4.0.0 to ^5.0.0
    * @libp2p/identify bumped from ^4.0.0 to ^5.0.0
    * @libp2p/interface bumped from ^3.0.0 to ^4.0.0
    * @libp2p/mplex bumped from ^12.0.0 to ^13.0.0
    * @libp2p/ping bumped from ^3.0.0 to ^4.0.0
    * @libp2p/tcp bumped from ^11.0.0 to ^12.0.0
    * @libp2p/tls bumped from ^3.0.0 to ^4.0.0
    * @libp2p/webrtc bumped from ^6.0.0 to ^7.0.0
    * @libp2p/websockets bumped from ^10.0.0 to ^11.0.0
    * @libp2p/webtransport bumped from ^6.0.0 to ^7.0.0
    * libp2p bumped from ^3.0.0 to ^4.0.0

## 1.0.0 (2025-09-23)


### ⚠ BREAKING CHANGES

* requires @mulitformats/multiaddr 13.x.x or later
* - Stream handlers accept `stream, connection`, not `{ stream, connection }`
* The `discoverRelays` option has been removed, instead add one or more instances of `"/p2p-circuit"` to the libp2p config under the `addresses.listen` key
* the `connectionEncryption` option has been renamed `connectionEncrypters`
* - `@libp2p/peer-id-factory` has been removed, use `generateKeyPair` and `peerIdFromPrivateKey` instead
* the autodialer has been removed as well as the corresponding config keys

### Features

* select muxer early ([#3026](https://github.com/libp2p/js-libp2p/issues/3026)) ([c4b6a37](https://github.com/libp2p/js-libp2p/commit/c4b6a37173bbf4bfd127bdc524c2c00a1a9749e6))
* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)
* WebRTC-Direct support for Node.js ([#2583](https://github.com/libp2p/js-libp2p/issues/2583)) ([200c2bd](https://github.com/libp2p/js-libp2p/commit/200c2bd22e4db2e74c4533c12bc52085ecf7296b))


### Bug Fixes

* make circuit relay listen on addresses like other transports ([#2776](https://github.com/libp2p/js-libp2p/issues/2776)) ([3244ed0](https://github.com/libp2p/js-libp2p/commit/3244ed08625516b25716485c936c26a34b69466a))
* remove autodialer ([#2639](https://github.com/libp2p/js-libp2p/issues/2639)) ([ab90179](https://github.com/libp2p/js-libp2p/commit/ab901790810d8ce59724af1706c9a9e74341b8ee))
* remove deprecated multihashes library ([#2522](https://github.com/libp2p/js-libp2p/issues/2522)) ([e9b6a24](https://github.com/libp2p/js-libp2p/commit/e9b6a242ac8b485f5fe9c33710e100c660c308aa))
* remove patches for gossipsub, noise and the daemon modules ([#2694](https://github.com/libp2p/js-libp2p/issues/2694)) ([7cd9845](https://github.com/libp2p/js-libp2p/commit/7cd984569dbf0046861ec84e8e030ef62725fd14))
* remove private key field from peer id ([#2660](https://github.com/libp2p/js-libp2p/issues/2660)) ([3eeb0c7](https://github.com/libp2p/js-libp2p/commit/3eeb0c705bd58285a6e1ec9fcbb6987c5959d504)), closes [#2659](https://github.com/libp2p/js-libp2p/issues/2659)
* remove ws filters ([#2983](https://github.com/libp2p/js-libp2p/issues/2983)) ([2b49a5f](https://github.com/libp2p/js-libp2p/commit/2b49a5f74e8c79d571396e8a6a70f904b73763f2))
* rename connectionEncryption option to connectionEncrypters ([#2691](https://github.com/libp2p/js-libp2p/issues/2691)) ([6d72709](https://github.com/libp2p/js-libp2p/commit/6d72709ba5959388777610e2f71b8ba9522139b6))
* update multiaddr ([#3184](https://github.com/libp2p/js-libp2p/issues/3184)) ([6c42ea6](https://github.com/libp2p/js-libp2p/commit/6c42ea64a6e22028a87ecb3422e418e99ff09279))
* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))


### Documentation

* add spellcheck to gh actions ([#2994](https://github.com/libp2p/js-libp2p/issues/2994)) ([5b084e9](https://github.com/libp2p/js-libp2p/commit/5b084e9682a572e82f7907714d7807b3b9856326))
* fix broken links ([#3282](https://github.com/libp2p/js-libp2p/issues/3282)) ([71b4c41](https://github.com/libp2p/js-libp2p/commit/71b4c41e5990db2b65067663120b14de1ad72f9d))
* remove mplex from docs ([b6681bd](https://github.com/libp2p/js-libp2p/commit/b6681bd2505ac2749192042c3f16b14a88a8656d))
* update spell check ([#2999](https://github.com/libp2p/js-libp2p/issues/2999)) ([6f8cfea](https://github.com/libp2p/js-libp2p/commit/6f8cfeafb2f6ddc231a85ca369fb33cf759940f7))
* update typedoc config ([#3146](https://github.com/libp2p/js-libp2p/issues/3146)) ([14dbebe](https://github.com/libp2p/js-libp2p/commit/14dbebea8bd17addadac730afec0fa3b1cc6334a))


### Dependencies

* bump aegir from 43.0.3 to 44.0.1 ([#2603](https://github.com/libp2p/js-libp2p/issues/2603)) ([944935f](https://github.com/libp2p/js-libp2p/commit/944935f8dbcc1083e4cb4a02b49a0aab3083d3d9))
* update @multiformats/multiaddr to 13.x.x ([#3268](https://github.com/libp2p/js-libp2p/issues/3268)) ([b8ecade](https://github.com/libp2p/js-libp2p/commit/b8ecade2a725d38d11dd8df888c5abb22e14f26b))
* update aegir, fix all linting issues ([#3110](https://github.com/libp2p/js-libp2p/issues/3110)) ([510b033](https://github.com/libp2p/js-libp2p/commit/510b033f6b15358c7fae21486c3b09e730aa26cd))
* The following workspace dependencies were updated
  * devDependencies
    * @libp2p/noise bumped from ^16.1.3 to ^1.0.0
    * @libp2p/yamux bumped from ^7.0.1 to ^8.0.0
    * @libp2p/circuit-relay-v2 bumped from ^3.2.24 to ^4.0.0
    * @libp2p/identify bumped from ^3.0.39 to ^4.0.0
    * @libp2p/interface bumped from ^2.11.0 to ^3.0.0
    * @libp2p/mplex bumped from ^11.0.47 to ^12.0.0
    * @libp2p/ping bumped from ^2.0.37 to ^3.0.0
    * @libp2p/tcp bumped from ^10.1.19 to ^11.0.0
    * @libp2p/tls bumped from ^2.2.7 to ^3.0.0
    * @libp2p/webrtc bumped from ^5.2.24 to ^6.0.0
    * @libp2p/websockets bumped from ^9.2.19 to ^10.0.0
    * @libp2p/webtransport bumped from ^5.0.51 to ^6.0.0
    * libp2p bumped from ^2.10.0 to ^3.0.0
