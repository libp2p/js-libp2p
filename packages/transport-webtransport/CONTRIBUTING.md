# Contributing

## Running tests

Run `npm run test`.

### Running tests without IPv6

If you try to run these tests locally, and your machine does not support IPv6,
the tests will hang waiting on an ip6 address from the
`go-libp2p-webtransport-server`.

To get around this, you can set the environment variable `DISABLE_IPV6` to `true`
to prevent those tests from running. e.g. `DISABLE_IPV6=true npm run test`
