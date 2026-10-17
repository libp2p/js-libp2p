/* spell-checker:disable */
/**
 * Datastores written by @libp2p/keychain 6.1.9, one per keychain
 * configuration. Values are stored verbatim so later keychain versions can be
 * tested against data written by this one. Do not regenerate.
 */

export interface LegacyKeychain {
  name: string
  init: { pass?: string, dek?: { hash: string, keyLength: number, iterationCount: number, salt: string } }
  keys: Array<{ name: string, id: string, type: string, publicKey: string }>
  entries: Record<string, string>
}

export const legacyKeychains: LegacyKeychain[] = [
  {
    name: 'no password',
    init: {},
    keys: [
      {
        name: 'self',
        id: 'QmXmJ5msbmAkY9PkhLDFaRZJZpqXUV4uQcVMjdXnZdcZfr',
        type: 'Ed25519',
        publicKey: 'CAESIJTRuwJhJKbkzlvsFOlRoCxKCaMl8SIiqBcEoXkKeQcV'
      },
      {
        name: 'secp256k1-key',
        id: 'QmawNT4BUiu6ixdrWNqwGvkQU24Z3hgou5e4EJft1XNMdZ',
        type: 'secp256k1',
        publicKey: 'CAISIQJTTZPHDQXgsI2rcTY0GUe083kZgcDM0ubzZSKCdSl4DA'
      },
      {
        name: 'ecdsa-key',
        id: 'QmZUDTHUk7aqfxhmpkax6wQ75JM5MWbwnCZRV4P7H8jtSP',
        type: 'ECDSA',
        publicKey: 'CAMSVzBVAgEBoAoGCCqGSM49AwEHoUQDQgAEiAGC3ilyk6QHqsyapaNUQXr2VOurJ9wg9AGZpLIi7UHBgkxxUq+a1oYOSSrBzoysrvrs14J7V9ZnjWcLy7rrfg'
      },
      {
        name: 'rsa-key',
        id: 'QmVfX8PGcGDDPHcrXc1NS16kDRuFFUQsGVcBE2gRreNhmg',
        type: 'RSA',
        publicKey: 'CAASogEwgZ8wDQYJKoZIhvcNAQEBBQADgY0AMIGJAoGBAL2nGx/aOZgu8rqVj2AhyWXWO53MMfB8kihfa7g1nTBYdEKpFEEs6tIWgq4avwZ99lvKERMymZdrfmdbdPSEmL1us/BoD6Zlt5MF3cAzofCYbOp8YY+gEwwMVz7eUZ8A4x4PEXT9WseXRFFQBqsmomfjGdsR1O6bzcNY5oJo5HXHAgMBAAE'
      }
    ],
    entries: {
      '/info/ecdsa-key': '{"name":"ecdsa-key","id":"QmZUDTHUk7aqfxhmpkax6wQ75JM5MWbwnCZRV4P7H8jtSP"}',
      '/info/rsa-key': '{"name":"rsa-key","id":"QmVfX8PGcGDDPHcrXc1NS16kDRuFFUQsGVcBE2gRreNhmg"}',
      '/info/secp256k1-key': '{"name":"secp256k1-key","id":"QmawNT4BUiu6ixdrWNqwGvkQU24Z3hgou5e4EJft1XNMdZ"}',
      '/info/self': '{"name":"self","id":"QmXmJ5msbmAkY9PkhLDFaRZJZpqXUV4uQcVMjdXnZdcZfr"}',
      '/pkcs8/ecdsa-key': 'mmZvshboSSFEOYBP/iau9+6Q6npaqfWdrbXljA7CRkmRkVyNKvTWfN/JgT/MvZBQSHmtjYWxMXx1OTzdUKSYtAMoY8tREX6M/IBBMJu6vvl0whomYjdnUHRldNXKqVVKEQ4NJH4eeDz2dQb8nccuVBNoXmsOLVNmTnBOLzd6OIIn+JdbB2nRiFqHbjTv0YKm3Fn/voL4V3yN5J0mAHfrEhiJ1+Cv+Lw7JhQ',
      '/pkcs8/rsa-key': '-----BEGIN ENCRYPTED PRIVATE KEY-----\nMIIC6DBiBgkqhkiG9w0BBQ0wVTA0BgkqhkiG9w0BBQwwJwQQx1so1ABJiQitetrE\nUhnyBAICJxACASAwDAYIKoZIhvcNAgsFADAdBglghkgBZQMEASoEEP7IiTRPR09x\nJOrY9CVDjzYEggKAvVfl+Yss/BPCuFrWW/P1EBrsnGMk6NfaSXioEG2v/kVfw+8l\nIIL4iPh9nau6TEMRIQp9votuVAPLa7NTo3EiGi83uTMkSfGXm5YZPZj9z54C1qU2\nfwV6l3b/YJsQafWE2FHuGszugcSk/8UD0o0HVAja7cuMHjLTMw4K2JS65Cgr1x2T\nWi5CXmkRuRc+mMEsYxm4hmMcHupIm3JaWSeEvOR5eXkwYI1MNMYcYhceN/IweizE\nF5IX95U/ecsepr62W54s0Wx3SJcJFe5wgpJugKdrpo7fCxlSEJl7Y6bVomsr31jJ\nhF1MDTIEUm7d9ckzEZEQNMDyUo6+BAso13sU8stI74hhB2sJAdWk0Vmsb1GgSyBM\niOQ52iqt8hDEzuYWc+vEL9yRVQoVw7AfcTZgVcqlKvavTXfXMPu/QdsEFx41hSEb\nyt/Vtssba5styKPlyZw3PXJtCmaiI2996ZROAvvNDMcJ/A6rrH5GI8B1HHizbta/\nXwBI9jJAB4cSBmMTXMCVh4FZR+ryvx3c339Vj6S1m+nzZlikfrSkQ501RvZzxvQ5\nhaHk5GVlbTAQhcZG71CBBr5ItBhGJO8S/7of5JOSBusAqaMitwruC0BurLYy0qZU\ncHY08CEXkv8VPT9tdaSU70RRfZkVgzqtVM5QHLOw6HmdRQvK3CLYpmiagPs8pA3M\n1PZP/nxjWKkGC5I1gbNNIFM7zqBY3EhVPlYgSeO3yJ/UMBTMwkwP9BQVKzEpDtqB\n4VztTQglgGAOug9FnDAKPQ88tVZ/QfG4+HVVl4LFNCQN3YK33ZwESzWA/xqNnhff\np5nxKlZaQeuowwEukvkWoLSTWRwc+9onmNLicg==\n-----END ENCRYPTED PRIVATE KEY-----',
      '/pkcs8/secp256k1-key': 'mYB/65ODdHNAPt1lbu0HBSwmH9uQR7lYJa996iAOdhAsCSe/pkjcb08qFYNMtx6AOb/d1RWpKDP1eULT18KZ40gap7IruH0WoLvZSmGBZP60',
      '/pkcs8/self': 'mxMZRXaCiF0D7jWKl3rsUMeyx7CLS7bNTwyC7DwRR1seFXc6bhQ74HvtLTafhjOa5zrtxKb17DOl8EGWOl68hp3msU8gWgeV9jZLTiDu64crYxoM8gtbNOMrxEONvjtrrYaHJCnvqmJWGSeoRwd0LrQ'
    }
  },
  {
    name: 'password with default dek',
    init: {
      pass: 'this is a fixture keychain password'
    },
    keys: [
      {
        name: 'self',
        id: 'QmSJ5gjuNXx8LqDk6yvEdntdn4V7HjCcyALd9DGXu1QpWa',
        type: 'Ed25519',
        publicKey: 'CAESIBv3GcbAKFXDum4I/UflxgMoO07kTbXNpB9lBqHPMbV5'
      },
      {
        name: 'secp256k1-key',
        id: 'QmVYg2sNuEs6hwAT3bA1EEd6u19vrEQvUUysucN25XqZ5o',
        type: 'secp256k1',
        publicKey: 'CAISIQN90KwnB7E2ewRzOUL70VE4WF6Oxs9MJYzi+I0StPSxNA'
      },
      {
        name: 'ecdsa-key',
        id: 'QmT4Mh2TnwXufWwY7FkbvWKJaAuVXkSpvpkEK8CKo22xCc',
        type: 'ECDSA',
        publicKey: 'CAMSVzBVAgEBoAoGCCqGSM49AwEHoUQDQgAEiNhBS+sTqEtYhBllpyH6o2Hac64d6w1qBsKyjQ8Z9W2ul9LOcrnakHqglgzfStky5OdEFXWO+1W4mKiS3qDD7w'
      },
      {
        name: 'rsa-key',
        id: 'QmRmFd3ZRyatExkVtE1KkUhdW6f1pJRjfjA4SJnEX9Gxqf',
        type: 'RSA',
        publicKey: 'CAASogEwgZ8wDQYJKoZIhvcNAQEBBQADgY0AMIGJAoGBAO5BwszoNvNBsDIy8lV+1xyGP3VA4TZNQhG4BH3cGMsgy25sUZmVdO8oY2v5tealpykeys0ONL/kuvPi7If/AR+1cNwbpniBXrv0eNp92qaetCnW9B9gvmy9lFZ9/+XTTVyzRqcbVrF1g7E9eAkxfLwtfaAQsgqwuKKRhxUk2EBnAgMBAAE'
      }
    ],
    entries: {
      '/info/ecdsa-key': '{"name":"ecdsa-key","id":"QmT4Mh2TnwXufWwY7FkbvWKJaAuVXkSpvpkEK8CKo22xCc"}',
      '/info/rsa-key': '{"name":"rsa-key","id":"QmRmFd3ZRyatExkVtE1KkUhdW6f1pJRjfjA4SJnEX9Gxqf"}',
      '/info/secp256k1-key': '{"name":"secp256k1-key","id":"QmVYg2sNuEs6hwAT3bA1EEd6u19vrEQvUUysucN25XqZ5o"}',
      '/info/self': '{"name":"self","id":"QmSJ5gjuNXx8LqDk6yvEdntdn4V7HjCcyALd9DGXu1QpWa"}',
      '/pkcs8/ecdsa-key': 'mRSmVo3NzqJuNF/ToycoLxtKRS0esEk637Rj9CPcAXmRSCU15IEBxPBBZCCFPhvWHp+G8tmYS/CQSqBv4F43obdj6kGhOIpu+JIqRuPEMEuqO/bpZaLm9Omj+viNfU4KeGQs3p/7rvPn1GKpIQRsGyTmM0npn3swB+bpVfAxPSGKKmVlk4jZKbwV7OIwEjrtFu3do0tiPP47NvkDgtEeZk+PQmhZFEGZQCg',
      '/pkcs8/rsa-key': '-----BEGIN ENCRYPTED PRIVATE KEY-----\nMIIC6DBiBgkqhkiG9w0BBQ0wVTA0BgkqhkiG9w0BBQwwJwQQJiZ1ITCJf5Qlzk0p\nzkjO2QICJxACASAwDAYIKoZIhvcNAgsFADAdBglghkgBZQMEASoEEKomqau7YIZs\nc1c2BATT91QEggKAy7xECCJ4lzoWNdVePiZsqV/vlV3wdKN0CBzWy7+32A3+U5bl\n4SADcbZSoODgvTnPpn5IxgvQ/dgTIEcC5y+REPsecGBy+gNmaLLNsy5zZpFrYgKR\nDwf7zymDn2D+Ze4ID+P34vjPRxZWkuvNYHDBrBc/mVKs9GHsyrTt8E5i3fCPJv41\nvxCyXEm7SpM/kW/Z6FIVusynIfukpFq2qIdAWv1KnpfmLajtYLecojhG/6gcX+26\nljHh+m/1INmx7JFROZ7eA+0j3eqyPRKZexNXh9XymAurQyOmi3n2YIxAfVoW7FoR\neCB9ujXH//66oNOV+6CCYyxIQg5yz6j29HqBxNacFMLOPlyUWgkNv+ryV4SZa/33\nzx/IlxfEaTUnH64lkKHuv9MNx69yD4Ex56Q7ls35sUxNPhvI4+m9mDQN7b3eX6HF\ndB6jbSLEl3bS+O9OGSxXYZAYLkc4SEnJtrlYSDnoX4JQL5PrOesUMDvTvmu84j3+\nLoIhIW1x2IVwcNF0qsrppGFWNawcJ7U7qi98L2SGCbyIHBYLfj0J7KfaMPWo28ll\nkQ8qMSqCjIhkAVQYMnR/hLYnLEdGD9+GRaDwo7TkXKiH0Ezj9acXKTs4Si8LLj5u\nM3L7O1yYvLZwb/FWKvFKJGAnC9sjHlFnWDeq2jHOW0/sUTTpurussrtrKKijNKWW\nKqpCAffjRqyNMxxvF4jY8FMcRmbbe7jCHP6IRFgmB2vPQx2MNiAzWjE7/UBqpbIV\nSO7HpWPAMLj1z6jM/OyEfWX/XAyxEWfcSgBV1LcpQxmU2EjFtCimmrU5TX8LKFfk\n8S1Ck+5FLeTcAHiK6jKkVhsflSK6ibXJlDt2UA==\n-----END ENCRYPTED PRIVATE KEY-----',
      '/pkcs8/secp256k1-key': 'm6CN8Zw2ust6ls9cxfS4qMS71DqubN1sdFi7WBxPAsi5KxvNKihaHdo3X6mTjrZbzOQVDd9ansLzCth5unLx3MrBlZUiw31I03BqwKiV5Dkk',
      '/pkcs8/self': 'mreJijjwyV/WRrEXD3uoBl+mI4A7U00SMG42e1neSzJHKjMMJvCVS3Ne5QBjaa7w8oJTV2iKlh4RT0siPZqTdBquuS4TcvwEIYDGwJQw1vEU3RZ1Kkw+vusWpEhLSXIR86nBZwkykj2VNHvDjzpJexA'
    }
  },
  {
    name: 'password with custom dek',
    init: {
      pass: 'this is a fixture keychain password',
      dek: {
        hash: 'sha2-256',
        keyLength: 32,
        iterationCount: 2000,
        salt: 'a custom fixture keychain salt'
      }
    },
    keys: [
      {
        name: 'self',
        id: 'QmXbjDyFQir6x7PFbhZghWQfXwcyJdxhdhHF8QGeeVzwot',
        type: 'Ed25519',
        publicKey: 'CAESIHgkTxT134T/4RJKq+cTb8SpICk0zRuTnopxAczQfMpC'
      },
      {
        name: 'rsa-key',
        id: 'QmdYZijf99H71P6xbdX9gxMAGiqfcPxh9NXM2kqNSNQJ9Q',
        type: 'RSA',
        publicKey: 'CAASogEwgZ8wDQYJKoZIhvcNAQEBBQADgY0AMIGJAoGBALnhb517ttWophDc2mpduQOGdSFLX8EF9oRP/RxYAibecMJukdgW6JQZqdvbDAH3Q3umYWkjlxxOL3d3rUE4nYlReTpcxhghb6OIr8742yk0IG1m/MNJk3g1mZJD6i/EOh/JlB96E8JdpE2zQByScN4d5pov1UPmP65DqBaFJJ1HAgMBAAE'
      }
    ],
    entries: {
      '/info/rsa-key': '{"name":"rsa-key","id":"QmdYZijf99H71P6xbdX9gxMAGiqfcPxh9NXM2kqNSNQJ9Q"}',
      '/info/self': '{"name":"self","id":"QmXbjDyFQir6x7PFbhZghWQfXwcyJdxhdhHF8QGeeVzwot"}',
      '/pkcs8/rsa-key': '-----BEGIN ENCRYPTED PRIVATE KEY-----\nMIIC6DBiBgkqhkiG9w0BBQ0wVTA0BgkqhkiG9w0BBQwwJwQQKRdN3oOWooooWnUx\nAc7TvwICJxACASAwDAYIKoZIhvcNAgsFADAdBglghkgBZQMEASoEELysdvWpZur2\nhDFkIHt2W3cEggKACOcnNdpssevNiRhUWL7TXIRpb0Hp9j9IiUSPcVT50nk0mupD\ngCk1HFim2vydQk4aRurNlLifoIb+0J5ZJ1gNuPr3eh/vulEUwhYiEktJbZ5IESYy\nNCcUqodoZ0TFprVg7n+UH0CS7Ta1mCk8BR9uwlGyWax9RVfXy9FqsZBMh510tOu6\nGz3GVAwC9fxemg3LHOB+xSTxItdMovhTw9Kuv/DrNPRso8vxZrfpOphdvpYnPN7c\nHhIiFSHNQaaY/VSpxMdNmsAEBQIESaBmrMSGDV9RJBXgoKbcDIx+bWGm/7ZC95rz\nd0CyKerecbyElxjAtDLSlM/RsVXHiPrU8RoauJGoF8CuHsM4FiN38VkDKK4OzYeW\nE8gxxkvPayWFI1IfhdoB8amPjlpf7lglbxt+RT1l495Md4+2VgPtUsGEH/fEyz0k\nSCtIeW6UQbhtVcZTKYplIOubiaKoquLpuJz+d2FY3t8OIxOGbSWZorys6yBV/64C\n7w7Z8+JTY2wHCvtgLLCywnyFMP232YxBr4+TzLTTAmdp6AjOhqpnEiKEBbW3hLJd\nih9iMWESZVr+ARLWUBOYQWg8Kcgr8g4uEo8yvHNryAZsoaSboWdDIPCHMRtlBxQO\n4b4cZRZWdRoBYRlQ97Gq/f3pwiIkG1JuqBzjcRbumfWzEnuPoXK43tnY1/gz/do5\nkW3YC/b4G1Dmfi/wREM1PNbLPrWi+YoCgEgW68AVge/QARnfbPRfYX5BBWqh8KxB\nzldNdG4opEc7J44ZkXWVPBDAXxLypzyO7pM+7rUdk3tsc2p5OMwCm3AiEatYYbs7\n1bWB9BFnadjQ1u/Mg9Dg+lxac9qodkEn7QYFhA==\n-----END ENCRYPTED PRIVATE KEY-----',
      '/pkcs8/self': 'mSACGewhK/kjj4O/bZS60va+cUdHVn5yHep3+cSOtRhYUc04vxxtR/CyDDkwy4ZFN86RxHodR7LixVfOiWrQtKJi3P0XKtXcrvPw9I7X+VqGU6dAx8AuCL30w6vt6iO6WkabXsBrDEHAl7Gnm4I/XgQ'
    }
  }
]
