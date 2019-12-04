# js-libp2p Dialer

**Synopsis**
* All Dial Requests in js-libp2p must request a token(s) from the Dialer.
  * The number of tokens requested should be between 1 and the MAX_PER_PEER_DIALS max set in the Dialer.
  * If the number of available tokens is less than requested, the Dialer may return less than requested.
* The number of tokens a DialRequest obtains reflects the maximum number of parallel Multiaddr Dials it can make.
* If no tokens are available a DialRequest should immediately end and throw. This deviates from the existing queue system to avoid queue congestion and provide more visibility to users.
* As tokens are limited, DialRequests should be given a prioritized list of Multiaddrs to minimize the potential request time.
* Once a single Multiaddr Dial has succeeded, all pending dials in that Dial Request should be aborted. All tokens should be immediately released to the Dialer.
* If all Multiaddr Dials fail, or the DIAL_TIMEOUT max is reached for the entire DialRequest, all in progress dials for that DialRequest should be aborted. All tokens should immediately be released to the Dialer.
* If a Multiaddr Dial fails and there are no more dials to use its token, that token should be immediately released to the Dialer.

## Multiaddr Confidence

**Not Yet Implemented**

An effective dialing system should involve the inclusion of a Confidence system for Multiaddrs. This enables ranking of Multiaddrs so that a prioritized list can be passed to DialRequests to maximize usage of Dialer Tokens.

* All Multiaddrs SHOULD start with a confidence of 1 (give it some trust by default)
* A failed dial SHOULD lower the confidence by 1, to a min of 0.
* A successful dial SHOULD increase the confidence of a multiaddr by 1, to a max of 10.
* Multiaddrs of confidence 0 MAY be pruned if higher confidence addresses exist. If this is done, it should be done an an actual failure. Aborted dials SHOULD NOT be considered failures, but timeouts SHOULD.

## Notes

* A DialRequest gets a set of tokens from the Dialer, up to the MAX_PER_PEER_DIALS max.
* A DialRequest SHOULD release its tokens after the DIAL_TIMEOUT has expired. This ensures that a peer with a large set of hanging addresses, does not block future dials.
* Upon releasing the tokens, the Dialer may allocate them to another DialRequest.
* A DialRequest SHOULD fail if no dial tokens are available. The DialRequest MAY proceed without tokens, but this should be reserved for High Priority actions and should be rare.
* A DialRequest MUST NOT request more tokens than it has addresses to dial. Example: If the MAX_PER_PEER_DIALS max is 4 and a DialRequest has 1 address, it should only request 1 token.
* A DialRequest MUST execute parallel dials for each of its addresses up the total number of tokens it has.
* On a successful dial, the DialRequest MUST abort any other in progress dials, return the successful connection and release all tokens.
* A new DialRequest SHOULD be given a descending list of prioritized Multiaddrs, based on their confidence. Having higher confidence Multiaddrs first can help minimize the time a DialRequest is active.
* A failed dial to a Multiaddr SHOULD add that Multiaddr to a temporary denyList.
* A failed dial to a Multiaddr SHOULD lower the confidence of that Multiaddr.
* A successful dial to a Multiaddr SHOULD increase the confidence of that Multiaddr.
