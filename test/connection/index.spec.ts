import * as PeerIdFactory from '@libp2p/peer-id-factory'
import { multiaddr } from '@multiformats/multiaddr'
import { createConnection } from '../../src/connection/index.js'
import { pair } from './fixtures/pair.js'
import type { Stream } from '@libp2p/interface-connection'

const peers = [{
  id: 'QmNMMAqSxPetRS1cVMmutW5BCN1qQQyEr4u98kUvZjcfEw',
  privKey: 'CAASpQkwggShAgEAAoIBAQDPek2aeHMa0blL42RTKd6xgtkk4Zkldvq4LHxzcag5uXepiQzWANEUvoD3KcUTmMRmx14PvsxdLCNst7S2JSa0R2n5wSRs14zGy6892lx4H4tLBD1KSpQlJ6vabYM1CJhIQRG90BtzDPrJ/X1iJ2HA0PPDz0Mflam2QUMDDrU0IuV2m7gSCJ5r4EmMs3U0xnH/1gShkVx4ir0WUdoWf5KQUJOmLn1clTRHYPv4KL9A/E38+imNAXfkH3c2T7DrCcYRkZSpK+WecjMsH1dCX15hhhggNqfp3iulO1tGPxHjm7PDGTPUjpCWKpD5e50sLqsUwexac1ja6ktMfszIR+FPAgMBAAECggEAB2H2uPRoRCAKU+T3gO4QeoiJaYKNjIO7UCplE0aMEeHDnEjAKC1HQ1G0DRdzZ8sb0fxuIGlNpFMZv5iZ2ZFg2zFfV//DaAwTek9tIOpQOAYHUtgHxkj5FIlg2BjlflGb+ZY3J2XsVB+2HNHkUEXOeKn2wpTxcoJE07NmywkO8Zfr1OL5oPxOPlRN1gI4ffYH2LbfaQVtRhwONR2+fs5ISfubk5iKso6BX4moMYkxubYwZbpucvKKi/rIjUA3SK86wdCUnno1KbDfdXSgCiUlvxt/IbRFXFURQoTV6BOi3sP5crBLw8OiVubMr9/8WE6KzJ0R7hPd5+eeWvYiYnWj4QKBgQD6jRlAFo/MgPO5NZ/HRAk6LUG+fdEWexA+GGV7CwJI61W/Dpbn9ZswPDhRJKo3rquyDFVZPdd7+RlXYg1wpmp1k54z++L1srsgj72vlg4I8wkZ4YLBg0+zVgHlQ0kxnp16DvQdOgiRFvMUUMEgetsoIx1CQWTd67hTExGsW+WAZQKBgQDT/WaHWvwyq9oaZ8G7F/tfeuXvNTk3HIJdfbWGgRXB7lJ7Gf6FsX4x7PeERfL5a67JLV6JdiLLVuYC2CBhipqLqC2DB962aKMvxobQpSljBBZvZyqP1IGPoKskrSo+2mqpYkeCLbDMuJ1nujgMP7gqVjabs2zj6ACKmmpYH/oNowJ/T0ZVtvFsjkg+1VsiMupUARRQuPUWMwa9HOibM1NIZcoQV2NGXB5Z++kR6JqxQO0DZlKArrviclderUdY+UuuY4VRiSEprpPeoW7ZlbTku/Ap8QZpWNEzZorQDro7bnfBW91fX9/81ets/gCPGrfEn+58U3pdb9oleCOQc/ifpQKBgBTYGbi9bYbd9vgZs6bd2M2um+VFanbMytS+g5bSIn2LHXkVOT2UEkB+eGf9KML1n54QY/dIMmukA8HL1oNAyalpw+/aWj+9Ui5kauUhGEywHjSeBEVYM9UXizxz+m9rsoktLLLUI0o97NxCJzitG0Kub3gn0FEogsUeIc7AdinZAoGBANnM1vcteSQDs7x94TDEnvvqwSkA2UWyLidD2jXgE0PG4V6tTkK//QPBmC9eq6TIqXkzYlsErSw4XeKO91knFofmdBzzVh/ddgx/NufJV4tXF+a2iTpqYBUJiz9wpIKgf43/Ob+P1EA99GAhSdxz1ess9O2aTqf3ANzn6v6g62Pv',
  pubKey: 'CAASpgIwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDPek2aeHMa0blL42RTKd6xgtkk4Zkldvq4LHxzcag5uXepiQzWANEUvoD3KcUTmMRmx14PvsxdLCNst7S2JSa0R2n5wSRs14zGy6892lx4H4tLBD1KSpQlJ6vabYM1CJhIQRG90BtzDPrJ/X1iJ2HA0PPDz0Mflam2QUMDDrU0IuV2m7gSCJ5r4EmMs3U0xnH/1gShkVx4ir0WUdoWf5KQUJOmLn1clTRHYPv4KL9A/E38+imNAXfkH3c2T7DrCcYRkZSpK+WecjMsH1dCX15hhhggNqfp3iulO1tGPxHjm7PDGTPUjpCWKpD5e50sLqsUwexac1ja6ktMfszIR+FPAgMBAAE='
}, {
  id: 'QmW8rAgaaA6sRydK1k6vonShQME47aDxaFidbtMevWs73t',
  privKey: 'CAASpwkwggSjAgEAAoIBAQCTU3gVDv3SRXLOsFln9GEf1nJ/uCEDhOG10eC0H9l9IPpVxjuPT1ep+ykFUdvefq3D3q+W3hbmiHm81o8dYv26RxZIEioToUWp7Ec5M2B/niYoE93za9/ZDwJdl7eh2hNKwAdxTmdbXUPjkIU4vLyHKRFbJIn9X8w9djldz8hoUvC1BK4L1XrT6F2l0ruJXErH2ZwI1youfSzo87TdXIoFKdrQLuW6hOtDCGKTiS+ab/DkMODc6zl8N47Oczv7vjzoWOJMUJs1Pg0ZsD1zmISY38P0y/QyEhatZn0B8BmSWxlLQuukatzOepQI6k+HtfyAAjn4UEqnMaXTP1uwLldVAgMBAAECggEAHq2f8MqpYjLiAFZKl9IUs3uFZkEiZsgx9BmbMAb91Aec+WWJG4OLHrNVTG1KWp+IcaQablEa9bBvoToQnS7y5OpOon1d066egg7Ymfmv24NEMM5KRpktCNcOSA0CySpPIB6yrg6EiUr3ixiaFUGABKkxmwgVz/Q15IqM0ZMmCUsC174PMAz1COFZxD0ZX0zgHblOJQW3dc0X3XSzhht8vU02SMoVObQHQfeXEHv3K/RiVj/Ax0bTc5JVkT8dm8xksTtsFCNOzRBqFS6MYqX6U/u0Onz3Jm5Jt7fLWb5n97gZR4SleyGrqxYNb46d9X7mP0ie7E6bzFW0DsWBIeAqVQKBgQDW0We2L1n44yOvJaMs3evpj0nps13jWidt2I3RlZXjWzWHiYQfvhWUWqps/xZBnAYgnN/38xbKzHZeRNhrqOo+VB0WK1IYl0lZVE4l6TNKCsLsUfQzsb1pePkd1eRZA+TSqsi+I/IOQlQU7HA0bMrah/5FYyUBP0jYvCOvYTlZuwKBgQCvkcVRydVlzjUgv7lY5lYvT8IHV5iYO4Qkk2q6Wjv9VUKAJZauurMdiy05PboWfs5kbETdwFybXMBcknIvZO4ihxmwL8mcoNwDVZHI4bXapIKMTCyHgUKvJ9SeTcKGC7ZuQJ8mslRmYox/HloTOXEJgQgPRxXcwa3amzvdZI+6LwKBgQCLsnQqgxKUi0m6bdR2qf7vzTH4258z6X34rjpT0F5AEyF1edVFOz0XU/q+lQhpNEi7zqjLuvbYfSyA026WXKuwSsz7jMJ/oWqev/duKgAjp2npesY/E9gkjfobD+zGgoS9BzkyhXe1FCdP0A6L2S/1+zg88WOwMvJxl6/xLl24XwKBgCm60xSajX8yIQyUpWBM9yUtpueJ2Xotgz4ST+bVNbcEAddll8gWFiaqgug9FLLuFu5lkYTHiPtgc1RNdphvO+62/9MRuLDixwh/2TPO+iNqwKDKJjda8Nei9vVddCPaOtU/xNQ0xLzFJbG9LBmvqH9izOCcu8SJwGHaTcNUeJj/AoGADCJ26cY30c13F/8awAAmFYpZWCuTP5ppTsRmjd63ixlrqgkeLGpJ7kYb5fXkcTycRGYgP0e1kssBGcmE7DuG955fx3ZJESX3GQZ+XfMHvYGONwF1EiK1f0p6+GReC2VlQ7PIkoD9o0hojM6SnWvv9EXNjCPALEbfPFFvcniKVsE=',
  pubKey: 'CAASpgIwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCTU3gVDv3SRXLOsFln9GEf1nJ/uCEDhOG10eC0H9l9IPpVxjuPT1ep+ykFUdvefq3D3q+W3hbmiHm81o8dYv26RxZIEioToUWp7Ec5M2B/niYoE93za9/ZDwJdl7eh2hNKwAdxTmdbXUPjkIU4vLyHKRFbJIn9X8w9djldz8hoUvC1BK4L1XrT6F2l0ruJXErH2ZwI1youfSzo87TdXIoFKdrQLuW6hOtDCGKTiS+ab/DkMODc6zl8N47Oczv7vjzoWOJMUJs1Pg0ZsD1zmISY38P0y/QyEhatZn0B8BmSWxlLQuukatzOepQI6k+HtfyAAjn4UEqnMaXTP1uwLldVAgMBAAE='
}, {
  id: 'QmZqCdSzgpsmB3Qweb9s4fojAoqELWzqku21UVrqtVSKi4',
  privKey: 'CAASpgkwggSiAgEAAoIBAQCdbSEsTmw7lp5HagRcx57DaLiSUEkh4iBcKc7Y+jHICEIA8NIVi9FlfGEZj9G21FpiTR4Cy+BLVEuf8Nm90bym4iV+cSumeS21fvD8xGTEbeKGljs6OYHy3M45JhWF85gqHQJOqZufI2NRDuRgMZEO2+qGEXmSlv9mMXba/+9ecze8nSpB7bG2Z2pnKDeYwhF9Cz+ElMyn7TBWDjJERGVgFbTpdM3rBnbhB/TGpvs732QqZmIBlxnDb/Jn0l1gNZCgkEDcJ/0NDMBJTQ8vbvcdmaw3eaMPLkn1ix4wdu9QWCA0IBtuY1R7vSUtf4irnLJG7DnAw2GfM5QrF3xF1GLXAgMBAAECggEAQ1N0qHoxl5pmvqv8iaFlqLSUmx5y6GbI6CGJMQpvV9kQQU68yjItr3VuIXx8d/CBZyEMAK4oko7OeOyMcr3MLKLy3gyQWnXgsopDjhZ/8fH8uwps8g2+IZuFJrO+6LaxEPGvFu06fOiphPUVfn40R2KN/iBjGeox+AaXijmCqaV2vEdNJJPpMfz6VKZBDLTrbiqvo/3GN1U99PUqfPWpOWR29oAhh/Au6blSqvqTUPXB2+D/X6e1JXv31mxMPK68atDHSUjZWKB9lE4FMK1bkSKJRbyXmNIlbZ9V8X4/0r8/6T7JnW7ZT8ugRkquohmwgG7KkDXB1YsOCKXYUqzVYQKBgQDtnopFXWYl7XUyePJ/2MA5i7eoko9jmF44L31irqmHc5unNf6JlNBjlxTNx3WyfzhUzrn3c18psnGkqtow0tkBj5hmqn8/WaPbc5UA/5R1FNaNf8W5khn7MDm6KtYRPjN9djqTDiVHyC6ljONYd+5S+MqyKVWZ3t/xvG60sw85qwKBgQCpmpDtL+2JBwkfeUr3LyDcQxvbfzcv8lXj2otopWxWiLiZF1HzcqgAa2CIwu9kCGEt9Zr+9E4uINbe1To0b01/FhvR6xKO/ukceGA/mBB3vsKDcRmvpBUp+3SmnhY0nOk+ArQl4DhJ34k8pDM3EDPrixPf8SfVdU/8IM32lsdHhQKBgHLgpvCKCwxjFLnmBzcPzz8C8TOqR3BbBZIcQ34l+wflOGdKj1hsfaLoM8KYn6pAHzfBCd88A9Hg11hI0VuxVACRL5jS7NnvuGwsIOluppNEE8Ys86aXn7/0vLPoab3EWJhbRE48FIHzobmft3nZ4XpzlWs02JGfUp1IAC2UM9QpAoGAeWy3pZhSr2/iEC5+hUmwdQF2yEbj8+fDpkWo2VrVnX506uXPPkQwE1zM2Bz31t5I9OaJ+U5fSpcoPpDaAwBMs1fYwwlRWB8YNdHY1q6/23svN3uZsC4BGPV2JnO34iMUudilsRg+NGVdk5TbNejbwx7nM8Urh59djFzQGGMKeSECgYA0QMCARPpdMY50Mf2xQaCP7HfMJhESSPaBq9V3xY6ToEOEnXgAR5pNjnU85wnspHp+82r5XrKfEQlFxGpj2YA4DRRmn239sjDa29qP42UNAFg1+C3OvXTht1d5oOabaGhU0udwKmkEKUbb0bG5xPQJ5qeSJ5T1gLzLk3SIP0GlSw==',
  pubKey: 'CAASpgIwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCdbSEsTmw7lp5HagRcx57DaLiSUEkh4iBcKc7Y+jHICEIA8NIVi9FlfGEZj9G21FpiTR4Cy+BLVEuf8Nm90bym4iV+cSumeS21fvD8xGTEbeKGljs6OYHy3M45JhWF85gqHQJOqZufI2NRDuRgMZEO2+qGEXmSlv9mMXba/+9ecze8nSpB7bG2Z2pnKDeYwhF9Cz+ElMyn7TBWDjJERGVgFbTpdM3rBnbhB/TGpvs732QqZmIBlxnDb/Jn0l1gNZCgkEDcJ/0NDMBJTQ8vbvcdmaw3eaMPLkn1ix4wdu9QWCA0IBtuY1R7vSUtf4irnLJG7DnAw2GfM5QrF3xF1GLXAgMBAAE='
}, {
  id: 'QmR5VwgsL7jyfZHAGyp66tguVrQhCRQuRc3NokocsCZ3fA',
  privKey: 'CAASpwkwggSjAgEAAoIBAQCGXYU+uc2nn1zuJhfdFOl34upztnrD1gpHu58ousgHdGlGgYgbqLBAvIAauXdEL0+e30HofjA634SQxE+9nV+0FQBam1DDzHQlXsuwHV+2SKvSDkk4bVllMFpu2SJtts6VH+OXC/2ANJOm+eTALykQPYXgLIBxrhp/eD+Jz5r6wW2nq3k6OmYyK/4pgGzFjo5UyX+fa/171AJ68UPboFpDy6BZCcUjS0ondxPvD7cv5jMNqqMKIB/7rpi8n+Q3oeccRqVL56wH+FE3/QLjwYHwY6ILNRyvNXRqHjwBEXB2R5moXN0AFUWTw9rt3KhFiEjR1U81BTw5/xS7W2Iu0FgZAgMBAAECggEAS64HK8JZfE09eYGJNWPe8ECmD1C7quw21BpwVe+GVPSTizvQHswPohbKDMNj0srXDMPxCnNw1OgqcaOwyjsGuZaOoXoTroTM8nOHRIX27+PUqzaStS6aCG2IsiCozKUHjGTuupftS7XRaF4eIsUtWtFcQ1ytZ9pJYHypRQTi5NMSrTze5ThjnWxtHilK7gnBXik+aR0mYEVfSn13czQEC4rMOs+b9RAc/iibDNoLopfIdvmCCvfxzmySnR7Cu1iSUAONkir7PB+2Mt/qRFCH6P+jMamtCgQ8AmifXgVmDUlun+4MnKg3KrPd6ZjOEKhVe9mCHtGozk65RDREShfDdQKBgQDi+x2MuRa9peEMOHnOyXTS+v+MFcfmG0InsO08rFNBKZChLB+c9UHBdIvexpfBHigSyERfuDye4z6lxi8ZnierWMYJP30nxmrnxwTGTk1MQquhfs1A0kpmDnPsjlOS/drEIEIssNx2WbfJ7YtMxLWBtp+BJzGpQmr0LKC+NHRSrwKBgQCXiy2kJESIUkIs2ihV55hhT6/bZo1B1O5DPA2nkjOBXqXF6fvijzMDX82JjLd07lQZlI0n1Q/Hw0p4iYi9YVd2bLkLXF5UIb2qOeHj76enVFOrPHUSkC9Y2g/0Xs+60Ths2xRd8RrrfQU3kl5iVpBywkCIrb2M5+wRnNTk1W3TtwKBgQCvplyrteAfSurpJhs9JzE8w/hWU9SqAZYkWQp91W1oE95Um2yrbjBAoQxMjaqKS+f/APPIjy56Vqj4aHGyhW11b/Fw3qzfxvCcBKtxOs8eoMlo5FO6QgJJEA4tlcafDcvp0nzjUMqK28safLU7503+33B35fjMXxWdd5u9FaKfCQKBgC4W6j6tuRosymuRvgrCcRnHfpify/5loEFallyMnpWOD6Tt0OnK25z/GifnYDRz96gAAh5HMpFy18dpLOlMHamqz2yhHx8/U8vd5tHIJZlCkF/X91M5/uxrBccwvsT2tM6Got8fYSyVzWxlW8dUxIHiinYHQUsFjkqdBDLEpq5pAoGASoTw5RBEWFM0GuAZdXsyNyxU+4S+grkTS7WdW/Ymkukh+bJZbnvF9a6MkSehqXnknthmufonds2AFNS//63gixENsoOhzT5+2cdfc6tJECvJ9xXVXkf85AoQ6T/RrXF0W4m9yQyCngNJUrKUOIH3oDIfdZITlYzOC3u1ojj7VuQ=',
  pubKey: 'CAASpgIwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCGXYU+uc2nn1zuJhfdFOl34upztnrD1gpHu58ousgHdGlGgYgbqLBAvIAauXdEL0+e30HofjA634SQxE+9nV+0FQBam1DDzHQlXsuwHV+2SKvSDkk4bVllMFpu2SJtts6VH+OXC/2ANJOm+eTALykQPYXgLIBxrhp/eD+Jz5r6wW2nq3k6OmYyK/4pgGzFjo5UyX+fa/171AJ68UPboFpDy6BZCcUjS0ondxPvD7cv5jMNqqMKIB/7rpi8n+Q3oeccRqVL56wH+FE3/QLjwYHwY6ILNRyvNXRqHjwBEXB2R5moXN0AFUWTw9rt3KhFiEjR1U81BTw5/xS7W2Iu0FgZAgMBAAE='
}, {
  id: 'QmScLDqRg7H6ipCYxm9fVk152UWavQFKscTdoT4YNHxgqp',
  privKey: 'CAASpwkwggSjAgEAAoIBAQCWEHaTZ6LBLFP5OPrUqjDM/cF4b2zrfh1Zm3kd02ZtgQB3iYtZqRPJT5ctT3A7WdVF/7dCxPGOCkJlLekTx4Y4gD8JtjA+EfN9fR/2RBKbti2N3CD4vkGp9ss4hbBFcXIhl8zuD/ELHutbV6b8b4QXJGnxfp/B+1kNPnyd7SJznS0QyvI8OLI1nAkVKdYLDRW8kPKeHyx1xhdNDuTQVTFyAjRGQ4e3UYFB7bYIHW3E6kCtCoJDlj+JPC02Yt1LHzIzZVLvPvNFnYY2mag6OiGFuh/oMBIqvnPc1zRZ3eLUqeGZjQVaoR0kdgZUKz7Q2TBeNldxK/s6XO0DnkQTlelNAgMBAAECggEAdmt1dyswR2p4tdIeNpY7Pnj9JNIhTNDPznefI0dArCdBvBMhkVaYk6MoNIxcj6l7YOrDroAF8sXr0TZimMY6B/pERKCt/z1hPWTxRQBBAvnHhwvwRPq2jK6BfhAZoyM8IoBNKowP9mum5QUNdGV4Al8s73KyFX0IsCfgZSvNpRdlt+DzPh+hu/CyoZaMpRchJc1UmK8Fyk3KfO+m0DZNfHP5P08lXNfM6MZLgTJVVgERHyG+vBOzTd2RElMe19nVCzHwb3dPPRZSQ7Fnz3rA+GeLqsM2Zi4HNhfbD1OcD9C4wDj5tYL6hWTkdz4IlfVcjCeUHxgIOhdDV2K+OwbuAQKBgQD0FjUZ09UW2FQ/fitbvIB5f1SkXWPxTF9l6mAeuXhoGv2EtQUO4vq/PK6N08RjrZdWQy6UsqHgffi7lVQ8o3hvCKdbtf4sP+cM92OrY0WZV89os79ndj4tyvmnP8WojwRjt/2XEfgdoWcgWxW9DiYINTOQVimZX+X/3on4s8hEgQKBgQCdY3kOMbyQeLTRkqHXjVTY4ddO+v4S4wOUa1l4rTqAbq1W3JYWwoDQgFuIu3limIHmjnSJpCD4EioXFsM7p6csenoc20sHxsaHnJ6Mn5Te41UYmY9EW0otkQ0C3KbXM0hwQkjyplnEmZawGKmjEHW8DJ3vRYTv9TUCgYKxDHgOzQKBgB4A/NYH7BG61eBYKgxEx6YnuMfbkwV+Vdu5S8d7FQn3B2LgvZZu4FPRqcNVXLbEB+5ao8czjiKCWaj1Wj15+rvrXGcxn+Tglg5J+r5+nXeUC7LbJZQaPNp0MOwWMr3dlrSLUWjYlJ9Pz9VyXOG4c4Rexc/gR4zK9QLW4C7qKpwBAoGAZzyUb0cYlPtYQA+asTU3bnvVKy1f8yuNcZFowst+EDiI4u0WVh+HNzy6zdmLKa03p+/RaWeLaK0hhrubnEnAUmCUMNF3ScaM+u804LDcicc8TkKLwx7ObU0z56isl4RAA8K27tNHFrpYKXJD834cfBkaj5ReOrfw6Y/iFhhDuBECgYEA8gbC76uz7LSHhW30DSRTcqOzTyoe2oYKQaxuxYNp7vSSOkcdRen+mrdflDvud2q/zN2QdL4pgqdldHlR35M/lJ0f0B6zp74jlzbO9700wzsOqreezGc5eWiroDL100U9uIZ50BKb8CKtixIHpinUSPIUcVDkSAZ2y7mbfCxQwqQ=',
  pubKey: 'CAASpgIwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCWEHaTZ6LBLFP5OPrUqjDM/cF4b2zrfh1Zm3kd02ZtgQB3iYtZqRPJT5ctT3A7WdVF/7dCxPGOCkJlLekTx4Y4gD8JtjA+EfN9fR/2RBKbti2N3CD4vkGp9ss4hbBFcXIhl8zuD/ELHutbV6b8b4QXJGnxfp/B+1kNPnyd7SJznS0QyvI8OLI1nAkVKdYLDRW8kPKeHyx1xhdNDuTQVTFyAjRGQ4e3UYFB7bYIHW3E6kCtCoJDlj+JPC02Yt1LHzIzZVLvPvNFnYY2mag6OiGFuh/oMBIqvnPc1zRZ3eLUqeGZjQVaoR0kdgZUKz7Q2TBeNldxK/s6XO0DnkQTlelNAgMBAAE='
}, {
  id: 'QmckxVrJw1Yo8LqvmDJNUmdAsKtSbiKWmrXJFyKmUraBoN',
  privKey: 'CAASpwkwggSjAgEAAoIBAQC1/GFud/7xutux7qRfMj1sIdMRh99/chR6HqVj6LQqrgk4jil0mdN/LCk/tqPqmDtObHdmEhCoybzuhLbCKgUqryKDwO6yBJHSKWY9QqrKZtLJ37SgKwGjE3+NUD4r1dJHhtQrICFdOdSCBzs/v8gi+J+KZLHo7+Nms4z09ysy7qZh94Pd7cW4gmSMergqUeANLD9C0ERw1NXolswOW7Bi7UGr7yuBxejICLO3nkxe0OtpQBrYrqdCD9vs3t/HQZbPWVoiRj4VO7fxkAPKLl30HzcIfxj/ayg8NHcH59d08D+N2v5Sdh28gsiYKIPE9CXvuw//HUY2WVRY5fDC5JglAgMBAAECggEBAKb5aN/1w3pBqz/HqRMbQpYLNuD33M3PexBNPAy+P0iFpDo63bh5Rz+A4lvuFNmzUX70MFz7qENlzi6+n/zolxMB29YtWBUH8k904rTEjXXl//NviQgITZk106tx+4k2x5gPEm57LYGfBOdFAUzNhzDnE2LkXwRNzkS161f7zKwOEsaGWRscj6UvhO4MIFxjb32CVwt5eK4yOVqtyMs9u30K4Og+AZYTlhtm+bHg6ndCCBO6CQurCQ3jD6YOkT+L3MotKqt1kORpvzIB0ujZRf49Um8wlcjC5G9aexBeGriXaVdPF62zm7GA7RMsbQM/6aRbA1fEQXvJhHUNF9UFeaECgYEA8wCjKqQA7UQnHjRwTsktdwG6szfxd7z+5MTqHHTWhWzgcQLgdh5/dO/zanEoOThadMk5C1Bqjq96gH2xim8dg5XQofSVtV3Ui0dDa+XRB3E3fyY4D3RF5hHv85O0GcvQc6DIb+Ja1oOhvHowFB1C+CT3yEgwzX/EK9xpe+KtYAkCgYEAv7hCnj/DcZFU3fAfS+unBLuVoVJT/drxv66P686s7J8UM6tW+39yDBZ1IcwY9vHFepBvxY2fFfEeLI02QFM+lZXVhNGzFkP90agNHK01psGgrmIufl9zAo8WOKgkLgbYbSHzkkDeqyjEPU+B0QSsZOCE+qLCHSdsnTmo/TjQhj0CgYAz1+j3yfGgrS+jVBC53lXi0+2fGspbf2jqKdDArXSvFqFzuudki/EpY6AND4NDYfB6hguzjD6PnoSGMUrVfAtR7X6LbwEZpqEX7eZGeMt1yQPMDr1bHrVi9mS5FMQR1NfuM1lP9Xzn00GIUpE7WVrWUhzDEBPJY/7YVLf0hFH08QKBgDWBRQZJIVBmkNrHktRrVddaSq4U/d/Q5LrsCrpymYwH8WliHgpeTQPWmKXwAd+ZJdXIzYjCt202N4eTeVqGYOb6Q/anV2WVYBbM4avpIxoA28kPGY6nML+8EyWIt2ApBOmgGgvtEreNzwaVU9NzjHEyv6n7FlVwlT1jxCe3XWq5AoGASYPKQoPeDlW+NmRG7z9EJXJRPVtmLL40fmGgtju9QIjLnjuK8XaczjAWT+ySI93Whu+Eujf2Uj7Q+NfUjvAEzJgwzuOd3jlQvoALq11kuaxlNQTn7rx0A1QhBgUJE8AkvShPC9FEnA4j/CLJU0re9H/8VvyN6qE0Mho0+YbjpP8=',
  pubKey: 'CAASpgIwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC1/GFud/7xutux7qRfMj1sIdMRh99/chR6HqVj6LQqrgk4jil0mdN/LCk/tqPqmDtObHdmEhCoybzuhLbCKgUqryKDwO6yBJHSKWY9QqrKZtLJ37SgKwGjE3+NUD4r1dJHhtQrICFdOdSCBzs/v8gi+J+KZLHo7+Nms4z09ysy7qZh94Pd7cW4gmSMergqUeANLD9C0ERw1NXolswOW7Bi7UGr7yuBxejICLO3nkxe0OtpQBrYrqdCD9vs3t/HQZbPWVoiRj4VO7fxkAPKLl30HzcIfxj/ayg8NHcH59d08D+N2v5Sdh28gsiYKIPE9CXvuw//HUY2WVRY5fDC5JglAgMBAAE='
}]

describe('connection', () => {
  it('should not require local or remote addrs', async () => {
    const remotePeer = await PeerIdFactory.createFromJSON(peers[1])

    let openStreams: any[] = []
    let streamId = 0

    return createConnection({
      remotePeer,
      remoteAddr: multiaddr('/ip4/127.0.0.1/tcp/4002'),
      stat: {
        timeline: {
          open: Date.now() - 10,
          upgraded: Date.now()
        },
        direction: 'outbound',
        encryption: '/secio/1.0.0',
        multiplexer: '/mplex/6.7.0',
        status: 'OPEN'
      },
      newStream: async (protocols) => {
        const id = `${streamId++}`
        const stream: Stream = {
          ...pair(),
          close: () => {
            void stream.sink(async function * () {}())

            openStreams = openStreams.filter(s => s.id !== id)
          },
          closeRead: () => {},
          closeWrite: () => {
            void stream.sink(async function * () {}())
          },
          id,
          abort: () => {},
          reset: () => {},
          stat: {
            direction: 'outbound',
            protocol: protocols[0],
            timeline: {
              open: 0
            }
          },
          metadata: {}
        }

        openStreams.push(stream)

        return stream
      },
      close: async () => {},
      getStreams: () => openStreams
    })
  })
})
