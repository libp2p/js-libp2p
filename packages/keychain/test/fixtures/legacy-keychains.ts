/* spell-checker:disable */
/**
 * Datastores written by `@libp2p/keychain` 6.1.9, one per keychain
 * configuration. Values are stored verbatim so later keychain versions can be
 * tested against data written by this one. Do not regenerate.
 *
 * With a password, `pbkdf2(pass, dek)` gives a base64 string (`derivedDek`)
 * that is used as the password for each key: `/pkcs8/<name>` holds AES-GCM
 * ciphertext as multibase base64, or an encrypted PKCS#8 PEM for RSA keys.
 * Without a password the empty string is used.
 */

export interface LegacyKeychain {
  name: string
  init: { pass?: string, dek?: { hash: string, keyLength: number, iterationCount: number, salt: string } }
  dek?: { hash: string, keyLength: number, iterationCount: number, salt: string }
  derivedDek?: string
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
        id: 'QmaTZmT1cmU4ofQYeitL5gmtwH6yxmCpsctReYAZVoDyun',
        type: 'Ed25519',
        publicKey: 'CAESIKezw4iruz4EQjnLFkhdNkLcei7oBByCu/dXCIApWQbq'
      },
      {
        name: 'secp256k1-key',
        id: 'QmV8SQzcxiyCoJJsuEpzBNUUJbPFefQV1t8Pr959FonpqU',
        type: 'secp256k1',
        publicKey: 'CAISIQJm5XbuzDbvN2YyrWVjHBPIRtkoQ/PldhWe9RVgbaOq/Q'
      },
      {
        name: 'ecdsa-key',
        id: 'QmXvvm7JqM3aS5WY4FMM78bnJoyMyE9Z59NQcSHGi8PHye',
        type: 'ECDSA',
        publicKey: 'CAMSVzBVAgEBoAoGCCqGSM49AwEHoUQDQgAEfVuyly256/t+zNKH+SY494ot/0WGnKXGLE1FRFkyLxxHBaTThfsvFzHXiuYKTjZmGl/LIZ9Ynzrj35MDmvlImg'
      },
      {
        name: 'rsa-key',
        id: 'QmPDU5sygNJ51sD2YC4SYrjv1KggrtF7mNHKMJD34SZYbj',
        type: 'RSA',
        publicKey: 'CAASogEwgZ8wDQYJKoZIhvcNAQEBBQADgY0AMIGJAoGBANEYGNL0025lw5wDJhuTgNYIjPtuzCP0etaQJJEGUTeNDxCz8X05H3LTqOlB2PFSwJNQtRYuewZFAKkmckF/JGcuhX2ysf0ZB+2n6/ttGLwSMEmH1b0aOIAO5a6ZSNsw5oDfq/Z1+ldKN0PO83eTmBtqfjO/kcYSkvo1YyENnFg7AgMBAAE'
      }
    ],
    entries: {
      '/info/ecdsa-key': '{"name":"ecdsa-key","id":"QmXvvm7JqM3aS5WY4FMM78bnJoyMyE9Z59NQcSHGi8PHye"}',
      '/info/rsa-key': '{"name":"rsa-key","id":"QmPDU5sygNJ51sD2YC4SYrjv1KggrtF7mNHKMJD34SZYbj"}',
      '/info/secp256k1-key': '{"name":"secp256k1-key","id":"QmV8SQzcxiyCoJJsuEpzBNUUJbPFefQV1t8Pr959FonpqU"}',
      '/info/self': '{"name":"self","id":"QmaTZmT1cmU4ofQYeitL5gmtwH6yxmCpsctReYAZVoDyun"}',
      '/pkcs8/ecdsa-key': 'mzaC9SZb5rYWgJ2lsxTFRfsIxqdtOTTZfT2aEUK1ivUvnoRjPkbr0T1TtFvLURbWoSW274230QIqI7+DoF6+t5mzQPIbxevkJMr4onW5qrQJP9CrvYTdaWkBHDCSXNWz9o75u0VEVqIvNNbkaT4nRRgRuOfBwtm4ho0LMyLD1x01sENfd2t0kFZjBUXGH52kbaQXhSeFy2mXGEIoOwW59pByX52FZQO+qdg',
      '/pkcs8/rsa-key': '-----BEGIN ENCRYPTED PRIVATE KEY-----\nMIIC6DBiBgkqhkiG9w0BBQ0wVTA0BgkqhkiG9w0BBQwwJwQQDw2/LfC1nOpIreSS\nU6HRxgICJxACASAwDAYIKoZIhvcNAgsFADAdBglghkgBZQMEASoEEC+X1b2QTdbU\nLbPNhPytxzkEggKAy5BMuaAsAMpiY9U8Swg/BrDRo/aauZCcN9PfKVzA5v8XvfS8\ni5ZXsInsiFdN83vHKIkNaeFSs5n3CyUzT8MHG27VwaSF9sDQN8ADEyWy9+U73Cla\nYFMiLFjEbLgJfCuLpY8AOSlOE+w8N6x1SjacJ/lBJvo7Mq0p2a9Gb553cFB4xVqs\n61iERBJVOoKJGuXUPY8I+E1TuMei138f+1R9WC3ZJwH+Np5JBOTW2+4kMDJBdWOZ\nhXg6AtCW2kX//G7L2lZr25kYePumsS00Mx6oDu+5i3slbbN5Unq/ls9a9R4IQXDo\nqjMHzQnMVPitjVTqEPmrLjgkztrZQo1P2jUJ6IhFm6+jo5htdHJBiDmqSpeYQopV\nAPWzNuOOMEoT9grQK8wr3WibSaVGhLR3vMbGvbxJWry6SdnEELDThmbq5JaSrG9k\nAzQC9OAkdGZKN7qvHSBdMmD3e6ivRGR6O/ewf1Fze82HaT2PZgNLUHb1oCrQ3Ed7\nHjkzfbA0OgebGNr3lyRzRXsOfozGVi4J4XROa78AO05BlfPeNq0eRLrOP6IuYAOh\njiL6JNAAHrGcSsPhNX/5EihzgZKpRi4L/ZJzQgjFx+d77XLLQTM8nyHXOYVYNSW1\nolmb11WoEKwg9EMqv54DiwCM1EcNQ4qula2NNHJoRfmjxe30WYG18UhEZio10RGc\nSZ1wx+d9+igKpe8uQJIupdqdEfrry08ateVi4Z3q8aUQd28fqNy7BK2cXhrg9vA1\nSGDM/BrWXxywqYzhdozfraDcWKxiNLEBzQsEv6u+q8M2crbWv/Zac/n3mXl2SJg+\nY+7wmjmX8962MuHfJtcNmwyC2hFJfe1M/DGhQg==\n-----END ENCRYPTED PRIVATE KEY-----',
      '/pkcs8/secp256k1-key': 'mXMrucWGOPok04wiYple5i88v7RyAdDT5Znr6aXmclembArJ1MbQqg6aOdodauTOR2JUcy/Ep6Jv34sqtCqlO5cza3DakCkgmyXMfmLQzceU',
      '/pkcs8/self': 'mK1Y92THfWNbZCvIkRVl7ZVpa3d8y2eM4eSKvHX+JrYjwia6bYmiaUJxgYqC6szHDu59XHvFmlazvjCr2N6BuERueIdtBiVWtA37xzz8pV3cQM+SaPmAnNEYFab6wfkxLlkF90t5qijhQktdsjyFstw'
    }
  },
  {
    name: 'password with default dek',
    init: {
      pass: 'this is a fixture keychain password'
    },
    dek: {
      keyLength: 64,
      iterationCount: 10000,
      salt: 'you should override this value with a crypto secure random number',
      hash: 'sha2-512'
    },
    derivedDek: 'lpbSJIRM5J7JhYneFPtA9Ur4Aut3uee4GOxMrPqSbhcoIXsi+lcQXhEZjhVL/xFAuMrMPX4qTSMAK9xgoFyTow',
    keys: [
      {
        name: 'self',
        id: 'QmPteqfbCknH5XnCWnMHT1inLMYUWtHV1U3YgRzq2hv5yP',
        type: 'Ed25519',
        publicKey: 'CAESIFBpU8Eze8UnEFIHephw7fnmxZlREhvXWlqFDuPcVnVO'
      },
      {
        name: 'secp256k1-key',
        id: 'QmeDcm13xgFHftoiyYedaq9nT6ApegP8h3g5S1mR9DwR3e',
        type: 'secp256k1',
        publicKey: 'CAISIQLMiGqLIyCnWZxMX+WokMpo5pF6b3NEfLPW8OLwjDyH4A'
      },
      {
        name: 'ecdsa-key',
        id: 'QmWM2Ny4LurM2CzibkxZq1K19PbJnW7WzdVfmBsNan7mq3',
        type: 'ECDSA',
        publicKey: 'CAMSVzBVAgEBoAoGCCqGSM49AwEHoUQDQgAEpj2QzwhVzIfmxff55z4H2ElyrpjLbZgT4JFD5bEBpRGZZYR6/LkzmdKeiPuFuuvIxMGBpwarR113v54SGGikQg'
      },
      {
        name: 'rsa-key',
        id: 'QmTVvPNrw7by6sKV9trdionzcT91QyR2Jpi2biCieAEqXK',
        type: 'RSA',
        publicKey: 'CAASogEwgZ8wDQYJKoZIhvcNAQEBBQADgY0AMIGJAoGBANngESdg2Lusgz0Xztjamj6SMe+6jJj5ls84YBwuSANBR+fR2GoEEJyc67r4MAjPPhZGNcDqNamXaX0tuROZ9/mMXtdGz/3cShropr7uCAIfRpGURw2vVFbtxdhS9OkNfQqD6Q4cFggyzkgMQrLpW464tYI/j64HTOhLz0/qLgN1AgMBAAE'
      },
      {
        name: 'my key é.v2',
        id: 'QmdjBFWAsWbj41p4cTunQvbYSHihHTAjcQY37Wvm5daE64',
        type: 'Ed25519',
        publicKey: 'CAESIBDi9txNMabACyklADFDNbIZMdmR4QIKGTqrEUk5ILOo'
      }
    ],
    entries: {
      '/info/ecdsa-key': '{"name":"ecdsa-key","id":"QmWM2Ny4LurM2CzibkxZq1K19PbJnW7WzdVfmBsNan7mq3"}',
      '/info/my key é.v2': '{"name":"my key é.v2","id":"QmdjBFWAsWbj41p4cTunQvbYSHihHTAjcQY37Wvm5daE64"}',
      '/info/rsa-key': '{"name":"rsa-key","id":"QmTVvPNrw7by6sKV9trdionzcT91QyR2Jpi2biCieAEqXK"}',
      '/info/secp256k1-key': '{"name":"secp256k1-key","id":"QmeDcm13xgFHftoiyYedaq9nT6ApegP8h3g5S1mR9DwR3e"}',
      '/info/self': '{"name":"self","id":"QmPteqfbCknH5XnCWnMHT1inLMYUWtHV1U3YgRzq2hv5yP"}',
      '/pkcs8/ecdsa-key': 'meZttc7hq9fb9QC+808E7TUYdKSNCgdd+F6MOGXMUyloMsxngHwSYQc+v8giV8KJNa6acIxTN7Gs4d9JuqK+sJqnrq/I+lAThPuCMQ8DEH8Wxrx5GGu1S892e/2gHcY5dE7UcR04J7O3uT9UAPO520C2p6FRQcHWezgZbABOhRTTLC3H5L8s63S5yjk2ueDZlGZXwvknofeVpQhXIILMfgV9nF/+MhxfSjQ',
      '/pkcs8/my key é.v2': 'mjo2b/KX2Cse8zaaN8FnF4Bb94AhMftZySHWfB5uVR110QxMpb8ek+QZWK01Q7jTM148XJGPBF7rFEfJ0WREvloVwwGOV6Igmgx+ldUf9cuM4WQ4GiaA/lmdA1S5TQfFiWqz/nemhWSjUS/CBJBV3aQ',
      '/pkcs8/rsa-key': '-----BEGIN ENCRYPTED PRIVATE KEY-----\nMIIC6DBiBgkqhkiG9w0BBQ0wVTA0BgkqhkiG9w0BBQwwJwQQyrSZN9FwFqV6UVZN\nLlLLvgICJxACASAwDAYIKoZIhvcNAgsFADAdBglghkgBZQMEASoEEKg8m7dC21ZO\nozvxmtXgGAIEggKAIMrCtf/V8fjBzttto4ExrHv7YtXKjD19XftFmyJH56Yo93sr\ngKjpI5KtPX8vLJJu1t51VfsTZRZi8KsXnjdLRcfYwgbHcVHPoIkJh3Ymylvi8vN+\noys8emnvk9nht4qg3DHxY/rvzUxBkrwxwxavqwiZz8ZQ29qPLJqIinZyvM3h+ZgO\n+XpceFcFXVj9mc/Xcu+6PalReRresE+RtGeErfE1FyFLDRkjB/Ksce4O3NZUgR18\nErKinWG0Rnmd0hhKdC+Kty4CjHbwwz812WWC51vvqLpImEwjqV0nBb+2sVl/eOvx\nt6MmvAzNsYqr19Hi8NYATLv53C6VYnD1OEjGmxg/xo+23VCFcpBMyIqCkfaRbodH\nJJDUhkMc8DZyZhhhgTReU0fLJiY9E011FC2EMKAmFCNe5T2EVk/zKoH5jsHou4wF\nrMtUilVIHkea5wrPcpD3OkeIb8rdOtwR18L0Q7gvwwQp0MLhTWl3idi8S0bJVFao\nzBsq++n2/vZCwyVDbfWLOof4BkwfrkGeqXmm6UOVoC4M54qd3NjgqRl9ozDDXTGK\nYf3vqr7YUSUJ00akuqLSq13Os5vbpIpgKuSzFXjqCBpYaV9x/BPHofxJP4ZFDcS0\nTLlV8YyNZjjBERGXRwKpXLBGcDrHEFkl3sGrAPmerrh4fzOij+cQL7II7gwEyDPo\nYjjZ9nPX+0KdZuO+53MywQGwL38ulT2Qs0wzRMdNb3+cGQszZdMfsf2/NzLBnAOx\n6sRhfXUng5D62Ko1ZBkxKNjWGu4mBv/TO+oAxVR+ZyZ55hZqxQJ3yBRFkKu/sUhG\n7MBGhztvOQ1DEVLL/zvkRwAf32EJ2ti5n2hsPw==\n-----END ENCRYPTED PRIVATE KEY-----',
      '/pkcs8/secp256k1-key': 'mB0lIF34CECqmPu0GSeSx2g3Sy8NajHXnUuq8RjjV8gg18aSYVWZv6qm38cz2Q10I/rp5L33ZJhjL0T3ZanLXX6xa1aKvHf7qGM0tpGoKKRg',
      '/pkcs8/self': 'm5SAmRLfmpArEM8Hr803jT6Tj6c4aG6+M629gfHF1n/rOKv2l/Lu6Hj3IR/TSKOfaQi9V4iswX+e3Eg5p5/LEf4ikx2ZVWEpidtj2lGyqF9K+A3jEv0GcP1FM31mKRTEN/CwdR9ZPe8YVI3oYLyIEYA'
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
    dek: {
      keyLength: 32,
      iterationCount: 2000,
      salt: 'a custom fixture keychain salt',
      hash: 'sha2-256'
    },
    derivedDek: 'xpcRV3immk8LYH/JYtdWxMh6JNyQszPKDaJ4vBdqdZ8',
    keys: [
      {
        name: 'self',
        id: 'Qmf2MGzbWeyDSQBVnwkka5MZBqJnkLn682UJAtwJU5m5iG',
        type: 'Ed25519',
        publicKey: 'CAESIHveRRgQVocj2xNRaxYNz/y65TqwIyE6uwYtm7oupiCk'
      },
      {
        name: 'rsa-key',
        id: 'QmVUjp6Wqypcugs9McARbaforzdMTNzB5Z5SYWDNGJfCZH',
        type: 'RSA',
        publicKey: 'CAASogEwgZ8wDQYJKoZIhvcNAQEBBQADgY0AMIGJAoGBAJWiIWKnk8KPJjp2bww/0CptN0tgGTvql1EhepZdkqqUonpplAwA5inIpi4eEs2W/07/ClCd7RZZCGMH0moBphiQ26deLDiZlGSHzNiUUOCBXIjkgdLdzV4TMCRf6tyjeJVTcMqLRnwXFd+U+knFcmDXhtc/oQE3iG7sb7dK5nf3AgMBAAE'
      }
    ],
    entries: {
      '/info/rsa-key': '{"name":"rsa-key","id":"QmVUjp6Wqypcugs9McARbaforzdMTNzB5Z5SYWDNGJfCZH"}',
      '/info/self': '{"name":"self","id":"Qmf2MGzbWeyDSQBVnwkka5MZBqJnkLn682UJAtwJU5m5iG"}',
      '/pkcs8/rsa-key': '-----BEGIN ENCRYPTED PRIVATE KEY-----\nMIIC6DBiBgkqhkiG9w0BBQ0wVTA0BgkqhkiG9w0BBQwwJwQQEVGjtVeI4BWY7P8A\ntmQlkQICJxACASAwDAYIKoZIhvcNAgsFADAdBglghkgBZQMEASoEEMhyNaLGKiB4\n/mfQ+MpaXLYEggKA/wkxsu8HH6x2JXsvxSGmi4aFhuubaBiiszxszudMzC3Wm4sL\nF2iEYffvTs4job+DU6i5uz729kncsshIbX2SkqPVk7kiaJrN/UouDtkADt0BZPi2\nXaQNxaZM8n9G7Z5nl5kqL0gHQRx+oXg+R9k2ssMQjEpfYt3yhdgsKQRNya2pp2nW\nJselydp95+W/1YDc4+eeVCrDKhHc23Uobxb/aW/vxxSDPAQr25xRHgaRBG/f7XRq\nQ1r4MK9IcephJtAxjhxn0zEKOunMpySQuuZtQSDr8Pb4xZGGzpojVBbU5xZj2Zry\nLo8Omb7hb8attK6eaD++fMNMMTkCE4e7FsXUBV8l8cbH/Mzk0eroLPAbYvgk8L9Q\nlV4wRm8K75BJGONpx54zYSuRLYDFXfVi70sq8DUdSsL9LKXOlFs9bj5QsNIHETek\nkWuDC8ZQ4FdV30D97GbYXMhdRsFs2cUQM6MRFoZZ+OfM0ypJDPj0oGCPyZO4eglW\nz9ejuaJz44tmbaJ7LyazryymXipD6aN595bMHVHv5jKB15bREnk1Gbsc4QsV6gmK\n7qqySRueAMlaOVNyZw6dIkDArw97LAcG2pBTARgOl+x4mShKn6jS3Vx2toYSkzE9\nc1zwdIBCmwNa9fBS2BCOZGRUMG4n5H0iXOEBNn9PzxG/KrbP7ZtD8aos1QLm0jFg\nPCLQim/eDuPOp7tRCotL+NKbfTXli24J/E6dQUOzvyW5MxgwJOS16ZX3fXyfzGKM\nNAk8k75HTIjMPGZQfPKBfHRNVxO6pxkDW4sO8my/c7pHaPavFXSlUONbr1q+WYTI\nSquWuB/bG4VW4hJCISPbFLmJiop/Vvn3xEuBTA==\n-----END ENCRYPTED PRIVATE KEY-----',
      '/pkcs8/self': 'mINr2XznVJKol26ngn+VFVdsSj8uGcV5EC2T8hPv5CVoF30e9zuoaMDvFtZRNqYFn2yHhV1GgxbQXKDRvGG4wZOlG96tmdiYteh/PaOEzTaWlW3KTHWz7FCxxvAsENdqGX6KkuDrvMaxluh0c7EIg5w'
    }
  }
]
