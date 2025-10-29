:robot: I have created a release *beep* *boop*
---


<details><summary>autonat: 4.0.0</summary>

## [4.0.0](https://github.com/libp2p/js-libp2p/compare/autonat-v3.0.7...autonat-v4.0.0) (2025-10-29)


###   BREAKING CHANGES

* requires @mulitformats/multiaddr 13.x.x or later
* - Stream handlers accept `stream, connection`, not `{ stream, connection }`
* - `@libp2p/peer-id-factory` has been removed, use `generateKeyPair` and `peerIdFromPrivateKey` instead
* The `.code` property has been removed from most errors, use `.name` instead

### Features

* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)
* use `.name` property instead of `.code` for errors ([#2655](https://github.com/libp2p/js-libp2p/issues/2655)) ([0d20426](https://github.com/libp2p/js-libp2p/commit/0d20426fd5ea19b03345c70289bbd692e4348e1f))


### Bug Fixes

* add autonat capability ([#2827](https://github.com/libp2p/js-libp2p/issues/2827)) ([05d559f](https://github.com/libp2p/js-libp2p/commit/05d559f545d7408646f2b7dcd5adf5c6771a97e6))
* add tracking for long-lived maps ([#3158](https://github.com/libp2p/js-libp2p/issues/3158)) ([3528df8](https://github.com/libp2p/js-libp2p/commit/3528df8295ed0ccceff5cfac6a3d35d8f2480765))
* check max connections before reverifying addresses ([#2879](https://github.com/libp2p/js-libp2p/issues/2879)) ([9614de7](https://github.com/libp2p/js-libp2p/commit/9614de7c63d5dfad71fdad533b9be650d885205d))
* deduplicate typed event target ([#3170](https://github.com/libp2p/js-libp2p/issues/3170)) ([cc7b34c](https://github.com/libp2p/js-libp2p/commit/cc7b34c0fe3ac5745fd082ae0198b8742371a412))
* import types from interface module ([#2946](https://github.com/libp2p/js-libp2p/issues/2946)) ([d5b399e](https://github.com/libp2p/js-libp2p/commit/d5b399e3098e8dc20e33138d9b2cd5bcd844f700))
* increase max autonat streams and limit incoming message size ([#2890](https://github.com/libp2p/js-libp2p/issues/2890)) ([d3e5a33](https://github.com/libp2p/js-libp2p/commit/d3e5a3382ffd9b666b68e537ad8533ff38737102))
* remove private key field from peer id ([#2660](https://github.com/libp2p/js-libp2p/issues/2660)) ([3eeb0c7](https://github.com/libp2p/js-libp2p/commit/3eeb0c705bd58285a6e1ec9fcbb6987c5959d504)), closes [#2659](https://github.com/libp2p/js-libp2p/issues/2659)
* require external confirmation of public addresses ([#2867](https://github.com/libp2p/js-libp2p/issues/2867)) ([d19974d](https://github.com/libp2p/js-libp2p/commit/d19974d93a1015acfca95c2155dbcffc5fd6a6c0))
* scope logging to connection and stream ([#3215](https://github.com/libp2p/js-libp2p/issues/3215)) ([ce6b542](https://github.com/libp2p/js-libp2p/commit/ce6b542a8ea3d42e2238f910cf2a113370515058))
* update error logs to use %e token ([#3261](https://github.com/libp2p/js-libp2p/issues/3261)) ([e10c5c0](https://github.com/libp2p/js-libp2p/commit/e10c5c0c51876ab83da51d558ee4789fc3c38a49))
* update multiaddr ([#3184](https://github.com/libp2p/js-libp2p/issues/3184)) ([6c42ea6](https://github.com/libp2p/js-libp2p/commit/6c42ea64a6e22028a87ecb3422e418e99ff09279))
* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))
* update stream deps ([#3055](https://github.com/libp2p/js-libp2p/issues/3055)) ([b2124c2](https://github.com/libp2p/js-libp2p/commit/b2124c2db02d7870b958f294da42ec79084818a3))


### Documentation

* update autonat readme ([#3199](https://github.com/libp2p/js-libp2p/issues/3199)) ([8ad44f7](https://github.com/libp2p/js-libp2p/commit/8ad44f759ae274b1d12796b2a4f059221831a812))
* update spell check ([#2999](https://github.com/libp2p/js-libp2p/issues/2999)) ([6f8cfea](https://github.com/libp2p/js-libp2p/commit/6f8cfeafb2f6ddc231a85ca369fb33cf759940f7))
* update typedoc config ([#3146](https://github.com/libp2p/js-libp2p/issues/3146)) ([14dbebe](https://github.com/libp2p/js-libp2p/commit/14dbebea8bd17addadac730afec0fa3b1cc6334a))


### Dependencies

* bump aegir from 43.0.3 to 44.0.1 ([#2603](https://github.com/libp2p/js-libp2p/issues/2603)) ([944935f](https://github.com/libp2p/js-libp2p/commit/944935f8dbcc1083e4cb4a02b49a0aab3083d3d9))
* bump it-length-prefixed from 9.1.1 to 10.0.1 ([#2962](https://github.com/libp2p/js-libp2p/issues/2962)) ([1fc0e26](https://github.com/libp2p/js-libp2p/commit/1fc0e26620d2fd9d752179ab4f6dcc7b6ed5ee5c))
* bump sinon from 19.0.5 to 20.0.0 ([#3112](https://github.com/libp2p/js-libp2p/issues/3112)) ([d1ce677](https://github.com/libp2p/js-libp2p/commit/d1ce6774d8f7c338f15a05f80d09e361d21e7586))
* update @multiformats/multiaddr to 13.x.x ([#3268](https://github.com/libp2p/js-libp2p/issues/3268)) ([b8ecade](https://github.com/libp2p/js-libp2p/commit/b8ecade2a725d38d11dd8df888c5abb22e14f26b))
* update aegir, fix all linting issues ([#3110](https://github.com/libp2p/js-libp2p/issues/3110)) ([510b033](https://github.com/libp2p/js-libp2p/commit/510b033f6b15358c7fae21486c3b09e730aa26cd))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^3.1.0 to ^4.0.0
    * @libp2p/interface-internal bumped from ^3.0.7 to ^4.0.0
    * @libp2p/peer-collections bumped from ^7.0.7 to ^8.0.0
    * @libp2p/peer-id bumped from ^6.0.4 to ^7.0.0
    * @libp2p/utils bumped from ^7.0.7 to ^8.0.0
  * devDependencies
    * @libp2p/crypto bumped from ^5.1.13 to ^6.0.0
    * @libp2p/logger bumped from ^6.2.0 to ^7.0.0
</details>

<details><summary>autonat-v2: 3.0.0</summary>

## [3.0.0](https://github.com/libp2p/js-libp2p/compare/autonat-v2-v2.0.7...autonat-v2-v3.0.0) (2025-10-29)


###   BREAKING CHANGES

* requires @mulitformats/multiaddr 13.x.x or later
* - Stream handlers accept `stream, connection`, not `{ stream, connection }`

### Features

* implement AutoNATv2 ([#3196](https://github.com/libp2p/js-libp2p/issues/3196)) ([d2dc12c](https://github.com/libp2p/js-libp2p/commit/d2dc12c7d5b13c05d5c1682e4722307e0c685242))
* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)


### Bug Fixes

* update error logs to use %e token ([#3261](https://github.com/libp2p/js-libp2p/issues/3261)) ([e10c5c0](https://github.com/libp2p/js-libp2p/commit/e10c5c0c51876ab83da51d558ee4789fc3c38a49))
* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))


### Documentation

* update autonat v2 readme ([#3198](https://github.com/libp2p/js-libp2p/issues/3198)) ([1a716dc](https://github.com/libp2p/js-libp2p/commit/1a716dc6b33f439e267ef98ff845898571cbd965))


### Dependencies

* update @multiformats/multiaddr to 13.x.x ([#3268](https://github.com/libp2p/js-libp2p/issues/3268)) ([b8ecade](https://github.com/libp2p/js-libp2p/commit/b8ecade2a725d38d11dd8df888c5abb22e14f26b))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^3.1.0 to ^4.0.0
    * @libp2p/interface-internal bumped from ^3.0.7 to ^4.0.0
    * @libp2p/peer-collections bumped from ^7.0.7 to ^8.0.0
    * @libp2p/utils bumped from ^7.0.7 to ^8.0.0
  * devDependencies
    * @libp2p/crypto bumped from ^5.1.13 to ^6.0.0
    * @libp2p/logger bumped from ^6.2.0 to ^7.0.0
    * @libp2p/peer-id bumped from ^6.0.4 to ^7.0.0
</details>

<details><summary>bootstrap: 13.0.0</summary>

## [13.0.0](https://github.com/libp2p/js-libp2p/compare/bootstrap-v12.0.8...bootstrap-v13.0.0) (2025-10-29)


###   BREAKING CHANGES

* requires @mulitformats/multiaddr 13.x.x or later
* the autodialer has been removed as well as the corresponding config keys

### Bug Fixes

* .d.ts is in ./dist folder ([#3018](https://github.com/libp2p/js-libp2p/issues/3018)) ([52a46ec](https://github.com/libp2p/js-libp2p/commit/52a46ecad0d2ccd88eaf6190a1d6d67d388fd11b))
* deduplicate typed event target ([#3170](https://github.com/libp2p/js-libp2p/issues/3170)) ([cc7b34c](https://github.com/libp2p/js-libp2p/commit/cc7b34c0fe3ac5745fd082ae0198b8742371a412))
* export transiently referenced types ([#2717](https://github.com/libp2p/js-libp2p/issues/2717)) ([7f7ec82](https://github.com/libp2p/js-libp2p/commit/7f7ec82ae4ee7761360bdfdd294de271feaf1841))
* remove autodialer ([#2639](https://github.com/libp2p/js-libp2p/issues/2639)) ([ab90179](https://github.com/libp2p/js-libp2p/commit/ab901790810d8ce59724af1706c9a9e74341b8ee))
* update error logs to use %e token ([#3261](https://github.com/libp2p/js-libp2p/issues/3261)) ([e10c5c0](https://github.com/libp2p/js-libp2p/commit/e10c5c0c51876ab83da51d558ee4789fc3c38a49))
* update multiaddr ([#3184](https://github.com/libp2p/js-libp2p/issues/3184)) ([6c42ea6](https://github.com/libp2p/js-libp2p/commit/6c42ea64a6e22028a87ecb3422e418e99ff09279))
* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))


### Documentation

* update spell check ([#2999](https://github.com/libp2p/js-libp2p/issues/2999)) ([6f8cfea](https://github.com/libp2p/js-libp2p/commit/6f8cfeafb2f6ddc231a85ca369fb33cf759940f7))
* update typedoc config ([#3146](https://github.com/libp2p/js-libp2p/issues/3146)) ([14dbebe](https://github.com/libp2p/js-libp2p/commit/14dbebea8bd17addadac730afec0fa3b1cc6334a))


### Dependencies

* bump aegir from 43.0.3 to 44.0.1 ([#2603](https://github.com/libp2p/js-libp2p/issues/2603)) ([944935f](https://github.com/libp2p/js-libp2p/commit/944935f8dbcc1083e4cb4a02b49a0aab3083d3d9))
* update @multiformats/multiaddr to 13.x.x ([#3268](https://github.com/libp2p/js-libp2p/issues/3268)) ([b8ecade](https://github.com/libp2p/js-libp2p/commit/b8ecade2a725d38d11dd8df888c5abb22e14f26b))
* update aegir, fix all linting issues ([#3110](https://github.com/libp2p/js-libp2p/issues/3110)) ([510b033](https://github.com/libp2p/js-libp2p/commit/510b033f6b15358c7fae21486c3b09e730aa26cd))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^3.1.0 to ^4.0.0
    * @libp2p/interface-internal bumped from ^3.0.7 to ^4.0.0
    * @libp2p/peer-id bumped from ^6.0.4 to ^7.0.0
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^7.0.8 to ^8.0.0
    * @libp2p/logger bumped from ^6.2.0 to ^7.0.0
</details>

<details><summary>circuit-relay-v2: 5.0.0</summary>

## [5.0.0](https://github.com/libp2p/js-libp2p/compare/circuit-relay-v2-v4.1.0...circuit-relay-v2-v5.0.0) (2025-10-29)


###   BREAKING CHANGES

* All props and methods flagged as deprecated and for removal have been removed
* requires @mulitformats/multiaddr 13.x.x or later
* - Stream handlers accept `stream, connection`, not `{ stream, connection }`
* The `discoverRelays` option has been removed, instead add one or more instances of `"/p2p-circuit"` to the libp2p config under the `addresses.listen` key
* - `@libp2p/peer-id-factory` has been removed, use `generateKeyPair` and `peerIdFromPrivateKey` instead
* The `.code` property has been removed from most errors, use `.name` instead
* * The `notifyOnTransient` property of `libp2p.register` has been renamed `notifyOnLimitedConnection`

### Features

* add relay server reservation store metrics ([#2722](https://github.com/libp2p/js-libp2p/issues/2722)) ([60f6aa9](https://github.com/libp2p/js-libp2p/commit/60f6aa91cfd925ad59452ad6d19297f2915be042))
* add reprovide ([#2785](https://github.com/libp2p/js-libp2p/issues/2785)) ([52b3b1a](https://github.com/libp2p/js-libp2p/commit/52b3b1a16e56f73de9a75e7f62d5c3b367d757d9))
* add routing field to providers ([#3340](https://github.com/libp2p/js-libp2p/issues/3340)) ([0f3ab9e](https://github.com/libp2p/js-libp2p/commit/0f3ab9e617ab10fc09b108923c9d6e0fadd106a3))
* allow transports to modify announce addresses ([#2978](https://github.com/libp2p/js-libp2p/issues/2978)) ([8331c8e](https://github.com/libp2p/js-libp2p/commit/8331c8ea8feef1d642b6667213409dbe8293b606))
* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)
* use `.name` property instead of `.code` for errors ([#2655](https://github.com/libp2p/js-libp2p/issues/2655)) ([0d20426](https://github.com/libp2p/js-libp2p/commit/0d20426fd5ea19b03345c70289bbd692e4348e1f))


### Bug Fixes

* auto-confirm relay addresses ([#2886](https://github.com/libp2p/js-libp2p/issues/2886)) ([5c4a79e](https://github.com/libp2p/js-libp2p/commit/5c4a79e5a6e8d0db1ef6464075841a0b9de507ef)), closes [#2883](https://github.com/libp2p/js-libp2p/issues/2883)
* deduplicate typed event target ([#3170](https://github.com/libp2p/js-libp2p/issues/3170)) ([cc7b34c](https://github.com/libp2p/js-libp2p/commit/cc7b34c0fe3ac5745fd082ae0198b8742371a412))
* dial peers until relays are discovered ([#3188](https://github.com/libp2p/js-libp2p/issues/3188)) ([439d2c9](https://github.com/libp2p/js-libp2p/commit/439d2c9ce3376077e7448b507d445154c0311fe5))
* emit 'listening' when relays change ([#2758](https://github.com/libp2p/js-libp2p/issues/2758)) ([0d326d1](https://github.com/libp2p/js-libp2p/commit/0d326d102e4f6bf06c6f3e961a3b6b5844486495))
* ensure that the upgrader applies timeouts to incoming dials ([#3000](https://github.com/libp2p/js-libp2p/issues/3000)) ([90cca82](https://github.com/libp2p/js-libp2p/commit/90cca822b4cb112fc71bf9ad954023de685a9040))
* export transiently referenced types ([#2717](https://github.com/libp2p/js-libp2p/issues/2717)) ([7f7ec82](https://github.com/libp2p/js-libp2p/commit/7f7ec82ae4ee7761360bdfdd294de271feaf1841))
* handle more circuit relay refresh failures ([#2764](https://github.com/libp2p/js-libp2p/issues/2764)) ([5d199f9](https://github.com/libp2p/js-libp2p/commit/5d199f9b6ebe1cfd6f83051457b0ea62b0e86d91))
* import types from interface module ([#2946](https://github.com/libp2p/js-libp2p/issues/2946)) ([d5b399e](https://github.com/libp2p/js-libp2p/commit/d5b399e3098e8dc20e33138d9b2cd5bcd844f700))
* increase signal listeners ([#3101](https://github.com/libp2p/js-libp2p/issues/3101)) ([4b8c0a6](https://github.com/libp2p/js-libp2p/commit/4b8c0a6bd289c0a0d5002ee34efc696feb349caf))
* log relay response messages ([ad5cfd6](https://github.com/libp2p/js-libp2p/commit/ad5cfd66a3fccf94ddcabce8675a3bf742669484))
* make circuit relay listen on addresses like other transports ([#2776](https://github.com/libp2p/js-libp2p/issues/2776)) ([3244ed0](https://github.com/libp2p/js-libp2p/commit/3244ed08625516b25716485c936c26a34b69466a))
* remove deprecated code ([#3271](https://github.com/libp2p/js-libp2p/issues/3271)) ([6332556](https://github.com/libp2p/js-libp2p/commit/633255644eefb6bf9f739123b9cbd002c3d5a351))
* remove private key field from peer id ([#2660](https://github.com/libp2p/js-libp2p/issues/2660)) ([3eeb0c7](https://github.com/libp2p/js-libp2p/commit/3eeb0c705bd58285a6e1ec9fcbb6987c5959d504)), closes [#2659](https://github.com/libp2p/js-libp2p/issues/2659)
* rename "transient" connections to "limited" ([#2645](https://github.com/libp2p/js-libp2p/issues/2645)) ([2988602](https://github.com/libp2p/js-libp2p/commit/29886022eddc8a793217b2c888beac8aef63f1be)), closes [#2622](https://github.com/libp2p/js-libp2p/issues/2622)
* scope logging to connection and stream ([#3215](https://github.com/libp2p/js-libp2p/issues/3215)) ([ce6b542](https://github.com/libp2p/js-libp2p/commit/ce6b542a8ea3d42e2238f910cf2a113370515058))
* tag relay with keep_alive ([#2753](https://github.com/libp2p/js-libp2p/issues/2753)) ([8874660](https://github.com/libp2p/js-libp2p/commit/8874660c07609fef18802205c8486ac431ddbf9b))
* update error logs to use %e token ([#3261](https://github.com/libp2p/js-libp2p/issues/3261)) ([e10c5c0](https://github.com/libp2p/js-libp2p/commit/e10c5c0c51876ab83da51d558ee4789fc3c38a49))
* update multiaddr ([#3184](https://github.com/libp2p/js-libp2p/issues/3184)) ([6c42ea6](https://github.com/libp2p/js-libp2p/commit/6c42ea64a6e22028a87ecb3422e418e99ff09279))
* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))
* update race-signal ([#2986](https://github.com/libp2p/js-libp2p/issues/2986)) ([2a3cec9](https://github.com/libp2p/js-libp2p/commit/2a3cec9220f1250b7558635c4cb37d61f745645d)), closes [#2702](https://github.com/libp2p/js-libp2p/issues/2702)
* update stream deps ([#3055](https://github.com/libp2p/js-libp2p/issues/3055)) ([b2124c2](https://github.com/libp2p/js-libp2p/commit/b2124c2db02d7870b958f294da42ec79084818a3))
* use keep-alive as a tag prefix ([#2757](https://github.com/libp2p/js-libp2p/issues/2757)) ([29b47ad](https://github.com/libp2p/js-libp2p/commit/29b47adb47b48e9a2b01580bd0d50dc7c2be8fd6))


### Documentation

* add spellcheck to gh actions ([#2994](https://github.com/libp2p/js-libp2p/issues/2994)) ([5b084e9](https://github.com/libp2p/js-libp2p/commit/5b084e9682a572e82f7907714d7807b3b9856326))
* update spell check ([#2999](https://github.com/libp2p/js-libp2p/issues/2999)) ([6f8cfea](https://github.com/libp2p/js-libp2p/commit/6f8cfeafb2f6ddc231a85ca369fb33cf759940f7))
* update typedoc config ([#3146](https://github.com/libp2p/js-libp2p/issues/3146)) ([14dbebe](https://github.com/libp2p/js-libp2p/commit/14dbebea8bd17addadac730afec0fa3b1cc6334a))


### Dependencies

* bump aegir from 43.0.3 to 44.0.1 ([#2603](https://github.com/libp2p/js-libp2p/issues/2603)) ([944935f](https://github.com/libp2p/js-libp2p/commit/944935f8dbcc1083e4cb4a02b49a0aab3083d3d9))
* bump retimeable-signal in /packages/transport-circuit-relay-v2 ([#2853](https://github.com/libp2p/js-libp2p/issues/2853)) ([ce2f45e](https://github.com/libp2p/js-libp2p/commit/ce2f45ee91c37a056be67f3b47d14c0511231141))
* bump sinon from 19.0.5 to 20.0.0 ([#3112](https://github.com/libp2p/js-libp2p/issues/3112)) ([d1ce677](https://github.com/libp2p/js-libp2p/commit/d1ce6774d8f7c338f15a05f80d09e361d21e7586))
* update @multiformats/multiaddr to 13.x.x ([#3268](https://github.com/libp2p/js-libp2p/issues/3268)) ([b8ecade](https://github.com/libp2p/js-libp2p/commit/b8ecade2a725d38d11dd8df888c5abb22e14f26b))
* update @multiformats/multiaddr-matcher dep to 2.x.x ([#3208](https://github.com/libp2p/js-libp2p/issues/3208)) ([57e7fa4](https://github.com/libp2p/js-libp2p/commit/57e7fa4413a0e19799b5917bad6743800c77e1f7))
* update aegir, fix all linting issues ([#3110](https://github.com/libp2p/js-libp2p/issues/3110)) ([510b033](https://github.com/libp2p/js-libp2p/commit/510b033f6b15358c7fae21486c3b09e730aa26cd))
* update p-event, p-wait-for and noble deps ([#3302](https://github.com/libp2p/js-libp2p/issues/3302)) ([55bbd8c](https://github.com/libp2p/js-libp2p/commit/55bbd8cde12fe1c05e8d264e6e2406ca9fe2f044))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^5.1.13 to ^6.0.0
    * @libp2p/interface bumped from ^3.1.0 to ^4.0.0
    * @libp2p/interface-internal bumped from ^3.0.7 to ^4.0.0
    * @libp2p/peer-collections bumped from ^7.0.7 to ^8.0.0
    * @libp2p/peer-id bumped from ^6.0.4 to ^7.0.0
    * @libp2p/peer-record bumped from ^9.0.4 to ^10.0.0
    * @libp2p/utils bumped from ^7.0.7 to ^8.0.0
  * devDependencies
    * @libp2p/logger bumped from ^6.2.0 to ^7.0.0
</details>

<details><summary>config: 1.2.0</summary>

## [1.2.0](https://github.com/libp2p/js-libp2p/compare/config-v1.1.22...config-v1.2.0) (2025-10-29)


### Features

* add @libp2p/config ([#2893](https://github.com/libp2p/js-libp2p/issues/2893)) ([f474745](https://github.com/libp2p/js-libp2p/commit/f4747450f1025df1dc31970355ceed2154c5b835))
* allow configuring self-key name in config ([#2975](https://github.com/libp2p/js-libp2p/issues/2975)) ([56e5a2a](https://github.com/libp2p/js-libp2p/commit/56e5a2a87f2218d5c4d5b84f3941741a176b0cd7))


### Bug Fixes

* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))


### Documentation

* update comments in interface module and elsewhere ([#3107](https://github.com/libp2p/js-libp2p/issues/3107)) ([32627c8](https://github.com/libp2p/js-libp2p/commit/32627c8767587f7e8df88a700933ece6d5f5c3c4)), closes [#2112](https://github.com/libp2p/js-libp2p/issues/2112)
* update config docs ([#2917](https://github.com/libp2p/js-libp2p/issues/2917)) ([8582cc2](https://github.com/libp2p/js-libp2p/commit/8582cc24965b8636e466a259ed9f65a23e511ec6))
* update spell check ([#2999](https://github.com/libp2p/js-libp2p/issues/2999)) ([6f8cfea](https://github.com/libp2p/js-libp2p/commit/6f8cfeafb2f6ddc231a85ca369fb33cf759940f7))
* update typedoc config ([#3146](https://github.com/libp2p/js-libp2p/issues/3146)) ([14dbebe](https://github.com/libp2p/js-libp2p/commit/14dbebea8bd17addadac730afec0fa3b1cc6334a))


### Dependencies

* update aegir, fix all linting issues ([#3110](https://github.com/libp2p/js-libp2p/issues/3110)) ([510b033](https://github.com/libp2p/js-libp2p/commit/510b033f6b15358c7fae21486c3b09e730aa26cd))
* update datastore ([#3326](https://github.com/libp2p/js-libp2p/issues/3326)) ([a0f9da2](https://github.com/libp2p/js-libp2p/commit/a0f9da212fcc8ac8d21da835e87c9225ae138fdd))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^5.1.13 to ^6.0.0
    * @libp2p/interface bumped from ^3.1.0 to ^4.0.0
    * @libp2p/keychain bumped from ^6.0.7 to ^7.0.0
    * @libp2p/logger bumped from ^6.2.0 to ^7.0.0
</details>

<details><summary>crypto: 6.0.0</summary>

## [6.0.0](https://github.com/libp2p/js-libp2p/compare/crypto-v5.1.13...crypto-v6.0.0) (2025-10-29)


###   BREAKING CHANGES

* - `@libp2p/peer-id-factory` has been removed, use `generateKeyPair` and `peerIdFromPrivateKey` instead
* The `.code` property has been removed from most errors, use `.name` instead

### Features

* add functions to convert PrivateKey to CryptoKeyPair ([#3061](https://github.com/libp2p/js-libp2p/issues/3061)) ([0b9090a](https://github.com/libp2p/js-libp2p/commit/0b9090aea0ef0c9d5abca96f5295d6fe08a08aef))
* expose jwk prop on ECDSA and RSA keys ([#3060](https://github.com/libp2p/js-libp2p/issues/3060)) ([78cd7d5](https://github.com/libp2p/js-libp2p/commit/78cd7d53ec18a1495843d5de013f5b26cf232b00))
* support ECDSA private keys ([#3059](https://github.com/libp2p/js-libp2p/issues/3059)) ([fc51221](https://github.com/libp2p/js-libp2p/commit/fc512211024778d4aefb04411e815d977e91e03a))
* use `.name` property instead of `.code` for errors ([#2655](https://github.com/libp2p/js-libp2p/issues/2655)) ([0d20426](https://github.com/libp2p/js-libp2p/commit/0d20426fd5ea19b03345c70289bbd692e4348e1f))


### Bug Fixes

* .d.ts is in ./dist folder ([#3018](https://github.com/libp2p/js-libp2p/issues/3018)) ([52a46ec](https://github.com/libp2p/js-libp2p/commit/52a46ecad0d2ccd88eaf6190a1d6d67d388fd11b))
* abort async operations ([#3152](https://github.com/libp2p/js-libp2p/issues/3152)) ([8efb065](https://github.com/libp2p/js-libp2p/commit/8efb065d216fc587605a01d0b2ff93259c7ff723))
* add DER decoder and allow passing protobuf digest ([#3013](https://github.com/libp2p/js-libp2p/issues/3013)) ([9acccaa](https://github.com/libp2p/js-libp2p/commit/9acccaaed99ae7a42e3dc750437b29f8a002463f))
* add public/private key type disambiguators ([#2698](https://github.com/libp2p/js-libp2p/issues/2698)) ([18dd3cb](https://github.com/libp2p/js-libp2p/commit/18dd3cb2649412126b995c90e976ed06220c8590))
* correct secp256k1 key length detection in publicKeyFromRaw ([#2697](https://github.com/libp2p/js-libp2p/issues/2697)) ([1210884](https://github.com/libp2p/js-libp2p/commit/1210884edfe724389bb99aaf67042626093ee60b))
* detect Ed25519 support in WebCrypto ([#3100](https://github.com/libp2p/js-libp2p/issues/3100)) ([8e87be9](https://github.com/libp2p/js-libp2p/commit/8e87be9e6854b4508b2682535c7c9a4013bb5537))
* export transiently referenced types ([#2717](https://github.com/libp2p/js-libp2p/issues/2717)) ([7f7ec82](https://github.com/libp2p/js-libp2p/commit/7f7ec82ae4ee7761360bdfdd294de271feaf1841))
* remove private key field from peer id ([#2660](https://github.com/libp2p/js-libp2p/issues/2660)) ([3eeb0c7](https://github.com/libp2p/js-libp2p/commit/3eeb0c705bd58285a6e1ec9fcbb6987c5959d504)), closes [#2659](https://github.com/libp2p/js-libp2p/issues/2659)
* update P-521 bit length in Web Crypto ([#2710](https://github.com/libp2p/js-libp2p/issues/2710)) ([67587a2](https://github.com/libp2p/js-libp2p/commit/67587a273d7a65a14b513821ec7b129bf17504cc))
* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))
* use publicKey.x instead of privateKey.x for Ed25519 keys ([#2926](https://github.com/libp2p/js-libp2p/issues/2926)) ([e2ec7bd](https://github.com/libp2p/js-libp2p/commit/e2ec7bdaae767061c0aa07ea101184608a5072bb))
* use raw asn1js int value to improve performance ([#2788](https://github.com/libp2p/js-libp2p/issues/2788)) ([c4399dc](https://github.com/libp2p/js-libp2p/commit/c4399dcb93b24339a15e152d48009f448fc701d0))


### Documentation

* add spellcheck to gh actions ([#2994](https://github.com/libp2p/js-libp2p/issues/2994)) ([5b084e9](https://github.com/libp2p/js-libp2p/commit/5b084e9682a572e82f7907714d7807b3b9856326))
* update comments in interface module and elsewhere ([#3107](https://github.com/libp2p/js-libp2p/issues/3107)) ([32627c8](https://github.com/libp2p/js-libp2p/commit/32627c8767587f7e8df88a700933ece6d5f5c3c4)), closes [#2112](https://github.com/libp2p/js-libp2p/issues/2112)
* update spell check ([#2999](https://github.com/libp2p/js-libp2p/issues/2999)) ([6f8cfea](https://github.com/libp2p/js-libp2p/commit/6f8cfeafb2f6ddc231a85ca369fb33cf759940f7))
* update typedoc config ([#3146](https://github.com/libp2p/js-libp2p/issues/3146)) ([14dbebe](https://github.com/libp2p/js-libp2p/commit/14dbebea8bd17addadac730afec0fa3b1cc6334a))


### Dependencies

* bump @stablelib/ed25519 in /packages/crypto/benchmark/ed25519 ([#2855](https://github.com/libp2p/js-libp2p/issues/2855)) ([86a646b](https://github.com/libp2p/js-libp2p/commit/86a646b7fb0efb1c09fdbd068dc9a78653553fcf))
* bump aegir from 43.0.3 to 44.0.1 ([#2603](https://github.com/libp2p/js-libp2p/issues/2603)) ([944935f](https://github.com/libp2p/js-libp2p/commit/944935f8dbcc1083e4cb4a02b49a0aab3083d3d9))
* update aegir, fix all linting issues ([#3110](https://github.com/libp2p/js-libp2p/issues/3110)) ([510b033](https://github.com/libp2p/js-libp2p/commit/510b033f6b15358c7fae21486c3b09e730aa26cd))
* update p-event, p-wait-for and noble deps ([#3302](https://github.com/libp2p/js-libp2p/issues/3302)) ([55bbd8c](https://github.com/libp2p/js-libp2p/commit/55bbd8cde12fe1c05e8d264e6e2406ca9fe2f044))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^3.1.0 to ^4.0.0
</details>

<details><summary>daemon: 7.0.0</summary>

## [7.0.0](https://github.com/libp2p/js-libp2p/compare/daemon-v6.0.9...daemon-v7.0.0) (2025-10-29)


###   BREAKING CHANGES

* requires @mulitformats/multiaddr 13.x.x or later
* - Stream handlers accept `stream, connection`, not `{ stream, connection }`

### Features

* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)


### Bug Fixes

* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))


### Dependencies

* update @multiformats/multiaddr to 13.x.x ([#3268](https://github.com/libp2p/js-libp2p/issues/3268)) ([b8ecade](https://github.com/libp2p/js-libp2p/commit/b8ecade2a725d38d11dd8df888c5abb22e14f26b))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/daemon-server bumped from ^9.0.9 to ^10.0.0
</details>

<details><summary>daemon-client: 11.0.0</summary>

## [11.0.0](https://github.com/libp2p/js-libp2p/compare/daemon-client-v10.0.9...daemon-client-v11.0.0) (2025-10-29)


###   BREAKING CHANGES

* the `@libp2p/pubsub` module has been removed
* requires @mulitformats/multiaddr 13.x.x or later
* - Stream handlers accept `stream, connection`, not `{ stream, connection }`

### Features

* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)


### Bug Fixes

* remove pubsub ([#3291](https://github.com/libp2p/js-libp2p/issues/3291)) ([9a9b11f](https://github.com/libp2p/js-libp2p/commit/9a9b11fd44cf91a67a85805882e210ab1bff7ef2))
* update error logs to use %e token ([#3261](https://github.com/libp2p/js-libp2p/issues/3261)) ([e10c5c0](https://github.com/libp2p/js-libp2p/commit/e10c5c0c51876ab83da51d558ee4789fc3c38a49))
* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))


### Dependencies

* update @multiformats/multiaddr to 13.x.x ([#3268](https://github.com/libp2p/js-libp2p/issues/3268)) ([b8ecade](https://github.com/libp2p/js-libp2p/commit/b8ecade2a725d38d11dd8df888c5abb22e14f26b))
* update p-event, p-wait-for and noble deps ([#3302](https://github.com/libp2p/js-libp2p/issues/3302)) ([55bbd8c](https://github.com/libp2p/js-libp2p/commit/55bbd8cde12fe1c05e8d264e6e2406ca9fe2f044))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/daemon-protocol bumped from ^8.0.3 to ^9.0.0
    * @libp2p/interface bumped from ^3.1.0 to ^4.0.0
    * @libp2p/logger bumped from ^6.2.0 to ^7.0.0
    * @libp2p/peer-id bumped from ^6.0.4 to ^7.0.0
    * @libp2p/tcp bumped from ^11.0.7 to ^12.0.0
    * @libp2p/utils bumped from ^7.0.7 to ^8.0.0
  * devDependencies
    * @libp2p/gossipsub bumped from ^15.0.9 to ^16.0.0
    * @libp2p/daemon-server bumped from ^9.0.9 to ^10.0.0
    * @libp2p/kad-dht bumped from ^16.1.0 to ^17.0.0
</details>

<details><summary>daemon-protocol: 9.0.0</summary>

## [9.0.0](https://github.com/libp2p/js-libp2p/compare/daemon-protocol-v8.0.3...daemon-protocol-v9.0.0) (2025-10-29)


###   BREAKING CHANGES

* - Stream handlers accept `stream, connection`, not `{ stream, connection }`

### Features

* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)


### Bug Fixes

* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^3.1.0 to ^4.0.0
</details>

<details><summary>daemon-server: 10.0.0</summary>

## [10.0.0](https://github.com/libp2p/js-libp2p/compare/daemon-server-v9.0.9...daemon-server-v10.0.0) (2025-10-29)


###   BREAKING CHANGES

* the `@libp2p/pubsub` module has been removed
* requires @mulitformats/multiaddr 13.x.x or later
* - Stream handlers accept `stream, connection`, not `{ stream, connection }`

### Features

* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)


### Bug Fixes

* remove pubsub ([#3291](https://github.com/libp2p/js-libp2p/issues/3291)) ([9a9b11f](https://github.com/libp2p/js-libp2p/commit/9a9b11fd44cf91a67a85805882e210ab1bff7ef2))
* update error logs to use %e token ([#3261](https://github.com/libp2p/js-libp2p/issues/3261)) ([e10c5c0](https://github.com/libp2p/js-libp2p/commit/e10c5c0c51876ab83da51d558ee4789fc3c38a49))
* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))


### Dependencies

* update @multiformats/multiaddr to 13.x.x ([#3268](https://github.com/libp2p/js-libp2p/issues/3268)) ([b8ecade](https://github.com/libp2p/js-libp2p/commit/b8ecade2a725d38d11dd8df888c5abb22e14f26b))
* update p-event, p-wait-for and noble deps ([#3302](https://github.com/libp2p/js-libp2p/issues/3302)) ([55bbd8c](https://github.com/libp2p/js-libp2p/commit/55bbd8cde12fe1c05e8d264e6e2406ca9fe2f044))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/gossipsub bumped from ^15.0.9 to ^16.0.0
    * @libp2p/crypto bumped from ^5.1.13 to ^6.0.0
    * @libp2p/daemon-protocol bumped from ^8.0.3 to ^9.0.0
    * @libp2p/interface bumped from ^3.1.0 to ^4.0.0
    * @libp2p/kad-dht bumped from ^16.1.0 to ^17.0.0
    * @libp2p/logger bumped from ^6.2.0 to ^7.0.0
    * @libp2p/peer-id bumped from ^6.0.4 to ^7.0.0
    * @libp2p/tcp bumped from ^11.0.7 to ^12.0.0
    * @libp2p/utils bumped from ^7.0.7 to ^8.0.0
</details>

<details><summary>dcutr: 4.0.0</summary>

## [4.0.0](https://github.com/libp2p/js-libp2p/compare/dcutr-v3.0.7...dcutr-v4.0.0) (2025-10-29)


###   BREAKING CHANGES

* requires @mulitformats/multiaddr 13.x.x or later
* - Stream handlers accept `stream, connection`, not `{ stream, connection }`
* - `@libp2p/peer-id-factory` has been removed, use `generateKeyPair` and `peerIdFromPrivateKey` instead
* The `.code` property has been removed from most errors, use `.name` instead
* * The `notifyOnTransient` property of `libp2p.register` has been renamed `notifyOnLimitedConnection`

### Features

* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)
* use `.name` property instead of `.code` for errors ([#2655](https://github.com/libp2p/js-libp2p/issues/2655)) ([0d20426](https://github.com/libp2p/js-libp2p/commit/0d20426fd5ea19b03345c70289bbd692e4348e1f))


### Bug Fixes

* allow overriding mss mode ([#2924](https://github.com/libp2p/js-libp2p/issues/2924)) ([4bbcfa7](https://github.com/libp2p/js-libp2p/commit/4bbcfa707bba45a028429061ce44dec3dd7add34))
* export transiently referenced types ([#2717](https://github.com/libp2p/js-libp2p/issues/2717)) ([7f7ec82](https://github.com/libp2p/js-libp2p/commit/7f7ec82ae4ee7761360bdfdd294de271feaf1841))
* remove private key field from peer id ([#2660](https://github.com/libp2p/js-libp2p/issues/2660)) ([3eeb0c7](https://github.com/libp2p/js-libp2p/commit/3eeb0c705bd58285a6e1ec9fcbb6987c5959d504)), closes [#2659](https://github.com/libp2p/js-libp2p/issues/2659)
* rename "transient" connections to "limited" ([#2645](https://github.com/libp2p/js-libp2p/issues/2645)) ([2988602](https://github.com/libp2p/js-libp2p/commit/29886022eddc8a793217b2c888beac8aef63f1be)), closes [#2622](https://github.com/libp2p/js-libp2p/issues/2622)
* update error logs to use %e token ([#3261](https://github.com/libp2p/js-libp2p/issues/3261)) ([e10c5c0](https://github.com/libp2p/js-libp2p/commit/e10c5c0c51876ab83da51d558ee4789fc3c38a49))
* update multiaddr ([#3184](https://github.com/libp2p/js-libp2p/issues/3184)) ([6c42ea6](https://github.com/libp2p/js-libp2p/commit/6c42ea64a6e22028a87ecb3422e418e99ff09279))
* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))
* update stream deps ([#3055](https://github.com/libp2p/js-libp2p/issues/3055)) ([b2124c2](https://github.com/libp2p/js-libp2p/commit/b2124c2db02d7870b958f294da42ec79084818a3))


### Documentation

* add spellcheck to gh actions ([#2994](https://github.com/libp2p/js-libp2p/issues/2994)) ([5b084e9](https://github.com/libp2p/js-libp2p/commit/5b084e9682a572e82f7907714d7807b3b9856326))
* update spell check ([#2999](https://github.com/libp2p/js-libp2p/issues/2999)) ([6f8cfea](https://github.com/libp2p/js-libp2p/commit/6f8cfeafb2f6ddc231a85ca369fb33cf759940f7))
* update typedoc config ([#3146](https://github.com/libp2p/js-libp2p/issues/3146)) ([14dbebe](https://github.com/libp2p/js-libp2p/commit/14dbebea8bd17addadac730afec0fa3b1cc6334a))


### Dependencies

* bump aegir from 43.0.3 to 44.0.1 ([#2603](https://github.com/libp2p/js-libp2p/issues/2603)) ([944935f](https://github.com/libp2p/js-libp2p/commit/944935f8dbcc1083e4cb4a02b49a0aab3083d3d9))
* bump sinon from 19.0.5 to 20.0.0 ([#3112](https://github.com/libp2p/js-libp2p/issues/3112)) ([d1ce677](https://github.com/libp2p/js-libp2p/commit/d1ce6774d8f7c338f15a05f80d09e361d21e7586))
* update @multiformats/multiaddr to 13.x.x ([#3268](https://github.com/libp2p/js-libp2p/issues/3268)) ([b8ecade](https://github.com/libp2p/js-libp2p/commit/b8ecade2a725d38d11dd8df888c5abb22e14f26b))
* update @multiformats/multiaddr-matcher dep to 2.x.x ([#3208](https://github.com/libp2p/js-libp2p/issues/3208)) ([57e7fa4](https://github.com/libp2p/js-libp2p/commit/57e7fa4413a0e19799b5917bad6743800c77e1f7))
* update aegir, fix all linting issues ([#3110](https://github.com/libp2p/js-libp2p/issues/3110)) ([510b033](https://github.com/libp2p/js-libp2p/commit/510b033f6b15358c7fae21486c3b09e730aa26cd))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^3.1.0 to ^4.0.0
    * @libp2p/interface-internal bumped from ^3.0.7 to ^4.0.0
    * @libp2p/utils bumped from ^7.0.7 to ^8.0.0
</details>

<details><summary>echo: 4.0.0</summary>

## [4.0.0](https://github.com/libp2p/js-libp2p/compare/echo-v3.0.8...echo-v4.0.0) (2025-10-29)


###   BREAKING CHANGES

* requires @mulitformats/multiaddr 13.x.x or later
* - Stream handlers accept `stream, connection`, not `{ stream, connection }`
* the `connectionEncryption` option has been renamed `connectionEncrypters`
* The `.code` property has been removed from most errors, use `.name` instead

### Features

* add .echo method to echo protocol ([#2766](https://github.com/libp2p/js-libp2p/issues/2766)) ([75301ac](https://github.com/libp2p/js-libp2p/commit/75301ac7df0175ea53c729bd56f74c20c66307cb))
* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)
* use `.name` property instead of `.code` for errors ([#2655](https://github.com/libp2p/js-libp2p/issues/2655)) ([0d20426](https://github.com/libp2p/js-libp2p/commit/0d20426fd5ea19b03345c70289bbd692e4348e1f))


### Bug Fixes

* add abort options to echo ([#2808](https://github.com/libp2p/js-libp2p/issues/2808)) ([06c4381](https://github.com/libp2p/js-libp2p/commit/06c4381d2fd5b80deb42d72f65e6dcc6a9637109))
* rename connectionEncryption option to connectionEncrypters ([#2691](https://github.com/libp2p/js-libp2p/issues/2691)) ([6d72709](https://github.com/libp2p/js-libp2p/commit/6d72709ba5959388777610e2f71b8ba9522139b6))
* scope logging to connection and stream ([#3215](https://github.com/libp2p/js-libp2p/issues/3215)) ([ce6b542](https://github.com/libp2p/js-libp2p/commit/ce6b542a8ea3d42e2238f910cf2a113370515058))
* update multiaddr ([#3184](https://github.com/libp2p/js-libp2p/issues/3184)) ([6c42ea6](https://github.com/libp2p/js-libp2p/commit/6c42ea64a6e22028a87ecb3422e418e99ff09279))
* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))
* update stream deps ([#3055](https://github.com/libp2p/js-libp2p/issues/3055)) ([b2124c2](https://github.com/libp2p/js-libp2p/commit/b2124c2db02d7870b958f294da42ec79084818a3))
* use @chainsafe/libp2p-noise and @chainsafe/libp2p-yamux ([#3308](https://github.com/libp2p/js-libp2p/issues/3308)) ([425a42c](https://github.com/libp2p/js-libp2p/commit/425a42cddac5aac4d0ac822295cc4c4817dcdc95))


### Documentation

* update spell check ([#2999](https://github.com/libp2p/js-libp2p/issues/2999)) ([6f8cfea](https://github.com/libp2p/js-libp2p/commit/6f8cfeafb2f6ddc231a85ca369fb33cf759940f7))
* update typedoc config ([#3146](https://github.com/libp2p/js-libp2p/issues/3146)) ([14dbebe](https://github.com/libp2p/js-libp2p/commit/14dbebea8bd17addadac730afec0fa3b1cc6334a))


### Dependencies

* bump aegir from 43.0.3 to 44.0.1 ([#2603](https://github.com/libp2p/js-libp2p/issues/2603)) ([944935f](https://github.com/libp2p/js-libp2p/commit/944935f8dbcc1083e4cb4a02b49a0aab3083d3d9))
* bump sinon from 19.0.5 to 20.0.0 ([#3112](https://github.com/libp2p/js-libp2p/issues/3112)) ([d1ce677](https://github.com/libp2p/js-libp2p/commit/d1ce6774d8f7c338f15a05f80d09e361d21e7586))
* update @multiformats/multiaddr to 13.x.x ([#3268](https://github.com/libp2p/js-libp2p/issues/3268)) ([b8ecade](https://github.com/libp2p/js-libp2p/commit/b8ecade2a725d38d11dd8df888c5abb22e14f26b))
* update aegir, fix all linting issues ([#3110](https://github.com/libp2p/js-libp2p/issues/3110)) ([510b033](https://github.com/libp2p/js-libp2p/commit/510b033f6b15358c7fae21486c3b09e730aa26cd))
* update p-event, p-wait-for and noble deps ([#3302](https://github.com/libp2p/js-libp2p/issues/3302)) ([55bbd8c](https://github.com/libp2p/js-libp2p/commit/55bbd8cde12fe1c05e8d264e6e2406ca9fe2f044))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^3.1.0 to ^4.0.0
    * @libp2p/interface-internal bumped from ^3.0.7 to ^4.0.0
    * @libp2p/utils bumped from ^7.0.7 to ^8.0.0
</details>

<details><summary>fetch: 5.0.0</summary>

## [5.0.0](https://github.com/libp2p/js-libp2p/compare/fetch-v4.0.7...fetch-v5.0.0) (2025-10-29)


###   BREAKING CHANGES

* - Stream handlers accept `stream, connection`, not `{ stream, connection }`
* registered lookup functions now receive a Uint8Array identifier instead of a string
* - `@libp2p/peer-id-factory` has been removed, use `generateKeyPair` and `peerIdFromPrivateKey` instead
* The `.code` property has been removed from most errors, use `.name` instead

### Features

* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)
* use `.name` property instead of `.code` for errors ([#2655](https://github.com/libp2p/js-libp2p/issues/2655)) ([0d20426](https://github.com/libp2p/js-libp2p/commit/0d20426fd5ea19b03345c70289bbd692e4348e1f))


### Bug Fixes

* accept Uint8Arrays as keys ([#2909](https://github.com/libp2p/js-libp2p/issues/2909)) ([b56d918](https://github.com/libp2p/js-libp2p/commit/b56d918848b22febde02171e90d2d04eb07203a4))
* deduplicate typed event target ([#3170](https://github.com/libp2p/js-libp2p/issues/3170)) ([cc7b34c](https://github.com/libp2p/js-libp2p/commit/cc7b34c0fe3ac5745fd082ae0198b8742371a412))
* import types from interface module ([#2946](https://github.com/libp2p/js-libp2p/issues/2946)) ([d5b399e](https://github.com/libp2p/js-libp2p/commit/d5b399e3098e8dc20e33138d9b2cd5bcd844f700))
* remove private key field from peer id ([#2660](https://github.com/libp2p/js-libp2p/issues/2660)) ([3eeb0c7](https://github.com/libp2p/js-libp2p/commit/3eeb0c705bd58285a6e1ec9fcbb6987c5959d504)), closes [#2659](https://github.com/libp2p/js-libp2p/issues/2659)
* scope logging to connection and stream ([#3215](https://github.com/libp2p/js-libp2p/issues/3215)) ([ce6b542](https://github.com/libp2p/js-libp2p/commit/ce6b542a8ea3d42e2238f910cf2a113370515058))
* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))
* update stream deps ([#3055](https://github.com/libp2p/js-libp2p/issues/3055)) ([b2124c2](https://github.com/libp2p/js-libp2p/commit/b2124c2db02d7870b958f294da42ec79084818a3))


### Documentation

* add spellcheck to gh actions ([#2994](https://github.com/libp2p/js-libp2p/issues/2994)) ([5b084e9](https://github.com/libp2p/js-libp2p/commit/5b084e9682a572e82f7907714d7807b3b9856326))
* typo in protocol fetch ([#2638](https://github.com/libp2p/js-libp2p/issues/2638)) ([a8ec2bc](https://github.com/libp2p/js-libp2p/commit/a8ec2bcb78b5e400cc0fc3a3f035a63fcb8001ac))
* update spell check ([#2999](https://github.com/libp2p/js-libp2p/issues/2999)) ([6f8cfea](https://github.com/libp2p/js-libp2p/commit/6f8cfeafb2f6ddc231a85ca369fb33cf759940f7))
* update typedoc config ([#3146](https://github.com/libp2p/js-libp2p/issues/3146)) ([14dbebe](https://github.com/libp2p/js-libp2p/commit/14dbebea8bd17addadac730afec0fa3b1cc6334a))


### Dependencies

* bump aegir from 43.0.3 to 44.0.1 ([#2603](https://github.com/libp2p/js-libp2p/issues/2603)) ([944935f](https://github.com/libp2p/js-libp2p/commit/944935f8dbcc1083e4cb4a02b49a0aab3083d3d9))
* bump sinon from 19.0.5 to 20.0.0 ([#3112](https://github.com/libp2p/js-libp2p/issues/3112)) ([d1ce677](https://github.com/libp2p/js-libp2p/commit/d1ce6774d8f7c338f15a05f80d09e361d21e7586))
* update aegir, fix all linting issues ([#3110](https://github.com/libp2p/js-libp2p/issues/3110)) ([510b033](https://github.com/libp2p/js-libp2p/commit/510b033f6b15358c7fae21486c3b09e730aa26cd))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^3.1.0 to ^4.0.0
    * @libp2p/interface-internal bumped from ^3.0.7 to ^4.0.0
    * @libp2p/utils bumped from ^7.0.7 to ^8.0.0
  * devDependencies
    * @libp2p/crypto bumped from ^5.1.13 to ^6.0.0
    * @libp2p/peer-id bumped from ^6.0.4 to ^7.0.0
</details>

<details><summary>floodsub: 12.0.0</summary>

## [12.0.0](https://github.com/libp2p/js-libp2p/compare/floodsub-v11.0.8...floodsub-v12.0.0) (2025-10-29)


###   BREAKING CHANGES

* the `@libp2p/pubsub` module has been removed

### Bug Fixes

* remove pipe from floodsub ([#3310](https://github.com/libp2p/js-libp2p/issues/3310)) ([39e2e54](https://github.com/libp2p/js-libp2p/commit/39e2e541ad534e3c214b09b7055e71118648a77b))
* remove pubsub ([#3291](https://github.com/libp2p/js-libp2p/issues/3291)) ([9a9b11f](https://github.com/libp2p/js-libp2p/commit/9a9b11fd44cf91a67a85805882e210ab1bff7ef2))
* update error logs to use %e token ([#3261](https://github.com/libp2p/js-libp2p/issues/3261)) ([e10c5c0](https://github.com/libp2p/js-libp2p/commit/e10c5c0c51876ab83da51d558ee4789fc3c38a49))


### Dependencies

* bump p-queue from 8.1.1 to 9.0.0 ([#3323](https://github.com/libp2p/js-libp2p/issues/3323)) ([5fccd1d](https://github.com/libp2p/js-libp2p/commit/5fccd1dded71c02a50259350a8f9667cef557891))
* update p-event, p-wait-for and noble deps ([#3302](https://github.com/libp2p/js-libp2p/issues/3302)) ([55bbd8c](https://github.com/libp2p/js-libp2p/commit/55bbd8cde12fe1c05e8d264e6e2406ca9fe2f044))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^5.1.13 to ^6.0.0
    * @libp2p/interface bumped from ^3.1.0 to ^4.0.0
    * @libp2p/interface-internal bumped from ^3.0.7 to ^4.0.0
    * @libp2p/peer-collections bumped from ^7.0.7 to ^8.0.0
    * @libp2p/peer-id bumped from ^6.0.4 to ^7.0.0
    * @libp2p/utils bumped from ^7.0.7 to ^8.0.0
  * devDependencies
    * @libp2p/logger bumped from ^6.2.0 to ^7.0.0
</details>

<details><summary>gossipsub: 16.0.0</summary>

## [16.0.0](https://github.com/libp2p/js-libp2p/compare/gossipsub-v15.0.9...gossipsub-v16.0.0) (2025-10-29)


###   BREAKING CHANGES

* the `@libp2p/pubsub` module has been removed

### Bug Fixes

* remove pubsub ([#3291](https://github.com/libp2p/js-libp2p/issues/3291)) ([9a9b11f](https://github.com/libp2p/js-libp2p/commit/9a9b11fd44cf91a67a85805882e210ab1bff7ef2))


### Dependencies

* update datastore ([#3326](https://github.com/libp2p/js-libp2p/issues/3326)) ([a0f9da2](https://github.com/libp2p/js-libp2p/commit/a0f9da212fcc8ac8d21da835e87c9225ae138fdd))
* update p-event, p-wait-for and noble deps ([#3302](https://github.com/libp2p/js-libp2p/issues/3302)) ([55bbd8c](https://github.com/libp2p/js-libp2p/commit/55bbd8cde12fe1c05e8d264e6e2406ca9fe2f044))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^5.1.13 to ^6.0.0
    * @libp2p/interface bumped from ^3.1.0 to ^4.0.0
    * @libp2p/interface-internal bumped from ^3.0.7 to ^4.0.0
    * @libp2p/peer-id bumped from ^6.0.4 to ^7.0.0
  * devDependencies
    * @libp2p/floodsub bumped from ^11.0.8 to ^12.0.0
    * @libp2p/interface-compliance-tests bumped from ^7.0.8 to ^8.0.0
    * @libp2p/logger bumped from ^6.2.0 to ^7.0.0
    * @libp2p/peer-store bumped from ^12.0.7 to ^13.0.0
</details>

<details><summary>identify: 5.0.0</summary>

## [5.0.0](https://github.com/libp2p/js-libp2p/compare/identify-v4.0.7...identify-v5.0.0) (2025-10-29)


###   BREAKING CHANGES

* All props and methods flagged as deprecated and for removal have been removed
* requires @mulitformats/multiaddr 13.x.x or later
* - Stream handlers accept `stream, connection`, not `{ stream, connection }`
* - `@libp2p/peer-id-factory` has been removed, use `generateKeyPair` and `peerIdFromPrivateKey` instead
* The `.code` property has been removed from most errors, use `.name` instead
* * The `notifyOnTransient` property of `libp2p.register` has been renamed `notifyOnLimitedConnection`

### Features

* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)
* use `.name` property instead of `.code` for errors ([#2655](https://github.com/libp2p/js-libp2p/issues/2655)) ([0d20426](https://github.com/libp2p/js-libp2p/commit/0d20426fd5ea19b03345c70289bbd692e4348e1f))


### Bug Fixes

* abort async operations ([#3152](https://github.com/libp2p/js-libp2p/issues/3152)) ([8efb065](https://github.com/libp2p/js-libp2p/commit/8efb065d216fc587605a01d0b2ff93259c7ff723))
* capture early datachannels ([#3312](https://github.com/libp2p/js-libp2p/issues/3312)) ([8d66d5f](https://github.com/libp2p/js-libp2p/commit/8d66d5ff1c28298ac1bef3b68fb757eeba1d3bfa))
* debounce sending identify push messages ([#3193](https://github.com/libp2p/js-libp2p/issues/3193)) ([451e011](https://github.com/libp2p/js-libp2p/commit/451e011d471141d00d6fb6ad86c7f62bee6c7e26)), closes [#2389](https://github.com/libp2p/js-libp2p/issues/2389)
* deduplicate typed event target ([#3170](https://github.com/libp2p/js-libp2p/issues/3170)) ([cc7b34c](https://github.com/libp2p/js-libp2p/commit/cc7b34c0fe3ac5745fd082ae0198b8742371a412))
* ignore observed IPv6 addresses that are not global unicast ([#2873](https://github.com/libp2p/js-libp2p/issues/2873)) ([4e55fe8](https://github.com/libp2p/js-libp2p/commit/4e55fe8ff5bef906fd8ba21037c55861d9fefae0))
* import types from interface module ([#2946](https://github.com/libp2p/js-libp2p/issues/2946)) ([d5b399e](https://github.com/libp2p/js-libp2p/commit/d5b399e3098e8dc20e33138d9b2cd5bcd844f700))
* include platform in user agent ([#2942](https://github.com/libp2p/js-libp2p/issues/2942)) ([96f14e4](https://github.com/libp2p/js-libp2p/commit/96f14e429eac84d02504c4b97f183511c8af2add))
* remove deprecated code ([#3271](https://github.com/libp2p/js-libp2p/issues/3271)) ([6332556](https://github.com/libp2p/js-libp2p/commit/633255644eefb6bf9f739123b9cbd002c3d5a351))
* remove private key field from peer id ([#2660](https://github.com/libp2p/js-libp2p/issues/2660)) ([3eeb0c7](https://github.com/libp2p/js-libp2p/commit/3eeb0c705bd58285a6e1ec9fcbb6987c5959d504)), closes [#2659](https://github.com/libp2p/js-libp2p/issues/2659)
* rename "transient" connections to "limited" ([#2645](https://github.com/libp2p/js-libp2p/issues/2645)) ([2988602](https://github.com/libp2p/js-libp2p/commit/29886022eddc8a793217b2c888beac8aef63f1be)), closes [#2622](https://github.com/libp2p/js-libp2p/issues/2622)
* scope logging to connection and stream ([#3215](https://github.com/libp2p/js-libp2p/issues/3215)) ([ce6b542](https://github.com/libp2p/js-libp2p/commit/ce6b542a8ea3d42e2238f910cf2a113370515058))
* switch informational logging to trace logging ([#2727](https://github.com/libp2p/js-libp2p/issues/2727)) ([442a835](https://github.com/libp2p/js-libp2p/commit/442a835556116a440365da225ef4f1195f3a5b4d))
* update multiaddr ([#3184](https://github.com/libp2p/js-libp2p/issues/3184)) ([6c42ea6](https://github.com/libp2p/js-libp2p/commit/6c42ea64a6e22028a87ecb3422e418e99ff09279))
* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))
* update stream deps ([#3055](https://github.com/libp2p/js-libp2p/issues/3055)) ([b2124c2](https://github.com/libp2p/js-libp2p/commit/b2124c2db02d7870b958f294da42ec79084818a3))
* use isPrivate to detect private multiaddrs ([#2868](https://github.com/libp2p/js-libp2p/issues/2868)) ([2c182d2](https://github.com/libp2p/js-libp2p/commit/2c182d2e23d3246ece92ac937dfd91275b39bdc0))


### Documentation

* add spellcheck to gh actions ([#2994](https://github.com/libp2p/js-libp2p/issues/2994)) ([5b084e9](https://github.com/libp2p/js-libp2p/commit/5b084e9682a572e82f7907714d7807b3b9856326))
* update comments in interface module and elsewhere ([#3107](https://github.com/libp2p/js-libp2p/issues/3107)) ([32627c8](https://github.com/libp2p/js-libp2p/commit/32627c8767587f7e8df88a700933ece6d5f5c3c4)), closes [#2112](https://github.com/libp2p/js-libp2p/issues/2112)
* update spell check ([#2999](https://github.com/libp2p/js-libp2p/issues/2999)) ([6f8cfea](https://github.com/libp2p/js-libp2p/commit/6f8cfeafb2f6ddc231a85ca369fb33cf759940f7))
* update typedoc config ([#3146](https://github.com/libp2p/js-libp2p/issues/3146)) ([14dbebe](https://github.com/libp2p/js-libp2p/commit/14dbebea8bd17addadac730afec0fa3b1cc6334a))


### Dependencies

* bump aegir from 43.0.3 to 44.0.1 ([#2603](https://github.com/libp2p/js-libp2p/issues/2603)) ([944935f](https://github.com/libp2p/js-libp2p/commit/944935f8dbcc1083e4cb4a02b49a0aab3083d3d9))
* bump it-length-prefixed from 9.1.1 to 10.0.1 ([#2962](https://github.com/libp2p/js-libp2p/issues/2962)) ([1fc0e26](https://github.com/libp2p/js-libp2p/commit/1fc0e26620d2fd9d752179ab4f6dcc7b6ed5ee5c))
* update @multiformats/multiaddr to 13.x.x ([#3268](https://github.com/libp2p/js-libp2p/issues/3268)) ([b8ecade](https://github.com/libp2p/js-libp2p/commit/b8ecade2a725d38d11dd8df888c5abb22e14f26b))
* update @multiformats/multiaddr-matcher dep to 2.x.x ([#3208](https://github.com/libp2p/js-libp2p/issues/3208)) ([57e7fa4](https://github.com/libp2p/js-libp2p/commit/57e7fa4413a0e19799b5917bad6743800c77e1f7))
* update aegir, fix all linting issues ([#3110](https://github.com/libp2p/js-libp2p/issues/3110)) ([510b033](https://github.com/libp2p/js-libp2p/commit/510b033f6b15358c7fae21486c3b09e730aa26cd))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^5.1.13 to ^6.0.0
    * @libp2p/interface bumped from ^3.1.0 to ^4.0.0
    * @libp2p/interface-internal bumped from ^3.0.7 to ^4.0.0
    * @libp2p/peer-id bumped from ^6.0.4 to ^7.0.0
    * @libp2p/peer-record bumped from ^9.0.4 to ^10.0.0
    * @libp2p/utils bumped from ^7.0.7 to ^8.0.0
  * devDependencies
    * @libp2p/logger bumped from ^6.2.0 to ^7.0.0
</details>

<details><summary>integration-tests: 2.0.0</summary>

## [2.0.0](https://github.com/libp2p/js-libp2p/compare/integration-tests-v1.1.0...integration-tests-v2.0.0) (2025-10-29)


###   BREAKING CHANGES

* merge-options has been removed from `@libp2p/utils`
* the `@libp2p/pubsub` module has been removed
* All props and methods flagged as deprecated and for removal have been removed
* requires @mulitformats/multiaddr 13.x.x or later
* - Stream handlers accept `stream, connection`, not `{ stream, connection }`
* `@libp2p/kad-dht` now depends on `@libp2p/ping` - please configure this in your service map
* registered lookup functions now receive a Uint8Array identifier instead of a string
* The `discoverRelays` option has been removed, instead add one or more instances of `"/p2p-circuit"` to the libp2p config under the `addresses.listen` key
* the `connectionEncryption` option has been renamed `connectionEncrypters`
* - `@libp2p/peer-id-factory` has been removed, use `generateKeyPair` and `peerIdFromPrivateKey` instead
* the autodialer has been removed as well as the corresponding config keys
* The `.code` property has been removed from most errors, use `.name` instead
* * The `notifyOnTransient` property of `libp2p.register` has been renamed `notifyOnLimitedConnection`

### Features

* add reprovide ([#2785](https://github.com/libp2p/js-libp2p/issues/2785)) ([52b3b1a](https://github.com/libp2p/js-libp2p/commit/52b3b1a16e56f73de9a75e7f62d5c3b367d757d9))
* add routing field to providers ([#3340](https://github.com/libp2p/js-libp2p/issues/3340)) ([0f3ab9e](https://github.com/libp2p/js-libp2p/commit/0f3ab9e617ab10fc09b108923c9d6e0fadd106a3))
* select muxer early ([#3026](https://github.com/libp2p/js-libp2p/issues/3026)) ([c4b6a37](https://github.com/libp2p/js-libp2p/commit/c4b6a37173bbf4bfd127bdc524c2c00a1a9749e6))
* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)
* use `.name` property instead of `.code` for errors ([#2655](https://github.com/libp2p/js-libp2p/issues/2655)) ([0d20426](https://github.com/libp2p/js-libp2p/commit/0d20426fd5ea19b03345c70289bbd692e4348e1f))
* WebRTC-Direct support for Node.js ([#2583](https://github.com/libp2p/js-libp2p/issues/2583)) ([200c2bd](https://github.com/libp2p/js-libp2p/commit/200c2bd22e4db2e74c4533c12bc52085ecf7296b))


### Bug Fixes

* accept Uint8Arrays as keys ([#2909](https://github.com/libp2p/js-libp2p/issues/2909)) ([b56d918](https://github.com/libp2p/js-libp2p/commit/b56d918848b22febde02171e90d2d04eb07203a4))
* allow connection gater classes ([#3281](https://github.com/libp2p/js-libp2p/issues/3281)) ([e1aaf4e](https://github.com/libp2p/js-libp2p/commit/e1aaf4ed0e77b9b33e273f36681a24b403e22ca8))
* allow overriding mss mode ([#2924](https://github.com/libp2p/js-libp2p/issues/2924)) ([4bbcfa7](https://github.com/libp2p/js-libp2p/commit/4bbcfa707bba45a028429061ce44dec3dd7add34))
* bump noise version ([#3306](https://github.com/libp2p/js-libp2p/issues/3306)) ([71e8ee1](https://github.com/libp2p/js-libp2p/commit/71e8ee1632fdeaff5d6c33a38ae6df02ea69f579))
* close handshake datachannel after use ([#3076](https://github.com/libp2p/js-libp2p/issues/3076)) ([b9e32cc](https://github.com/libp2p/js-libp2p/commit/b9e32cc37b3f45efc512e0f868cd7df1dbf1aef3))
* deduplicate typed event target ([#3170](https://github.com/libp2p/js-libp2p/issues/3170)) ([cc7b34c](https://github.com/libp2p/js-libp2p/commit/cc7b34c0fe3ac5745fd082ae0198b8742371a412))
* do not close relay connection after WebRTC upgrade ([#3205](https://github.com/libp2p/js-libp2p/issues/3205)) ([cfe2be4](https://github.com/libp2p/js-libp2p/commit/cfe2be4c9319b68f8e68df8021b9ee3c1a7236fd))
* emit 'listening' when relays change ([#2758](https://github.com/libp2p/js-libp2p/issues/2758)) ([0d326d1](https://github.com/libp2p/js-libp2p/commit/0d326d102e4f6bf06c6f3e961a3b6b5844486495))
* ensure that the upgrader applies timeouts to incoming dials ([#3000](https://github.com/libp2p/js-libp2p/issues/3000)) ([90cca82](https://github.com/libp2p/js-libp2p/commit/90cca822b4cb112fc71bf9ad954023de685a9040))
* handle more circuit relay refresh failures ([#2764](https://github.com/libp2p/js-libp2p/issues/2764)) ([5d199f9](https://github.com/libp2p/js-libp2p/commit/5d199f9b6ebe1cfd6f83051457b0ea62b0e86d91))
* improve error message when starting server ([#3008](https://github.com/libp2p/js-libp2p/issues/3008)) ([ab1bb86](https://github.com/libp2p/js-libp2p/commit/ab1bb862f3c22059c8d3c7f750ceab0755a0a0f2))
* make circuit relay listen on addresses like other transports ([#2776](https://github.com/libp2p/js-libp2p/issues/2776)) ([3244ed0](https://github.com/libp2p/js-libp2p/commit/3244ed08625516b25716485c936c26a34b69466a))
* maximum call stack size with duplicate webrtc addresses ([#2980](https://github.com/libp2p/js-libp2p/issues/2980)) ([d98cc46](https://github.com/libp2p/js-libp2p/commit/d98cc46e4c9557c0eeb6caf528b9b97261d1d165))
* only close stream if it is open ([#2823](https://github.com/libp2p/js-libp2p/issues/2823)) ([3098232](https://github.com/libp2p/js-libp2p/commit/30982327b3924614d1fb552fd42b7b8f5a7419cd))
* refactor connection opening and closing ([#2735](https://github.com/libp2p/js-libp2p/issues/2735)) ([24fa1d5](https://github.com/libp2p/js-libp2p/commit/24fa1d5af3be19f60f31261e8e0242c1747da0b2))
* remove autodialer ([#2639](https://github.com/libp2p/js-libp2p/issues/2639)) ([ab90179](https://github.com/libp2p/js-libp2p/commit/ab901790810d8ce59724af1706c9a9e74341b8ee))
* remove deprecated code ([#3271](https://github.com/libp2p/js-libp2p/issues/3271)) ([6332556](https://github.com/libp2p/js-libp2p/commit/633255644eefb6bf9f739123b9cbd002c3d5a351))
* remove merge-options ([#3294](https://github.com/libp2p/js-libp2p/issues/3294)) ([dc01b32](https://github.com/libp2p/js-libp2p/commit/dc01b3278f021c944594644629fbd449514aee35))
* remove patches for gossipsub, noise and the daemon modules ([#2694](https://github.com/libp2p/js-libp2p/issues/2694)) ([7cd9845](https://github.com/libp2p/js-libp2p/commit/7cd984569dbf0046861ec84e8e030ef62725fd14))
* remove private key field from peer id ([#2660](https://github.com/libp2p/js-libp2p/issues/2660)) ([3eeb0c7](https://github.com/libp2p/js-libp2p/commit/3eeb0c705bd58285a6e1ec9fcbb6987c5959d504)), closes [#2659](https://github.com/libp2p/js-libp2p/issues/2659)
* remove pubsub ([#3291](https://github.com/libp2p/js-libp2p/issues/3291)) ([9a9b11f](https://github.com/libp2p/js-libp2p/commit/9a9b11fd44cf91a67a85805882e210ab1bff7ef2))
* remove ws filters ([#2983](https://github.com/libp2p/js-libp2p/issues/2983)) ([2b49a5f](https://github.com/libp2p/js-libp2p/commit/2b49a5f74e8c79d571396e8a6a70f904b73763f2))
* rename "transient" connections to "limited" ([#2645](https://github.com/libp2p/js-libp2p/issues/2645)) ([2988602](https://github.com/libp2p/js-libp2p/commit/29886022eddc8a793217b2c888beac8aef63f1be)), closes [#2622](https://github.com/libp2p/js-libp2p/issues/2622)
* rename connectionEncryption option to connectionEncrypters ([#2691](https://github.com/libp2p/js-libp2p/issues/2691)) ([6d72709](https://github.com/libp2p/js-libp2p/commit/6d72709ba5959388777610e2f71b8ba9522139b6))
* require external confirmation of public addresses ([#2867](https://github.com/libp2p/js-libp2p/issues/2867)) ([d19974d](https://github.com/libp2p/js-libp2p/commit/d19974d93a1015acfca95c2155dbcffc5fd6a6c0))
* send raw plaintext public key during handshake ([#2599](https://github.com/libp2p/js-libp2p/issues/2599)) ([359265a](https://github.com/libp2p/js-libp2p/commit/359265a3a842698b5bdf93c6be64e3bcfee745bf))
* update multiaddr ([#3184](https://github.com/libp2p/js-libp2p/issues/3184)) ([6c42ea6](https://github.com/libp2p/js-libp2p/commit/6c42ea64a6e22028a87ecb3422e418e99ff09279))
* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))
* use @chainsafe/libp2p-noise and @chainsafe/libp2p-yamux ([#3308](https://github.com/libp2p/js-libp2p/issues/3308)) ([425a42c](https://github.com/libp2p/js-libp2p/commit/425a42cddac5aac4d0ac822295cc4c4817dcdc95))
* use libp2p ping instad of kad ping ([#3074](https://github.com/libp2p/js-libp2p/issues/3074)) ([4f37aff](https://github.com/libp2p/js-libp2p/commit/4f37aff532282db1b9a544161e3becc4533ae402))


### Documentation

* add spellcheck to gh actions ([#2994](https://github.com/libp2p/js-libp2p/issues/2994)) ([5b084e9](https://github.com/libp2p/js-libp2p/commit/5b084e9682a572e82f7907714d7807b3b9856326))
* update spell check ([#2999](https://github.com/libp2p/js-libp2p/issues/2999)) ([6f8cfea](https://github.com/libp2p/js-libp2p/commit/6f8cfeafb2f6ddc231a85ca369fb33cf759940f7))
* update typedoc config ([#3146](https://github.com/libp2p/js-libp2p/issues/3146)) ([14dbebe](https://github.com/libp2p/js-libp2p/commit/14dbebea8bd17addadac730afec0fa3b1cc6334a))


### Dependencies

* bump aegir from 43.0.3 to 44.0.1 ([#2603](https://github.com/libp2p/js-libp2p/issues/2603)) ([944935f](https://github.com/libp2p/js-libp2p/commit/944935f8dbcc1083e4cb4a02b49a0aab3083d3d9))
* bump sinon from 19.0.5 to 20.0.0 ([#3112](https://github.com/libp2p/js-libp2p/issues/3112)) ([d1ce677](https://github.com/libp2p/js-libp2p/commit/d1ce6774d8f7c338f15a05f80d09e361d21e7586))
* update @multiformats/multiaddr to 13.x.x ([#3268](https://github.com/libp2p/js-libp2p/issues/3268)) ([b8ecade](https://github.com/libp2p/js-libp2p/commit/b8ecade2a725d38d11dd8df888c5abb22e14f26b))
* update @multiformats/multiaddr-matcher dep to 2.x.x ([#3208](https://github.com/libp2p/js-libp2p/issues/3208)) ([57e7fa4](https://github.com/libp2p/js-libp2p/commit/57e7fa4413a0e19799b5917bad6743800c77e1f7))
* update aegir, fix all linting issues ([#3110](https://github.com/libp2p/js-libp2p/issues/3110)) ([510b033](https://github.com/libp2p/js-libp2p/commit/510b033f6b15358c7fae21486c3b09e730aa26cd))
* update p-event, p-wait-for and noble deps ([#3302](https://github.com/libp2p/js-libp2p/issues/3302)) ([55bbd8c](https://github.com/libp2p/js-libp2p/commit/55bbd8cde12fe1c05e8d264e6e2406ca9fe2f044))
* The following workspace dependencies were updated
  * devDependencies
    * @libp2p/gossipsub bumped from ^15.0.9 to ^16.0.0
    * @libp2p/bootstrap bumped from ^12.0.8 to ^13.0.0
    * @libp2p/circuit-relay-v2 bumped from ^4.1.0 to ^5.0.0
    * @libp2p/crypto bumped from ^5.1.13 to ^6.0.0
    * @libp2p/daemon-client bumped from ^10.0.9 to ^11.0.0
    * @libp2p/daemon-server bumped from ^9.0.9 to ^10.0.0
    * @libp2p/dcutr bumped from ^3.0.7 to ^4.0.0
    * @libp2p/echo bumped from ^3.0.8 to ^4.0.0
    * @libp2p/fetch bumped from ^4.0.7 to ^5.0.0
    * @libp2p/floodsub bumped from ^11.0.8 to ^12.0.0
    * @libp2p/identify bumped from ^4.0.7 to ^5.0.0
    * @libp2p/interface bumped from ^3.1.0 to ^4.0.0
    * @libp2p/interface-compliance-tests bumped from ^7.0.8 to ^8.0.0
    * @libp2p/interface-internal bumped from ^3.0.7 to ^4.0.0
    * @libp2p/interop bumped from ^14.0.9 to ^15.0.0
    * @libp2p/kad-dht bumped from ^16.1.0 to ^17.0.0
    * @libp2p/logger bumped from ^6.2.0 to ^7.0.0
    * @libp2p/mdns bumped from ^12.0.8 to ^13.0.0
    * @libp2p/memory bumped from ^2.0.7 to ^3.0.0
    * @libp2p/mplex bumped from ^12.0.8 to ^13.0.0
    * @libp2p/peer-collections bumped from ^7.0.7 to ^8.0.0
    * @libp2p/peer-id bumped from ^6.0.4 to ^7.0.0
    * @libp2p/ping bumped from ^3.0.7 to ^4.0.0
    * @libp2p/plaintext bumped from ^3.0.7 to ^4.0.0
    * @libp2p/tcp bumped from ^11.0.7 to ^12.0.0
    * @libp2p/tls bumped from ^3.0.7 to ^4.0.0
    * @libp2p/utils bumped from ^7.0.7 to ^8.0.0
    * @libp2p/webrtc bumped from ^6.0.8 to ^7.0.0
    * @libp2p/websockets bumped from ^10.0.8 to ^11.0.0
    * @libp2p/webtransport bumped from ^6.0.9 to ^7.0.0
    * libp2p bumped from ^3.1.0 to ^4.0.0
</details>

<details><summary>interface: 4.0.0</summary>

## [4.0.0](https://github.com/libp2p/js-libp2p/compare/interface-v3.1.0...interface-v4.0.0) (2025-10-29)


###   BREAKING CHANGES

* the `@libp2p/pubsub` module has been removed
* All props and methods flagged as deprecated and for removal have been removed
* requires @mulitformats/multiaddr 13.x.x or later
* - Stream handlers accept `stream, connection`, not `{ stream, connection }`
* instead of `CodeError`, use `TimeoutError`, `UnexpectedPeerError`, etc
* - `@libp2p/peer-id-factory` has been removed, use `generateKeyPair` and `peerIdFromPrivateKey` instead
* the final argument to `secureOutbound` and `secureInbound` in the `ConnectionEncrypter` interface is now an options object
* The `.code` property has been removed from most errors, use `.name` instead
* removes `localPeer: PeerId` first parameter from `secureInbound` and `secureOutbound` in `ConnectionEncrypter`
* * The `notifyOnTransient` property of `libp2p.register` has been renamed `notifyOnLimitedConnection`
* `@libp2p/interface` no longer exports a `CustomEvent` polyfill

### Features

* add auto-tls service ([#2798](https://github.com/libp2p/js-libp2p/issues/2798)) ([d866eb5](https://github.com/libp2p/js-libp2p/commit/d866eb5bb8269485364c233119331ca073ff1343))
* add connection monitor ([#2644](https://github.com/libp2p/js-libp2p/issues/2644)) ([7939dbd](https://github.com/libp2p/js-libp2p/commit/7939dbd5cbab1c7b4be671ff976d0258e9b48178))
* add getInfo function to peerstore ([#3099](https://github.com/libp2p/js-libp2p/issues/3099)) ([a5a33af](https://github.com/libp2p/js-libp2p/commit/a5a33afd9fc7e5cc9060e0ac8d6daa8edb566ea8))
* add histogram and summary metric types ([#2705](https://github.com/libp2p/js-libp2p/issues/2705)) ([21fe841](https://github.com/libp2p/js-libp2p/commit/21fe841f2584e0166253d78fc390401d7cee5601))
* add isPubSub method to detect PubSub implementations ([#2707](https://github.com/libp2p/js-libp2p/issues/2707)) ([6ccbb06](https://github.com/libp2p/js-libp2p/commit/6ccbb06f0e76dcd1ba20d31e2518f3a1acb0efbc))
* add reprovide ([#2785](https://github.com/libp2p/js-libp2p/issues/2785)) ([52b3b1a](https://github.com/libp2p/js-libp2p/commit/52b3b1a16e56f73de9a75e7f62d5c3b367d757d9))
* add routing field to providers ([#3340](https://github.com/libp2p/js-libp2p/issues/3340)) ([0f3ab9e](https://github.com/libp2p/js-libp2p/commit/0f3ab9e617ab10fc09b108923c9d6e0fadd106a3))
* add skip muxer negotiation ([#3081](https://github.com/libp2p/js-libp2p/issues/3081)) ([3833353](https://github.com/libp2p/js-libp2p/commit/3833353bdc936695b17cc836515763ead2137756))
* add traceFunction call to metrics ([#2898](https://github.com/libp2p/js-libp2p/issues/2898)) ([20d9ba7](https://github.com/libp2p/js-libp2p/commit/20d9ba73e2fc76e42327458b2a1e29d1ba162bba))
* allow async stream handlers ([#3212](https://github.com/libp2p/js-libp2p/issues/3212)) ([cb1c14e](https://github.com/libp2p/js-libp2p/commit/cb1c14e628d2242988478c3bb856bea20db56bdc))
* allow creating scoped loggers ([#3214](https://github.com/libp2p/js-libp2p/issues/3214)) ([58abe87](https://github.com/libp2p/js-libp2p/commit/58abe8702f0c28d87b54f29e19155ea5c00c407d))
* allow early muxer selection by connection encrypters ([#3022](https://github.com/libp2p/js-libp2p/issues/3022)) ([dd71d8a](https://github.com/libp2p/js-libp2p/commit/dd71d8a86841acbccdca8f3e930bda0eced6d1d0))
* allow overriding stream handlers ([#2945](https://github.com/libp2p/js-libp2p/issues/2945)) ([21088c5](https://github.com/libp2p/js-libp2p/commit/21088c5195df2c3c371fc28bb824f5f84760bf12)), closes [#2928](https://github.com/libp2p/js-libp2p/issues/2928)
* allow transports to modify announce addresses ([#2978](https://github.com/libp2p/js-libp2p/issues/2978)) ([8331c8e](https://github.com/libp2p/js-libp2p/commit/8331c8ea8feef1d642b6667213409dbe8293b606))
* expose jwk prop on ECDSA and RSA keys ([#3060](https://github.com/libp2p/js-libp2p/issues/3060)) ([78cd7d5](https://github.com/libp2p/js-libp2p/commit/78cd7d53ec18a1495843d5de013f5b26cf232b00))
* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)
* support ECDSA private keys ([#3059](https://github.com/libp2p/js-libp2p/issues/3059)) ([fc51221](https://github.com/libp2p/js-libp2p/commit/fc512211024778d4aefb04411e815d977e91e03a))
* use `.name` property instead of `.code` for errors ([#2655](https://github.com/libp2p/js-libp2p/issues/2655)) ([0d20426](https://github.com/libp2p/js-libp2p/commit/0d20426fd5ea19b03345c70289bbd692e4348e1f))


### Bug Fixes

* abort async operations ([#3152](https://github.com/libp2p/js-libp2p/issues/3152)) ([8efb065](https://github.com/libp2p/js-libp2p/commit/8efb065d216fc587605a01d0b2ff93259c7ff723))
* add multiaddr resolvers ([#3200](https://github.com/libp2p/js-libp2p/issues/3200)) ([1c1c49e](https://github.com/libp2p/js-libp2p/commit/1c1c49ef4f25dcd8925d134f7e185658c10d2d6b))
* add optional generics to metric groups ([#2665](https://github.com/libp2p/js-libp2p/issues/2665)) ([df33069](https://github.com/libp2p/js-libp2p/commit/df330695a0ee627f79c51c1ab737cbf3278a91e8))
* add public/private key type disambiguators ([#2698](https://github.com/libp2p/js-libp2p/issues/2698)) ([18dd3cb](https://github.com/libp2p/js-libp2p/commit/18dd3cb2649412126b995c90e976ed06220c8590))
* allow aborting drain waiting ([72a7ea1](https://github.com/libp2p/js-libp2p/commit/72a7ea10a622221c4d850e8eaaf17da8b73e318d))
* allow overriding mss mode ([#2924](https://github.com/libp2p/js-libp2p/issues/2924)) ([4bbcfa7](https://github.com/libp2p/js-libp2p/commit/4bbcfa707bba45a028429061ce44dec3dd7add34))
* allow stream unshift ([#3320](https://github.com/libp2p/js-libp2p/issues/3320)) ([14e87cd](https://github.com/libp2p/js-libp2p/commit/14e87cd152a6f8bf38966071b9e7aa30d56d8978))
* byte stream should return null when remote closes ([#3319](https://github.com/libp2p/js-libp2p/issues/3319)) ([7e1c0ba](https://github.com/libp2p/js-libp2p/commit/7e1c0badab2098addab964ea97e2ee9d9236267c))
* deduplicate typed event target ([#3170](https://github.com/libp2p/js-libp2p/issues/3170)) ([cc7b34c](https://github.com/libp2p/js-libp2p/commit/cc7b34c0fe3ac5745fd082ae0198b8742371a412))
* emit 'listening' when relays change ([#2758](https://github.com/libp2p/js-libp2p/issues/2758)) ([0d326d1](https://github.com/libp2p/js-libp2p/commit/0d326d102e4f6bf06c6f3e961a3b6b5844486495))
* ensure that the upgrader applies timeouts to incoming dials ([#3000](https://github.com/libp2p/js-libp2p/issues/3000)) ([90cca82](https://github.com/libp2p/js-libp2p/commit/90cca822b4cb112fc71bf9ad954023de685a9040))
* export transiently referenced types ([#2717](https://github.com/libp2p/js-libp2p/issues/2717)) ([7f7ec82](https://github.com/libp2p/js-libp2p/commit/7f7ec82ae4ee7761360bdfdd294de271feaf1841))
* include platform in user agent ([#2942](https://github.com/libp2p/js-libp2p/issues/2942)) ([96f14e4](https://github.com/libp2p/js-libp2p/commit/96f14e429eac84d02504c4b97f183511c8af2add))
* make connection securing abortable ([#2662](https://github.com/libp2p/js-libp2p/issues/2662)) ([51f7b57](https://github.com/libp2p/js-libp2p/commit/51f7b570c3a5bae8dd7da7edbc4145893328400e))
* make event detail optional ([#3144](https://github.com/libp2p/js-libp2p/issues/3144)) ([ab014c0](https://github.com/libp2p/js-libp2p/commit/ab014c0c0bf0d7a1e3c63001ddbc42b449b41e5b))
* remove CodeError class ([#2688](https://github.com/libp2p/js-libp2p/issues/2688)) ([81ebe4e](https://github.com/libp2p/js-libp2p/commit/81ebe4e47e82508a847bb3af0af36cc249b78765))
* remove CustomEvent export from `@libp2p/interface` ([#2656](https://github.com/libp2p/js-libp2p/issues/2656)) ([fab6fc9](https://github.com/libp2p/js-libp2p/commit/fab6fc960b6bc03a6bc00ae5a4b3551d7d080c73))
* remove CustomEvent polyfill ([#2652](https://github.com/libp2p/js-libp2p/issues/2652)) ([0edbfe7](https://github.com/libp2p/js-libp2p/commit/0edbfe7af1ccf4bd23dd78b2bcc29ecf54ea02eb))
* remove deprecated code ([#3271](https://github.com/libp2p/js-libp2p/issues/3271)) ([6332556](https://github.com/libp2p/js-libp2p/commit/633255644eefb6bf9f739123b9cbd002c3d5a351))
* remove localPeer from secureInbound and secureOutbound ([#2304](https://github.com/libp2p/js-libp2p/issues/2304)) ([b435a21](https://github.com/libp2p/js-libp2p/commit/b435a214cf342c6015f474d26143fc27f0f673e9))
* remove private key field from peer id ([#2660](https://github.com/libp2p/js-libp2p/issues/2660)) ([3eeb0c7](https://github.com/libp2p/js-libp2p/commit/3eeb0c705bd58285a6e1ec9fcbb6987c5959d504)), closes [#2659](https://github.com/libp2p/js-libp2p/issues/2659)
* remove pubsub ([#3291](https://github.com/libp2p/js-libp2p/issues/3291)) ([9a9b11f](https://github.com/libp2p/js-libp2p/commit/9a9b11fd44cf91a67a85805882e210ab1bff7ef2))
* rename "transient" connections to "limited" ([#2645](https://github.com/libp2p/js-libp2p/issues/2645)) ([2988602](https://github.com/libp2p/js-libp2p/commit/29886022eddc8a793217b2c888beac8aef63f1be)), closes [#2622](https://github.com/libp2p/js-libp2p/issues/2622)
* scope logging to connection and stream ([#3215](https://github.com/libp2p/js-libp2p/issues/3215)) ([ce6b542](https://github.com/libp2p/js-libp2p/commit/ce6b542a8ea3d42e2238f910cf2a113370515058))
* simplify connection upgrade ([#2719](https://github.com/libp2p/js-libp2p/issues/2719)) ([c258b35](https://github.com/libp2p/js-libp2p/commit/c258b35af60eec906437129ab31201bfb9c80d16))
* update multiaddr ([#3184](https://github.com/libp2p/js-libp2p/issues/3184)) ([6c42ea6](https://github.com/libp2p/js-libp2p/commit/6c42ea64a6e22028a87ecb3422e418e99ff09279))
* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))
* update transport listener options ([#2826](https://github.com/libp2p/js-libp2p/issues/2826)) ([656db81](https://github.com/libp2p/js-libp2p/commit/656db81cff6f5cb8d1d5523f1928323057308b5a))
* use keep-alive as a tag prefix ([#2757](https://github.com/libp2p/js-libp2p/issues/2757)) ([29b47ad](https://github.com/libp2p/js-libp2p/commit/29b47adb47b48e9a2b01580bd0d50dc7c2be8fd6))


### Documentation

* add spellcheck to gh actions ([#2994](https://github.com/libp2p/js-libp2p/issues/2994)) ([5b084e9](https://github.com/libp2p/js-libp2p/commit/5b084e9682a572e82f7907714d7807b3b9856326))
* correct typo ([#2919](https://github.com/libp2p/js-libp2p/issues/2919)) ([d33abe8](https://github.com/libp2p/js-libp2p/commit/d33abe89d9ed54e910059efe4f9282fc18fe7317))
* fix broken links ([#3282](https://github.com/libp2p/js-libp2p/issues/3282)) ([71b4c41](https://github.com/libp2p/js-libp2p/commit/71b4c41e5990db2b65067663120b14de1ad72f9d))
* update `connection.newStream` return value ([#2630](https://github.com/libp2p/js-libp2p/issues/2630)) ([c164e2e](https://github.com/libp2p/js-libp2p/commit/c164e2e237716be17891ae8015ca78f46d0dea17))
* update comments in interface module and elsewhere ([#3107](https://github.com/libp2p/js-libp2p/issues/3107)) ([32627c8](https://github.com/libp2p/js-libp2p/commit/32627c8767587f7e8df88a700933ece6d5f5c3c4)), closes [#2112](https://github.com/libp2p/js-libp2p/issues/2112)
* update spell check ([#2999](https://github.com/libp2p/js-libp2p/issues/2999)) ([6f8cfea](https://github.com/libp2p/js-libp2p/commit/6f8cfeafb2f6ddc231a85ca369fb33cf759940f7))
* update typedoc config ([#3146](https://github.com/libp2p/js-libp2p/issues/3146)) ([14dbebe](https://github.com/libp2p/js-libp2p/commit/14dbebea8bd17addadac730afec0fa3b1cc6334a))


### Dependencies

* bump aegir from 43.0.3 to 44.0.1 ([#2603](https://github.com/libp2p/js-libp2p/issues/2603)) ([944935f](https://github.com/libp2p/js-libp2p/commit/944935f8dbcc1083e4cb4a02b49a0aab3083d3d9))
* update @multiformats/multiaddr to 13.x.x ([#3268](https://github.com/libp2p/js-libp2p/issues/3268)) ([b8ecade](https://github.com/libp2p/js-libp2p/commit/b8ecade2a725d38d11dd8df888c5abb22e14f26b))
* update aegir, fix all linting issues ([#3110](https://github.com/libp2p/js-libp2p/issues/3110)) ([510b033](https://github.com/libp2p/js-libp2p/commit/510b033f6b15358c7fae21486c3b09e730aa26cd))
</details>

<details><summary>interface-compliance-tests: 8.0.0</summary>

## [8.0.0](https://github.com/libp2p/js-libp2p/compare/interface-compliance-tests-v7.0.8...interface-compliance-tests-v8.0.0) (2025-10-29)


###   BREAKING CHANGES

* requires @mulitformats/multiaddr 13.x.x or later
* - Stream handlers accept `stream, connection`, not `{ stream, connection }`
* - `@libp2p/peer-id-factory` has been removed, use `generateKeyPair` and `peerIdFromPrivateKey` instead
* the final argument to `secureOutbound` and `secureInbound` in the `ConnectionEncrypter` interface is now an options object
* The `.code` property has been removed from most errors, use `.name` instead
* removes `localPeer: PeerId` first parameter from `secureInbound` and `secureOutbound` in `ConnectionEncrypter`
* * The `notifyOnTransient` property of `libp2p.register` has been renamed `notifyOnLimitedConnection`
* `@libp2p/interface` no longer exports a `CustomEvent` polyfill

### Features

* add getMaxConnections method to connection manager ([#2877](https://github.com/libp2p/js-libp2p/issues/2877)) ([1729fca](https://github.com/libp2p/js-libp2p/commit/1729fcaebc78307ff06783d5a2201ad83f92c109))
* add histogram and summary metric types ([#2705](https://github.com/libp2p/js-libp2p/issues/2705)) ([21fe841](https://github.com/libp2p/js-libp2p/commit/21fe841f2584e0166253d78fc390401d7cee5601))
* add isPubSub method to detect PubSub implementations ([#2707](https://github.com/libp2p/js-libp2p/issues/2707)) ([6ccbb06](https://github.com/libp2p/js-libp2p/commit/6ccbb06f0e76dcd1ba20d31e2518f3a1acb0efbc))
* allow async stream handlers ([#3212](https://github.com/libp2p/js-libp2p/issues/3212)) ([cb1c14e](https://github.com/libp2p/js-libp2p/commit/cb1c14e628d2242988478c3bb856bea20db56bdc))
* allow early muxer selection by connection encrypters ([#3022](https://github.com/libp2p/js-libp2p/issues/3022)) ([dd71d8a](https://github.com/libp2p/js-libp2p/commit/dd71d8a86841acbccdca8f3e930bda0eced6d1d0))
* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)
* use `.name` property instead of `.code` for errors ([#2655](https://github.com/libp2p/js-libp2p/issues/2655)) ([0d20426](https://github.com/libp2p/js-libp2p/commit/0d20426fd5ea19b03345c70289bbd692e4348e1f))
* WebRTC-Direct support for Node.js ([#2583](https://github.com/libp2p/js-libp2p/issues/2583)) ([200c2bd](https://github.com/libp2p/js-libp2p/commit/200c2bd22e4db2e74c4533c12bc52085ecf7296b))


### Bug Fixes

* abort open connection and new stream ([#3106](https://github.com/libp2p/js-libp2p/issues/3106)) ([213a54a](https://github.com/libp2p/js-libp2p/commit/213a54a1e21fdceb84fd7c92a4f9d42441cfcea0))
* capture early datachannels ([#3312](https://github.com/libp2p/js-libp2p/issues/3312)) ([8d66d5f](https://github.com/libp2p/js-libp2p/commit/8d66d5ff1c28298ac1bef3b68fb757eeba1d3bfa))
* deduplicate typed event target ([#3170](https://github.com/libp2p/js-libp2p/issues/3170)) ([cc7b34c](https://github.com/libp2p/js-libp2p/commit/cc7b34c0fe3ac5745fd082ae0198b8742371a412))
* ensure that the upgrader applies timeouts to incoming dials ([#3000](https://github.com/libp2p/js-libp2p/issues/3000)) ([90cca82](https://github.com/libp2p/js-libp2p/commit/90cca822b4cb112fc71bf9ad954023de685a9040))
* export transiently referenced types ([#2717](https://github.com/libp2p/js-libp2p/issues/2717)) ([7f7ec82](https://github.com/libp2p/js-libp2p/commit/7f7ec82ae4ee7761360bdfdd294de271feaf1841))
* import types from interface module ([#2946](https://github.com/libp2p/js-libp2p/issues/2946)) ([d5b399e](https://github.com/libp2p/js-libp2p/commit/d5b399e3098e8dc20e33138d9b2cd5bcd844f700))
* make connection securing abortable ([#2662](https://github.com/libp2p/js-libp2p/issues/2662)) ([51f7b57](https://github.com/libp2p/js-libp2p/commit/51f7b570c3a5bae8dd7da7edbc4145893328400e))
* remove CustomEvent export from `@libp2p/interface` ([#2656](https://github.com/libp2p/js-libp2p/issues/2656)) ([fab6fc9](https://github.com/libp2p/js-libp2p/commit/fab6fc960b6bc03a6bc00ae5a4b3551d7d080c73))
* remove localPeer from secureInbound and secureOutbound ([#2304](https://github.com/libp2p/js-libp2p/issues/2304)) ([b435a21](https://github.com/libp2p/js-libp2p/commit/b435a214cf342c6015f474d26143fc27f0f673e9))
* remove private key field from peer id ([#2660](https://github.com/libp2p/js-libp2p/issues/2660)) ([3eeb0c7](https://github.com/libp2p/js-libp2p/commit/3eeb0c705bd58285a6e1ec9fcbb6987c5959d504)), closes [#2659](https://github.com/libp2p/js-libp2p/issues/2659)
* remove slow network test ([#2829](https://github.com/libp2p/js-libp2p/issues/2829)) ([f53f65d](https://github.com/libp2p/js-libp2p/commit/f53f65d1805f9cd41f1b55558cef06d03f7a796c))
* rename "transient" connections to "limited" ([#2645](https://github.com/libp2p/js-libp2p/issues/2645)) ([2988602](https://github.com/libp2p/js-libp2p/commit/29886022eddc8a793217b2c888beac8aef63f1be)), closes [#2622](https://github.com/libp2p/js-libp2p/issues/2622)
* scope logging to connection and stream ([#3215](https://github.com/libp2p/js-libp2p/issues/3215)) ([ce6b542](https://github.com/libp2p/js-libp2p/commit/ce6b542a8ea3d42e2238f910cf2a113370515058))
* simplify connection upgrade ([#2719](https://github.com/libp2p/js-libp2p/issues/2719)) ([c258b35](https://github.com/libp2p/js-libp2p/commit/c258b35af60eec906437129ab31201bfb9c80d16))
* update multiaddr ([#3184](https://github.com/libp2p/js-libp2p/issues/3184)) ([6c42ea6](https://github.com/libp2p/js-libp2p/commit/6c42ea64a6e22028a87ecb3422e418e99ff09279))
* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))
* update stream deps ([#3055](https://github.com/libp2p/js-libp2p/issues/3055)) ([b2124c2](https://github.com/libp2p/js-libp2p/commit/b2124c2db02d7870b958f294da42ec79084818a3))
* use `.close()` to close streams ([#3191](https://github.com/libp2p/js-libp2p/issues/3191)) ([53001ad](https://github.com/libp2p/js-libp2p/commit/53001addfadc264712f4c030be0c3356c6e8a197))


### Documentation

* add spellcheck to gh actions ([#2994](https://github.com/libp2p/js-libp2p/issues/2994)) ([5b084e9](https://github.com/libp2p/js-libp2p/commit/5b084e9682a572e82f7907714d7807b3b9856326))
* update comments in interface module and elsewhere ([#3107](https://github.com/libp2p/js-libp2p/issues/3107)) ([32627c8](https://github.com/libp2p/js-libp2p/commit/32627c8767587f7e8df88a700933ece6d5f5c3c4)), closes [#2112](https://github.com/libp2p/js-libp2p/issues/2112)
* update spell check ([#2999](https://github.com/libp2p/js-libp2p/issues/2999)) ([6f8cfea](https://github.com/libp2p/js-libp2p/commit/6f8cfeafb2f6ddc231a85ca369fb33cf759940f7))
* update typedoc config ([#3146](https://github.com/libp2p/js-libp2p/issues/3146)) ([14dbebe](https://github.com/libp2p/js-libp2p/commit/14dbebea8bd17addadac730afec0fa3b1cc6334a))


### Dependencies

* bump aegir from 43.0.3 to 44.0.1 ([#2603](https://github.com/libp2p/js-libp2p/issues/2603)) ([944935f](https://github.com/libp2p/js-libp2p/commit/944935f8dbcc1083e4cb4a02b49a0aab3083d3d9))
* bump sinon from 19.0.5 to 20.0.0 ([#3112](https://github.com/libp2p/js-libp2p/issues/3112)) ([d1ce677](https://github.com/libp2p/js-libp2p/commit/d1ce6774d8f7c338f15a05f80d09e361d21e7586))
* update @multiformats/multiaddr to 13.x.x ([#3268](https://github.com/libp2p/js-libp2p/issues/3268)) ([b8ecade](https://github.com/libp2p/js-libp2p/commit/b8ecade2a725d38d11dd8df888c5abb22e14f26b))
* update @multiformats/multiaddr-matcher dep to 2.x.x ([#3208](https://github.com/libp2p/js-libp2p/issues/3208)) ([57e7fa4](https://github.com/libp2p/js-libp2p/commit/57e7fa4413a0e19799b5917bad6743800c77e1f7))
* update aegir, fix all linting issues ([#3110](https://github.com/libp2p/js-libp2p/issues/3110)) ([510b033](https://github.com/libp2p/js-libp2p/commit/510b033f6b15358c7fae21486c3b09e730aa26cd))
* update p-event, p-wait-for and noble deps ([#3302](https://github.com/libp2p/js-libp2p/issues/3302)) ([55bbd8c](https://github.com/libp2p/js-libp2p/commit/55bbd8cde12fe1c05e8d264e6e2406ca9fe2f044))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^5.1.13 to ^6.0.0
    * @libp2p/echo bumped from ^3.0.8 to ^4.0.0
    * @libp2p/interface bumped from ^3.1.0 to ^4.0.0
    * @libp2p/interface-internal bumped from ^3.0.7 to ^4.0.0
    * @libp2p/logger bumped from ^6.2.0 to ^7.0.0
    * @libp2p/memory bumped from ^2.0.7 to ^3.0.0
    * @libp2p/peer-id bumped from ^6.0.4 to ^7.0.0
    * @libp2p/plaintext bumped from ^3.0.7 to ^4.0.0
    * @libp2p/utils bumped from ^7.0.7 to ^8.0.0
    * libp2p bumped from ^3.1.0 to ^4.0.0
</details>

<details><summary>interface-internal: 4.0.0</summary>

## [4.0.0](https://github.com/libp2p/js-libp2p/compare/interface-internal-v3.0.7...interface-internal-v4.0.0) (2025-10-29)


###   BREAKING CHANGES

* All props and methods flagged as deprecated and for removal have been removed
* requires @mulitformats/multiaddr 13.x.x or later
* - Stream handlers accept `stream, connection`, not `{ stream, connection }`
* * The `notifyOnTransient` property of `libp2p.register` has been renamed `notifyOnLimitedConnection`

### Features

* add dns mappings to address manager ([#2818](https://github.com/libp2p/js-libp2p/issues/2818)) ([7dcabb8](https://github.com/libp2p/js-libp2p/commit/7dcabb884c37dfba69e3ce427544ab05209d137b))
* add getMaxConnections method to connection manager ([#2877](https://github.com/libp2p/js-libp2p/issues/2877)) ([1729fca](https://github.com/libp2p/js-libp2p/commit/1729fcaebc78307ff06783d5a2201ad83f92c109))
* allow adding external ip/port mapping ([#2836](https://github.com/libp2p/js-libp2p/issues/2836)) ([6ddc1b8](https://github.com/libp2p/js-libp2p/commit/6ddc1b80ebe396afee58082865ae6cae2bb39fb1))
* allow overriding stream handlers ([#2945](https://github.com/libp2p/js-libp2p/issues/2945)) ([21088c5](https://github.com/libp2p/js-libp2p/commit/21088c5195df2c3c371fc28bb824f5f84760bf12)), closes [#2928](https://github.com/libp2p/js-libp2p/issues/2928)
* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)


### Bug Fixes

* abort async operations ([#3152](https://github.com/libp2p/js-libp2p/issues/3152)) ([8efb065](https://github.com/libp2p/js-libp2p/commit/8efb065d216fc587605a01d0b2ff93259c7ff723))
* allow overriding mss mode ([#2924](https://github.com/libp2p/js-libp2p/issues/2924)) ([4bbcfa7](https://github.com/libp2p/js-libp2p/commit/4bbcfa707bba45a028429061ce44dec3dd7add34))
* auto-confirm relay addresses ([#2886](https://github.com/libp2p/js-libp2p/issues/2886)) ([5c4a79e](https://github.com/libp2p/js-libp2p/commit/5c4a79e5a6e8d0db1ef6464075841a0b9de507ef)), closes [#2883](https://github.com/libp2p/js-libp2p/issues/2883)
* export transiently referenced types ([#2717](https://github.com/libp2p/js-libp2p/issues/2717)) ([7f7ec82](https://github.com/libp2p/js-libp2p/commit/7f7ec82ae4ee7761360bdfdd294de271feaf1841))
* remove deprecated code ([#3271](https://github.com/libp2p/js-libp2p/issues/3271)) ([6332556](https://github.com/libp2p/js-libp2p/commit/633255644eefb6bf9f739123b9cbd002c3d5a351))
* rename "transient" connections to "limited" ([#2645](https://github.com/libp2p/js-libp2p/issues/2645)) ([2988602](https://github.com/libp2p/js-libp2p/commit/29886022eddc8a793217b2c888beac8aef63f1be)), closes [#2622](https://github.com/libp2p/js-libp2p/issues/2622)
* require confirmation of global unicast addresses ([#2876](https://github.com/libp2p/js-libp2p/issues/2876)) ([92cc740](https://github.com/libp2p/js-libp2p/commit/92cc740828963a4786ea83befe606dac4ba25e45))
* require external confirmation of public addresses ([#2867](https://github.com/libp2p/js-libp2p/issues/2867)) ([d19974d](https://github.com/libp2p/js-libp2p/commit/d19974d93a1015acfca95c2155dbcffc5fd6a6c0))
* simplify connection upgrade ([#2719](https://github.com/libp2p/js-libp2p/issues/2719)) ([c258b35](https://github.com/libp2p/js-libp2p/commit/c258b35af60eec906437129ab31201bfb9c80d16))
* update multiaddr ([#3184](https://github.com/libp2p/js-libp2p/issues/3184)) ([6c42ea6](https://github.com/libp2p/js-libp2p/commit/6c42ea64a6e22028a87ecb3422e418e99ff09279))
* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))


### Documentation

* add spellcheck to gh actions ([#2994](https://github.com/libp2p/js-libp2p/issues/2994)) ([5b084e9](https://github.com/libp2p/js-libp2p/commit/5b084e9682a572e82f7907714d7807b3b9856326))
* add TSDoc comments interface-internal module ([#2949](https://github.com/libp2p/js-libp2p/issues/2949)) ([d222968](https://github.com/libp2p/js-libp2p/commit/d2229682c16e07ce67276127da9ee96fe5197c59))
* update interface-internal readme ([#2972](https://github.com/libp2p/js-libp2p/issues/2972)) ([754fe84](https://github.com/libp2p/js-libp2p/commit/754fe84db8f5f075c4fb23f1c2b9539b71ab3b66))
* update spell check ([#2999](https://github.com/libp2p/js-libp2p/issues/2999)) ([6f8cfea](https://github.com/libp2p/js-libp2p/commit/6f8cfeafb2f6ddc231a85ca369fb33cf759940f7))
* update typedoc config ([#3146](https://github.com/libp2p/js-libp2p/issues/3146)) ([14dbebe](https://github.com/libp2p/js-libp2p/commit/14dbebea8bd17addadac730afec0fa3b1cc6334a))


### Dependencies

* bump aegir from 43.0.3 to 44.0.1 ([#2603](https://github.com/libp2p/js-libp2p/issues/2603)) ([944935f](https://github.com/libp2p/js-libp2p/commit/944935f8dbcc1083e4cb4a02b49a0aab3083d3d9))
* update @multiformats/multiaddr to 13.x.x ([#3268](https://github.com/libp2p/js-libp2p/issues/3268)) ([b8ecade](https://github.com/libp2p/js-libp2p/commit/b8ecade2a725d38d11dd8df888c5abb22e14f26b))
* update aegir, fix all linting issues ([#3110](https://github.com/libp2p/js-libp2p/issues/3110)) ([510b033](https://github.com/libp2p/js-libp2p/commit/510b033f6b15358c7fae21486c3b09e730aa26cd))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^3.1.0 to ^4.0.0
    * @libp2p/peer-collections bumped from ^7.0.7 to ^8.0.0
</details>

<details><summary>interop: 15.0.0</summary>

## [15.0.0](https://github.com/libp2p/js-libp2p/compare/interop-v14.0.9...interop-v15.0.0) (2025-10-29)


###   BREAKING CHANGES

* requires @mulitformats/multiaddr 13.x.x or later
* - Stream handlers accept `stream, connection`, not `{ stream, connection }`

### Features

* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)


### Bug Fixes

* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))


### Dependencies

* update @multiformats/multiaddr to 13.x.x ([#3268](https://github.com/libp2p/js-libp2p/issues/3268)) ([b8ecade](https://github.com/libp2p/js-libp2p/commit/b8ecade2a725d38d11dd8df888c5abb22e14f26b))
* update p-event, p-wait-for and noble deps ([#3302](https://github.com/libp2p/js-libp2p/issues/3302)) ([55bbd8c](https://github.com/libp2p/js-libp2p/commit/55bbd8cde12fe1c05e8d264e6e2406ca9fe2f044))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/daemon-client bumped from ^10.0.9 to ^11.0.0
    * @libp2p/interface bumped from ^3.1.0 to ^4.0.0
    * @libp2p/utils bumped from ^7.0.7 to ^8.0.0
</details>

<details><summary>kad-dht: 17.0.0</summary>

## [17.0.0](https://github.com/libp2p/js-libp2p/compare/kad-dht-v16.1.0...kad-dht-v17.0.0) (2025-10-29)


###   BREAKING CHANGES

* requires @mulitformats/multiaddr 13.x.x or later
* - Stream handlers accept `stream, connection`, not `{ stream, connection }`
* `@libp2p/kad-dht` now depends on `@libp2p/ping` - please configure this in your service map
* the routing ping options have been split into "old contact" and "new contact" and renamed according
* - `@libp2p/peer-id-factory` has been removed, use `generateKeyPair` and `peerIdFromPrivateKey` instead
* The `.code` property has been removed from most errors, use `.name` instead
* `@libp2p/interface` no longer exports a `CustomEvent` polyfill

### Features

* add inbound rpc request metrics ([#2721](https://github.com/libp2p/js-libp2p/issues/2721)) ([fa83ee1](https://github.com/libp2p/js-libp2p/commit/fa83ee1c7b246cd264730368b39b45fe63b9999e))
* add path index to events ([#3102](https://github.com/libp2p/js-libp2p/issues/3102)) ([185b23e](https://github.com/libp2p/js-libp2p/commit/185b23eac36303ff02ea475a0ec2c0be0774e6a0))
* add reprovide ([#2785](https://github.com/libp2p/js-libp2p/issues/2785)) ([52b3b1a](https://github.com/libp2p/js-libp2p/commit/52b3b1a16e56f73de9a75e7f62d5c3b367d757d9))
* add routing field to providers ([#3340](https://github.com/libp2p/js-libp2p/issues/3340)) ([0f3ab9e](https://github.com/libp2p/js-libp2p/commit/0f3ab9e617ab10fc09b108923c9d6e0fadd106a3))
* add traceFunction call to metrics ([#2898](https://github.com/libp2p/js-libp2p/issues/2898)) ([20d9ba7](https://github.com/libp2p/js-libp2p/commit/20d9ba73e2fc76e42327458b2a1e29d1ba162bba))
* ping peers before adding to routing table ([#2745](https://github.com/libp2p/js-libp2p/issues/2745)) ([661d658](https://github.com/libp2p/js-libp2p/commit/661d6586ace41973a61eb04a97692ef8cb74831a))
* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)
* use `.name` property instead of `.code` for errors ([#2655](https://github.com/libp2p/js-libp2p/issues/2655)) ([0d20426](https://github.com/libp2p/js-libp2p/commit/0d20426fd5ea19b03345c70289bbd692e4348e1f))


### Bug Fixes

* abort async operations ([#3152](https://github.com/libp2p/js-libp2p/issues/3152)) ([8efb065](https://github.com/libp2p/js-libp2p/commit/8efb065d216fc587605a01d0b2ff93259c7ff723))
* add kad-dht to capabilities ([#3156](https://github.com/libp2p/js-libp2p/issues/3156)) ([b32bc84](https://github.com/libp2p/js-libp2p/commit/b32bc8406e92de89fb4f6be12e32f32fa7f3e7c5))
* add time out to incoming KAD streams ([#3167](https://github.com/libp2p/js-libp2p/issues/3167)) ([6a3ae02](https://github.com/libp2p/js-libp2p/commit/6a3ae02f57079bc40181054447586a285c699c48))
* avoid wasteful reprovides outside threshold ([#3238](https://github.com/libp2p/js-libp2p/issues/3238)) ([aa770ab](https://github.com/libp2p/js-libp2p/commit/aa770ab81b6ca2a86cc2d6df12a3176a292455bf))
* decrease default routing table size ([#3023](https://github.com/libp2p/js-libp2p/issues/3023)) ([48cd9b6](https://github.com/libp2p/js-libp2p/commit/48cd9b6529d78a6a5797c40332015d15c242128a))
* deduplicate typed event target ([#3170](https://github.com/libp2p/js-libp2p/issues/3170)) ([cc7b34c](https://github.com/libp2p/js-libp2p/commit/cc7b34c0fe3ac5745fd082ae0198b8742371a412))
* do not add peers to routing table during RPC handling ([#2866](https://github.com/libp2p/js-libp2p/issues/2866)) ([99f5f27](https://github.com/libp2p/js-libp2p/commit/99f5f270b9e7b69e4ef543c1ff1c019815af58cb))
* empty routing table on stop ([#3166](https://github.com/libp2p/js-libp2p/issues/3166)) ([57dbdaa](https://github.com/libp2p/js-libp2p/commit/57dbdaa762f62d7bcf2e13f338519395fdf65fef))
* ensure greater spec compliance ([#3105](https://github.com/libp2p/js-libp2p/issues/3105)) ([3577af8](https://github.com/libp2p/js-libp2p/commit/3577af88ad169cfacfd3c94428fbe4cb828f21a2))
* export transiently referenced types ([#2717](https://github.com/libp2p/js-libp2p/issues/2717)) ([7f7ec82](https://github.com/libp2p/js-libp2p/commit/7f7ec82ae4ee7761360bdfdd294de271feaf1841))
* import types from interface module ([#2946](https://github.com/libp2p/js-libp2p/issues/2946)) ([d5b399e](https://github.com/libp2p/js-libp2p/commit/d5b399e3098e8dc20e33138d9b2cd5bcd844f700))
* improve kad distance list performance ([#3009](https://github.com/libp2p/js-libp2p/issues/3009)) ([4939ef7](https://github.com/libp2p/js-libp2p/commit/4939ef7aeda77ee506d38fef548344e5bdd73d52))
* include DHT client in FIND_NODE response if exact match ([#2835](https://github.com/libp2p/js-libp2p/issues/2835)) ([98f3c77](https://github.com/libp2p/js-libp2p/commit/98f3c773dce0deea7abf15c77fad5d2bb83b507e))
* increase providers validity to 48 hours ([#2801](https://github.com/libp2p/js-libp2p/issues/2801)) ([4329553](https://github.com/libp2p/js-libp2p/commit/43295539045639fe003e762dede1ec1a5aa60c77))
* make kad-dht init object optional ([#2618](https://github.com/libp2p/js-libp2p/issues/2618)) ([928801a](https://github.com/libp2p/js-libp2p/commit/928801a80232d437a058e79f5b21e12eac128f2c))
* pass abort signal to stream close ([32c176f](https://github.com/libp2p/js-libp2p/commit/32c176fd53e9aa953885398ddc67387e46875b85))
* record query metrics properly ([#2736](https://github.com/libp2p/js-libp2p/issues/2736)) ([58784ab](https://github.com/libp2p/js-libp2p/commit/58784abf7c311308eb33a50b1e652d996592394a))
* reduce dht logging and update metrics ([#2725](https://github.com/libp2p/js-libp2p/issues/2725)) ([80fb47f](https://github.com/libp2p/js-libp2p/commit/80fb47f2c860628a210ca8d34d65971d6778f4d3))
* remove CustomEvent export from `@libp2p/interface` ([#2656](https://github.com/libp2p/js-libp2p/issues/2656)) ([fab6fc9](https://github.com/libp2p/js-libp2p/commit/fab6fc960b6bc03a6bc00ae5a4b3551d7d080c73))
* remove private key field from peer id ([#2660](https://github.com/libp2p/js-libp2p/issues/2660)) ([3eeb0c7](https://github.com/libp2p/js-libp2p/commit/3eeb0c705bd58285a6e1ec9fcbb6987c5959d504)), closes [#2659](https://github.com/libp2p/js-libp2p/issues/2659)
* remove provider lock ([#3169](https://github.com/libp2p/js-libp2p/issues/3169)) ([8499ef4](https://github.com/libp2p/js-libp2p/commit/8499ef400755c6f3dc94f65e5a94d657628b1b1b))
* remove signal event listener used during query ([#3202](https://github.com/libp2p/js-libp2p/issues/3202)) ([2d6079b](https://github.com/libp2p/js-libp2p/commit/2d6079bc16d591806877fa6efbced0fecca352d2))
* return closest known peers, even if they are not closer ([#3182](https://github.com/libp2p/js-libp2p/issues/3182)) ([ae595d8](https://github.com/libp2p/js-libp2p/commit/ae595d8db4456e57064876f7646ad3d2610177c2))
* silence max listeners warning for dht routing table ([#3233](https://github.com/libp2p/js-libp2p/issues/3233)) ([cf9aab5](https://github.com/libp2p/js-libp2p/commit/cf9aab5c841ec08bc023b9f49083c95ad78a7a07))
* tag kad-close peers with keepalive ([#2740](https://github.com/libp2p/js-libp2p/issues/2740)) ([12bcd86](https://github.com/libp2p/js-libp2p/commit/12bcd86bfad3b89b3676f7a15bc3aa08dca79b07))
* track closest peers separately from main routing table ([#2748](https://github.com/libp2p/js-libp2p/issues/2748)) ([27b2fa6](https://github.com/libp2p/js-libp2p/commit/27b2fa6b61af646c9459120b3bf6f31c2bd89878))
* update error logs to use %e token ([#3261](https://github.com/libp2p/js-libp2p/issues/3261)) ([e10c5c0](https://github.com/libp2p/js-libp2p/commit/e10c5c0c51876ab83da51d558ee4789fc3c38a49))
* update multiaddr ([#3184](https://github.com/libp2p/js-libp2p/issues/3184)) ([6c42ea6](https://github.com/libp2p/js-libp2p/commit/6c42ea64a6e22028a87ecb3422e418e99ff09279))
* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))
* update race-signal ([#2986](https://github.com/libp2p/js-libp2p/issues/2986)) ([2a3cec9](https://github.com/libp2p/js-libp2p/commit/2a3cec9220f1250b7558635c4cb37d61f745645d)), closes [#2702](https://github.com/libp2p/js-libp2p/issues/2702)
* update stream deps ([#3055](https://github.com/libp2p/js-libp2p/issues/3055)) ([b2124c2](https://github.com/libp2p/js-libp2p/commit/b2124c2db02d7870b958f294da42ec79084818a3))
* use failure event instead of error ([#3219](https://github.com/libp2p/js-libp2p/issues/3219)) ([4420fad](https://github.com/libp2p/js-libp2p/commit/4420fad686921f887854e1b37ecd01f65b276e0d))
* use keep-alive as a tag prefix ([#2757](https://github.com/libp2p/js-libp2p/issues/2757)) ([29b47ad](https://github.com/libp2p/js-libp2p/commit/29b47adb47b48e9a2b01580bd0d50dc7c2be8fd6))
* use libp2p ping instad of kad ping ([#3074](https://github.com/libp2p/js-libp2p/issues/3074)) ([4f37aff](https://github.com/libp2p/js-libp2p/commit/4f37aff532282db1b9a544161e3becc4533ae402))
* write correct ping message ([35b4802](https://github.com/libp2p/js-libp2p/commit/35b48025cad5c96b4acba0bdbe1308f96a9d1f47))


### Documentation

* add spellcheck to gh actions ([#2994](https://github.com/libp2p/js-libp2p/issues/2994)) ([5b084e9](https://github.com/libp2p/js-libp2p/commit/5b084e9682a572e82f7907714d7807b3b9856326))
* update kad-dht api docs link ([#3195](https://github.com/libp2p/js-libp2p/issues/3195)) ([0f07e3d](https://github.com/libp2p/js-libp2p/commit/0f07e3df5fab90558c816ae2e0051fbfc3aa6cf6))
* update spell check ([#2999](https://github.com/libp2p/js-libp2p/issues/2999)) ([6f8cfea](https://github.com/libp2p/js-libp2p/commit/6f8cfeafb2f6ddc231a85ca369fb33cf759940f7))
* update typedoc config ([#3146](https://github.com/libp2p/js-libp2p/issues/3146)) ([14dbebe](https://github.com/libp2p/js-libp2p/commit/14dbebea8bd17addadac730afec0fa3b1cc6334a))


### Dependencies

* bump aegir from 43.0.3 to 44.0.1 ([#2603](https://github.com/libp2p/js-libp2p/issues/2603)) ([944935f](https://github.com/libp2p/js-libp2p/commit/944935f8dbcc1083e4cb4a02b49a0aab3083d3d9))
* bump it-length-prefixed from 9.1.1 to 10.0.1 ([#2962](https://github.com/libp2p/js-libp2p/issues/2962)) ([1fc0e26](https://github.com/libp2p/js-libp2p/commit/1fc0e26620d2fd9d752179ab4f6dcc7b6ed5ee5c))
* bump sinon from 19.0.5 to 20.0.0 ([#3112](https://github.com/libp2p/js-libp2p/issues/3112)) ([d1ce677](https://github.com/libp2p/js-libp2p/commit/d1ce6774d8f7c338f15a05f80d09e361d21e7586))
* update @multiformats/multiaddr to 13.x.x ([#3268](https://github.com/libp2p/js-libp2p/issues/3268)) ([b8ecade](https://github.com/libp2p/js-libp2p/commit/b8ecade2a725d38d11dd8df888c5abb22e14f26b))
* update aegir, fix all linting issues ([#3110](https://github.com/libp2p/js-libp2p/issues/3110)) ([510b033](https://github.com/libp2p/js-libp2p/commit/510b033f6b15358c7fae21486c3b09e730aa26cd))
* update datastore ([#3326](https://github.com/libp2p/js-libp2p/issues/3326)) ([a0f9da2](https://github.com/libp2p/js-libp2p/commit/a0f9da212fcc8ac8d21da835e87c9225ae138fdd))
* update p-event, p-wait-for and noble deps ([#3302](https://github.com/libp2p/js-libp2p/issues/3302)) ([55bbd8c](https://github.com/libp2p/js-libp2p/commit/55bbd8cde12fe1c05e8d264e6e2406ca9fe2f044))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^5.1.13 to ^6.0.0
    * @libp2p/interface bumped from ^3.1.0 to ^4.0.0
    * @libp2p/interface-internal bumped from ^3.0.7 to ^4.0.0
    * @libp2p/peer-collections bumped from ^7.0.7 to ^8.0.0
    * @libp2p/peer-id bumped from ^6.0.4 to ^7.0.0
    * @libp2p/ping bumped from ^3.0.7 to ^4.0.0
    * @libp2p/utils bumped from ^7.0.7 to ^8.0.0
  * devDependencies
    * @libp2p/logger bumped from ^6.2.0 to ^7.0.0
    * @libp2p/peer-store bumped from ^12.0.7 to ^13.0.0
</details>

<details><summary>keychain: 7.0.0</summary>

## [7.0.0](https://github.com/libp2p/js-libp2p/compare/keychain-v6.0.7...keychain-v7.0.0) (2025-10-29)


###   BREAKING CHANGES

* merge-options has been removed from `@libp2p/utils`
* - Stream handlers accept `stream, connection`, not `{ stream, connection }`
* - `@libp2p/peer-id-factory` has been removed, use `generateKeyPair` and `peerIdFromPrivateKey` instead
* The `.code` property has been removed from most errors, use `.name` instead

### Features

* allow configuring self key name ([#2974](https://github.com/libp2p/js-libp2p/issues/2974)) ([461092b](https://github.com/libp2p/js-libp2p/commit/461092b4478d6109251106c555a5885ecaf74fb3))
* store x509 certs in the keychain ([#3062](https://github.com/libp2p/js-libp2p/issues/3062)) ([d53ef17](https://github.com/libp2p/js-libp2p/commit/d53ef170cb171f5301758d5b2fc9e782950b4204))
* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)
* support ECDSA private keys ([#3059](https://github.com/libp2p/js-libp2p/issues/3059)) ([fc51221](https://github.com/libp2p/js-libp2p/commit/fc512211024778d4aefb04411e815d977e91e03a))
* use `.name` property instead of `.code` for errors ([#2655](https://github.com/libp2p/js-libp2p/issues/2655)) ([0d20426](https://github.com/libp2p/js-libp2p/commit/0d20426fd5ea19b03345c70289bbd692e4348e1f))


### Bug Fixes

* .d.ts is in ./dist folder ([#3018](https://github.com/libp2p/js-libp2p/issues/3018)) ([52a46ec](https://github.com/libp2p/js-libp2p/commit/52a46ecad0d2ccd88eaf6190a1d6d67d388fd11b))
* allow importing the self key ([#2700](https://github.com/libp2p/js-libp2p/issues/2700)) ([34455b5](https://github.com/libp2p/js-libp2p/commit/34455b5f2848b4a7656699751e3cbe372641c13a))
* do not store x509 certs in the keychain ([#3069](https://github.com/libp2p/js-libp2p/issues/3069)) ([da4e9da](https://github.com/libp2p/js-libp2p/commit/da4e9da825721edd94958426d4742b816aafb44d))
* remove merge-options ([#3294](https://github.com/libp2p/js-libp2p/issues/3294)) ([dc01b32](https://github.com/libp2p/js-libp2p/commit/dc01b3278f021c944594644629fbd449514aee35))
* remove private key field from peer id ([#2660](https://github.com/libp2p/js-libp2p/issues/2660)) ([3eeb0c7](https://github.com/libp2p/js-libp2p/commit/3eeb0c705bd58285a6e1ec9fcbb6987c5959d504)), closes [#2659](https://github.com/libp2p/js-libp2p/issues/2659)
* update error logs to use %e token ([#3261](https://github.com/libp2p/js-libp2p/issues/3261)) ([e10c5c0](https://github.com/libp2p/js-libp2p/commit/e10c5c0c51876ab83da51d558ee4789fc3c38a49))
* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))


### Documentation

* add spellcheck to gh actions ([#2994](https://github.com/libp2p/js-libp2p/issues/2994)) ([5b084e9](https://github.com/libp2p/js-libp2p/commit/5b084e9682a572e82f7907714d7807b3b9856326))
* fix broken links ([#3282](https://github.com/libp2p/js-libp2p/issues/3282)) ([71b4c41](https://github.com/libp2p/js-libp2p/commit/71b4c41e5990db2b65067663120b14de1ad72f9d))
* update keychain examples ([#2640](https://github.com/libp2p/js-libp2p/issues/2640)) ([e211b46](https://github.com/libp2p/js-libp2p/commit/e211b46cc9f3b83180f00c09d17fd32c7607d7d2))
* update spell check ([#2999](https://github.com/libp2p/js-libp2p/issues/2999)) ([6f8cfea](https://github.com/libp2p/js-libp2p/commit/6f8cfeafb2f6ddc231a85ca369fb33cf759940f7))
* update typedoc config ([#3146](https://github.com/libp2p/js-libp2p/issues/3146)) ([14dbebe](https://github.com/libp2p/js-libp2p/commit/14dbebea8bd17addadac730afec0fa3b1cc6334a))


### Dependencies

* bump aegir from 43.0.3 to 44.0.1 ([#2603](https://github.com/libp2p/js-libp2p/issues/2603)) ([944935f](https://github.com/libp2p/js-libp2p/commit/944935f8dbcc1083e4cb4a02b49a0aab3083d3d9))
* update aegir, fix all linting issues ([#3110](https://github.com/libp2p/js-libp2p/issues/3110)) ([510b033](https://github.com/libp2p/js-libp2p/commit/510b033f6b15358c7fae21486c3b09e730aa26cd))
* update datastore ([#3326](https://github.com/libp2p/js-libp2p/issues/3326)) ([a0f9da2](https://github.com/libp2p/js-libp2p/commit/a0f9da212fcc8ac8d21da835e87c9225ae138fdd))
* update p-event, p-wait-for and noble deps ([#3302](https://github.com/libp2p/js-libp2p/issues/3302)) ([55bbd8c](https://github.com/libp2p/js-libp2p/commit/55bbd8cde12fe1c05e8d264e6e2406ca9fe2f044))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^5.1.13 to ^6.0.0
    * @libp2p/interface bumped from ^3.1.0 to ^4.0.0
  * devDependencies
    * @libp2p/logger bumped from ^6.2.0 to ^7.0.0
</details>

<details><summary>logger: 7.0.0</summary>

## [7.0.0](https://github.com/libp2p/js-libp2p/compare/logger-v6.2.0...logger-v7.0.0) (2025-10-29)


###   BREAKING CHANGES

* requires @mulitformats/multiaddr 13.x.x or later
* - Stream handlers accept `stream, connection`, not `{ stream, connection }`
* - `@libp2p/peer-id-factory` has been removed, use `generateKeyPair` and `peerIdFromPrivateKey` instead
* The `.code` property has been removed from most errors, use `.name` instead

### Features

* add %e error formatter ([#2726](https://github.com/libp2p/js-libp2p/issues/2726)) ([c5988cc](https://github.com/libp2p/js-libp2p/commit/c5988cce8ca8c1435315639ef8113199ef470d5d))
* add routing field to providers ([#3340](https://github.com/libp2p/js-libp2p/issues/3340)) ([0f3ab9e](https://github.com/libp2p/js-libp2p/commit/0f3ab9e617ab10fc09b108923c9d6e0fadd106a3))
* allow creating scoped loggers ([#3214](https://github.com/libp2p/js-libp2p/issues/3214)) ([58abe87](https://github.com/libp2p/js-libp2p/commit/58abe8702f0c28d87b54f29e19155ea5c00c407d))
* expose logger options ([#3336](https://github.com/libp2p/js-libp2p/issues/3336)) ([4bab14e](https://github.com/libp2p/js-libp2p/commit/4bab14e83cb934c0b0c7417b872036ea4b050473))
* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)
* use `.name` property instead of `.code` for errors ([#2655](https://github.com/libp2p/js-libp2p/issues/2655)) ([0d20426](https://github.com/libp2p/js-libp2p/commit/0d20426fd5ea19b03345c70289bbd692e4348e1f))


### Bug Fixes

* .d.ts is in ./dist folder ([#3018](https://github.com/libp2p/js-libp2p/issues/3018)) ([52a46ec](https://github.com/libp2p/js-libp2p/commit/52a46ecad0d2ccd88eaf6190a1d6d67d388fd11b))
* error logging in firefox ([#2768](https://github.com/libp2p/js-libp2p/issues/2768)) ([e6b4158](https://github.com/libp2p/js-libp2p/commit/e6b4158c60d000fbb58aab5d93de1cbcc965ae79))
* format aggregate errors ([#3337](https://github.com/libp2p/js-libp2p/issues/3337)) ([dad3cca](https://github.com/libp2p/js-libp2p/commit/dad3cca5d71b1a4407ca76f110a84b10ba04f853))
* remove private key field from peer id ([#2660](https://github.com/libp2p/js-libp2p/issues/2660)) ([3eeb0c7](https://github.com/libp2p/js-libp2p/commit/3eeb0c705bd58285a6e1ec9fcbb6987c5959d504)), closes [#2659](https://github.com/libp2p/js-libp2p/issues/2659)
* replace debug with weald to remove CJS deps ([#2648](https://github.com/libp2p/js-libp2p/issues/2648)) ([f30e2ee](https://github.com/libp2p/js-libp2p/commit/f30e2ee8de0ce5c050598cfc6744b02cc329c2b9))
* update error logs to use %e token ([#3261](https://github.com/libp2p/js-libp2p/issues/3261)) ([e10c5c0](https://github.com/libp2p/js-libp2p/commit/e10c5c0c51876ab83da51d558ee4789fc3c38a49))
* update multiaddr ([#3184](https://github.com/libp2p/js-libp2p/issues/3184)) ([6c42ea6](https://github.com/libp2p/js-libp2p/commit/6c42ea64a6e22028a87ecb3422e418e99ff09279))
* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))


### Documentation

* add spellcheck to gh actions ([#2994](https://github.com/libp2p/js-libp2p/issues/2994)) ([5b084e9](https://github.com/libp2p/js-libp2p/commit/5b084e9682a572e82f7907714d7807b3b9856326))
* update readme with link to weald ([#2779](https://github.com/libp2p/js-libp2p/issues/2779)) ([5a25d83](https://github.com/libp2p/js-libp2p/commit/5a25d831467a13cbde5a65f01cfa591e32a80f5d))
* update spell check ([#2999](https://github.com/libp2p/js-libp2p/issues/2999)) ([6f8cfea](https://github.com/libp2p/js-libp2p/commit/6f8cfeafb2f6ddc231a85ca369fb33cf759940f7))
* update typedoc config ([#3146](https://github.com/libp2p/js-libp2p/issues/3146)) ([14dbebe](https://github.com/libp2p/js-libp2p/commit/14dbebea8bd17addadac730afec0fa3b1cc6334a))


### Dependencies

* bump aegir from 43.0.3 to 44.0.1 ([#2603](https://github.com/libp2p/js-libp2p/issues/2603)) ([944935f](https://github.com/libp2p/js-libp2p/commit/944935f8dbcc1083e4cb4a02b49a0aab3083d3d9))
* bump sinon from 19.0.5 to 20.0.0 ([#3112](https://github.com/libp2p/js-libp2p/issues/3112)) ([d1ce677](https://github.com/libp2p/js-libp2p/commit/d1ce6774d8f7c338f15a05f80d09e361d21e7586))
* update @multiformats/multiaddr to 13.x.x ([#3268](https://github.com/libp2p/js-libp2p/issues/3268)) ([b8ecade](https://github.com/libp2p/js-libp2p/commit/b8ecade2a725d38d11dd8df888c5abb22e14f26b))
* update aegir, fix all linting issues ([#3110](https://github.com/libp2p/js-libp2p/issues/3110)) ([510b033](https://github.com/libp2p/js-libp2p/commit/510b033f6b15358c7fae21486c3b09e730aa26cd))
* update datastore ([#3326](https://github.com/libp2p/js-libp2p/issues/3326)) ([a0f9da2](https://github.com/libp2p/js-libp2p/commit/a0f9da212fcc8ac8d21da835e87c9225ae138fdd))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^3.1.0 to ^4.0.0
  * devDependencies
    * @libp2p/peer-id bumped from ^6.0.4 to ^7.0.0
</details>

<details><summary>mdns: 13.0.0</summary>

## [13.0.0](https://github.com/libp2p/js-libp2p/compare/mdns-v12.0.8...mdns-v13.0.0) (2025-10-29)


###   BREAKING CHANGES

* requires @mulitformats/multiaddr 13.x.x or later
* - Stream handlers accept `stream, connection`, not `{ stream, connection }`
* - `@libp2p/peer-id-factory` has been removed, use `generateKeyPair` and `peerIdFromPrivateKey` instead
* `@libp2p/interface` no longer exports a `CustomEvent` polyfill

### Features

* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)


### Bug Fixes

* deduplicate typed event target ([#3170](https://github.com/libp2p/js-libp2p/issues/3170)) ([cc7b34c](https://github.com/libp2p/js-libp2p/commit/cc7b34c0fe3ac5745fd082ae0198b8742371a412))
* export transiently referenced types ([#2717](https://github.com/libp2p/js-libp2p/issues/2717)) ([7f7ec82](https://github.com/libp2p/js-libp2p/commit/7f7ec82ae4ee7761360bdfdd294de271feaf1841))
* remove CustomEvent export from `@libp2p/interface` ([#2656](https://github.com/libp2p/js-libp2p/issues/2656)) ([fab6fc9](https://github.com/libp2p/js-libp2p/commit/fab6fc960b6bc03a6bc00ae5a4b3551d7d080c73))
* remove private key field from peer id ([#2660](https://github.com/libp2p/js-libp2p/issues/2660)) ([3eeb0c7](https://github.com/libp2p/js-libp2p/commit/3eeb0c705bd58285a6e1ec9fcbb6987c5959d504)), closes [#2659](https://github.com/libp2p/js-libp2p/issues/2659)
* update error logs to use %e token ([#3261](https://github.com/libp2p/js-libp2p/issues/3261)) ([e10c5c0](https://github.com/libp2p/js-libp2p/commit/e10c5c0c51876ab83da51d558ee4789fc3c38a49))
* update multiaddr ([#3184](https://github.com/libp2p/js-libp2p/issues/3184)) ([6c42ea6](https://github.com/libp2p/js-libp2p/commit/6c42ea64a6e22028a87ecb3422e418e99ff09279))
* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))


### Documentation

* update mdns example and docs ([#3056](https://github.com/libp2p/js-libp2p/issues/3056)) ([f04e182](https://github.com/libp2p/js-libp2p/commit/f04e18253ad9fd6ddcfa5c5fb3afc924408459e4))
* update spell check ([#2999](https://github.com/libp2p/js-libp2p/issues/2999)) ([6f8cfea](https://github.com/libp2p/js-libp2p/commit/6f8cfeafb2f6ddc231a85ca369fb33cf759940f7))
* update typedoc config ([#3146](https://github.com/libp2p/js-libp2p/issues/3146)) ([14dbebe](https://github.com/libp2p/js-libp2p/commit/14dbebea8bd17addadac730afec0fa3b1cc6334a))


### Dependencies

* bump aegir from 43.0.3 to 44.0.1 ([#2603](https://github.com/libp2p/js-libp2p/issues/2603)) ([944935f](https://github.com/libp2p/js-libp2p/commit/944935f8dbcc1083e4cb4a02b49a0aab3083d3d9))
* update @multiformats/multiaddr to 13.x.x ([#3268](https://github.com/libp2p/js-libp2p/issues/3268)) ([b8ecade](https://github.com/libp2p/js-libp2p/commit/b8ecade2a725d38d11dd8df888c5abb22e14f26b))
* update aegir, fix all linting issues ([#3110](https://github.com/libp2p/js-libp2p/issues/3110)) ([510b033](https://github.com/libp2p/js-libp2p/commit/510b033f6b15358c7fae21486c3b09e730aa26cd))
* update p-event, p-wait-for and noble deps ([#3302](https://github.com/libp2p/js-libp2p/issues/3302)) ([55bbd8c](https://github.com/libp2p/js-libp2p/commit/55bbd8cde12fe1c05e8d264e6e2406ca9fe2f044))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^3.1.0 to ^4.0.0
    * @libp2p/interface-internal bumped from ^3.0.7 to ^4.0.0
    * @libp2p/peer-id bumped from ^6.0.4 to ^7.0.0
    * @libp2p/utils bumped from ^7.0.7 to ^8.0.0
  * devDependencies
    * @libp2p/crypto bumped from ^5.1.13 to ^6.0.0
    * @libp2p/interface-compliance-tests bumped from ^7.0.8 to ^8.0.0
    * @libp2p/logger bumped from ^6.2.0 to ^7.0.0
</details>

<details><summary>memory: 3.0.0</summary>

## [3.0.0](https://github.com/libp2p/js-libp2p/compare/memory-v2.0.7...memory-v3.0.0) (2025-10-29)


###   BREAKING CHANGES

* requires @mulitformats/multiaddr 13.x.x or later
* - Stream handlers accept `stream, connection`, not `{ stream, connection }`

### Features

* add latency option to memory transport ([#2810](https://github.com/libp2p/js-libp2p/issues/2810)) ([050b01f](https://github.com/libp2p/js-libp2p/commit/050b01f05265eccc0d4cd9e0bd5706852d8d142b))
* add memory transport ([#2802](https://github.com/libp2p/js-libp2p/issues/2802)) ([adc7678](https://github.com/libp2p/js-libp2p/commit/adc767899d3fcf186a2bfb37a4d53decadc3a93f))
* allow transports to modify announce addresses ([#2978](https://github.com/libp2p/js-libp2p/issues/2978)) ([8331c8e](https://github.com/libp2p/js-libp2p/commit/8331c8ea8feef1d642b6667213409dbe8293b606))
* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)


### Bug Fixes

* deduplicate typed event target ([#3170](https://github.com/libp2p/js-libp2p/issues/3170)) ([cc7b34c](https://github.com/libp2p/js-libp2p/commit/cc7b34c0fe3ac5745fd082ae0198b8742371a412))
* ensure that the upgrader applies timeouts to incoming dials ([#3000](https://github.com/libp2p/js-libp2p/issues/3000)) ([90cca82](https://github.com/libp2p/js-libp2p/commit/90cca822b4cb112fc71bf9ad954023de685a9040))
* increase signal listeners ([#3101](https://github.com/libp2p/js-libp2p/issues/3101)) ([4b8c0a6](https://github.com/libp2p/js-libp2p/commit/4b8c0a6bd289c0a0d5002ee34efc696feb349caf))
* scope logging to connection and stream ([#3215](https://github.com/libp2p/js-libp2p/issues/3215)) ([ce6b542](https://github.com/libp2p/js-libp2p/commit/ce6b542a8ea3d42e2238f910cf2a113370515058))
* update multiaddr ([#3184](https://github.com/libp2p/js-libp2p/issues/3184)) ([6c42ea6](https://github.com/libp2p/js-libp2p/commit/6c42ea64a6e22028a87ecb3422e418e99ff09279))
* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))


### Documentation

* remove tcp header from memory transport ([#3098](https://github.com/libp2p/js-libp2p/issues/3098)) ([9b33d20](https://github.com/libp2p/js-libp2p/commit/9b33d202e31920a22aaca74f0a8d81c47b980ef8))
* update spell check ([#2999](https://github.com/libp2p/js-libp2p/issues/2999)) ([6f8cfea](https://github.com/libp2p/js-libp2p/commit/6f8cfeafb2f6ddc231a85ca369fb33cf759940f7))
* update typedoc config ([#3146](https://github.com/libp2p/js-libp2p/issues/3146)) ([14dbebe](https://github.com/libp2p/js-libp2p/commit/14dbebea8bd17addadac730afec0fa3b1cc6334a))


### Dependencies

* bump sinon from 19.0.5 to 20.0.0 ([#3112](https://github.com/libp2p/js-libp2p/issues/3112)) ([d1ce677](https://github.com/libp2p/js-libp2p/commit/d1ce6774d8f7c338f15a05f80d09e361d21e7586))
* update @multiformats/multiaddr to 13.x.x ([#3268](https://github.com/libp2p/js-libp2p/issues/3268)) ([b8ecade](https://github.com/libp2p/js-libp2p/commit/b8ecade2a725d38d11dd8df888c5abb22e14f26b))
* update @multiformats/multiaddr-matcher dep to 2.x.x ([#3208](https://github.com/libp2p/js-libp2p/issues/3208)) ([57e7fa4](https://github.com/libp2p/js-libp2p/commit/57e7fa4413a0e19799b5917bad6743800c77e1f7))
* update aegir, fix all linting issues ([#3110](https://github.com/libp2p/js-libp2p/issues/3110)) ([510b033](https://github.com/libp2p/js-libp2p/commit/510b033f6b15358c7fae21486c3b09e730aa26cd))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^3.1.0 to ^4.0.0
    * @libp2p/utils bumped from ^7.0.7 to ^8.0.0
  * devDependencies
    * @libp2p/logger bumped from ^6.2.0 to ^7.0.0
    * @libp2p/peer-id bumped from ^6.0.4 to ^7.0.0
</details>

<details><summary>mplex: 13.0.0</summary>

## [13.0.0](https://github.com/libp2p/js-libp2p/compare/mplex-v12.0.8...mplex-v13.0.0) (2025-10-29)


###   BREAKING CHANGES

* - Stream handlers accept `stream, connection`, not `{ stream, connection }`
* instead of `CodeError`, use `TimeoutError`, `UnexpectedPeerError`, etc
* The `.code` property has been removed from most errors, use `.name` instead

### Features

* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)
* use `.name` property instead of `.code` for errors ([#2655](https://github.com/libp2p/js-libp2p/issues/2655)) ([0d20426](https://github.com/libp2p/js-libp2p/commit/0d20426fd5ea19b03345c70289bbd692e4348e1f))


### Bug Fixes

* add deprecation warning to mplex ([3b43a37](https://github.com/libp2p/js-libp2p/commit/3b43a373dc81f3d4f619e0ff7929161ec5370e97))
* export transiently referenced types ([#2717](https://github.com/libp2p/js-libp2p/issues/2717)) ([7f7ec82](https://github.com/libp2p/js-libp2p/commit/7f7ec82ae4ee7761360bdfdd294de271feaf1841))
* remove CodeError class ([#2688](https://github.com/libp2p/js-libp2p/issues/2688)) ([81ebe4e](https://github.com/libp2p/js-libp2p/commit/81ebe4e47e82508a847bb3af0af36cc249b78765))
* scope logging to connection and stream ([#3215](https://github.com/libp2p/js-libp2p/issues/3215)) ([ce6b542](https://github.com/libp2p/js-libp2p/commit/ce6b542a8ea3d42e2238f910cf2a113370515058))
* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))
* use @chainsafe/libp2p-noise and @chainsafe/libp2p-yamux ([#3308](https://github.com/libp2p/js-libp2p/issues/3308)) ([425a42c](https://github.com/libp2p/js-libp2p/commit/425a42cddac5aac4d0ac822295cc4c4817dcdc95))


### Documentation

* add spellcheck to gh actions ([#2994](https://github.com/libp2p/js-libp2p/issues/2994)) ([5b084e9](https://github.com/libp2p/js-libp2p/commit/5b084e9682a572e82f7907714d7807b3b9856326))
* update spell check ([#2999](https://github.com/libp2p/js-libp2p/issues/2999)) ([6f8cfea](https://github.com/libp2p/js-libp2p/commit/6f8cfeafb2f6ddc231a85ca369fb33cf759940f7))
* update typedoc config ([#3146](https://github.com/libp2p/js-libp2p/issues/3146)) ([14dbebe](https://github.com/libp2p/js-libp2p/commit/14dbebea8bd17addadac730afec0fa3b1cc6334a))


### Dependencies

* bump aegir from 43.0.3 to 44.0.1 ([#2603](https://github.com/libp2p/js-libp2p/issues/2603)) ([944935f](https://github.com/libp2p/js-libp2p/commit/944935f8dbcc1083e4cb4a02b49a0aab3083d3d9))
* update aegir, fix all linting issues ([#3110](https://github.com/libp2p/js-libp2p/issues/3110)) ([510b033](https://github.com/libp2p/js-libp2p/commit/510b033f6b15358c7fae21486c3b09e730aa26cd))
* update p-event, p-wait-for and noble deps ([#3302](https://github.com/libp2p/js-libp2p/issues/3302)) ([55bbd8c](https://github.com/libp2p/js-libp2p/commit/55bbd8cde12fe1c05e8d264e6e2406ca9fe2f044))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^3.1.0 to ^4.0.0
    * @libp2p/utils bumped from ^7.0.7 to ^8.0.0
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^7.0.8 to ^8.0.0
    * @libp2p/logger bumped from ^6.2.0 to ^7.0.0
</details>

<details><summary>multistream-select: 8.0.0</summary>

## [8.0.0](https://github.com/libp2p/js-libp2p/compare/multistream-select-v7.0.7...multistream-select-v8.0.0) (2025-10-29)


###   BREAKING CHANGES

* - Stream handlers accept `stream, connection`, not `{ stream, connection }`
* The `.code` property has been removed from most errors, use `.name` instead

### Features

* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)
* use `.name` property instead of `.code` for errors ([#2655](https://github.com/libp2p/js-libp2p/issues/2655)) ([0d20426](https://github.com/libp2p/js-libp2p/commit/0d20426fd5ea19b03345c70289bbd692e4348e1f))


### Bug Fixes

* export transiently referenced types ([#2717](https://github.com/libp2p/js-libp2p/issues/2717)) ([7f7ec82](https://github.com/libp2p/js-libp2p/commit/7f7ec82ae4ee7761360bdfdd294de271feaf1841))
* switch informational logging to trace logging ([#2727](https://github.com/libp2p/js-libp2p/issues/2727)) ([442a835](https://github.com/libp2p/js-libp2p/commit/442a835556116a440365da225ef4f1195f3a5b4d))
* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))
* update race-signal ([#2986](https://github.com/libp2p/js-libp2p/issues/2986)) ([2a3cec9](https://github.com/libp2p/js-libp2p/commit/2a3cec9220f1250b7558635c4cb37d61f745645d)), closes [#2702](https://github.com/libp2p/js-libp2p/issues/2702)
* update stream deps ([#3055](https://github.com/libp2p/js-libp2p/issues/3055)) ([b2124c2](https://github.com/libp2p/js-libp2p/commit/b2124c2db02d7870b958f294da42ec79084818a3))


### Documentation

* add spellcheck to gh actions ([#2994](https://github.com/libp2p/js-libp2p/issues/2994)) ([5b084e9](https://github.com/libp2p/js-libp2p/commit/5b084e9682a572e82f7907714d7807b3b9856326))
* update spell check ([#2999](https://github.com/libp2p/js-libp2p/issues/2999)) ([6f8cfea](https://github.com/libp2p/js-libp2p/commit/6f8cfeafb2f6ddc231a85ca369fb33cf759940f7))
* update typedoc config ([#3146](https://github.com/libp2p/js-libp2p/issues/3146)) ([14dbebe](https://github.com/libp2p/js-libp2p/commit/14dbebea8bd17addadac730afec0fa3b1cc6334a))


### Dependencies

* bump aegir from 43.0.3 to 44.0.1 ([#2603](https://github.com/libp2p/js-libp2p/issues/2603)) ([944935f](https://github.com/libp2p/js-libp2p/commit/944935f8dbcc1083e4cb4a02b49a0aab3083d3d9))
* bump it-length-prefixed from 9.1.1 to 10.0.1 ([#2962](https://github.com/libp2p/js-libp2p/issues/2962)) ([1fc0e26](https://github.com/libp2p/js-libp2p/commit/1fc0e26620d2fd9d752179ab4f6dcc7b6ed5ee5c))
* update aegir, fix all linting issues ([#3110](https://github.com/libp2p/js-libp2p/issues/3110)) ([510b033](https://github.com/libp2p/js-libp2p/commit/510b033f6b15358c7fae21486c3b09e730aa26cd))
* update p-event, p-wait-for and noble deps ([#3302](https://github.com/libp2p/js-libp2p/issues/3302)) ([55bbd8c](https://github.com/libp2p/js-libp2p/commit/55bbd8cde12fe1c05e8d264e6e2406ca9fe2f044))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^3.1.0 to ^4.0.0
    * @libp2p/utils bumped from ^7.0.7 to ^8.0.0
</details>

<details><summary>opentelemetry-metrics: 3.0.0</summary>

## [3.0.0](https://github.com/libp2p/js-libp2p/compare/opentelemetry-metrics-v2.0.7...opentelemetry-metrics-v3.0.0) (2025-10-29)


###   BREAKING CHANGES

* - Stream handlers accept `stream, connection`, not `{ stream, connection }`

### Features

* add OpenTelemetry metrics implementation ([#2899](https://github.com/libp2p/js-libp2p/issues/2899)) ([abe9bd1](https://github.com/libp2p/js-libp2p/commit/abe9bd154e4f1213c96efdb41764389fac823f02))
* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)


### Bug Fixes

* clear references to metrics on stop ([#3154](https://github.com/libp2p/js-libp2p/issues/3154)) ([01328a0](https://github.com/libp2p/js-libp2p/commit/01328a0b4eab0a66d5805d9ad4b6f25dbbdb4b03))
* include platform in user agent ([#2942](https://github.com/libp2p/js-libp2p/issues/2942)) ([96f14e4](https://github.com/libp2p/js-libp2p/commit/96f14e429eac84d02504c4b97f183511c8af2add))
* metrics should persist beyond node restarts ([#3159](https://github.com/libp2p/js-libp2p/issues/3159)) ([d91ae66](https://github.com/libp2p/js-libp2p/commit/d91ae66c6c8db5ae0a9cb9d388d67418fe318736))
* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))
* use isPromise/etc function from utils ([#2925](https://github.com/libp2p/js-libp2p/issues/2925)) ([a32fbeb](https://github.com/libp2p/js-libp2p/commit/a32fbeb1dbf1ffbb59445f56ba011af4123ab085))


### Documentation

* add spellcheck to gh actions ([#2994](https://github.com/libp2p/js-libp2p/issues/2994)) ([5b084e9](https://github.com/libp2p/js-libp2p/commit/5b084e9682a572e82f7907714d7807b3b9856326))
* update spell check ([#2999](https://github.com/libp2p/js-libp2p/issues/2999)) ([6f8cfea](https://github.com/libp2p/js-libp2p/commit/6f8cfeafb2f6ddc231a85ca369fb33cf759940f7))
* update typedoc config ([#3146](https://github.com/libp2p/js-libp2p/issues/3146)) ([14dbebe](https://github.com/libp2p/js-libp2p/commit/14dbebea8bd17addadac730afec0fa3b1cc6334a))


### Dependencies

* update aegir, fix all linting issues ([#3110](https://github.com/libp2p/js-libp2p/issues/3110)) ([510b033](https://github.com/libp2p/js-libp2p/commit/510b033f6b15358c7fae21486c3b09e730aa26cd))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^3.1.0 to ^4.0.0
    * @libp2p/utils bumped from ^7.0.7 to ^8.0.0
  * devDependencies
    * @libp2p/logger bumped from ^6.2.0 to ^7.0.0
</details>

<details><summary>peer-collections: 8.0.0</summary>

## [8.0.0](https://github.com/libp2p/js-libp2p/compare/peer-collections-v7.0.7...peer-collections-v8.0.0) (2025-10-29)


###   BREAKING CHANGES

* - Stream handlers accept `stream, connection`, not `{ stream, connection }`
* - `@libp2p/peer-id-factory` has been removed, use `generateKeyPair` and `peerIdFromPrivateKey` instead

### Features

* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)


### Bug Fixes

* export transiently referenced types ([#2717](https://github.com/libp2p/js-libp2p/issues/2717)) ([7f7ec82](https://github.com/libp2p/js-libp2p/commit/7f7ec82ae4ee7761360bdfdd294de271feaf1841))
* remove private key field from peer id ([#2660](https://github.com/libp2p/js-libp2p/issues/2660)) ([3eeb0c7](https://github.com/libp2p/js-libp2p/commit/3eeb0c705bd58285a6e1ec9fcbb6987c5959d504)), closes [#2659](https://github.com/libp2p/js-libp2p/issues/2659)
* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))


### Documentation

* update comments in interface module and elsewhere ([#3107](https://github.com/libp2p/js-libp2p/issues/3107)) ([32627c8](https://github.com/libp2p/js-libp2p/commit/32627c8767587f7e8df88a700933ece6d5f5c3c4)), closes [#2112](https://github.com/libp2p/js-libp2p/issues/2112)
* update spell check ([#2999](https://github.com/libp2p/js-libp2p/issues/2999)) ([6f8cfea](https://github.com/libp2p/js-libp2p/commit/6f8cfeafb2f6ddc231a85ca369fb33cf759940f7))
* update typedoc config ([#3146](https://github.com/libp2p/js-libp2p/issues/3146)) ([14dbebe](https://github.com/libp2p/js-libp2p/commit/14dbebea8bd17addadac730afec0fa3b1cc6334a))


### Dependencies

* bump aegir from 43.0.3 to 44.0.1 ([#2603](https://github.com/libp2p/js-libp2p/issues/2603)) ([944935f](https://github.com/libp2p/js-libp2p/commit/944935f8dbcc1083e4cb4a02b49a0aab3083d3d9))
* bump sinon from 19.0.5 to 20.0.0 ([#3112](https://github.com/libp2p/js-libp2p/issues/3112)) ([d1ce677](https://github.com/libp2p/js-libp2p/commit/d1ce6774d8f7c338f15a05f80d09e361d21e7586))
* update aegir, fix all linting issues ([#3110](https://github.com/libp2p/js-libp2p/issues/3110)) ([510b033](https://github.com/libp2p/js-libp2p/commit/510b033f6b15358c7fae21486c3b09e730aa26cd))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^3.1.0 to ^4.0.0
    * @libp2p/peer-id bumped from ^6.0.4 to ^7.0.0
    * @libp2p/utils bumped from ^7.0.7 to ^8.0.0
  * devDependencies
    * @libp2p/crypto bumped from ^5.1.13 to ^6.0.0
</details>

<details><summary>peer-id: 7.0.0</summary>

## [7.0.0](https://github.com/libp2p/js-libp2p/compare/peer-id-v6.0.4...peer-id-v7.0.0) (2025-10-29)


###   BREAKING CHANGES

* - Stream handlers accept `stream, connection`, not `{ stream, connection }`
* - `@libp2p/peer-id-factory` has been removed, use `generateKeyPair` and `peerIdFromPrivateKey` instead
* The `.code` property has been removed from most errors, use `.name` instead

### Features

* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)
* support parsing base32 and base36 libp2p-key CIDs in peerIdFromString ([#3042](https://github.com/libp2p/js-libp2p/issues/3042)) ([0699fb7](https://github.com/libp2p/js-libp2p/commit/0699fb7470b1173a6a3cdb33fe8deee627b1e651))
* use `.name` property instead of `.code` for errors ([#2655](https://github.com/libp2p/js-libp2p/issues/2655)) ([0d20426](https://github.com/libp2p/js-libp2p/commit/0d20426fd5ea19b03345c70289bbd692e4348e1f))


### Bug Fixes

* remove private key field from peer id ([#2660](https://github.com/libp2p/js-libp2p/issues/2660)) ([3eeb0c7](https://github.com/libp2p/js-libp2p/commit/3eeb0c705bd58285a6e1ec9fcbb6987c5959d504)), closes [#2659](https://github.com/libp2p/js-libp2p/issues/2659)
* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))


### Documentation

* add spellcheck to gh actions ([#2994](https://github.com/libp2p/js-libp2p/issues/2994)) ([5b084e9](https://github.com/libp2p/js-libp2p/commit/5b084e9682a572e82f7907714d7807b3b9856326))
* update peer id string ([#2780](https://github.com/libp2p/js-libp2p/issues/2780)) ([dc3bdb9](https://github.com/libp2p/js-libp2p/commit/dc3bdb9f67a708dc5b7d72654a2cab5ade2c0d9c))
* update spell check ([#2999](https://github.com/libp2p/js-libp2p/issues/2999)) ([6f8cfea](https://github.com/libp2p/js-libp2p/commit/6f8cfeafb2f6ddc231a85ca369fb33cf759940f7))
* update typedoc config ([#3146](https://github.com/libp2p/js-libp2p/issues/3146)) ([14dbebe](https://github.com/libp2p/js-libp2p/commit/14dbebea8bd17addadac730afec0fa3b1cc6334a))


### Dependencies

* bump aegir from 43.0.3 to 44.0.1 ([#2603](https://github.com/libp2p/js-libp2p/issues/2603)) ([944935f](https://github.com/libp2p/js-libp2p/commit/944935f8dbcc1083e4cb4a02b49a0aab3083d3d9))
* bump sinon from 19.0.5 to 20.0.0 ([#3112](https://github.com/libp2p/js-libp2p/issues/3112)) ([d1ce677](https://github.com/libp2p/js-libp2p/commit/d1ce6774d8f7c338f15a05f80d09e361d21e7586))
* update aegir, fix all linting issues ([#3110](https://github.com/libp2p/js-libp2p/issues/3110)) ([510b033](https://github.com/libp2p/js-libp2p/commit/510b033f6b15358c7fae21486c3b09e730aa26cd))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^5.1.13 to ^6.0.0
    * @libp2p/interface bumped from ^3.1.0 to ^4.0.0
</details>

<details><summary>peer-record: 10.0.0</summary>

## [10.0.0](https://github.com/libp2p/js-libp2p/compare/peer-record-v9.0.4...peer-record-v10.0.0) (2025-10-29)


###   BREAKING CHANGES

* requires @mulitformats/multiaddr 13.x.x or later
* - Stream handlers accept `stream, connection`, not `{ stream, connection }`
* - `@libp2p/peer-id-factory` has been removed, use `generateKeyPair` and `peerIdFromPrivateKey` instead
* The `.code` property has been removed from most errors, use `.name` instead

### Features

* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)
* use `.name` property instead of `.code` for errors ([#2655](https://github.com/libp2p/js-libp2p/issues/2655)) ([0d20426](https://github.com/libp2p/js-libp2p/commit/0d20426fd5ea19b03345c70289bbd692e4348e1f))


### Bug Fixes

* .d.ts is in ./dist folder ([#3018](https://github.com/libp2p/js-libp2p/issues/3018)) ([52a46ec](https://github.com/libp2p/js-libp2p/commit/52a46ecad0d2ccd88eaf6190a1d6d67d388fd11b))
* abort async operations ([#3152](https://github.com/libp2p/js-libp2p/issues/3152)) ([8efb065](https://github.com/libp2p/js-libp2p/commit/8efb065d216fc587605a01d0b2ff93259c7ff723))
* remove private key field from peer id ([#2660](https://github.com/libp2p/js-libp2p/issues/2660)) ([3eeb0c7](https://github.com/libp2p/js-libp2p/commit/3eeb0c705bd58285a6e1ec9fcbb6987c5959d504)), closes [#2659](https://github.com/libp2p/js-libp2p/issues/2659)
* update multiaddr ([#3184](https://github.com/libp2p/js-libp2p/issues/3184)) ([6c42ea6](https://github.com/libp2p/js-libp2p/commit/6c42ea64a6e22028a87ecb3422e418e99ff09279))
* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))


### Documentation

* add spellcheck to gh actions ([#2994](https://github.com/libp2p/js-libp2p/issues/2994)) ([5b084e9](https://github.com/libp2p/js-libp2p/commit/5b084e9682a572e82f7907714d7807b3b9856326))
* update comments in interface module and elsewhere ([#3107](https://github.com/libp2p/js-libp2p/issues/3107)) ([32627c8](https://github.com/libp2p/js-libp2p/commit/32627c8767587f7e8df88a700933ece6d5f5c3c4)), closes [#2112](https://github.com/libp2p/js-libp2p/issues/2112)
* update dead link to record interface source ([#3066](https://github.com/libp2p/js-libp2p/issues/3066)) ([298d3e9](https://github.com/libp2p/js-libp2p/commit/298d3e9fa74fa05da478cf9c6a9202311afc80b8))
* update spell check ([#2999](https://github.com/libp2p/js-libp2p/issues/2999)) ([6f8cfea](https://github.com/libp2p/js-libp2p/commit/6f8cfeafb2f6ddc231a85ca369fb33cf759940f7))
* update typedoc config ([#3146](https://github.com/libp2p/js-libp2p/issues/3146)) ([14dbebe](https://github.com/libp2p/js-libp2p/commit/14dbebea8bd17addadac730afec0fa3b1cc6334a))


### Dependencies

* bump aegir from 43.0.3 to 44.0.1 ([#2603](https://github.com/libp2p/js-libp2p/issues/2603)) ([944935f](https://github.com/libp2p/js-libp2p/commit/944935f8dbcc1083e4cb4a02b49a0aab3083d3d9))
* update @multiformats/multiaddr to 13.x.x ([#3268](https://github.com/libp2p/js-libp2p/issues/3268)) ([b8ecade](https://github.com/libp2p/js-libp2p/commit/b8ecade2a725d38d11dd8df888c5abb22e14f26b))
* update aegir, fix all linting issues ([#3110](https://github.com/libp2p/js-libp2p/issues/3110)) ([510b033](https://github.com/libp2p/js-libp2p/commit/510b033f6b15358c7fae21486c3b09e730aa26cd))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^5.1.13 to ^6.0.0
    * @libp2p/interface bumped from ^3.1.0 to ^4.0.0
    * @libp2p/peer-id bumped from ^6.0.4 to ^7.0.0
</details>

<details><summary>peer-store: 13.0.0</summary>

## [13.0.0](https://github.com/libp2p/js-libp2p/compare/peer-store-v12.0.7...peer-store-v13.0.0) (2025-10-29)


###   BREAKING CHANGES

* requires @mulitformats/multiaddr 13.x.x or later
* - Stream handlers accept `stream, connection`, not `{ stream, connection }`
* - `@libp2p/peer-id-factory` has been removed, use `generateKeyPair` and `peerIdFromPrivateKey` instead
* The `.code` property has been removed from most errors, use `.name` instead

### Features

* add getInfo function to peerstore ([#3099](https://github.com/libp2p/js-libp2p/issues/3099)) ([a5a33af](https://github.com/libp2p/js-libp2p/commit/a5a33afd9fc7e5cc9060e0ac8d6daa8edb566ea8))
* expire peerstore data ([#3019](https://github.com/libp2p/js-libp2p/issues/3019)) ([80fe31a](https://github.com/libp2p/js-libp2p/commit/80fe31aa1c5c7938644a7e45b53740579297f804)), closes [#3017](https://github.com/libp2p/js-libp2p/issues/3017)
* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)
* use `.name` property instead of `.code` for errors ([#2655](https://github.com/libp2p/js-libp2p/issues/2655)) ([0d20426](https://github.com/libp2p/js-libp2p/commit/0d20426fd5ea19b03345c70289bbd692e4348e1f))


### Bug Fixes

* .d.ts is in ./dist folder ([#3018](https://github.com/libp2p/js-libp2p/issues/3018)) ([52a46ec](https://github.com/libp2p/js-libp2p/commit/52a46ecad0d2ccd88eaf6190a1d6d67d388fd11b))
* abort async operations ([#3152](https://github.com/libp2p/js-libp2p/issues/3152)) ([8efb065](https://github.com/libp2p/js-libp2p/commit/8efb065d216fc587605a01d0b2ff93259c7ff723))
* deduplicate typed event target ([#3170](https://github.com/libp2p/js-libp2p/issues/3170)) ([cc7b34c](https://github.com/libp2p/js-libp2p/commit/cc7b34c0fe3ac5745fd082ae0198b8742371a412))
* do not expire self multiaddrs ([#3053](https://github.com/libp2p/js-libp2p/issues/3053)) ([2f2322a](https://github.com/libp2p/js-libp2p/commit/2f2322a250414175b78a8fdcd2c416fcf10d2574)), closes [#3051](https://github.com/libp2p/js-libp2p/issues/3051)
* export transiently referenced types ([#2717](https://github.com/libp2p/js-libp2p/issues/2717)) ([7f7ec82](https://github.com/libp2p/js-libp2p/commit/7f7ec82ae4ee7761360bdfdd294de271feaf1841))
* finalize peerstore lock after use ([#3168](https://github.com/libp2p/js-libp2p/issues/3168)) ([b8600fc](https://github.com/libp2p/js-libp2p/commit/b8600fce83ec3ee97ac47e9f1d8032bb545a67d2))
* ignore corrupt peerstore data ([#2859](https://github.com/libp2p/js-libp2p/issues/2859)) ([f2f9008](https://github.com/libp2p/js-libp2p/commit/f2f9008b8e7c634a3855fea746af0762af920beb))
* only log when data is invalid ([#2862](https://github.com/libp2p/js-libp2p/issues/2862)) ([a0c8ceb](https://github.com/libp2p/js-libp2p/commit/a0c8ceb9917518e82587dab1be71f02aa7a6a52c))
* pass digest to publicKeyFromProtobuf ([#3014](https://github.com/libp2p/js-libp2p/issues/3014)) ([3d9b07c](https://github.com/libp2p/js-libp2p/commit/3d9b07c34857376adc6942aaba19bc8a208f58df))
* remove peer cache ([#2786](https://github.com/libp2p/js-libp2p/issues/2786)) ([7383821](https://github.com/libp2p/js-libp2p/commit/7383821e1a4bab17ee56a55c78d523e918db0bcc))
* remove private key field from peer id ([#2660](https://github.com/libp2p/js-libp2p/issues/2660)) ([3eeb0c7](https://github.com/libp2p/js-libp2p/commit/3eeb0c705bd58285a6e1ec9fcbb6987c5959d504)), closes [#2659](https://github.com/libp2p/js-libp2p/issues/2659)
* update multiaddr ([#3184](https://github.com/libp2p/js-libp2p/issues/3184)) ([6c42ea6](https://github.com/libp2p/js-libp2p/commit/6c42ea64a6e22028a87ecb3422e418e99ff09279))
* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))
* use a per-peer lock ([#3162](https://github.com/libp2p/js-libp2p/issues/3162)) ([2a7425c](https://github.com/libp2p/js-libp2p/commit/2a7425cdbcbbc18364c8385256ed457a46dafa4a))


### Documentation

* add spellcheck to gh actions ([#2994](https://github.com/libp2p/js-libp2p/issues/2994)) ([5b084e9](https://github.com/libp2p/js-libp2p/commit/5b084e9682a572e82f7907714d7807b3b9856326))
* update spell check ([#2999](https://github.com/libp2p/js-libp2p/issues/2999)) ([6f8cfea](https://github.com/libp2p/js-libp2p/commit/6f8cfeafb2f6ddc231a85ca369fb33cf759940f7))
* update typedoc config ([#3146](https://github.com/libp2p/js-libp2p/issues/3146)) ([14dbebe](https://github.com/libp2p/js-libp2p/commit/14dbebea8bd17addadac730afec0fa3b1cc6334a))


### Dependencies

* bump aegir from 43.0.3 to 44.0.1 ([#2603](https://github.com/libp2p/js-libp2p/issues/2603)) ([944935f](https://github.com/libp2p/js-libp2p/commit/944935f8dbcc1083e4cb4a02b49a0aab3083d3d9))
* bump sinon from 19.0.5 to 20.0.0 ([#3112](https://github.com/libp2p/js-libp2p/issues/3112)) ([d1ce677](https://github.com/libp2p/js-libp2p/commit/d1ce6774d8f7c338f15a05f80d09e361d21e7586))
* update @multiformats/multiaddr to 13.x.x ([#3268](https://github.com/libp2p/js-libp2p/issues/3268)) ([b8ecade](https://github.com/libp2p/js-libp2p/commit/b8ecade2a725d38d11dd8df888c5abb22e14f26b))
* update aegir, fix all linting issues ([#3110](https://github.com/libp2p/js-libp2p/issues/3110)) ([510b033](https://github.com/libp2p/js-libp2p/commit/510b033f6b15358c7fae21486c3b09e730aa26cd))
* update datastore ([#3326](https://github.com/libp2p/js-libp2p/issues/3326)) ([a0f9da2](https://github.com/libp2p/js-libp2p/commit/a0f9da212fcc8ac8d21da835e87c9225ae138fdd))
* update p-event, p-wait-for and noble deps ([#3302](https://github.com/libp2p/js-libp2p/issues/3302)) ([55bbd8c](https://github.com/libp2p/js-libp2p/commit/55bbd8cde12fe1c05e8d264e6e2406ca9fe2f044))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^5.1.13 to ^6.0.0
    * @libp2p/interface bumped from ^3.1.0 to ^4.0.0
    * @libp2p/peer-collections bumped from ^7.0.7 to ^8.0.0
    * @libp2p/peer-id bumped from ^6.0.4 to ^7.0.0
    * @libp2p/peer-record bumped from ^9.0.4 to ^10.0.0
  * devDependencies
    * @libp2p/logger bumped from ^6.2.0 to ^7.0.0
</details>

<details><summary>perf: 6.0.0</summary>

## [6.0.0](https://github.com/libp2p/js-libp2p/compare/perf-v5.0.8...perf-v6.0.0) (2025-10-29)


###   BREAKING CHANGES

* requires @mulitformats/multiaddr 13.x.x or later
* - Stream handlers accept `stream, connection`, not `{ stream, connection }`
* the `connectionEncryption` option has been renamed `connectionEncrypters`
* * The `notifyOnTransient` property of `libp2p.register` has been renamed `notifyOnLimitedConnection`

### Features

* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)


### Bug Fixes

* export transiently referenced types ([#2717](https://github.com/libp2p/js-libp2p/issues/2717)) ([7f7ec82](https://github.com/libp2p/js-libp2p/commit/7f7ec82ae4ee7761360bdfdd294de271feaf1841))
* import types from interface module ([#2946](https://github.com/libp2p/js-libp2p/issues/2946)) ([d5b399e](https://github.com/libp2p/js-libp2p/commit/d5b399e3098e8dc20e33138d9b2cd5bcd844f700))
* rename "transient" connections to "limited" ([#2645](https://github.com/libp2p/js-libp2p/issues/2645)) ([2988602](https://github.com/libp2p/js-libp2p/commit/29886022eddc8a793217b2c888beac8aef63f1be)), closes [#2622](https://github.com/libp2p/js-libp2p/issues/2622)
* rename connectionEncryption option to connectionEncrypters ([#2691](https://github.com/libp2p/js-libp2p/issues/2691)) ([6d72709](https://github.com/libp2p/js-libp2p/commit/6d72709ba5959388777610e2f71b8ba9522139b6))
* scope logging to connection and stream ([#3215](https://github.com/libp2p/js-libp2p/issues/3215)) ([ce6b542](https://github.com/libp2p/js-libp2p/commit/ce6b542a8ea3d42e2238f910cf2a113370515058))
* update multiaddr ([#3184](https://github.com/libp2p/js-libp2p/issues/3184)) ([6c42ea6](https://github.com/libp2p/js-libp2p/commit/6c42ea64a6e22028a87ecb3422e418e99ff09279))
* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))
* use @chainsafe/libp2p-noise and @chainsafe/libp2p-yamux ([#3308](https://github.com/libp2p/js-libp2p/issues/3308)) ([425a42c](https://github.com/libp2p/js-libp2p/commit/425a42cddac5aac4d0ac822295cc4c4817dcdc95))


### Documentation

* add spellcheck to gh actions ([#2994](https://github.com/libp2p/js-libp2p/issues/2994)) ([5b084e9](https://github.com/libp2p/js-libp2p/commit/5b084e9682a572e82f7907714d7807b3b9856326))
* remove mplex from docs ([b6681bd](https://github.com/libp2p/js-libp2p/commit/b6681bd2505ac2749192042c3f16b14a88a8656d))
* update spell check ([#2999](https://github.com/libp2p/js-libp2p/issues/2999)) ([6f8cfea](https://github.com/libp2p/js-libp2p/commit/6f8cfeafb2f6ddc231a85ca369fb33cf759940f7))
* update typedoc config ([#3146](https://github.com/libp2p/js-libp2p/issues/3146)) ([14dbebe](https://github.com/libp2p/js-libp2p/commit/14dbebea8bd17addadac730afec0fa3b1cc6334a))


### Dependencies

* bump aegir from 43.0.3 to 44.0.1 ([#2603](https://github.com/libp2p/js-libp2p/issues/2603)) ([944935f](https://github.com/libp2p/js-libp2p/commit/944935f8dbcc1083e4cb4a02b49a0aab3083d3d9))
* update @multiformats/multiaddr to 13.x.x ([#3268](https://github.com/libp2p/js-libp2p/issues/3268)) ([b8ecade](https://github.com/libp2p/js-libp2p/commit/b8ecade2a725d38d11dd8df888c5abb22e14f26b))
* update aegir, fix all linting issues ([#3110](https://github.com/libp2p/js-libp2p/issues/3110)) ([510b033](https://github.com/libp2p/js-libp2p/commit/510b033f6b15358c7fae21486c3b09e730aa26cd))
* update p-event, p-wait-for and noble deps ([#3302](https://github.com/libp2p/js-libp2p/issues/3302)) ([55bbd8c](https://github.com/libp2p/js-libp2p/commit/55bbd8cde12fe1c05e8d264e6e2406ca9fe2f044))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^3.1.0 to ^4.0.0
    * @libp2p/interface-internal bumped from ^3.0.7 to ^4.0.0
  * devDependencies
    * @libp2p/logger bumped from ^6.2.0 to ^7.0.0
    * @libp2p/utils bumped from ^7.0.7 to ^8.0.0
</details>

<details><summary>ping: 4.0.0</summary>

## [4.0.0](https://github.com/libp2p/js-libp2p/compare/ping-v3.0.7...ping-v4.0.0) (2025-10-29)


###   BREAKING CHANGES

* All props and methods flagged as deprecated and for removal have been removed
* requires @mulitformats/multiaddr 13.x.x or later
* - Stream handlers accept `stream, connection`, not `{ stream, connection }`
* - `@libp2p/peer-id-factory` has been removed, use `generateKeyPair` and `peerIdFromPrivateKey` instead
* The `.code` property has been removed from most errors, use `.name` instead
* * The `notifyOnTransient` property of `libp2p.register` has been renamed `notifyOnLimitedConnection`

### Features

* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)
* use `.name` property instead of `.code` for errors ([#2655](https://github.com/libp2p/js-libp2p/issues/2655)) ([0d20426](https://github.com/libp2p/js-libp2p/commit/0d20426fd5ea19b03345c70289bbd692e4348e1f))


### Bug Fixes

* allow multiple ping messages ([#2711](https://github.com/libp2p/js-libp2p/issues/2711)) ([c628c44](https://github.com/libp2p/js-libp2p/commit/c628c44c588ad7102ce9522594ac888e751f35ba))
* deduplicate typed event target ([#3170](https://github.com/libp2p/js-libp2p/issues/3170)) ([cc7b34c](https://github.com/libp2p/js-libp2p/commit/cc7b34c0fe3ac5745fd082ae0198b8742371a412))
* export ping service capabilities ([#3075](https://github.com/libp2p/js-libp2p/issues/3075)) ([53a9be5](https://github.com/libp2p/js-libp2p/commit/53a9be54e5b8bbf64ee851e918a73d26a429fe22))
* gracefully handle remote stream closure during ping ([#2822](https://github.com/libp2p/js-libp2p/issues/2822)) ([4db0645](https://github.com/libp2p/js-libp2p/commit/4db0645c8ef5fb366a60f47db42c0e45f412e36e))
* import types from interface module ([#2946](https://github.com/libp2p/js-libp2p/issues/2946)) ([d5b399e](https://github.com/libp2p/js-libp2p/commit/d5b399e3098e8dc20e33138d9b2cd5bcd844f700))
* limit incoming ping bytes to 32 ([#2673](https://github.com/libp2p/js-libp2p/issues/2673)) ([50b8971](https://github.com/libp2p/js-libp2p/commit/50b897139cbace820548194191b7481e1379b149))
* remove deprecated code ([#3271](https://github.com/libp2p/js-libp2p/issues/3271)) ([6332556](https://github.com/libp2p/js-libp2p/commit/633255644eefb6bf9f739123b9cbd002c3d5a351))
* remove private key field from peer id ([#2660](https://github.com/libp2p/js-libp2p/issues/2660)) ([3eeb0c7](https://github.com/libp2p/js-libp2p/commit/3eeb0c705bd58285a6e1ec9fcbb6987c5959d504)), closes [#2659](https://github.com/libp2p/js-libp2p/issues/2659)
* rename "transient" connections to "limited" ([#2645](https://github.com/libp2p/js-libp2p/issues/2645)) ([2988602](https://github.com/libp2p/js-libp2p/commit/29886022eddc8a793217b2c888beac8aef63f1be)), closes [#2622](https://github.com/libp2p/js-libp2p/issues/2622)
* scope logging to connection and stream ([#3215](https://github.com/libp2p/js-libp2p/issues/3215)) ([ce6b542](https://github.com/libp2p/js-libp2p/commit/ce6b542a8ea3d42e2238f910cf2a113370515058))
* update multiaddr ([#3184](https://github.com/libp2p/js-libp2p/issues/3184)) ([6c42ea6](https://github.com/libp2p/js-libp2p/commit/6c42ea64a6e22028a87ecb3422e418e99ff09279))
* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))
* update stream deps ([#3055](https://github.com/libp2p/js-libp2p/issues/3055)) ([b2124c2](https://github.com/libp2p/js-libp2p/commit/b2124c2db02d7870b958f294da42ec79084818a3))


### Documentation

* update spell check ([#2999](https://github.com/libp2p/js-libp2p/issues/2999)) ([6f8cfea](https://github.com/libp2p/js-libp2p/commit/6f8cfeafb2f6ddc231a85ca369fb33cf759940f7))
* update typedoc config ([#3146](https://github.com/libp2p/js-libp2p/issues/3146)) ([14dbebe](https://github.com/libp2p/js-libp2p/commit/14dbebea8bd17addadac730afec0fa3b1cc6334a))


### Dependencies

* bump aegir from 43.0.3 to 44.0.1 ([#2603](https://github.com/libp2p/js-libp2p/issues/2603)) ([944935f](https://github.com/libp2p/js-libp2p/commit/944935f8dbcc1083e4cb4a02b49a0aab3083d3d9))
* update @multiformats/multiaddr to 13.x.x ([#3268](https://github.com/libp2p/js-libp2p/issues/3268)) ([b8ecade](https://github.com/libp2p/js-libp2p/commit/b8ecade2a725d38d11dd8df888c5abb22e14f26b))
* update aegir, fix all linting issues ([#3110](https://github.com/libp2p/js-libp2p/issues/3110)) ([510b033](https://github.com/libp2p/js-libp2p/commit/510b033f6b15358c7fae21486c3b09e730aa26cd))
* update p-event, p-wait-for and noble deps ([#3302](https://github.com/libp2p/js-libp2p/issues/3302)) ([55bbd8c](https://github.com/libp2p/js-libp2p/commit/55bbd8cde12fe1c05e8d264e6e2406ca9fe2f044))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^5.1.13 to ^6.0.0
    * @libp2p/interface bumped from ^3.1.0 to ^4.0.0
    * @libp2p/interface-internal bumped from ^3.0.7 to ^4.0.0
  * devDependencies
    * @libp2p/peer-id bumped from ^6.0.4 to ^7.0.0
    * @libp2p/utils bumped from ^7.0.7 to ^8.0.0
</details>

<details><summary>plaintext: 4.0.0</summary>

## [4.0.0](https://github.com/libp2p/js-libp2p/compare/plaintext-v3.0.7...plaintext-v4.0.0) (2025-10-29)


###   BREAKING CHANGES

* - Stream handlers accept `stream, connection`, not `{ stream, connection }`
* the `connectionEncryption` option has been renamed `connectionEncrypters`
* - `@libp2p/peer-id-factory` has been removed, use `generateKeyPair` and `peerIdFromPrivateKey` instead
* the final argument to `secureOutbound` and `secureInbound` in the `ConnectionEncrypter` interface is now an options object
* The `.code` property has been removed from most errors, use `.name` instead
* removes `localPeer: PeerId` first parameter from `secureInbound` and `secureOutbound` in `ConnectionEncrypter`

### Features

* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)
* use `.name` property instead of `.code` for errors ([#2655](https://github.com/libp2p/js-libp2p/issues/2655)) ([0d20426](https://github.com/libp2p/js-libp2p/commit/0d20426fd5ea19b03345c70289bbd692e4348e1f))


### Bug Fixes

* always send key type ([#3028](https://github.com/libp2p/js-libp2p/issues/3028)) ([2fbcdb6](https://github.com/libp2p/js-libp2p/commit/2fbcdb68763032db4cc9f3ff7d8acc7de3a65789))
* make connection securing abortable ([#2662](https://github.com/libp2p/js-libp2p/issues/2662)) ([51f7b57](https://github.com/libp2p/js-libp2p/commit/51f7b570c3a5bae8dd7da7edbc4145893328400e))
* remove localPeer from secureInbound and secureOutbound ([#2304](https://github.com/libp2p/js-libp2p/issues/2304)) ([b435a21](https://github.com/libp2p/js-libp2p/commit/b435a214cf342c6015f474d26143fc27f0f673e9))
* remove private key field from peer id ([#2660](https://github.com/libp2p/js-libp2p/issues/2660)) ([3eeb0c7](https://github.com/libp2p/js-libp2p/commit/3eeb0c705bd58285a6e1ec9fcbb6987c5959d504)), closes [#2659](https://github.com/libp2p/js-libp2p/issues/2659)
* rename connectionEncryption option to connectionEncrypters ([#2691](https://github.com/libp2p/js-libp2p/issues/2691)) ([6d72709](https://github.com/libp2p/js-libp2p/commit/6d72709ba5959388777610e2f71b8ba9522139b6))
* scope logging to connection and stream ([#3215](https://github.com/libp2p/js-libp2p/issues/3215)) ([ce6b542](https://github.com/libp2p/js-libp2p/commit/ce6b542a8ea3d42e2238f910cf2a113370515058))
* send raw plaintext public key during handshake ([#2599](https://github.com/libp2p/js-libp2p/issues/2599)) ([359265a](https://github.com/libp2p/js-libp2p/commit/359265a3a842698b5bdf93c6be64e3bcfee745bf))
* update error logs to use %e token ([#3261](https://github.com/libp2p/js-libp2p/issues/3261)) ([e10c5c0](https://github.com/libp2p/js-libp2p/commit/e10c5c0c51876ab83da51d558ee4789fc3c38a49))
* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))
* update stream deps ([#3055](https://github.com/libp2p/js-libp2p/issues/3055)) ([b2124c2](https://github.com/libp2p/js-libp2p/commit/b2124c2db02d7870b958f294da42ec79084818a3))


### Documentation

* update comments in interface module and elsewhere ([#3107](https://github.com/libp2p/js-libp2p/issues/3107)) ([32627c8](https://github.com/libp2p/js-libp2p/commit/32627c8767587f7e8df88a700933ece6d5f5c3c4)), closes [#2112](https://github.com/libp2p/js-libp2p/issues/2112)
* update spell check ([#2999](https://github.com/libp2p/js-libp2p/issues/2999)) ([6f8cfea](https://github.com/libp2p/js-libp2p/commit/6f8cfeafb2f6ddc231a85ca369fb33cf759940f7))
* update typedoc config ([#3146](https://github.com/libp2p/js-libp2p/issues/3146)) ([14dbebe](https://github.com/libp2p/js-libp2p/commit/14dbebea8bd17addadac730afec0fa3b1cc6334a))


### Dependencies

* bump aegir from 43.0.3 to 44.0.1 ([#2603](https://github.com/libp2p/js-libp2p/issues/2603)) ([944935f](https://github.com/libp2p/js-libp2p/commit/944935f8dbcc1083e4cb4a02b49a0aab3083d3d9))
* bump sinon from 19.0.5 to 20.0.0 ([#3112](https://github.com/libp2p/js-libp2p/issues/3112)) ([d1ce677](https://github.com/libp2p/js-libp2p/commit/d1ce6774d8f7c338f15a05f80d09e361d21e7586))
* update aegir, fix all linting issues ([#3110](https://github.com/libp2p/js-libp2p/issues/3110)) ([510b033](https://github.com/libp2p/js-libp2p/commit/510b033f6b15358c7fae21486c3b09e730aa26cd))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^5.1.13 to ^6.0.0
    * @libp2p/interface bumped from ^3.1.0 to ^4.0.0
    * @libp2p/peer-id bumped from ^6.0.4 to ^7.0.0
    * @libp2p/utils bumped from ^7.0.7 to ^8.0.0
  * devDependencies
    * @libp2p/crypto bumped from ^5.1.13 to ^6.0.0
    * @libp2p/logger bumped from ^6.2.0 to ^7.0.0
</details>

<details><summary>pnet: 4.0.0</summary>

## [4.0.0](https://github.com/libp2p/js-libp2p/compare/pnet-v3.0.8...pnet-v4.0.0) (2025-10-29)


###   BREAKING CHANGES

* - Stream handlers accept `stream, connection`, not `{ stream, connection }`
* - `@libp2p/peer-id-factory` has been removed, use `generateKeyPair` and `peerIdFromPrivateKey` instead
* The `.code` property has been removed from most errors, use `.name` instead

### Features

* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)
* use `.name` property instead of `.code` for errors ([#2655](https://github.com/libp2p/js-libp2p/issues/2655)) ([0d20426](https://github.com/libp2p/js-libp2p/commit/0d20426fd5ea19b03345c70289bbd692e4348e1f))


### Bug Fixes

* export transiently referenced types ([#2717](https://github.com/libp2p/js-libp2p/issues/2717)) ([7f7ec82](https://github.com/libp2p/js-libp2p/commit/7f7ec82ae4ee7761360bdfdd294de271feaf1841))
* remove private key field from peer id ([#2660](https://github.com/libp2p/js-libp2p/issues/2660)) ([3eeb0c7](https://github.com/libp2p/js-libp2p/commit/3eeb0c705bd58285a6e1ec9fcbb6987c5959d504)), closes [#2659](https://github.com/libp2p/js-libp2p/issues/2659)
* unwrap connection for boxed stream ([#3314](https://github.com/libp2p/js-libp2p/issues/3314)) ([de2ad9c](https://github.com/libp2p/js-libp2p/commit/de2ad9ca559ffa31caf040f1702193dc530a4db2))
* update multiaddr ([#3184](https://github.com/libp2p/js-libp2p/issues/3184)) ([6c42ea6](https://github.com/libp2p/js-libp2p/commit/6c42ea64a6e22028a87ecb3422e418e99ff09279))
* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))
* update stream deps ([#3055](https://github.com/libp2p/js-libp2p/issues/3055)) ([b2124c2](https://github.com/libp2p/js-libp2p/commit/b2124c2db02d7870b958f294da42ec79084818a3))


### Documentation

* add spellcheck to gh actions ([#2994](https://github.com/libp2p/js-libp2p/issues/2994)) ([5b084e9](https://github.com/libp2p/js-libp2p/commit/5b084e9682a572e82f7907714d7807b3b9856326))
* update spell check ([#2999](https://github.com/libp2p/js-libp2p/issues/2999)) ([6f8cfea](https://github.com/libp2p/js-libp2p/commit/6f8cfeafb2f6ddc231a85ca369fb33cf759940f7))
* update typedoc config ([#3146](https://github.com/libp2p/js-libp2p/issues/3146)) ([14dbebe](https://github.com/libp2p/js-libp2p/commit/14dbebea8bd17addadac730afec0fa3b1cc6334a))


### Dependencies

* bump aegir from 43.0.3 to 44.0.1 ([#2603](https://github.com/libp2p/js-libp2p/issues/2603)) ([944935f](https://github.com/libp2p/js-libp2p/commit/944935f8dbcc1083e4cb4a02b49a0aab3083d3d9))
* update aegir, fix all linting issues ([#3110](https://github.com/libp2p/js-libp2p/issues/3110)) ([510b033](https://github.com/libp2p/js-libp2p/commit/510b033f6b15358c7fae21486c3b09e730aa26cd))
* update p-event, p-wait-for and noble deps ([#3302](https://github.com/libp2p/js-libp2p/issues/3302)) ([55bbd8c](https://github.com/libp2p/js-libp2p/commit/55bbd8cde12fe1c05e8d264e6e2406ca9fe2f044))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^5.1.13 to ^6.0.0
    * @libp2p/interface bumped from ^3.1.0 to ^4.0.0
    * @libp2p/utils bumped from ^7.0.7 to ^8.0.0
</details>

<details><summary>prometheus-metrics: 6.0.0</summary>

## [6.0.0](https://github.com/libp2p/js-libp2p/compare/prometheus-metrics-v5.0.7...prometheus-metrics-v6.0.0) (2025-10-29)


###   BREAKING CHANGES

* - Stream handlers accept `stream, connection`, not `{ stream, connection }`
* - `@libp2p/peer-id-factory` has been removed, use `generateKeyPair` and `peerIdFromPrivateKey` instead

### Features

* add histogram and summary metric types ([#2705](https://github.com/libp2p/js-libp2p/issues/2705)) ([21fe841](https://github.com/libp2p/js-libp2p/commit/21fe841f2584e0166253d78fc390401d7cee5601))
* add traceFunction call to metrics ([#2898](https://github.com/libp2p/js-libp2p/issues/2898)) ([20d9ba7](https://github.com/libp2p/js-libp2p/commit/20d9ba73e2fc76e42327458b2a1e29d1ba162bba))
* collect metrics on available storage ([#2730](https://github.com/libp2p/js-libp2p/issues/2730)) ([a74c75d](https://github.com/libp2p/js-libp2p/commit/a74c75d02404feae119f232424b430f904c9d8b5))
* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)


### Bug Fixes

* add optional generics to metric groups ([#2665](https://github.com/libp2p/js-libp2p/issues/2665)) ([df33069](https://github.com/libp2p/js-libp2p/commit/df330695a0ee627f79c51c1ab737cbf3278a91e8))
* clear references to metrics on stop ([#3154](https://github.com/libp2p/js-libp2p/issues/3154)) ([01328a0](https://github.com/libp2p/js-libp2p/commit/01328a0b4eab0a66d5805d9ad4b6f25dbbdb4b03))
* fix metric group timers ([#2789](https://github.com/libp2p/js-libp2p/issues/2789)) ([a4b2db1](https://github.com/libp2p/js-libp2p/commit/a4b2db1e286052fbd0383cdb7be430590502c5dc))
* metrics should persist beyond node restarts ([#3159](https://github.com/libp2p/js-libp2p/issues/3159)) ([d91ae66](https://github.com/libp2p/js-libp2p/commit/d91ae66c6c8db5ae0a9cb9d388d67418fe318736))
* remove private key field from peer id ([#2660](https://github.com/libp2p/js-libp2p/issues/2660)) ([3eeb0c7](https://github.com/libp2p/js-libp2p/commit/3eeb0c705bd58285a6e1ec9fcbb6987c5959d504)), closes [#2659](https://github.com/libp2p/js-libp2p/issues/2659)
* update multiaddr ([#3184](https://github.com/libp2p/js-libp2p/issues/3184)) ([6c42ea6](https://github.com/libp2p/js-libp2p/commit/6c42ea64a6e22028a87ecb3422e418e99ff09279))
* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))


### Documentation

* add spellcheck to gh actions ([#2994](https://github.com/libp2p/js-libp2p/issues/2994)) ([5b084e9](https://github.com/libp2p/js-libp2p/commit/5b084e9682a572e82f7907714d7807b3b9856326))
* update spell check ([#2999](https://github.com/libp2p/js-libp2p/issues/2999)) ([6f8cfea](https://github.com/libp2p/js-libp2p/commit/6f8cfeafb2f6ddc231a85ca369fb33cf759940f7))
* update typedoc config ([#3146](https://github.com/libp2p/js-libp2p/issues/3146)) ([14dbebe](https://github.com/libp2p/js-libp2p/commit/14dbebea8bd17addadac730afec0fa3b1cc6334a))


### Dependencies

* bump aegir from 43.0.3 to 44.0.1 ([#2603](https://github.com/libp2p/js-libp2p/issues/2603)) ([944935f](https://github.com/libp2p/js-libp2p/commit/944935f8dbcc1083e4cb4a02b49a0aab3083d3d9))
* update aegir, fix all linting issues ([#3110](https://github.com/libp2p/js-libp2p/issues/3110)) ([510b033](https://github.com/libp2p/js-libp2p/commit/510b033f6b15358c7fae21486c3b09e730aa26cd))
* update p-event, p-wait-for and noble deps ([#3302](https://github.com/libp2p/js-libp2p/issues/3302)) ([55bbd8c](https://github.com/libp2p/js-libp2p/commit/55bbd8cde12fe1c05e8d264e6e2406ca9fe2f044))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^3.1.0 to ^4.0.0
  * devDependencies
    * @libp2p/logger bumped from ^6.2.0 to ^7.0.0
    * @libp2p/utils bumped from ^7.0.7 to ^8.0.0
</details>

<details><summary>simple-metrics: 3.0.0</summary>

## [3.0.0](https://github.com/libp2p/js-libp2p/compare/simple-metrics-v2.0.7...simple-metrics-v3.0.0) (2025-10-29)


###   BREAKING CHANGES

* - Stream handlers accept `stream, connection`, not `{ stream, connection }`

### Features

* add histogram and summary metric types ([#2705](https://github.com/libp2p/js-libp2p/issues/2705)) ([21fe841](https://github.com/libp2p/js-libp2p/commit/21fe841f2584e0166253d78fc390401d7cee5601))
* add traceFunction call to metrics ([#2898](https://github.com/libp2p/js-libp2p/issues/2898)) ([20d9ba7](https://github.com/libp2p/js-libp2p/commit/20d9ba73e2fc76e42327458b2a1e29d1ba162bba))
* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)


### Bug Fixes

* clear references to metrics on stop ([#3154](https://github.com/libp2p/js-libp2p/issues/3154)) ([01328a0](https://github.com/libp2p/js-libp2p/commit/01328a0b4eab0a66d5805d9ad4b6f25dbbdb4b03))
* metrics should persist beyond node restarts ([#3159](https://github.com/libp2p/js-libp2p/issues/3159)) ([d91ae66](https://github.com/libp2p/js-libp2p/commit/d91ae66c6c8db5ae0a9cb9d388d67418fe318736))
* update error logs to use %e token ([#3261](https://github.com/libp2p/js-libp2p/issues/3261)) ([e10c5c0](https://github.com/libp2p/js-libp2p/commit/e10c5c0c51876ab83da51d558ee4789fc3c38a49))
* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))


### Documentation

* update spell check ([#2999](https://github.com/libp2p/js-libp2p/issues/2999)) ([6f8cfea](https://github.com/libp2p/js-libp2p/commit/6f8cfeafb2f6ddc231a85ca369fb33cf759940f7))
* update typedoc config ([#3146](https://github.com/libp2p/js-libp2p/issues/3146)) ([14dbebe](https://github.com/libp2p/js-libp2p/commit/14dbebea8bd17addadac730afec0fa3b1cc6334a))


### Dependencies

* bump aegir from 43.0.3 to 44.0.1 ([#2603](https://github.com/libp2p/js-libp2p/issues/2603)) ([944935f](https://github.com/libp2p/js-libp2p/commit/944935f8dbcc1083e4cb4a02b49a0aab3083d3d9))
* update aegir, fix all linting issues ([#3110](https://github.com/libp2p/js-libp2p/issues/3110)) ([510b033](https://github.com/libp2p/js-libp2p/commit/510b033f6b15358c7fae21486c3b09e730aa26cd))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^3.1.0 to ^4.0.0
    * @libp2p/logger bumped from ^6.2.0 to ^7.0.0
</details>

<details><summary>tcp: 12.0.0</summary>

## [12.0.0](https://github.com/libp2p/js-libp2p/compare/tcp-v11.0.7...tcp-v12.0.0) (2025-10-29)


###   BREAKING CHANGES

* requires @mulitformats/multiaddr 13.x.x or later
* - Stream handlers accept `stream, connection`, not `{ stream, connection }`
* instead of `CodeError`, use `TimeoutError`, `UnexpectedPeerError`, etc
* The `.code` property has been removed from most errors, use `.name` instead

### Features

* allow transports to modify announce addresses ([#2978](https://github.com/libp2p/js-libp2p/issues/2978)) ([8331c8e](https://github.com/libp2p/js-libp2p/commit/8331c8ea8feef1d642b6667213409dbe8293b606))
* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)
* use `.name` property instead of `.code` for errors ([#2655](https://github.com/libp2p/js-libp2p/issues/2655)) ([0d20426](https://github.com/libp2p/js-libp2p/commit/0d20426fd5ea19b03345c70289bbd692e4348e1f))


### Bug Fixes

* **@libp2p/tcp:** race condition in onSocket ([#2763](https://github.com/libp2p/js-libp2p/issues/2763)) ([aa8de9f](https://github.com/libp2p/js-libp2p/commit/aa8de9fd3f6ca8773596fa3fae765787caa8e866))
* add inbound upgrade timeout config option ([#2995](https://github.com/libp2p/js-libp2p/issues/2995)) ([f465c54](https://github.com/libp2p/js-libp2p/commit/f465c5473bbf4446fa1e8b882e6df6c1da18785e))
* add optional generics to metric groups ([#2665](https://github.com/libp2p/js-libp2p/issues/2665)) ([df33069](https://github.com/libp2p/js-libp2p/commit/df330695a0ee627f79c51c1ab737cbf3278a91e8))
* allow importing @libp2p/tcp in browsers ([#2682](https://github.com/libp2p/js-libp2p/issues/2682)) ([dd7b329](https://github.com/libp2p/js-libp2p/commit/dd7b329c483d9d06964e212d71d3090dae0556f9))
* constrain ip6 listener to ip6 addresses ([#3010](https://github.com/libp2p/js-libp2p/issues/3010)) ([22e62d0](https://github.com/libp2p/js-libp2p/commit/22e62d00f508b0d77fc61e93b2f365963b6b699a))
* deduplicate typed event target ([#3170](https://github.com/libp2p/js-libp2p/issues/3170)) ([cc7b34c](https://github.com/libp2p/js-libp2p/commit/cc7b34c0fe3ac5745fd082ae0198b8742371a412))
* do not re-register metrics ([#3153](https://github.com/libp2p/js-libp2p/issues/3153)) ([5b004c0](https://github.com/libp2p/js-libp2p/commit/5b004c0c42195c893dece1989a52ad6ddc90a3c1))
* ensure that the upgrader applies timeouts to incoming dials ([#3000](https://github.com/libp2p/js-libp2p/issues/3000)) ([90cca82](https://github.com/libp2p/js-libp2p/commit/90cca822b4cb112fc71bf9ad954023de685a9040))
* export transiently referenced types ([#2717](https://github.com/libp2p/js-libp2p/issues/2717)) ([7f7ec82](https://github.com/libp2p/js-libp2p/commit/7f7ec82ae4ee7761360bdfdd294de271feaf1841))
* make tcp closing error throwing consistent ([#2729](https://github.com/libp2p/js-libp2p/issues/2729)) ([9308bc1](https://github.com/libp2p/js-libp2p/commit/9308bc1f2d2abc6947531ef52ed3c1fc2da59119))
* override browser override for react-native ([#2970](https://github.com/libp2p/js-libp2p/issues/2970)) ([5a9bbf7](https://github.com/libp2p/js-libp2p/commit/5a9bbf7eeb52df79a5d8b99a19d2b108f8bbbc55)), closes [#2969](https://github.com/libp2p/js-libp2p/issues/2969)
* refactor connection opening and closing ([#2735](https://github.com/libp2p/js-libp2p/issues/2735)) ([24fa1d5](https://github.com/libp2p/js-libp2p/commit/24fa1d5af3be19f60f31261e8e0242c1747da0b2))
* remove CodeError class ([#2688](https://github.com/libp2p/js-libp2p/issues/2688)) ([81ebe4e](https://github.com/libp2p/js-libp2p/commit/81ebe4e47e82508a847bb3af0af36cc249b78765))
* remove unused fields from browser polyfill ([#2958](https://github.com/libp2p/js-libp2p/issues/2958)) ([c4e8627](https://github.com/libp2p/js-libp2p/commit/c4e8627313f40cd625b6149da6967df48ce6ffba))
* scope logging to connection and stream ([#3215](https://github.com/libp2p/js-libp2p/issues/3215)) ([ce6b542](https://github.com/libp2p/js-libp2p/commit/ce6b542a8ea3d42e2238f910cf2a113370515058))
* simplify connection upgrade ([#2719](https://github.com/libp2p/js-libp2p/issues/2719)) ([c258b35](https://github.com/libp2p/js-libp2p/commit/c258b35af60eec906437129ab31201bfb9c80d16))
* update error logs to use %e token ([#3261](https://github.com/libp2p/js-libp2p/issues/3261)) ([e10c5c0](https://github.com/libp2p/js-libp2p/commit/e10c5c0c51876ab83da51d558ee4789fc3c38a49))
* update multiaddr ([#3184](https://github.com/libp2p/js-libp2p/issues/3184)) ([6c42ea6](https://github.com/libp2p/js-libp2p/commit/6c42ea64a6e22028a87ecb3422e418e99ff09279))
* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))
* use getThinWaistAddresss function ([#3047](https://github.com/libp2p/js-libp2p/issues/3047)) ([a7ab9a4](https://github.com/libp2p/js-libp2p/commit/a7ab9a41b97504695d10045c1d50b2a610d69c24))


### Documentation

* add spellcheck to gh actions ([#2994](https://github.com/libp2p/js-libp2p/issues/2994)) ([5b084e9](https://github.com/libp2p/js-libp2p/commit/5b084e9682a572e82f7907714d7807b3b9856326))
* update spell check ([#2999](https://github.com/libp2p/js-libp2p/issues/2999)) ([6f8cfea](https://github.com/libp2p/js-libp2p/commit/6f8cfeafb2f6ddc231a85ca369fb33cf759940f7))
* update typedoc config ([#3146](https://github.com/libp2p/js-libp2p/issues/3146)) ([14dbebe](https://github.com/libp2p/js-libp2p/commit/14dbebea8bd17addadac730afec0fa3b1cc6334a))


### Dependencies

* bump aegir from 43.0.3 to 44.0.1 ([#2603](https://github.com/libp2p/js-libp2p/issues/2603)) ([944935f](https://github.com/libp2p/js-libp2p/commit/944935f8dbcc1083e4cb4a02b49a0aab3083d3d9))
* bump sinon from 19.0.5 to 20.0.0 ([#3112](https://github.com/libp2p/js-libp2p/issues/3112)) ([d1ce677](https://github.com/libp2p/js-libp2p/commit/d1ce6774d8f7c338f15a05f80d09e361d21e7586))
* update @multiformats/multiaddr to 13.x.x ([#3268](https://github.com/libp2p/js-libp2p/issues/3268)) ([b8ecade](https://github.com/libp2p/js-libp2p/commit/b8ecade2a725d38d11dd8df888c5abb22e14f26b))
* update @multiformats/multiaddr-matcher dep to 2.x.x ([#3208](https://github.com/libp2p/js-libp2p/issues/3208)) ([57e7fa4](https://github.com/libp2p/js-libp2p/commit/57e7fa4413a0e19799b5917bad6743800c77e1f7))
* update aegir, fix all linting issues ([#3110](https://github.com/libp2p/js-libp2p/issues/3110)) ([510b033](https://github.com/libp2p/js-libp2p/commit/510b033f6b15358c7fae21486c3b09e730aa26cd))
* update p-event, p-wait-for and noble deps ([#3302](https://github.com/libp2p/js-libp2p/issues/3302)) ([55bbd8c](https://github.com/libp2p/js-libp2p/commit/55bbd8cde12fe1c05e8d264e6e2406ca9fe2f044))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^3.1.0 to ^4.0.0
    * @libp2p/utils bumped from ^7.0.7 to ^8.0.0
  * devDependencies
    * @libp2p/logger bumped from ^6.2.0 to ^7.0.0
</details>

<details><summary>tls: 4.0.0</summary>

## [4.0.0](https://github.com/libp2p/js-libp2p/compare/tls-v3.0.7...tls-v4.0.0) (2025-10-29)


###   BREAKING CHANGES

* - Stream handlers accept `stream, connection`, not `{ stream, connection }`
* the `connectionEncryption` option has been renamed `connectionEncrypters`
* - `@libp2p/peer-id-factory` has been removed, use `generateKeyPair` and `peerIdFromPrivateKey` instead
* the final argument to `secureOutbound` and `secureInbound` in the `ConnectionEncrypter` interface is now an options object
* The `.code` property has been removed from most errors, use `.name` instead
* removes `localPeer: PeerId` first parameter from `secureInbound` and `secureOutbound` in `ConnectionEncrypter`

### Features

* add metrics to tls encrypter ([#3025](https://github.com/libp2p/js-libp2p/issues/3025)) ([3f127b6](https://github.com/libp2p/js-libp2p/commit/3f127b6104339b95d947c7c741e73508a90f0352))
* add skip muxer negotiation ([#3081](https://github.com/libp2p/js-libp2p/issues/3081)) ([3833353](https://github.com/libp2p/js-libp2p/commit/3833353bdc936695b17cc836515763ead2137756))
* select muxer early ([#3026](https://github.com/libp2p/js-libp2p/issues/3026)) ([c4b6a37](https://github.com/libp2p/js-libp2p/commit/c4b6a37173bbf4bfd127bdc524c2c00a1a9749e6))
* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)
* use `.name` property instead of `.code` for errors ([#2655](https://github.com/libp2p/js-libp2p/issues/2655)) ([0d20426](https://github.com/libp2p/js-libp2p/commit/0d20426fd5ea19b03345c70289bbd692e4348e1f))


### Bug Fixes

* abort connection on TLS error ([#3027](https://github.com/libp2p/js-libp2p/issues/3027)) ([2c8ecb4](https://github.com/libp2p/js-libp2p/commit/2c8ecb455833074300953270a9d9386386275699))
* add backpressure to tls encryption ([#3054](https://github.com/libp2p/js-libp2p/issues/3054)) ([0712672](https://github.com/libp2p/js-libp2p/commit/071267286c2adc79e03ba47a199bd4c0943f1ae3))
* check for signal abort in tls during cert generation ([#3203](https://github.com/libp2p/js-libp2p/issues/3203)) ([82ac83c](https://github.com/libp2p/js-libp2p/commit/82ac83c0d532abf95cc17debea7e7b208ee0a8aa))
* close tls socket on encryption failure ([#2724](https://github.com/libp2p/js-libp2p/issues/2724)) ([9800384](https://github.com/libp2p/js-libp2p/commit/9800384773597621bb87f4bf0587a9451a152d6f))
* make connection securing abortable ([#2662](https://github.com/libp2p/js-libp2p/issues/2662)) ([51f7b57](https://github.com/libp2p/js-libp2p/commit/51f7b570c3a5bae8dd7da7edbc4145893328400e))
* remove localPeer from secureInbound and secureOutbound ([#2304](https://github.com/libp2p/js-libp2p/issues/2304)) ([b435a21](https://github.com/libp2p/js-libp2p/commit/b435a214cf342c6015f474d26143fc27f0f673e9))
* remove private key field from peer id ([#2660](https://github.com/libp2p/js-libp2p/issues/2660)) ([3eeb0c7](https://github.com/libp2p/js-libp2p/commit/3eeb0c705bd58285a6e1ec9fcbb6987c5959d504)), closes [#2659](https://github.com/libp2p/js-libp2p/issues/2659)
* rename connectionEncryption option to connectionEncrypters ([#2691](https://github.com/libp2p/js-libp2p/issues/2691)) ([6d72709](https://github.com/libp2p/js-libp2p/commit/6d72709ba5959388777610e2f71b8ba9522139b6))
* scope logging to connection and stream ([#3215](https://github.com/libp2p/js-libp2p/issues/3215)) ([ce6b542](https://github.com/libp2p/js-libp2p/commit/ce6b542a8ea3d42e2238f910cf2a113370515058))
* update error logs to use %e token ([#3261](https://github.com/libp2p/js-libp2p/issues/3261)) ([e10c5c0](https://github.com/libp2p/js-libp2p/commit/e10c5c0c51876ab83da51d558ee4789fc3c38a49))
* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))


### Documentation

* add spellcheck to gh actions ([#2994](https://github.com/libp2p/js-libp2p/issues/2994)) ([5b084e9](https://github.com/libp2p/js-libp2p/commit/5b084e9682a572e82f7907714d7807b3b9856326))
* update spell check ([#2999](https://github.com/libp2p/js-libp2p/issues/2999)) ([6f8cfea](https://github.com/libp2p/js-libp2p/commit/6f8cfeafb2f6ddc231a85ca369fb33cf759940f7))
* update typedoc config ([#3146](https://github.com/libp2p/js-libp2p/issues/3146)) ([14dbebe](https://github.com/libp2p/js-libp2p/commit/14dbebea8bd17addadac730afec0fa3b1cc6334a))


### Dependencies

* bump aegir from 43.0.3 to 44.0.1 ([#2603](https://github.com/libp2p/js-libp2p/issues/2603)) ([944935f](https://github.com/libp2p/js-libp2p/commit/944935f8dbcc1083e4cb4a02b49a0aab3083d3d9))
* bump it-queueless-pushable from 1.0.2 to 2.0.1 in /packages/connection-encrypter-tls ([#3117](https://github.com/libp2p/js-libp2p/issues/3117)) ([923ecc6](https://github.com/libp2p/js-libp2p/commit/923ecc6cd9b5df0dfef4df621dc035aaa36f3c85))
* bump sinon from 19.0.5 to 20.0.0 ([#3112](https://github.com/libp2p/js-libp2p/issues/3112)) ([d1ce677](https://github.com/libp2p/js-libp2p/commit/d1ce6774d8f7c338f15a05f80d09e361d21e7586))
* update aegir, fix all linting issues ([#3110](https://github.com/libp2p/js-libp2p/issues/3110)) ([510b033](https://github.com/libp2p/js-libp2p/commit/510b033f6b15358c7fae21486c3b09e730aa26cd))
* update p-event, p-wait-for and noble deps ([#3302](https://github.com/libp2p/js-libp2p/issues/3302)) ([55bbd8c](https://github.com/libp2p/js-libp2p/commit/55bbd8cde12fe1c05e8d264e6e2406ca9fe2f044))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^5.1.13 to ^6.0.0
    * @libp2p/interface bumped from ^3.1.0 to ^4.0.0
    * @libp2p/peer-id bumped from ^6.0.4 to ^7.0.0
    * @libp2p/utils bumped from ^7.0.7 to ^8.0.0
  * devDependencies
    * @libp2p/logger bumped from ^6.2.0 to ^7.0.0
</details>

<details><summary>transport-interop-libp2p-main: 2.0.0</summary>

## [2.0.0](https://github.com/libp2p/js-libp2p/compare/transport-interop-libp2p-main-v1.0.9...transport-interop-libp2p-main-v2.0.0) (2025-10-29)


###   BREAKING CHANGES

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

* bump noise version ([#3306](https://github.com/libp2p/js-libp2p/issues/3306)) ([71e8ee1](https://github.com/libp2p/js-libp2p/commit/71e8ee1632fdeaff5d6c33a38ae6df02ea69f579))
* capture early datachannels ([#3312](https://github.com/libp2p/js-libp2p/issues/3312)) ([8d66d5f](https://github.com/libp2p/js-libp2p/commit/8d66d5ff1c28298ac1bef3b68fb757eeba1d3bfa))
* make circuit relay listen on addresses like other transports ([#2776](https://github.com/libp2p/js-libp2p/issues/2776)) ([3244ed0](https://github.com/libp2p/js-libp2p/commit/3244ed08625516b25716485c936c26a34b69466a))
* remove autodialer ([#2639](https://github.com/libp2p/js-libp2p/issues/2639)) ([ab90179](https://github.com/libp2p/js-libp2p/commit/ab901790810d8ce59724af1706c9a9e74341b8ee))
* remove patches for gossipsub, noise and the daemon modules ([#2694](https://github.com/libp2p/js-libp2p/issues/2694)) ([7cd9845](https://github.com/libp2p/js-libp2p/commit/7cd984569dbf0046861ec84e8e030ef62725fd14))
* remove private key field from peer id ([#2660](https://github.com/libp2p/js-libp2p/issues/2660)) ([3eeb0c7](https://github.com/libp2p/js-libp2p/commit/3eeb0c705bd58285a6e1ec9fcbb6987c5959d504)), closes [#2659](https://github.com/libp2p/js-libp2p/issues/2659)
* remove ws filters ([#2983](https://github.com/libp2p/js-libp2p/issues/2983)) ([2b49a5f](https://github.com/libp2p/js-libp2p/commit/2b49a5f74e8c79d571396e8a6a70f904b73763f2))
* rename connectionEncryption option to connectionEncrypters ([#2691](https://github.com/libp2p/js-libp2p/issues/2691)) ([6d72709](https://github.com/libp2p/js-libp2p/commit/6d72709ba5959388777610e2f71b8ba9522139b6))
* update multiaddr ([#3184](https://github.com/libp2p/js-libp2p/issues/3184)) ([6c42ea6](https://github.com/libp2p/js-libp2p/commit/6c42ea64a6e22028a87ecb3422e418e99ff09279))
* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))
* use @chainsafe/libp2p-noise and @chainsafe/libp2p-yamux ([#3308](https://github.com/libp2p/js-libp2p/issues/3308)) ([425a42c](https://github.com/libp2p/js-libp2p/commit/425a42cddac5aac4d0ac822295cc4c4817dcdc95))


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
* update p-event, p-wait-for and noble deps ([#3302](https://github.com/libp2p/js-libp2p/issues/3302)) ([55bbd8c](https://github.com/libp2p/js-libp2p/commit/55bbd8cde12fe1c05e8d264e6e2406ca9fe2f044))
* The following workspace dependencies were updated
  * devDependencies
    * @libp2p/circuit-relay-v2 bumped from ^4.1.0 to ^5.0.0
    * @libp2p/identify bumped from ^4.0.7 to ^5.0.0
    * @libp2p/interface bumped from ^3.1.0 to ^4.0.0
    * @libp2p/mplex bumped from ^12.0.8 to ^13.0.0
    * @libp2p/ping bumped from ^3.0.7 to ^4.0.0
    * @libp2p/tcp bumped from ^11.0.7 to ^12.0.0
    * @libp2p/tls bumped from ^3.0.7 to ^4.0.0
    * @libp2p/webrtc bumped from ^6.0.8 to ^7.0.0
    * @libp2p/websockets bumped from ^10.0.8 to ^11.0.0
    * @libp2p/webtransport bumped from ^6.0.9 to ^7.0.0
    * libp2p bumped from ^3.1.0 to ^4.0.0
</details>

<details><summary>upnp-nat: 5.0.0</summary>

## [5.0.0](https://github.com/libp2p/js-libp2p/compare/upnp-nat-v4.0.7...upnp-nat-v5.0.0) (2025-10-29)


###   BREAKING CHANGES

* requires @mulitformats/multiaddr 13.x.x or later
* - Stream handlers accept `stream, connection`, not `{ stream, connection }`
* use ip/port mapping ([#2840](https://github.com/libp2p/js-libp2p/issues/2840))
* - `@libp2p/peer-id-factory` has been removed, use `generateKeyPair` and `peerIdFromPrivateKey` instead
* The `.code` property has been removed from most errors, use `.name` instead

### Features

* allow specifying UPnP gateways and external address ([#2937](https://github.com/libp2p/js-libp2p/issues/2937)) ([26313e6](https://github.com/libp2p/js-libp2p/commit/26313e6959513eeb6235662ad4b5dc53cfb61470))
* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)
* use `.name` property instead of `.code` for errors ([#2655](https://github.com/libp2p/js-libp2p/issues/2655)) ([0d20426](https://github.com/libp2p/js-libp2p/commit/0d20426fd5ea19b03345c70289bbd692e4348e1f))


### Bug Fixes

* add browser polyfill to upnp-nat ([#2959](https://github.com/libp2p/js-libp2p/issues/2959)) ([d188511](https://github.com/libp2p/js-libp2p/commit/d188511b97ef9fc320233d284d16a6275b029b81))
* confirm external ip ([#2895](https://github.com/libp2p/js-libp2p/issues/2895)) ([52f0f2f](https://github.com/libp2p/js-libp2p/commit/52f0f2f1324bb7316157c3bcdbbdb5f1b151e3ad))
* deduplicate typed event target ([#3170](https://github.com/libp2p/js-libp2p/issues/3170)) ([cc7b34c](https://github.com/libp2p/js-libp2p/commit/cc7b34c0fe3ac5745fd082ae0198b8742371a412))
* include platform in user agent ([#2942](https://github.com/libp2p/js-libp2p/issues/2942)) ([96f14e4](https://github.com/libp2p/js-libp2p/commit/96f14e429eac84d02504c4b97f183511c8af2add))
* increase initial gateway search interval ([#2936](https://github.com/libp2p/js-libp2p/issues/2936)) ([66c3ec5](https://github.com/libp2p/js-libp2p/commit/66c3ec5e1de2706de53e9b5261df8b470d2294a4))
* remove private key field from peer id ([#2660](https://github.com/libp2p/js-libp2p/issues/2660)) ([3eeb0c7](https://github.com/libp2p/js-libp2p/commit/3eeb0c705bd58285a6e1ec9fcbb6987c5959d504)), closes [#2659](https://github.com/libp2p/js-libp2p/issues/2659)
* require autonat when not automatically confirming addresses ([#2824](https://github.com/libp2p/js-libp2p/issues/2824)) ([eee97c7](https://github.com/libp2p/js-libp2p/commit/eee97c7d4ced5763f6620e535f3c9a5619abf046))
* require external confirmation of public addresses ([#2867](https://github.com/libp2p/js-libp2p/issues/2867)) ([d19974d](https://github.com/libp2p/js-libp2p/commit/d19974d93a1015acfca95c2155dbcffc5fd6a6c0))
* run UPnP nat on address change, update nat port mapper ([#2797](https://github.com/libp2p/js-libp2p/issues/2797)) ([7626b22](https://github.com/libp2p/js-libp2p/commit/7626b224d23c474d1c885c8a7922977ab7e4bea6))
* support IPv6 with IPv4 ([#2864](https://github.com/libp2p/js-libp2p/issues/2864)) ([406b391](https://github.com/libp2p/js-libp2p/commit/406b3916cac688cd98c02b61ee2e52a9cd041704))
* unhandled promise rejection when finding gateway ([#2884](https://github.com/libp2p/js-libp2p/issues/2884)) ([127abe2](https://github.com/libp2p/js-libp2p/commit/127abe24b567e462b5fb8809960201635bee2202))
* update multiaddr ([#3184](https://github.com/libp2p/js-libp2p/issues/3184)) ([6c42ea6](https://github.com/libp2p/js-libp2p/commit/6c42ea64a6e22028a87ecb3422e418e99ff09279))
* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))
* update race-signal ([#2986](https://github.com/libp2p/js-libp2p/issues/2986)) ([2a3cec9](https://github.com/libp2p/js-libp2p/commit/2a3cec9220f1250b7558635c4cb37d61f745645d)), closes [#2702](https://github.com/libp2p/js-libp2p/issues/2702)
* use addresses with metadata to map ports ([#2878](https://github.com/libp2p/js-libp2p/issues/2878)) ([d51c21f](https://github.com/libp2p/js-libp2p/commit/d51c21f0b0e87d54841876a652fd9985dfafd030))
* use ip/port mapping ([#2840](https://github.com/libp2p/js-libp2p/issues/2840)) ([a82b07d](https://github.com/libp2p/js-libp2p/commit/a82b07d8c69640b6c72824a584b55bb7c30ca06e))


### Documentation

* add spellcheck to gh actions ([#2994](https://github.com/libp2p/js-libp2p/issues/2994)) ([5b084e9](https://github.com/libp2p/js-libp2p/commit/5b084e9682a572e82f7907714d7807b3b9856326))
* update spell check ([#2999](https://github.com/libp2p/js-libp2p/issues/2999)) ([6f8cfea](https://github.com/libp2p/js-libp2p/commit/6f8cfeafb2f6ddc231a85ca369fb33cf759940f7))
* update typedoc config ([#3146](https://github.com/libp2p/js-libp2p/issues/3146)) ([14dbebe](https://github.com/libp2p/js-libp2p/commit/14dbebea8bd17addadac730afec0fa3b1cc6334a))


### Dependencies

* bump aegir from 43.0.3 to 44.0.1 ([#2603](https://github.com/libp2p/js-libp2p/issues/2603)) ([944935f](https://github.com/libp2p/js-libp2p/commit/944935f8dbcc1083e4cb4a02b49a0aab3083d3d9))
* update @multiformats/multiaddr to 13.x.x ([#3268](https://github.com/libp2p/js-libp2p/issues/3268)) ([b8ecade](https://github.com/libp2p/js-libp2p/commit/b8ecade2a725d38d11dd8df888c5abb22e14f26b))
* update @multiformats/multiaddr-matcher dep to 2.x.x ([#3208](https://github.com/libp2p/js-libp2p/issues/3208)) ([57e7fa4](https://github.com/libp2p/js-libp2p/commit/57e7fa4413a0e19799b5917bad6743800c77e1f7))
* update aegir, fix all linting issues ([#3110](https://github.com/libp2p/js-libp2p/issues/3110)) ([510b033](https://github.com/libp2p/js-libp2p/commit/510b033f6b15358c7fae21486c3b09e730aa26cd))
* update nat-port-mapper to v3 ([#2843](https://github.com/libp2p/js-libp2p/issues/2843)) ([b02ea9b](https://github.com/libp2p/js-libp2p/commit/b02ea9b6edf1a6ef2e059ea8570ba57cc9052229))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^3.1.0 to ^4.0.0
    * @libp2p/interface-internal bumped from ^3.0.7 to ^4.0.0
    * @libp2p/utils bumped from ^7.0.7 to ^8.0.0
  * devDependencies
    * @libp2p/crypto bumped from ^5.1.13 to ^6.0.0
    * @libp2p/logger bumped from ^6.2.0 to ^7.0.0
    * @libp2p/peer-id bumped from ^6.0.4 to ^7.0.0
</details>

<details><summary>utils: 8.0.0</summary>

## [8.0.0](https://github.com/libp2p/js-libp2p/compare/utils-v7.0.7...utils-v8.0.0) (2025-10-29)


###   BREAKING CHANGES

* merge-options has been removed from `@libp2p/utils`
* All props and methods flagged as deprecated and for removal have been removed
* requires @mulitformats/multiaddr 13.x.x or later
* - Stream handlers accept `stream, connection`, not `{ stream, connection }`
* - `@libp2p/peer-id-factory` has been removed, use `generateKeyPair` and `peerIdFromPrivateKey` instead
* The `.code` property has been removed from most errors, use `.name` instead
* * The `notifyOnTransient` property of `libp2p.register` has been renamed `notifyOnLimitedConnection`

### Features

* add debounce and repeating task to utils ([#2795](https://github.com/libp2p/js-libp2p/issues/2795)) ([0a3406a](https://github.com/libp2p/js-libp2p/commit/0a3406a0536f8e7390e67eec88ccc518bd90e9a6))
* add generator detection functions to utils ([#2923](https://github.com/libp2p/js-libp2p/issues/2923)) ([31a15a1](https://github.com/libp2p/js-libp2p/commit/31a15a1483e0af0f9ede24de0a7f1d24bf9d408d))
* add isGlobalUnicast function ([#2872](https://github.com/libp2p/js-libp2p/issues/2872)) ([b5a2d3e](https://github.com/libp2p/js-libp2p/commit/b5a2d3e29a82dd075d68928120d4bb1403caf50f))
* add isLinkLocal function ([#2856](https://github.com/libp2p/js-libp2p/issues/2856)) ([5ac8c8b](https://github.com/libp2p/js-libp2p/commit/5ac8c8b5e06be915080f0798a1c0a3abad939a08))
* add isLinkLocalIp function ([#2863](https://github.com/libp2p/js-libp2p/issues/2863)) ([97978b9](https://github.com/libp2p/js-libp2p/commit/97978b93e5f014d26d127136d7025aa4e76bec3c))
* add maxSize to queues ([#2742](https://github.com/libp2p/js-libp2p/issues/2742)) ([116a887](https://github.com/libp2p/js-libp2p/commit/116a88743bc004aee3f73440437e8c23f49c7e78))
* add util to get thin waist addresses ([#3043](https://github.com/libp2p/js-libp2p/issues/3043)) ([757577d](https://github.com/libp2p/js-libp2p/commit/757577dd2802935616933553a800e5e0050b09a1))
* allow changing repeating task interval and timeout ([#2934](https://github.com/libp2p/js-libp2p/issues/2934)) ([d708bb6](https://github.com/libp2p/js-libp2p/commit/d708bb6c848a548d7e5e88bdd623b00e08fa31c8))
* allow interrupting repeating task ([#3186](https://github.com/libp2p/js-libp2p/issues/3186)) ([7eed3b4](https://github.com/libp2p/js-libp2p/commit/7eed3b40d7e538a8547781078ec31b010d07d545))
* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)
* use `.name` property instead of `.code` for errors ([#2655](https://github.com/libp2p/js-libp2p/issues/2655)) ([0d20426](https://github.com/libp2p/js-libp2p/commit/0d20426fd5ea19b03345c70289bbd692e4348e1f))


### Bug Fixes

* .d.ts is in ./dist folder ([#3018](https://github.com/libp2p/js-libp2p/issues/3018)) ([52a46ec](https://github.com/libp2p/js-libp2p/commit/52a46ecad0d2ccd88eaf6190a1d6d67d388fd11b))
* add ipv6Check regex for private address ([#2624](https://github.com/libp2p/js-libp2p/issues/2624)) ([a82ff82](https://github.com/libp2p/js-libp2p/commit/a82ff82211f187e6ad6eef2f73e3221f6fc7b444))
* allow aborting drain waiting ([72a7ea1](https://github.com/libp2p/js-libp2p/commit/72a7ea10a622221c4d850e8eaaf17da8b73e318d))
* allow setting interval repeatedly ([#3141](https://github.com/libp2p/js-libp2p/issues/3141)) ([7788b40](https://github.com/libp2p/js-libp2p/commit/7788b402592aeb4580d90798317826ff997a89ce))
* allow stream unshift ([#3320](https://github.com/libp2p/js-libp2p/issues/3320)) ([14e87cd](https://github.com/libp2p/js-libp2p/commit/14e87cd152a6f8bf38966071b9e7aa30d56d8978))
* byte stream should return null when remote closes ([#3319](https://github.com/libp2p/js-libp2p/issues/3319)) ([7e1c0ba](https://github.com/libp2p/js-libp2p/commit/7e1c0badab2098addab964ea97e2ee9d9236267c))
* constrain maximum timeout value ([#3163](https://github.com/libp2p/js-libp2p/issues/3163)) ([dbbc6ef](https://github.com/libp2p/js-libp2p/commit/dbbc6ef1d7632c0fa06c08f1b498bb20e5e5fb6e))
* constrain maxiumum timeout value ([dbbc6ef](https://github.com/libp2p/js-libp2p/commit/dbbc6ef1d7632c0fa06c08f1b498bb20e5e5fb6e))
* create hasBytes promise before await ([#3304](https://github.com/libp2p/js-libp2p/issues/3304)) ([55b7e5f](https://github.com/libp2p/js-libp2p/commit/55b7e5feadfc3cf7bccb674dae65b1c2827334d7))
* debounce queue idle/empty events ([#3103](https://github.com/libp2p/js-libp2p/issues/3103)) ([5c1de24](https://github.com/libp2p/js-libp2p/commit/5c1de2430c346b248b61acb1772c819769c59f80))
* deduplicate typed event target ([#3170](https://github.com/libp2p/js-libp2p/issues/3170)) ([cc7b34c](https://github.com/libp2p/js-libp2p/commit/cc7b34c0fe3ac5745fd082ae0198b8742371a412))
* dial loopback addresses last ([#2982](https://github.com/libp2p/js-libp2p/issues/2982)) ([1ab50cc](https://github.com/libp2p/js-libp2p/commit/1ab50cc0d1ce19f629105b9e154be9f8571dba8d))
* export transiently referenced types ([#2717](https://github.com/libp2p/js-libp2p/issues/2717)) ([7f7ec82](https://github.com/libp2p/js-libp2p/commit/7f7ec82ae4ee7761360bdfdd294de271feaf1841))
* increase default adaptive timeout ([#3104](https://github.com/libp2p/js-libp2p/issues/3104)) ([a01606e](https://github.com/libp2p/js-libp2p/commit/a01606e1a370843f5bc3cf0b1a45d6f5eac96194))
* increase default cuckoo filter fingerprint size ([#2636](https://github.com/libp2p/js-libp2p/issues/2636)) ([34cf1f7](https://github.com/libp2p/js-libp2p/commit/34cf1f7cd178799a9f153dacf6734a3b83f11c3e))
* isPrivate should handle more types of addresses ([#2846](https://github.com/libp2p/js-libp2p/issues/2846)) ([671bc47](https://github.com/libp2p/js-libp2p/commit/671bc47656199d90410719824f1af5cdf989fdf1))
* make queue job args non-optional ([#2743](https://github.com/libp2p/js-libp2p/issues/2743)) ([80e798c](https://github.com/libp2p/js-libp2p/commit/80e798cdccc8ef579634dc140f35d5327e2e5cf2))
* only close stream if it is open ([#2823](https://github.com/libp2p/js-libp2p/issues/2823)) ([3098232](https://github.com/libp2p/js-libp2p/commit/30982327b3924614d1fb552fd42b7b8f5a7419cd))
* remove deprecated code ([#3271](https://github.com/libp2p/js-libp2p/issues/3271)) ([6332556](https://github.com/libp2p/js-libp2p/commit/633255644eefb6bf9f739123b9cbd002c3d5a351))
* remove merge-options ([#3294](https://github.com/libp2p/js-libp2p/issues/3294)) ([dc01b32](https://github.com/libp2p/js-libp2p/commit/dc01b3278f021c944594644629fbd449514aee35))
* remove private key field from peer id ([#2660](https://github.com/libp2p/js-libp2p/issues/2660)) ([3eeb0c7](https://github.com/libp2p/js-libp2p/commit/3eeb0c705bd58285a6e1ec9fcbb6987c5959d504)), closes [#2659](https://github.com/libp2p/js-libp2p/issues/2659)
* remove while loop for setbit & getbit ([#2687](https://github.com/libp2p/js-libp2p/issues/2687)) ([a142bb6](https://github.com/libp2p/js-libp2p/commit/a142bb642b3a232479c79a7da235508f0022dd94))
* rename "transient" connections to "limited" ([#2645](https://github.com/libp2p/js-libp2p/issues/2645)) ([2988602](https://github.com/libp2p/js-libp2p/commit/29886022eddc8a793217b2c888beac8aef63f1be)), closes [#2622](https://github.com/libp2p/js-libp2p/issues/2622)
* scope logging to connection and stream ([#3215](https://github.com/libp2p/js-libp2p/issues/3215)) ([ce6b542](https://github.com/libp2p/js-libp2p/commit/ce6b542a8ea3d42e2238f910cf2a113370515058))
* sort addresses by transport before dial ([#2731](https://github.com/libp2p/js-libp2p/issues/2731)) ([dad979f](https://github.com/libp2p/js-libp2p/commit/dad979f9bf1181defb1a72de69b21f5b8d7fce5b))
* switch bloom filter hash from murmur to fnv1a ([#2943](https://github.com/libp2p/js-libp2p/issues/2943)) ([34b3c14](https://github.com/libp2p/js-libp2p/commit/34b3c14b87e57cdec90861830f4c26edad5b8dcc))
* update error logs to use %e token ([#3261](https://github.com/libp2p/js-libp2p/issues/3261)) ([e10c5c0](https://github.com/libp2p/js-libp2p/commit/e10c5c0c51876ab83da51d558ee4789fc3c38a49))
* update multiaddr ([#3184](https://github.com/libp2p/js-libp2p/issues/3184)) ([6c42ea6](https://github.com/libp2p/js-libp2p/commit/6c42ea64a6e22028a87ecb3422e418e99ff09279))
* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))
* update race-signal ([#2986](https://github.com/libp2p/js-libp2p/issues/2986)) ([2a3cec9](https://github.com/libp2p/js-libp2p/commit/2a3cec9220f1250b7558635c4cb37d61f745645d)), closes [#2702](https://github.com/libp2p/js-libp2p/issues/2702)
* use failure event instead of error ([#3219](https://github.com/libp2p/js-libp2p/issues/3219)) ([4420fad](https://github.com/libp2p/js-libp2p/commit/4420fad686921f887854e1b37ecd01f65b276e0d))
* use getThinWaistAddresss function ([#3047](https://github.com/libp2p/js-libp2p/issues/3047)) ([a7ab9a4](https://github.com/libp2p/js-libp2p/commit/a7ab9a41b97504695d10045c1d50b2a610d69c24))
* use isPromise/etc function from utils ([#2925](https://github.com/libp2p/js-libp2p/issues/2925)) ([a32fbeb](https://github.com/libp2p/js-libp2p/commit/a32fbeb1dbf1ffbb59445f56ba011af4123ab085))


### Documentation

* add spellcheck to gh actions ([#2994](https://github.com/libp2p/js-libp2p/issues/2994)) ([5b084e9](https://github.com/libp2p/js-libp2p/commit/5b084e9682a572e82f7907714d7807b3b9856326))
* update spell check ([#2999](https://github.com/libp2p/js-libp2p/issues/2999)) ([6f8cfea](https://github.com/libp2p/js-libp2p/commit/6f8cfeafb2f6ddc231a85ca369fb33cf759940f7))
* update typedoc config ([#3146](https://github.com/libp2p/js-libp2p/issues/3146)) ([14dbebe](https://github.com/libp2p/js-libp2p/commit/14dbebea8bd17addadac730afec0fa3b1cc6334a))


### Dependencies

* bump aegir from 43.0.3 to 44.0.1 ([#2603](https://github.com/libp2p/js-libp2p/issues/2603)) ([944935f](https://github.com/libp2p/js-libp2p/commit/944935f8dbcc1083e4cb4a02b49a0aab3083d3d9))
* bump sinon from 19.0.5 to 20.0.0 ([#3112](https://github.com/libp2p/js-libp2p/issues/3112)) ([d1ce677](https://github.com/libp2p/js-libp2p/commit/d1ce6774d8f7c338f15a05f80d09e361d21e7586))
* update @multiformats/multiaddr to 13.x.x ([#3268](https://github.com/libp2p/js-libp2p/issues/3268)) ([b8ecade](https://github.com/libp2p/js-libp2p/commit/b8ecade2a725d38d11dd8df888c5abb22e14f26b))
* update aegir, fix all linting issues ([#3110](https://github.com/libp2p/js-libp2p/issues/3110)) ([510b033](https://github.com/libp2p/js-libp2p/commit/510b033f6b15358c7fae21486c3b09e730aa26cd))
* update p-event, p-wait-for and noble deps ([#3302](https://github.com/libp2p/js-libp2p/issues/3302)) ([55bbd8c](https://github.com/libp2p/js-libp2p/commit/55bbd8cde12fe1c05e8d264e6e2406ca9fe2f044))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^5.1.13 to ^6.0.0
    * @libp2p/interface bumped from ^3.1.0 to ^4.0.0
    * @libp2p/logger bumped from ^6.2.0 to ^7.0.0
  * devDependencies
    * @libp2p/peer-id bumped from ^6.0.4 to ^7.0.0
</details>

<details><summary>webrtc: 7.0.0</summary>

## [7.0.0](https://github.com/libp2p/js-libp2p/compare/webrtc-v6.0.8...webrtc-v7.0.0) (2025-10-29)


###   BREAKING CHANGES

* All props and methods flagged as deprecated and for removal have been removed
* requires @mulitformats/multiaddr 13.x.x or later
* - Stream handlers accept `stream, connection`, not `{ stream, connection }`
* the `connectionEncryption` option has been renamed `connectionEncrypters`
* - `@libp2p/peer-id-factory` has been removed, use `generateKeyPair` and `peerIdFromPrivateKey` instead
* the final argument to `secureOutbound` and `secureInbound` in the `ConnectionEncrypter` interface is now an options object
* the autodialer has been removed as well as the corresponding config keys
* The `.code` property has been removed from most errors, use `.name` instead
* removes `localPeer: PeerId` first parameter from `secureInbound` and `secureOutbound` in `ConnectionEncrypter`
* * The `notifyOnTransient` property of `libp2p.register` has been renamed `notifyOnLimitedConnection`

### Features

* allow transports to modify announce addresses ([#2978](https://github.com/libp2p/js-libp2p/issues/2978)) ([8331c8e](https://github.com/libp2p/js-libp2p/commit/8331c8ea8feef1d642b6667213409dbe8293b606))
* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)
* use `.name` property instead of `.code` for errors ([#2655](https://github.com/libp2p/js-libp2p/issues/2655)) ([0d20426](https://github.com/libp2p/js-libp2p/commit/0d20426fd5ea19b03345c70289bbd692e4348e1f))
* WebRTC-Direct support for Node.js ([#2583](https://github.com/libp2p/js-libp2p/issues/2583)) ([200c2bd](https://github.com/libp2p/js-libp2p/commit/200c2bd22e4db2e74c4533c12bc52085ecf7296b))


### Bug Fixes

* bump noise version ([#3306](https://github.com/libp2p/js-libp2p/issues/3306)) ([71e8ee1](https://github.com/libp2p/js-libp2p/commit/71e8ee1632fdeaff5d6c33a38ae6df02ea69f579))
* byte stream should return null when remote closes ([#3319](https://github.com/libp2p/js-libp2p/issues/3319)) ([7e1c0ba](https://github.com/libp2p/js-libp2p/commit/7e1c0badab2098addab964ea97e2ee9d9236267c))
* capture early datachannels ([#3312](https://github.com/libp2p/js-libp2p/issues/3312)) ([8d66d5f](https://github.com/libp2p/js-libp2p/commit/8d66d5ff1c28298ac1bef3b68fb757eeba1d3bfa))
* close handshake datachannel after use ([#3076](https://github.com/libp2p/js-libp2p/issues/3076)) ([b9e32cc](https://github.com/libp2p/js-libp2p/commit/b9e32cc37b3f45efc512e0f868cd7df1dbf1aef3))
* decrease max buffered amount for WebRTC datachannels ([#2628](https://github.com/libp2p/js-libp2p/issues/2628)) ([4a994c5](https://github.com/libp2p/js-libp2p/commit/4a994c5effea95c363164c5ba51b8f78faa6bc8a))
* deduplicate typed event target ([#3170](https://github.com/libp2p/js-libp2p/issues/3170)) ([cc7b34c](https://github.com/libp2p/js-libp2p/commit/cc7b34c0fe3ac5745fd082ae0198b8742371a412))
* do not close relay connection after WebRTC upgrade ([#3205](https://github.com/libp2p/js-libp2p/issues/3205)) ([cfe2be4](https://github.com/libp2p/js-libp2p/commit/cfe2be4c9319b68f8e68df8021b9ee3c1a7236fd))
* do not require peer id for webrtc-direct ([#2820](https://github.com/libp2p/js-libp2p/issues/2820)) ([2feaedd](https://github.com/libp2p/js-libp2p/commit/2feaeddb40712a5d58aee158021a10b9b9bbf660))
* drain timeout is 30s no 301s ([#3041](https://github.com/libp2p/js-libp2p/issues/3041)) ([600d0a5](https://github.com/libp2p/js-libp2p/commit/600d0a561ad88df3a5bf6d56851728c899d86429))
* ensure that the upgrader applies timeouts to incoming dials ([#3000](https://github.com/libp2p/js-libp2p/issues/3000)) ([90cca82](https://github.com/libp2p/js-libp2p/commit/90cca822b4cb112fc71bf9ad954023de685a9040))
* export transiently referenced types ([#2717](https://github.com/libp2p/js-libp2p/issues/2717)) ([7f7ec82](https://github.com/libp2p/js-libp2p/commit/7f7ec82ae4ee7761360bdfdd294de271feaf1841))
* ignore failures to listen on IPv6 addresses when IPv4 succeeds ([#3001](https://github.com/libp2p/js-libp2p/issues/3001)) ([e2f4943](https://github.com/libp2p/js-libp2p/commit/e2f49432b58fe3f8484c8f7f0237f996b4d211fa)), closes [#2977](https://github.com/libp2p/js-libp2p/issues/2977)
* import types from interface module ([#2946](https://github.com/libp2p/js-libp2p/issues/2946)) ([d5b399e](https://github.com/libp2p/js-libp2p/commit/d5b399e3098e8dc20e33138d9b2cd5bcd844f700))
* increase signal listeners ([#3101](https://github.com/libp2p/js-libp2p/issues/3101)) ([4b8c0a6](https://github.com/libp2p/js-libp2p/commit/4b8c0a6bd289c0a0d5002ee34efc696feb349caf))
* increase WebRTC max datachannel message size ([#2627](https://github.com/libp2p/js-libp2p/issues/2627)) ([9e92b0c](https://github.com/libp2p/js-libp2p/commit/9e92b0c5ea7b3e982f92b8ecd6d8c6b28e994012)), closes [#2612](https://github.com/libp2p/js-libp2p/issues/2612)
* make connection securing abortable ([#2662](https://github.com/libp2p/js-libp2p/issues/2662)) ([51f7b57](https://github.com/libp2p/js-libp2p/commit/51f7b570c3a5bae8dd7da7edbc4145893328400e))
* make UDP mux registry global ([#2979](https://github.com/libp2p/js-libp2p/issues/2979)) ([7718d02](https://github.com/libp2p/js-libp2p/commit/7718d020ae5809dd6ef149c29aace4ea3258face))
* maximum call stack size with duplicate webrtc addresses ([#2980](https://github.com/libp2p/js-libp2p/issues/2980)) ([d98cc46](https://github.com/libp2p/js-libp2p/commit/d98cc46e4c9557c0eeb6caf528b9b97261d1d165))
* only check for non-wildcard ports ([#3050](https://github.com/libp2p/js-libp2p/issues/3050)) ([a71c7c3](https://github.com/libp2p/js-libp2p/commit/a71c7c32b4615da731a1750964ee1be8ce63e4b8)), closes [#3049](https://github.com/libp2p/js-libp2p/issues/3049)
* parameterise max message size in SDP messages ([#2681](https://github.com/libp2p/js-libp2p/issues/2681)) ([737b3ea](https://github.com/libp2p/js-libp2p/commit/737b3ea5bd8555f09a0f63f2e0562aa9f0b73f62))
* partial revert of [#3076](https://github.com/libp2p/js-libp2p/issues/3076) - do not close handshake channel ([#3083](https://github.com/libp2p/js-libp2p/issues/3083)) ([f09bef8](https://github.com/libp2p/js-libp2p/commit/f09bef8438b57e3c918881d1acb2931b14cefd47))
* pass abort signal to noise and the upgrader ([#2992](https://github.com/libp2p/js-libp2p/issues/2992)) ([e7e01f5](https://github.com/libp2p/js-libp2p/commit/e7e01f58fa7cb4f0a0e5a43fd4501f58f5ed29ad))
* remove autodialer ([#2639](https://github.com/libp2p/js-libp2p/issues/2639)) ([ab90179](https://github.com/libp2p/js-libp2p/commit/ab901790810d8ce59724af1706c9a9e74341b8ee))
* remove deprecated code ([#3271](https://github.com/libp2p/js-libp2p/issues/3271)) ([6332556](https://github.com/libp2p/js-libp2p/commit/633255644eefb6bf9f739123b9cbd002c3d5a351))
* remove localPeer from secureInbound and secureOutbound ([#2304](https://github.com/libp2p/js-libp2p/issues/2304)) ([b435a21](https://github.com/libp2p/js-libp2p/commit/b435a214cf342c6015f474d26143fc27f0f673e9))
* remove patches for gossipsub, noise and the daemon modules ([#2694](https://github.com/libp2p/js-libp2p/issues/2694)) ([7cd9845](https://github.com/libp2p/js-libp2p/commit/7cd984569dbf0046861ec84e8e030ef62725fd14))
* remove private key field from peer id ([#2660](https://github.com/libp2p/js-libp2p/issues/2660)) ([3eeb0c7](https://github.com/libp2p/js-libp2p/commit/3eeb0c705bd58285a6e1ec9fcbb6987c5959d504)), closes [#2659](https://github.com/libp2p/js-libp2p/issues/2659)
* remove redundant types ([#3097](https://github.com/libp2p/js-libp2p/issues/3097)) ([f1de466](https://github.com/libp2p/js-libp2p/commit/f1de46607e7a592c4de307ba4acf3ad27a4abcb2))
* remove ws filters ([#2983](https://github.com/libp2p/js-libp2p/issues/2983)) ([2b49a5f](https://github.com/libp2p/js-libp2p/commit/2b49a5f74e8c79d571396e8a6a70f904b73763f2))
* rename "transient" connections to "limited" ([#2645](https://github.com/libp2p/js-libp2p/issues/2645)) ([2988602](https://github.com/libp2p/js-libp2p/commit/29886022eddc8a793217b2c888beac8aef63f1be)), closes [#2622](https://github.com/libp2p/js-libp2p/issues/2622)
* rename connectionEncryption option to connectionEncrypters ([#2691](https://github.com/libp2p/js-libp2p/issues/2691)) ([6d72709](https://github.com/libp2p/js-libp2p/commit/6d72709ba5959388777610e2f71b8ba9522139b6))
* reuse WebRTC certificates between restarts ([#3071](https://github.com/libp2p/js-libp2p/issues/3071)) ([4c64bd0](https://github.com/libp2p/js-libp2p/commit/4c64bd06dc77c38992e3da7fd33210056f01c0c7))
* revert WebRTC message size increase ([#2679](https://github.com/libp2p/js-libp2p/issues/2679)) ([2265e59](https://github.com/libp2p/js-libp2p/commit/2265e59baa489141192a6cdcc1f47bb736575b92))
* rotate webrtc direct certificates ([#3073](https://github.com/libp2p/js-libp2p/issues/3073)) ([da7353a](https://github.com/libp2p/js-libp2p/commit/da7353a0b7882649fdd1aa87b9d6997cbd6daf50))
* scope logging to connection and stream ([#3215](https://github.com/libp2p/js-libp2p/issues/3215)) ([ce6b542](https://github.com/libp2p/js-libp2p/commit/ce6b542a8ea3d42e2238f910cf2a113370515058))
* skip muxer negotiation ([#3084](https://github.com/libp2p/js-libp2p/issues/3084)) ([6f96de8](https://github.com/libp2p/js-libp2p/commit/6f96de86cc951910211e21393117a1ffe96ee588))
* support multiple udp mux listeners on the same port ([#2976](https://github.com/libp2p/js-libp2p/issues/2976)) ([ff951f1](https://github.com/libp2p/js-libp2p/commit/ff951f1a0a959f2a2a15aaab7cef63860a827048))
* support multiple wildcard ports ([20e8844](https://github.com/libp2p/js-libp2p/commit/20e8844990acfe1c626ecf08fab679160ce3ac77))
* update error logs to use %e token ([#3261](https://github.com/libp2p/js-libp2p/issues/3261)) ([e10c5c0](https://github.com/libp2p/js-libp2p/commit/e10c5c0c51876ab83da51d558ee4789fc3c38a49))
* update multiaddr ([#3184](https://github.com/libp2p/js-libp2p/issues/3184)) ([6c42ea6](https://github.com/libp2p/js-libp2p/commit/6c42ea64a6e22028a87ecb3422e418e99ff09279))
* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))
* update race-signal ([#2986](https://github.com/libp2p/js-libp2p/issues/2986)) ([2a3cec9](https://github.com/libp2p/js-libp2p/commit/2a3cec9220f1250b7558635c4cb37d61f745645d)), closes [#2702](https://github.com/libp2p/js-libp2p/issues/2702)
* update stream deps ([#3055](https://github.com/libp2p/js-libp2p/issues/3055)) ([b2124c2](https://github.com/libp2p/js-libp2p/commit/b2124c2db02d7870b958f294da42ec79084818a3))
* update WebRTC types ([#3095](https://github.com/libp2p/js-libp2p/issues/3095)) ([cdc63e6](https://github.com/libp2p/js-libp2p/commit/cdc63e6cc1a5058a83dc22d538b896455ab10b55))
* use @chainsafe/libp2p-noise and @chainsafe/libp2p-yamux ([#3308](https://github.com/libp2p/js-libp2p/issues/3308)) ([425a42c](https://github.com/libp2p/js-libp2p/commit/425a42cddac5aac4d0ac822295cc4c4817dcdc95))
* use getThinWaistAddresss function ([#3047](https://github.com/libp2p/js-libp2p/issues/3047)) ([a7ab9a4](https://github.com/libp2p/js-libp2p/commit/a7ab9a41b97504695d10045c1d50b2a610d69c24))
* **webrtc:** remove vulnerable unmaintained stun package dependency ([#2967](https://github.com/libp2p/js-libp2p/issues/2967)) ([6d0f3ee](https://github.com/libp2p/js-libp2p/commit/6d0f3ee7d2b2de5c6ac69caf0daac6566a834284))


### Documentation

* add spellcheck to gh actions ([#2994](https://github.com/libp2p/js-libp2p/issues/2994)) ([5b084e9](https://github.com/libp2p/js-libp2p/commit/5b084e9682a572e82f7907714d7807b3b9856326))
* update spell check ([#2999](https://github.com/libp2p/js-libp2p/issues/2999)) ([6f8cfea](https://github.com/libp2p/js-libp2p/commit/6f8cfeafb2f6ddc231a85ca369fb33cf759940f7))
* update typedoc config ([#3146](https://github.com/libp2p/js-libp2p/issues/3146)) ([14dbebe](https://github.com/libp2p/js-libp2p/commit/14dbebea8bd17addadac730afec0fa3b1cc6334a))
* update webrtc example ([#2777](https://github.com/libp2p/js-libp2p/issues/2777)) ([4521cf1](https://github.com/libp2p/js-libp2p/commit/4521cf1f7b8c81728db6a454a7d36d38491afc41))
* update WebRTC jsdocs ([#3005](https://github.com/libp2p/js-libp2p/issues/3005)) ([f3d9f56](https://github.com/libp2p/js-libp2p/commit/f3d9f56b685f4e5b731571e56a4967d34f9ec6c8))
* update webrtc-direct docs ([#2971](https://github.com/libp2p/js-libp2p/issues/2971)) ([a2c529a](https://github.com/libp2p/js-libp2p/commit/a2c529aa2abe18c20a1a36196e1d5cfe535d9493))


### Dependencies

* bump aegir from 43.0.3 to 44.0.1 ([#2603](https://github.com/libp2p/js-libp2p/issues/2603)) ([944935f](https://github.com/libp2p/js-libp2p/commit/944935f8dbcc1083e4cb4a02b49a0aab3083d3d9))
* bump it-length-prefixed from 9.1.1 to 10.0.1 ([#2962](https://github.com/libp2p/js-libp2p/issues/2962)) ([1fc0e26](https://github.com/libp2p/js-libp2p/commit/1fc0e26620d2fd9d752179ab4f6dcc7b6ed5ee5c))
* bump node-datachannel from 0.10.1 to 0.11.0 ([#2635](https://github.com/libp2p/js-libp2p/issues/2635)) ([aa5528f](https://github.com/libp2p/js-libp2p/commit/aa5528fe7df53ce743453177873566e9b892b17c))
* bump react-native-webrtc from 118.0.7 to 124.0.4 ([#2685](https://github.com/libp2p/js-libp2p/issues/2685)) ([5214dec](https://github.com/libp2p/js-libp2p/commit/5214dec4a0b7e7cb82056b9a681f1c77e82d34a2))
* bump sinon from 19.0.5 to 20.0.0 ([#3112](https://github.com/libp2p/js-libp2p/issues/3112)) ([d1ce677](https://github.com/libp2p/js-libp2p/commit/d1ce6774d8f7c338f15a05f80d09e361d21e7586))
* update @multiformats/multiaddr to 13.x.x ([#3268](https://github.com/libp2p/js-libp2p/issues/3268)) ([b8ecade](https://github.com/libp2p/js-libp2p/commit/b8ecade2a725d38d11dd8df888c5abb22e14f26b))
* update @multiformats/multiaddr-matcher dep to 2.x.x ([#3208](https://github.com/libp2p/js-libp2p/issues/3208)) ([57e7fa4](https://github.com/libp2p/js-libp2p/commit/57e7fa4413a0e19799b5917bad6743800c77e1f7))
* update aegir, fix all linting issues ([#3110](https://github.com/libp2p/js-libp2p/issues/3110)) ([510b033](https://github.com/libp2p/js-libp2p/commit/510b033f6b15358c7fae21486c3b09e730aa26cd))
* update datastore ([#3326](https://github.com/libp2p/js-libp2p/issues/3326)) ([a0f9da2](https://github.com/libp2p/js-libp2p/commit/a0f9da212fcc8ac8d21da835e87c9225ae138fdd))
* update p-event, p-wait-for and noble deps ([#3302](https://github.com/libp2p/js-libp2p/issues/3302)) ([55bbd8c](https://github.com/libp2p/js-libp2p/commit/55bbd8cde12fe1c05e8d264e6e2406ca9fe2f044))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^5.1.13 to ^6.0.0
    * @libp2p/interface bumped from ^3.1.0 to ^4.0.0
    * @libp2p/interface-internal bumped from ^3.0.7 to ^4.0.0
    * @libp2p/keychain bumped from ^6.0.7 to ^7.0.0
    * @libp2p/peer-id bumped from ^6.0.4 to ^7.0.0
    * @libp2p/utils bumped from ^7.0.7 to ^8.0.0
  * devDependencies
    * @libp2p/logger bumped from ^6.2.0 to ^7.0.0
</details>

<details><summary>websockets: 11.0.0</summary>

## [11.0.0](https://github.com/libp2p/js-libp2p/compare/websockets-v10.0.8...websockets-v11.0.0) (2025-10-29)


###   BREAKING CHANGES

* All props and methods flagged as deprecated and for removal have been removed
* requires @mulitformats/multiaddr 13.x.x or later
* - Stream handlers accept `stream, connection`, not `{ stream, connection }`
* The `.code` property has been removed from most errors, use `.name` instead

### Features

* add WebSockets metrics ([#2649](https://github.com/libp2p/js-libp2p/issues/2649)) ([1dfb74e](https://github.com/libp2p/js-libp2p/commit/1dfb74e795f45b67965467b4939d1855e070ffa0))
* allow transports to modify announce addresses ([#2978](https://github.com/libp2p/js-libp2p/issues/2978)) ([8331c8e](https://github.com/libp2p/js-libp2p/commit/8331c8ea8feef1d642b6667213409dbe8293b606))
* auto-tls for websockets ([#2800](https://github.com/libp2p/js-libp2p/issues/2800)) ([8a9258a](https://github.com/libp2p/js-libp2p/commit/8a9258a24168d13172eb139d32bc6889e71f81dc))
* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)
* use `.name` property instead of `.code` for errors ([#2655](https://github.com/libp2p/js-libp2p/issues/2655)) ([0d20426](https://github.com/libp2p/js-libp2p/commit/0d20426fd5ea19b03345c70289bbd692e4348e1f))


### Bug Fixes

* constrain ip6 ws listener to ip6 stack ([#3011](https://github.com/libp2p/js-libp2p/issues/3011)) ([0555339](https://github.com/libp2p/js-libp2p/commit/0555339ba3bb67822fd4595684f9175aaedaf963))
* deduplicate typed event target ([#3170](https://github.com/libp2p/js-libp2p/issues/3170)) ([cc7b34c](https://github.com/libp2p/js-libp2p/commit/cc7b34c0fe3ac5745fd082ae0198b8742371a412))
* ensure that the upgrader applies timeouts to incoming dials ([#3000](https://github.com/libp2p/js-libp2p/issues/3000)) ([90cca82](https://github.com/libp2p/js-libp2p/commit/90cca822b4cb112fc71bf9ad954023de685a9040))
* ignore IPv6 link-local addresses ([#2865](https://github.com/libp2p/js-libp2p/issues/2865)) ([f8da60e](https://github.com/libp2p/js-libp2p/commit/f8da60e73fede669986b8d48218f66c4e55fd776))
* increase signal listeners ([#3101](https://github.com/libp2p/js-libp2p/issues/3101)) ([4b8c0a6](https://github.com/libp2p/js-libp2p/commit/4b8c0a6bd289c0a0d5002ee34efc696feb349caf))
* remove browser dial filter ([#2838](https://github.com/libp2p/js-libp2p/issues/2838)) ([d6cd25d](https://github.com/libp2p/js-libp2p/commit/d6cd25d0deca292420093d894edbfbc47b347e5d))
* remove deprecated code ([#3271](https://github.com/libp2p/js-libp2p/issues/3271)) ([6332556](https://github.com/libp2p/js-libp2p/commit/633255644eefb6bf9f739123b9cbd002c3d5a351))
* remove it-ws ([#3309](https://github.com/libp2p/js-libp2p/issues/3309)) ([8543df0](https://github.com/libp2p/js-libp2p/commit/8543df06bef3ee363de4777aa09e9a3bd036fdc6))
* remove ws filters ([#2983](https://github.com/libp2p/js-libp2p/issues/2983)) ([2b49a5f](https://github.com/libp2p/js-libp2p/commit/2b49a5f74e8c79d571396e8a6a70f904b73763f2))
* replace mafmt with @multiformats/multiaddr-matcher ([#2791](https://github.com/libp2p/js-libp2p/issues/2791)) ([a5cd8cf](https://github.com/libp2p/js-libp2p/commit/a5cd8cfbe7d150659012879239ef2ef4ac3143c9))
* return empty address list during listen operation ([#2904](https://github.com/libp2p/js-libp2p/issues/2904)) ([ae75570](https://github.com/libp2p/js-libp2p/commit/ae75570c852fa9bfe00910dca1c219fa585dcb83)), closes [#2902](https://github.com/libp2p/js-libp2p/issues/2902)
* scope logging to connection and stream ([#3215](https://github.com/libp2p/js-libp2p/issues/3215)) ([ce6b542](https://github.com/libp2p/js-libp2p/commit/ce6b542a8ea3d42e2238f910cf2a113370515058))
* update error logs to use %e token ([#3261](https://github.com/libp2p/js-libp2p/issues/3261)) ([e10c5c0](https://github.com/libp2p/js-libp2p/commit/e10c5c0c51876ab83da51d558ee4789fc3c38a49))
* update multiaddr ([#3184](https://github.com/libp2p/js-libp2p/issues/3184)) ([6c42ea6](https://github.com/libp2p/js-libp2p/commit/6c42ea64a6e22028a87ecb3422e418e99ff09279))
* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))
* update race-signal ([#2986](https://github.com/libp2p/js-libp2p/issues/2986)) ([2a3cec9](https://github.com/libp2p/js-libp2p/commit/2a3cec9220f1250b7558635c4cb37d61f745645d)), closes [#2702](https://github.com/libp2p/js-libp2p/issues/2702)
* use getThinWaistAddresss function ([#3047](https://github.com/libp2p/js-libp2p/issues/3047)) ([a7ab9a4](https://github.com/libp2p/js-libp2p/commit/a7ab9a41b97504695d10045c1d50b2a610d69c24))


### Documentation

* update spell check ([#2999](https://github.com/libp2p/js-libp2p/issues/2999)) ([6f8cfea](https://github.com/libp2p/js-libp2p/commit/6f8cfeafb2f6ddc231a85ca369fb33cf759940f7))
* update typedoc config ([#3146](https://github.com/libp2p/js-libp2p/issues/3146)) ([14dbebe](https://github.com/libp2p/js-libp2p/commit/14dbebea8bd17addadac730afec0fa3b1cc6334a))


### Dependencies

* bump aegir from 43.0.3 to 44.0.1 ([#2603](https://github.com/libp2p/js-libp2p/issues/2603)) ([944935f](https://github.com/libp2p/js-libp2p/commit/944935f8dbcc1083e4cb4a02b49a0aab3083d3d9))
* bump sinon from 19.0.5 to 20.0.0 ([#3112](https://github.com/libp2p/js-libp2p/issues/3112)) ([d1ce677](https://github.com/libp2p/js-libp2p/commit/d1ce6774d8f7c338f15a05f80d09e361d21e7586))
* update @multiformats/multiaddr to 13.x.x ([#3268](https://github.com/libp2p/js-libp2p/issues/3268)) ([b8ecade](https://github.com/libp2p/js-libp2p/commit/b8ecade2a725d38d11dd8df888c5abb22e14f26b))
* update @multiformats/multiaddr-matcher dep to 2.x.x ([#3208](https://github.com/libp2p/js-libp2p/issues/3208)) ([57e7fa4](https://github.com/libp2p/js-libp2p/commit/57e7fa4413a0e19799b5917bad6743800c77e1f7))
* update aegir, fix all linting issues ([#3110](https://github.com/libp2p/js-libp2p/issues/3110)) ([510b033](https://github.com/libp2p/js-libp2p/commit/510b033f6b15358c7fae21486c3b09e730aa26cd))
* update p-event, p-wait-for and noble deps ([#3302](https://github.com/libp2p/js-libp2p/issues/3302)) ([55bbd8c](https://github.com/libp2p/js-libp2p/commit/55bbd8cde12fe1c05e8d264e6e2406ca9fe2f044))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^3.1.0 to ^4.0.0
    * @libp2p/utils bumped from ^7.0.7 to ^8.0.0
  * devDependencies
    * @libp2p/logger bumped from ^6.2.0 to ^7.0.0
</details>

<details><summary>webtransport: 7.0.0</summary>

## [7.0.0](https://github.com/libp2p/js-libp2p/compare/webtransport-v6.0.9...webtransport-v7.0.0) (2025-10-29)


###   BREAKING CHANGES

* requires @mulitformats/multiaddr 13.x.x or later
* - Stream handlers accept `stream, connection`, not `{ stream, connection }`
* the `connectionEncryption` option has been renamed `connectionEncrypters`
* - `@libp2p/peer-id-factory` has been removed, use `generateKeyPair` and `peerIdFromPrivateKey` instead
* the final argument to `secureOutbound` and `secureInbound` in the `ConnectionEncrypter` interface is now an options object
* the autodialer has been removed as well as the corresponding config keys
* The `.code` property has been removed from most errors, use `.name` instead
* removes `localPeer: PeerId` first parameter from `secureInbound` and `secureOutbound` in `ConnectionEncrypter`

### Features

* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)
* use `.name` property instead of `.code` for errors ([#2655](https://github.com/libp2p/js-libp2p/issues/2655)) ([0d20426](https://github.com/libp2p/js-libp2p/commit/0d20426fd5ea19b03345c70289bbd692e4348e1f))


### Bug Fixes

* .d.ts is in ./dist folder ([#3018](https://github.com/libp2p/js-libp2p/issues/3018)) ([52a46ec](https://github.com/libp2p/js-libp2p/commit/52a46ecad0d2ccd88eaf6190a1d6d67d388fd11b))
* bump noise version ([#3306](https://github.com/libp2p/js-libp2p/issues/3306)) ([71e8ee1](https://github.com/libp2p/js-libp2p/commit/71e8ee1632fdeaff5d6c33a38ae6df02ea69f579))
* ensure that the upgrader applies timeouts to incoming dials ([#3000](https://github.com/libp2p/js-libp2p/issues/3000)) ([90cca82](https://github.com/libp2p/js-libp2p/commit/90cca822b4cb112fc71bf9ad954023de685a9040))
* make connection securing abortable ([#2662](https://github.com/libp2p/js-libp2p/issues/2662)) ([51f7b57](https://github.com/libp2p/js-libp2p/commit/51f7b570c3a5bae8dd7da7edbc4145893328400e))
* pass upgrader to noise ([#3035](https://github.com/libp2p/js-libp2p/issues/3035)) ([a6c9aee](https://github.com/libp2p/js-libp2p/commit/a6c9aee5a8a4c3507702d2f63ac02a36316ef13f))
* remove autodialer ([#2639](https://github.com/libp2p/js-libp2p/issues/2639)) ([ab90179](https://github.com/libp2p/js-libp2p/commit/ab901790810d8ce59724af1706c9a9e74341b8ee))
* remove localPeer from secureInbound and secureOutbound ([#2304](https://github.com/libp2p/js-libp2p/issues/2304)) ([b435a21](https://github.com/libp2p/js-libp2p/commit/b435a214cf342c6015f474d26143fc27f0f673e9))
* remove patches for gossipsub, noise and the daemon modules ([#2694](https://github.com/libp2p/js-libp2p/issues/2694)) ([7cd9845](https://github.com/libp2p/js-libp2p/commit/7cd984569dbf0046861ec84e8e030ef62725fd14))
* remove private key field from peer id ([#2660](https://github.com/libp2p/js-libp2p/issues/2660)) ([3eeb0c7](https://github.com/libp2p/js-libp2p/commit/3eeb0c705bd58285a6e1ec9fcbb6987c5959d504)), closes [#2659](https://github.com/libp2p/js-libp2p/issues/2659)
* rename connectionEncryption option to connectionEncrypters ([#2691](https://github.com/libp2p/js-libp2p/issues/2691)) ([6d72709](https://github.com/libp2p/js-libp2p/commit/6d72709ba5959388777610e2f71b8ba9522139b6))
* scope logging to connection and stream ([#3215](https://github.com/libp2p/js-libp2p/issues/3215)) ([ce6b542](https://github.com/libp2p/js-libp2p/commit/ce6b542a8ea3d42e2238f910cf2a113370515058))
* skip muxer negotiation ([#3084](https://github.com/libp2p/js-libp2p/issues/3084)) ([6f96de8](https://github.com/libp2p/js-libp2p/commit/6f96de86cc951910211e21393117a1ffe96ee588))
* update error logs to use %e token ([#3261](https://github.com/libp2p/js-libp2p/issues/3261)) ([e10c5c0](https://github.com/libp2p/js-libp2p/commit/e10c5c0c51876ab83da51d558ee4789fc3c38a49))
* update multiaddr ([#3184](https://github.com/libp2p/js-libp2p/issues/3184)) ([6c42ea6](https://github.com/libp2p/js-libp2p/commit/6c42ea64a6e22028a87ecb3422e418e99ff09279))
* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))
* update race-signal ([#2986](https://github.com/libp2p/js-libp2p/issues/2986)) ([2a3cec9](https://github.com/libp2p/js-libp2p/commit/2a3cec9220f1250b7558635c4cb37d61f745645d)), closes [#2702](https://github.com/libp2p/js-libp2p/issues/2702)
* use @chainsafe/libp2p-noise and @chainsafe/libp2p-yamux ([#3308](https://github.com/libp2p/js-libp2p/issues/3308)) ([425a42c](https://github.com/libp2p/js-libp2p/commit/425a42cddac5aac4d0ac822295cc4c4817dcdc95))


### Documentation

* remove mplex from docs ([b6681bd](https://github.com/libp2p/js-libp2p/commit/b6681bd2505ac2749192042c3f16b14a88a8656d))
* update spell check ([#2999](https://github.com/libp2p/js-libp2p/issues/2999)) ([6f8cfea](https://github.com/libp2p/js-libp2p/commit/6f8cfeafb2f6ddc231a85ca369fb33cf759940f7))
* update typedoc config ([#3146](https://github.com/libp2p/js-libp2p/issues/3146)) ([14dbebe](https://github.com/libp2p/js-libp2p/commit/14dbebea8bd17addadac730afec0fa3b1cc6334a))


### Dependencies

* bump aegir from 43.0.3 to 44.0.1 ([#2603](https://github.com/libp2p/js-libp2p/issues/2603)) ([944935f](https://github.com/libp2p/js-libp2p/commit/944935f8dbcc1083e4cb4a02b49a0aab3083d3d9))
* update @multiformats/multiaddr to 13.x.x ([#3268](https://github.com/libp2p/js-libp2p/issues/3268)) ([b8ecade](https://github.com/libp2p/js-libp2p/commit/b8ecade2a725d38d11dd8df888c5abb22e14f26b))
* update @multiformats/multiaddr-matcher dep to 2.x.x ([#3208](https://github.com/libp2p/js-libp2p/issues/3208)) ([57e7fa4](https://github.com/libp2p/js-libp2p/commit/57e7fa4413a0e19799b5917bad6743800c77e1f7))
* update aegir, fix all linting issues ([#3110](https://github.com/libp2p/js-libp2p/issues/3110)) ([510b033](https://github.com/libp2p/js-libp2p/commit/510b033f6b15358c7fae21486c3b09e730aa26cd))
* update p-event, p-wait-for and noble deps ([#3302](https://github.com/libp2p/js-libp2p/issues/3302)) ([55bbd8c](https://github.com/libp2p/js-libp2p/commit/55bbd8cde12fe1c05e8d264e6e2406ca9fe2f044))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^3.1.0 to ^4.0.0
    * @libp2p/peer-id bumped from ^6.0.4 to ^7.0.0
    * @libp2p/utils bumped from ^7.0.7 to ^8.0.0
  * devDependencies
    * @libp2p/crypto bumped from ^5.1.13 to ^6.0.0
    * @libp2p/daemon-client bumped from ^10.0.9 to ^11.0.0
    * @libp2p/logger bumped from ^6.2.0 to ^7.0.0
    * @libp2p/ping bumped from ^3.0.7 to ^4.0.0
    * libp2p bumped from ^3.1.0 to ^4.0.0
</details>

<details><summary>libp2p: 4.0.0</summary>

## [4.0.0](https://github.com/libp2p/js-libp2p/compare/libp2p-v3.1.0...libp2p-v4.0.0) (2025-10-29)


###   BREAKING CHANGES

* merge-options has been removed from `@libp2p/utils`
* the `@libp2p/pubsub` module has been removed
* All props and methods flagged as deprecated and for removal have been removed
* requires @mulitformats/multiaddr 13.x.x or later
* - Stream handlers accept `stream, connection`, not `{ stream, connection }`
* the `connectionEncryption` option has been renamed `connectionEncrypters`
* instead of `CodeError`, use `TimeoutError`, `UnexpectedPeerError`, etc
* - `@libp2p/peer-id-factory` has been removed, use `generateKeyPair` and `peerIdFromPrivateKey` instead
* the final argument to `secureOutbound` and `secureInbound` in the `ConnectionEncrypter` interface is now an options object
* the autodialer has been removed as well as the corresponding config keys
* The `.code` property has been removed from most errors, use `.name` instead
* removes `localPeer: PeerId` first parameter from `secureInbound` and `secureOutbound` in `ConnectionEncrypter`
* * The `notifyOnTransient` property of `libp2p.register` has been renamed `notifyOnLimitedConnection`
* `@libp2p/interface` no longer exports a `CustomEvent` polyfill

### Features

* add append announce addresses ([#2834](https://github.com/libp2p/js-libp2p/issues/2834)) ([b248eef](https://github.com/libp2p/js-libp2p/commit/b248eefc01e6034c211b0d458d0ce7a74e99c24f))
* add connection monitor ([#2644](https://github.com/libp2p/js-libp2p/issues/2644)) ([7939dbd](https://github.com/libp2p/js-libp2p/commit/7939dbd5cbab1c7b4be671ff976d0258e9b48178))
* add dns mappings to address manager ([#2818](https://github.com/libp2p/js-libp2p/issues/2818)) ([7dcabb8](https://github.com/libp2p/js-libp2p/commit/7dcabb884c37dfba69e3ce427544ab05209d137b))
* add isLibp2p function for type guarding ([#3211](https://github.com/libp2p/js-libp2p/issues/3211)) ([87e5d59](https://github.com/libp2p/js-libp2p/commit/87e5d5938368fee2b34ed386ab42294307f9bf6e))
* add pending connections count to metrics ([#2713](https://github.com/libp2p/js-libp2p/issues/2713)) ([b3272cf](https://github.com/libp2p/js-libp2p/commit/b3272cfce13a56ea2302e5a6fe5dd0743c109cf7))
* add reprovide ([#2785](https://github.com/libp2p/js-libp2p/issues/2785)) ([52b3b1a](https://github.com/libp2p/js-libp2p/commit/52b3b1a16e56f73de9a75e7f62d5c3b367d757d9))
* add routing field to providers ([#3340](https://github.com/libp2p/js-libp2p/issues/3340)) ([0f3ab9e](https://github.com/libp2p/js-libp2p/commit/0f3ab9e617ab10fc09b108923c9d6e0fadd106a3))
* add traceFunction call to metrics ([#2898](https://github.com/libp2p/js-libp2p/issues/2898)) ([20d9ba7](https://github.com/libp2p/js-libp2p/commit/20d9ba73e2fc76e42327458b2a1e29d1ba162bba))
* allow adding external ip/port mapping ([#2836](https://github.com/libp2p/js-libp2p/issues/2836)) ([6ddc1b8](https://github.com/libp2p/js-libp2p/commit/6ddc1b80ebe396afee58082865ae6cae2bb39fb1))
* allow async stream handlers ([#3212](https://github.com/libp2p/js-libp2p/issues/3212)) ([cb1c14e](https://github.com/libp2p/js-libp2p/commit/cb1c14e628d2242988478c3bb856bea20db56bdc))
* allow early muxer selection by connection encrypters ([#3022](https://github.com/libp2p/js-libp2p/issues/3022)) ([dd71d8a](https://github.com/libp2p/js-libp2p/commit/dd71d8a86841acbccdca8f3e930bda0eced6d1d0))
* allow overriding stream handlers ([#2945](https://github.com/libp2p/js-libp2p/issues/2945)) ([21088c5](https://github.com/libp2p/js-libp2p/commit/21088c5195df2c3c371fc28bb824f5f84760bf12)), closes [#2928](https://github.com/libp2p/js-libp2p/issues/2928)
* allow transports to modify announce addresses ([#2978](https://github.com/libp2p/js-libp2p/issues/2978)) ([8331c8e](https://github.com/libp2p/js-libp2p/commit/8331c8ea8feef1d642b6667213409dbe8293b606))
* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)
* use `.name` property instead of `.code` for errors ([#2655](https://github.com/libp2p/js-libp2p/issues/2655)) ([0d20426](https://github.com/libp2p/js-libp2p/commit/0d20426fd5ea19b03345c70289bbd692e4348e1f))
* Use CIDR format for connection-manager allow/deny lists ([#2783](https://github.com/libp2p/js-libp2p/issues/2783)) ([48e9cfa](https://github.com/libp2p/js-libp2p/commit/48e9cfa56fdf9d2dcdc0efc758cf7f055106cbb5))


### Bug Fixes

* abort async operations ([#3152](https://github.com/libp2p/js-libp2p/issues/3152)) ([8efb065](https://github.com/libp2p/js-libp2p/commit/8efb065d216fc587605a01d0b2ff93259c7ff723))
* abort connection only when abortConnectionOnPingFailure is true ([#2684](https://github.com/libp2p/js-libp2p/issues/2684)) ([2022036](https://github.com/libp2p/js-libp2p/commit/2022036dfcbbd32289beac28f2fa4c1810f39f2b))
* accept custom ping protocol prefix in connection monitor ([#2667](https://github.com/libp2p/js-libp2p/issues/2667)) ([3c8dd5b](https://github.com/libp2p/js-libp2p/commit/3c8dd5bbfc57489a0b10b555c81e773058a58156))
* add multiaddr resolvers ([#3200](https://github.com/libp2p/js-libp2p/issues/3200)) ([1c1c49e](https://github.com/libp2p/js-libp2p/commit/1c1c49ef4f25dcd8925d134f7e185658c10d2d6b))
* add tracking for long-lived maps ([#3158](https://github.com/libp2p/js-libp2p/issues/3158)) ([3528df8](https://github.com/libp2p/js-libp2p/commit/3528df8295ed0ccceff5cfac6a3d35d8f2480765))
* allow connection gater classes ([#3281](https://github.com/libp2p/js-libp2p/issues/3281)) ([e1aaf4e](https://github.com/libp2p/js-libp2p/commit/e1aaf4ed0e77b9b33e273f36681a24b403e22ca8))
* allow empty error events ([#3082](https://github.com/libp2p/js-libp2p/issues/3082)) ([ae7d867](https://github.com/libp2p/js-libp2p/commit/ae7d867f25a7a730bbd551eb1167a6c148975d86))
* allow overriding mss mode ([#2924](https://github.com/libp2p/js-libp2p/issues/2924)) ([4bbcfa7](https://github.com/libp2p/js-libp2p/commit/4bbcfa707bba45a028429061ce44dec3dd7add34))
* allow partial routing implementations ([#3093](https://github.com/libp2p/js-libp2p/issues/3093)) ([772b401](https://github.com/libp2p/js-libp2p/commit/772b4011e18ab7bbfc5aeeefd9e13e168d5d9579))
* auto-confirm relay addresses ([#2886](https://github.com/libp2p/js-libp2p/issues/2886)) ([5c4a79e](https://github.com/libp2p/js-libp2p/commit/5c4a79e5a6e8d0db1ef6464075841a0b9de507ef)), closes [#2883](https://github.com/libp2p/js-libp2p/issues/2883)
* check for connection status before storing ([#2732](https://github.com/libp2p/js-libp2p/issues/2732)) ([7e4e6bd](https://github.com/libp2p/js-libp2p/commit/7e4e6bdbf3e735c4cffba7a398a50aa0664ae480))
* check for new addresses during dialing ([#3003](https://github.com/libp2p/js-libp2p/issues/3003)) ([be9b6a0](https://github.com/libp2p/js-libp2p/commit/be9b6a0708b82f97da00d1e94d74f38314cf1f4f))
* confirm dns mappings with ip mappings ([#2861](https://github.com/libp2p/js-libp2p/issues/2861)) ([0f87479](https://github.com/libp2p/js-libp2p/commit/0f8747950c26a47828c826b7f0a257bf95276b0f))
* connection monitor compatible with other ping implementations ([#2671](https://github.com/libp2p/js-libp2p/issues/2671)) ([7655e52](https://github.com/libp2p/js-libp2p/commit/7655e5200d32e7fe59387cedacb0fe640e260f1e))
* deduplicate typed event target ([#3170](https://github.com/libp2p/js-libp2p/issues/3170)) ([cc7b34c](https://github.com/libp2p/js-libp2p/commit/cc7b34c0fe3ac5745fd082ae0198b8742371a412))
* dial loopback addresses last ([#2982](https://github.com/libp2p/js-libp2p/issues/2982)) ([1ab50cc](https://github.com/libp2p/js-libp2p/commit/1ab50cc0d1ce19f629105b9e154be9f8571dba8d))
* do not close relay connection after WebRTC upgrade ([#3205](https://github.com/libp2p/js-libp2p/issues/3205)) ([cfe2be4](https://github.com/libp2p/js-libp2p/commit/cfe2be4c9319b68f8e68df8021b9ee3c1a7236fd))
* emit 'listening' when relays change ([#2758](https://github.com/libp2p/js-libp2p/issues/2758)) ([0d326d1](https://github.com/libp2p/js-libp2p/commit/0d326d102e4f6bf06c6f3e961a3b6b5844486495))
* ensure that the upgrader applies timeouts to incoming dials ([#3000](https://github.com/libp2p/js-libp2p/issues/3000)) ([90cca82](https://github.com/libp2p/js-libp2p/commit/90cca822b4cb112fc71bf9ad954023de685a9040))
* ensure user dial signals are respected ([#2842](https://github.com/libp2p/js-libp2p/issues/2842)) ([bc90b4f](https://github.com/libp2p/js-libp2p/commit/bc90b4fd58aee1ccd94d4fd61cc48d336e77d772))
* export transiently referenced types ([#2717](https://github.com/libp2p/js-libp2p/issues/2717)) ([7f7ec82](https://github.com/libp2p/js-libp2p/commit/7f7ec82ae4ee7761360bdfdd294de271feaf1841))
* handle dialing /p2p/Qmfoo-style addresses ([#3064](https://github.com/libp2p/js-libp2p/issues/3064)) ([bec05ed](https://github.com/libp2p/js-libp2p/commit/bec05ed48219f6ed9af4a4a7a13a1b4a462c3cee))
* handle router mappings of mixed IP version ([#2858](https://github.com/libp2p/js-libp2p/issues/2858)) ([f28c31d](https://github.com/libp2p/js-libp2p/commit/f28c31d803f13872ec151f8b5fe073aedc5dbcbf))
* ignore failures to listen on IPv6 addresses when IPv4 succeeds ([#3001](https://github.com/libp2p/js-libp2p/issues/3001)) ([e2f4943](https://github.com/libp2p/js-libp2p/commit/e2f49432b58fe3f8484c8f7f0237f996b4d211fa)), closes [#2977](https://github.com/libp2p/js-libp2p/issues/2977)
* import StreamHandler from interface ([#3037](https://github.com/libp2p/js-libp2p/issues/3037)) ([88b5c29](https://github.com/libp2p/js-libp2p/commit/88b5c29ed78b54e51c2a69094c8d9f2d41f2287c))
* improve error message when starting server ([#3008](https://github.com/libp2p/js-libp2p/issues/3008)) ([ab1bb86](https://github.com/libp2p/js-libp2p/commit/ab1bb862f3c22059c8d3c7f750ceab0755a0a0f2))
* include platform in user agent ([#2942](https://github.com/libp2p/js-libp2p/issues/2942)) ([96f14e4](https://github.com/libp2p/js-libp2p/commit/96f14e429eac84d02504c4b97f183511c8af2add))
* increase default adaptive timeout ([#3104](https://github.com/libp2p/js-libp2p/issues/3104)) ([a01606e](https://github.com/libp2p/js-libp2p/commit/a01606e1a370843f5bc3cf0b1a45d6f5eac96194))
* limit observed addresses in address manager ([#2869](https://github.com/libp2p/js-libp2p/issues/2869)) ([06f79b6](https://github.com/libp2p/js-libp2p/commit/06f79b6466fa8f6656676a71a5b90e6071825303))
* make connection securing abortable ([#2662](https://github.com/libp2p/js-libp2p/issues/2662)) ([51f7b57](https://github.com/libp2p/js-libp2p/commit/51f7b570c3a5bae8dd7da7edbc4145893328400e))
* only update pending incoming connections if connection accepted ([#2790](https://github.com/libp2p/js-libp2p/issues/2790)) ([d34642d](https://github.com/libp2p/js-libp2p/commit/d34642db1c2be39a74fe7cf21508eb17c19c8a22))
* override user agent in exports map ([#2952](https://github.com/libp2p/js-libp2p/issues/2952)) ([d8f003e](https://github.com/libp2p/js-libp2p/commit/d8f003e6e512fb3cff46ab167e7cd4f521c13f1b))
* pass abort signal to peer routing query ([#2888](https://github.com/libp2p/js-libp2p/issues/2888)) ([3c63482](https://github.com/libp2p/js-libp2p/commit/3c63482e5587e0edabb5c215cb6e565ed4f1185e))
* pass metrics to peerstore ([#3164](https://github.com/libp2p/js-libp2p/issues/3164)) ([307d0ba](https://github.com/libp2p/js-libp2p/commit/307d0ba58b7301f3fc5f6c86066606d63b72c882))
* record outbound pending connections metric ([#2737](https://github.com/libp2p/js-libp2p/issues/2737)) ([d9c7e0f](https://github.com/libp2p/js-libp2p/commit/d9c7e0f7ec608bd5154f30ae7baa6f1d6020bdfc))
* remove autodialer ([#2639](https://github.com/libp2p/js-libp2p/issues/2639)) ([ab90179](https://github.com/libp2p/js-libp2p/commit/ab901790810d8ce59724af1706c9a9e74341b8ee))
* remove browser dial filter ([#2838](https://github.com/libp2p/js-libp2p/issues/2838)) ([d6cd25d](https://github.com/libp2p/js-libp2p/commit/d6cd25d0deca292420093d894edbfbc47b347e5d))
* remove CodeError class ([#2688](https://github.com/libp2p/js-libp2p/issues/2688)) ([81ebe4e](https://github.com/libp2p/js-libp2p/commit/81ebe4e47e82508a847bb3af0af36cc249b78765))
* remove CustomEvent export from `@libp2p/interface` ([#2656](https://github.com/libp2p/js-libp2p/issues/2656)) ([fab6fc9](https://github.com/libp2p/js-libp2p/commit/fab6fc960b6bc03a6bc00ae5a4b3551d7d080c73))
* remove deprecated code ([#3271](https://github.com/libp2p/js-libp2p/issues/3271)) ([6332556](https://github.com/libp2p/js-libp2p/commit/633255644eefb6bf9f739123b9cbd002c3d5a351))
* remove localPeer from secureInbound and secureOutbound ([#2304](https://github.com/libp2p/js-libp2p/issues/2304)) ([b435a21](https://github.com/libp2p/js-libp2p/commit/b435a214cf342c6015f474d26143fc27f0f673e9))
* remove merge-options ([#3294](https://github.com/libp2p/js-libp2p/issues/3294)) ([dc01b32](https://github.com/libp2p/js-libp2p/commit/dc01b3278f021c944594644629fbd449514aee35))
* remove patches for gossipsub, noise and the daemon modules ([#2694](https://github.com/libp2p/js-libp2p/issues/2694)) ([7cd9845](https://github.com/libp2p/js-libp2p/commit/7cd984569dbf0046861ec84e8e030ef62725fd14))
* remove private key field from peer id ([#2660](https://github.com/libp2p/js-libp2p/issues/2660)) ([3eeb0c7](https://github.com/libp2p/js-libp2p/commit/3eeb0c705bd58285a6e1ec9fcbb6987c5959d504)), closes [#2659](https://github.com/libp2p/js-libp2p/issues/2659)
* remove pubsub ([#3291](https://github.com/libp2p/js-libp2p/issues/3291)) ([9a9b11f](https://github.com/libp2p/js-libp2p/commit/9a9b11fd44cf91a67a85805882e210ab1bff7ef2))
* rename "transient" connections to "limited" ([#2645](https://github.com/libp2p/js-libp2p/issues/2645)) ([2988602](https://github.com/libp2p/js-libp2p/commit/29886022eddc8a793217b2c888beac8aef63f1be)), closes [#2622](https://github.com/libp2p/js-libp2p/issues/2622)
* rename connectionEncryption option to connectionEncrypters ([#2691](https://github.com/libp2p/js-libp2p/issues/2691)) ([6d72709](https://github.com/libp2p/js-libp2p/commit/6d72709ba5959388777610e2f71b8ba9522139b6))
* report dial errors to metrics ([#3165](https://github.com/libp2p/js-libp2p/issues/3165)) ([ec73d59](https://github.com/libp2p/js-libp2p/commit/ec73d59a68947cbedc3367deceec21a1e59f21db))
* report version correctly ([#2984](https://github.com/libp2p/js-libp2p/issues/2984)) ([9b1a379](https://github.com/libp2p/js-libp2p/commit/9b1a3791dc5a37f23d608f222fc6a48f999096a5))
* require confirmation of global unicast addresses ([#2876](https://github.com/libp2p/js-libp2p/issues/2876)) ([92cc740](https://github.com/libp2p/js-libp2p/commit/92cc740828963a4786ea83befe606dac4ba25e45))
* require external confirmation of public addresses ([#2867](https://github.com/libp2p/js-libp2p/issues/2867)) ([d19974d](https://github.com/libp2p/js-libp2p/commit/d19974d93a1015acfca95c2155dbcffc5fd6a6c0))
* respect dial signal and expose protocol negotiation timeouts ([#2956](https://github.com/libp2p/js-libp2p/issues/2956)) ([f9345a7](https://github.com/libp2p/js-libp2p/commit/f9345a7a10974edf47a61279360b57012aae2da0))
* scope logging to connection and stream ([#3215](https://github.com/libp2p/js-libp2p/issues/3215)) ([ce6b542](https://github.com/libp2p/js-libp2p/commit/ce6b542a8ea3d42e2238f910cf2a113370515058))
* set expires on observed address ([#2935](https://github.com/libp2p/js-libp2p/issues/2935)) ([d61cbac](https://github.com/libp2p/js-libp2p/commit/d61cbacec14b9cdc61984d3b9e67f20eec038c4e))
* simplify connection upgrade ([#2719](https://github.com/libp2p/js-libp2p/issues/2719)) ([c258b35](https://github.com/libp2p/js-libp2p/commit/c258b35af60eec906437129ab31201bfb9c80d16))
* sort addresses by transport before dial ([#2731](https://github.com/libp2p/js-libp2p/issues/2731)) ([dad979f](https://github.com/libp2p/js-libp2p/commit/dad979f9bf1181defb1a72de69b21f5b8d7fce5b))
* split error/operation metrics ([#2728](https://github.com/libp2p/js-libp2p/issues/2728)) ([0c59578](https://github.com/libp2p/js-libp2p/commit/0c5957836d1416566f18233f58c92e7db6ab5525))
* trigger self:peer:update when ip/dns mappings change ([#2839](https://github.com/libp2p/js-libp2p/issues/2839)) ([4a85eb0](https://github.com/libp2p/js-libp2p/commit/4a85eb033f7ea8461a10bc8b38bbc76d1383d1cc))
* update agent version ([#2845](https://github.com/libp2p/js-libp2p/issues/2845)) ([4761dd7](https://github.com/libp2p/js-libp2p/commit/4761dd701aec6620ee504cb9908fa2319971b79b))
* update append announce addresses ([#3085](https://github.com/libp2p/js-libp2p/issues/3085)) ([afa5c9f](https://github.com/libp2p/js-libp2p/commit/afa5c9f598297fef9a5dd50d856868f190629837)), closes [#3080](https://github.com/libp2p/js-libp2p/issues/3080)
* update error logs to use %e token ([#3261](https://github.com/libp2p/js-libp2p/issues/3261)) ([e10c5c0](https://github.com/libp2p/js-libp2p/commit/e10c5c0c51876ab83da51d558ee4789fc3c38a49))
* update multiaddr ([#3184](https://github.com/libp2p/js-libp2p/issues/3184)) ([6c42ea6](https://github.com/libp2p/js-libp2p/commit/6c42ea64a6e22028a87ecb3422e418e99ff09279))
* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))
* update race-signal ([#2986](https://github.com/libp2p/js-libp2p/issues/2986)) ([2a3cec9](https://github.com/libp2p/js-libp2p/commit/2a3cec9220f1250b7558635c4cb37d61f745645d)), closes [#2702](https://github.com/libp2p/js-libp2p/issues/2702)
* update stream deps ([#3055](https://github.com/libp2p/js-libp2p/issues/3055)) ([b2124c2](https://github.com/libp2p/js-libp2p/commit/b2124c2db02d7870b958f294da42ec79084818a3))
* upgrade observed address to ip mapping ([#2941](https://github.com/libp2p/js-libp2p/issues/2941)) ([d795be1](https://github.com/libp2p/js-libp2p/commit/d795be1870c07464d3bc2d1c00823074331c7432)), closes [#2929](https://github.com/libp2p/js-libp2p/issues/2929)
* use @chainsafe/libp2p-noise and @chainsafe/libp2p-yamux ([#3308](https://github.com/libp2p/js-libp2p/issues/3308)) ([425a42c](https://github.com/libp2p/js-libp2p/commit/425a42cddac5aac4d0ac822295cc4c4817dcdc95))
* use failure event instead of error ([#3219](https://github.com/libp2p/js-libp2p/issues/3219)) ([4420fad](https://github.com/libp2p/js-libp2p/commit/4420fad686921f887854e1b37ecd01f65b276e0d))
* use keep-alive as a tag prefix ([#2757](https://github.com/libp2p/js-libp2p/issues/2757)) ([29b47ad](https://github.com/libp2p/js-libp2p/commit/29b47adb47b48e9a2b01580bd0d50dc7c2be8fd6))


### Documentation

* add roadmap for 2024/early 25 ([#2754](https://github.com/libp2p/js-libp2p/issues/2754)) ([3bc9769](https://github.com/libp2p/js-libp2p/commit/3bc9769b8aff1e9bb3588905323a2bc6b7d7b7bf))
* add spellcheck to gh actions ([#2994](https://github.com/libp2p/js-libp2p/issues/2994)) ([5b084e9](https://github.com/libp2p/js-libp2p/commit/5b084e9682a572e82f7907714d7807b3b9856326))
* fix broken links ([#3282](https://github.com/libp2p/js-libp2p/issues/3282)) ([71b4c41](https://github.com/libp2p/js-libp2p/commit/71b4c41e5990db2b65067663120b14de1ad72f9d))
* remove mplex from docs ([b6681bd](https://github.com/libp2p/js-libp2p/commit/b6681bd2505ac2749192042c3f16b14a88a8656d))
* update comments in interface module and elsewhere ([#3107](https://github.com/libp2p/js-libp2p/issues/3107)) ([32627c8](https://github.com/libp2p/js-libp2p/commit/32627c8767587f7e8df88a700933ece6d5f5c3c4)), closes [#2112](https://github.com/libp2p/js-libp2p/issues/2112)
* update spell check ([#2999](https://github.com/libp2p/js-libp2p/issues/2999)) ([6f8cfea](https://github.com/libp2p/js-libp2p/commit/6f8cfeafb2f6ddc231a85ca369fb33cf759940f7))
* update typedoc config ([#3146](https://github.com/libp2p/js-libp2p/issues/3146)) ([14dbebe](https://github.com/libp2p/js-libp2p/commit/14dbebea8bd17addadac730afec0fa3b1cc6334a))


### Dependencies

* bump aegir from 43.0.3 to 44.0.1 ([#2603](https://github.com/libp2p/js-libp2p/issues/2603)) ([944935f](https://github.com/libp2p/js-libp2p/commit/944935f8dbcc1083e4cb4a02b49a0aab3083d3d9))
* bump it-length-prefixed from 9.1.1 to 10.0.1 ([#2962](https://github.com/libp2p/js-libp2p/issues/2962)) ([1fc0e26](https://github.com/libp2p/js-libp2p/commit/1fc0e26620d2fd9d752179ab4f6dcc7b6ed5ee5c))
* bump sinon from 19.0.5 to 20.0.0 ([#3112](https://github.com/libp2p/js-libp2p/issues/3112)) ([d1ce677](https://github.com/libp2p/js-libp2p/commit/d1ce6774d8f7c338f15a05f80d09e361d21e7586))
* update @multiformats/multiaddr to 13.x.x ([#3268](https://github.com/libp2p/js-libp2p/issues/3268)) ([b8ecade](https://github.com/libp2p/js-libp2p/commit/b8ecade2a725d38d11dd8df888c5abb22e14f26b))
* update @multiformats/multiaddr-matcher dep to 2.x.x ([#3208](https://github.com/libp2p/js-libp2p/issues/3208)) ([57e7fa4](https://github.com/libp2p/js-libp2p/commit/57e7fa4413a0e19799b5917bad6743800c77e1f7))
* update aegir, fix all linting issues ([#3110](https://github.com/libp2p/js-libp2p/issues/3110)) ([510b033](https://github.com/libp2p/js-libp2p/commit/510b033f6b15358c7fae21486c3b09e730aa26cd))
* update datastore ([#3326](https://github.com/libp2p/js-libp2p/issues/3326)) ([a0f9da2](https://github.com/libp2p/js-libp2p/commit/a0f9da212fcc8ac8d21da835e87c9225ae138fdd))
* update p-event, p-wait-for and noble deps ([#3302](https://github.com/libp2p/js-libp2p/issues/3302)) ([55bbd8c](https://github.com/libp2p/js-libp2p/commit/55bbd8cde12fe1c05e8d264e6e2406ca9fe2f044))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^5.1.13 to ^6.0.0
    * @libp2p/interface bumped from ^3.1.0 to ^4.0.0
    * @libp2p/interface-internal bumped from ^3.0.7 to ^4.0.0
    * @libp2p/logger bumped from ^6.2.0 to ^7.0.0
    * @libp2p/multistream-select bumped from ^7.0.7 to ^8.0.0
    * @libp2p/peer-collections bumped from ^7.0.7 to ^8.0.0
    * @libp2p/peer-id bumped from ^6.0.4 to ^7.0.0
    * @libp2p/peer-store bumped from ^12.0.7 to ^13.0.0
    * @libp2p/utils bumped from ^7.0.7 to ^8.0.0
</details>

---
This PR was generated with [Release Please](https://github.com/googleapis/release-please). See [documentation](https://github.com/googleapis/release-please#release-please).