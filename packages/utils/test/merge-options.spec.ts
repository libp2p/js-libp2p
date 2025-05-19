import { expect } from 'aegir/chai'
import { mergeOptions } from '../src/merge-options.js'

const defineProtoProperty = (options: any, value: any): any => {
  Object.defineProperty(options, '__proto__', {
    value,
    writable: true,
    enumerable: true,
    configurable: true
  })

  return options
}

describe('merge-options', () => {
  it('should support array values', () => {
    const array1 = ['foo', 'bar'];
    const array2 = ['baz'];
    const result = mergeOptions({array: array1}, {array: array2})
    expect(result).to.deep.equal({array: array2})
    expect(result.array).to.not.equal(array1)
    expect(result.array).to.not.equal(array2)
  })

  it('should support concatenation', () => {
      const array1 = ['foo'];
      const array2 = ['bar'];
      const result = mergeOptions.call({concatArrays: true}, {array: array1}, {array: array2});
      expect(result.array).to.deep.equal(['foo', 'bar']);
      expect(result.array).to.not.equal(array1);
      expect(result.array).to.not.equal(array2);
  });

  it('should support concatenation via apply', () => {
      const array1 = ['foo'];
      const array2 = ['bar'];
      const result = mergeOptions.apply({concatArrays: true}, [{array: array1}, {array: array2}]);
      expect(result.array).to.deep.equal(['foo', 'bar']);
      expect(result.array).to.not.equal(array1);
      expect(result.array).to.not.equal(array2);
  });

  it('should support concatenation of sparse arrays', () => {
      const sparseArray1 = [];
      const sparseArray2 = [];
      sparseArray1[2] = 42;
      sparseArray2[5] = 'unicorns';
      const result = mergeOptions.call({concatArrays: true}, {foo: sparseArray1}, {foo: sparseArray2});
      expect(result.foo).to.deep.equal([42, 'unicorns']);
      expect(result.array).to.not.equal(sparseArray1);
      expect(result.array).to.not.equal(sparseArray2);
  });

  it('should support concatenation of sparse arrays via apply',() => {
      const sparseArray1 = [];
      const sparseArray2 = [];
      sparseArray1[2] = 42;
      sparseArray2[5] = 'unicorns';
      const result = mergeOptions.apply({concatArrays: true}, [{foo: sparseArray1}, {foo: sparseArray2}]);
      expect(result.foo).to.deep.equal([42, 'unicorns']);
      expect(result.array).to.not.equal(sparseArray1);
      expect(result.array).to.not.equal(sparseArray2);
  });

  it('should clone option objects', () => {
      const plainObject1 = {value: 'foo'};
      const plainObject2 = {value: 'bar'};
      const result = mergeOptions({array: [plainObject1]}, {array: [plainObject2]});
      expect(result.array).to.deep.equal([plainObject2]);
      expect(result.array[0]).to.not.equal(plainObject1);
      expect(result.array[0]).to.not.equal(plainObject2);
  });

  it('should ignore `undefined` Option Objects', () => {
      expect(mergeOptions(undefined)).to.deep.equal({});
      expect(mergeOptions(undefined, {foo: true}, {foo: false})).to.deep.equal({foo: false});
      expect(mergeOptions({foo: true}, undefined, {foo: false})).to.deep.equal({foo: false});
  });

  it('should support Object.create(null) Option Objects', () => {
      const option1 = Object.create(null);
      option1.foo = Object.create(null);
      expect(mergeOptions(option1, {bar: Object.create(null)})).to.deep.equal({foo: Object.create(null), bar: Object.create(null)});
  });

  it('should throw TypeError on non-option-objects', async () => {
      const promise = Promise.reject(new Error());
      [
          42,
          'unicorn',
          new Date(),
          promise,
          Symbol('unicorn'),
          /regexp/,
          function () {},
          null
      ].forEach(value => {
          expect(() => mergeOptions(value)).to.throw(TypeError)
          expect(() => mergeOptions({}, value)).to.throw(TypeError)
          expect(() => mergeOptions({foo: 'bar'}, value)).to.throw(TypeError)
          expect(() => mergeOptions(Object.create(null), value)).to.throw(TypeError)
      });

      await expect(promise).to.eventually.be.rejected()
  })

  it('should support `undefined` Option Values', () => {
      expect(mergeOptions({foo: true}, {foo: undefined})).to.deep.equal({foo: undefined})
  })

  it('should support undefined as target, null as source', () => {
      const result = mergeOptions({foo: undefined}, {foo: null})
      expect(result).to.have.property('foo', null)
  })

  it('should support null as target, undefined as source', () => {
      const result = mergeOptions({foo: null}, {foo: undefined})
      expect(result).to.have.property('foo', undefined)
  })

  it('should support Date as target, Number as source', () => {
      const result = mergeOptions({date: new Date()}, {date: 990741600000})
      expect(result.date.constructor).to.equal(Number)
      expect(result).to.have.property('date', 990741600000)
  })

  it('should support Date as target, Date as source', () => {
      const result = mergeOptions({date: new Date()}, {date: new Date(990741600000)})
      expect(result.date.constructor).to.equal(Date)
      expect(result.date.getTime()).to.equal(990741600000)
  })

  it('should support RegExp as target, String as source', () => {
      const result = mergeOptions({regexp: /reg/}, {regexp: 'string'})
      expect(result.regexp.constructor).to.equal(String)
      expect(result).to.have.property('regexp', 'string')
  })

  it('should support RegExp as target, RegExp as source', () => {
      const result = mergeOptions({regexp: /reg/}, {regexp: /new/})
      expect(result.regexp.constructor).to.equal(RegExp)
      expect(result.regexp.test('new')).to.be.true()
  })

  it('should support Promise as target, Number as source', () => {
      const promise1 = Promise.resolve(666)
      const promise2 = 42
      const result = mergeOptions({promise: promise1}, {promise: promise2})
      expect(result.promise.constructor).to.equal(Number)
      expect(result).to.have.property('promise', 42)
  });

  it('should support Promise as target, Promise as source', async () => {
      const promise1 = Promise.resolve(666)
      const promise2 = Promise.resolve(42)
      const result = mergeOptions({promise: promise1}, {promise: promise2})
      expect(result.promise.constructor).to.equal(Promise)
      await expect(result.promise).to.eventually.equal(42)
  });

  it('should support user-defined object as target, user-defined object as source', () => {
      class User {
        firstName: string

        constructor (firstName: string) {
          this.firstName = firstName
        }
      }

      const alice = new User('Alice')
      const bob = new User('Bob')
      const result = mergeOptions({user: alice}, {user: bob})
      expect(result.user.constructor).to.equal(User)
      expect(result).to.have.property('user', bob)
      expect(result).to.have.nested.property('user.firstName', 'Bob')
  })

  it('should preserve property order', () => {
      const letters = 'abcdefghijklmnopqrst'
      const source: Record<string, string> = {}
      letters.split('').forEach(letter => {
          source[letter] = letter
      });
      const target = mergeOptions({}, source)
      expect(Object.keys(target).join('')).to.equal(letters)
  });


  it('should not allow prototype pollution', () => {
      const maliciousPayload = '{"__proto__":{"oops":"It works !"}}'
      const a = {}
      expect(a).to.not.have.property('oops')
      mergeOptions(a, JSON.parse(maliciousPayload))
      expect(a).to.not.have.property('oops')
  });

  it('should not allow pollution of array values (regression test)', () => {
      const array1: any[] = []
      const array2: any[] = []
      const pristine: any[] = []
      defineProtoProperty(array2, {oops: 'It works !'})
      expect(pristine).to.not.have.property('oops')
      mergeOptions({array: array1}, {array: array2})
      expect(pristine).to.not.have.property('oops')
  });

  it('should allow recursive merge', () => {
      const a = {}
      const b = defineProtoProperty({a}, {oops: 'It works !'})
      expect(b).to.not.have.nested.property('a.oops')
      mergeOptions({a: {}}, b);
      expect(b).to.not.have.nested.property('a.oops')
  })

  it('should clone', async () => {
      const defaultPromise = Promise.reject(new Error())
      const optionsPromise = Promise.resolve('bar')
      const defaultOptions = {
          fn: () => false,
          promise: defaultPromise,
          array: ['foo'],
          nested: {unicorns: 'none'}
      }
      const options = {
          fn: () => true,
          promise: optionsPromise,
          array: ['baz'],
          nested: {unicorns: 'many'}
      }
      const result = mergeOptions(defaultOptions, options)
      expect(result).to.deep.equal(options)
      expect(result.fn).to.equal(options.fn)
      expect(result.promise).to.equal(options.promise)
      expect(result.array).to.not.equal(options.array)
      expect(result.nested).to.not.equal(options.nested)
      await expect(defaultPromise).to.eventually.be.rejected()
      await expect(optionsPromise).to.eventually.be.ok()
  })

  it('array.concat example', () => {
      expect(
          mergeOptions({patterns: ['src/**']}, {patterns: ['test/**']})).to.deep.equal(
          {patterns: ['test/**']}
      )
      expect(
          mergeOptions.call({concatArrays: true}, {patterns: ['src/**']}, {patterns: ['test/**']})).to.deep.equal(
          {patterns: ['src/**', 'test/**']}
      )
      expect(
          mergeOptions.apply({concatArrays: true}, [{patterns: ['src/**']}, {patterns: ['test/**']}])).to.deep.equal(
          {patterns: ['src/**', 'test/**']}
      )
  })

  it('basic examples', () => {
      expect(
          mergeOptions({foo: 0}, {bar: 1}, {baz: 2}, {bar: 3})).to.deep.equal(
          {foo: 0, bar: 3, baz: 2}
      )
      expect(
          mergeOptions({nested: {unicorns: 'none'}}, {nested: {unicorns: 'many'}})).to.deep.equal(
          {nested: {unicorns: 'many'}}
      )
      expect(
          mergeOptions({[Symbol.for('key')]: 0}, {[Symbol.for('key')]: 42})).to.deep.equal(
          {[Symbol.for('key')]: 42}
      )
  })

  it('return new option objects', () => {
      const fooKey = Symbol('foo');
      const source1: Record<string | symbol, any> = {};
      const source2: Record<string | symbol, any> = {};
      source1[fooKey] = {bar: false};
      source2[fooKey] = {bar: true};
      const fooRef1 = source1[fooKey];
      const fooRef2 = source2[fooKey];
      const result = mergeOptions(source1, source2);
      expect(result).to.deep.equal(source2)
      expect(result).to.not.equal(source2)
      expect(result[fooKey]).to.not.equal(source1[fooKey]);
      expect(result[fooKey]).to.not.equal(source2[fooKey]);
      expect(result[fooKey]).to.not.equal(fooRef1);
      expect(result[fooKey]).to.not.equal(fooRef2);
  });

  it('undefined values', () => {
      expect(mergeOptions.call({ignoreUndefined: true}, {foo: 0}, {foo: undefined}))
        .to.deep.equal({foo: 0})
  })

  it('deep undefined values', () => {
      expect(mergeOptions.call({ignoreUndefined: true}, {nested: {unicorns: 'none'}}, {nested: {unicorns: undefined}}))
        .to.deep.equal({nested: {unicorns: 'none'}})
  })

  it('undefined options objects', () => {
      expect(mergeOptions.call({ignoreUndefined: true}, {nested: {unicorns: 'none'}}, {nested: undefined}))
        .to.deep.equal({nested: {unicorns: 'none'}})
  })

  it('ignore non-own properties', () => {
      const optionObject = {foo: 'bar'};

      // eslint-disable-next-line no-extend-native
      Object.defineProperty(Object.prototype, 'TEST_NonOwnButEnumerable', {
          value: optionObject,
          configurable: true,
          enumerable: true
      });
      const result = mergeOptions({}, optionObject, {baz: true});

      expect(result.baz).to.be.true()
      expect(result.TEST_NonOwnButEnumerable).to.deep.equal(optionObject)
      expect(Object.hasOwnProperty.call(result, 'TEST_NonOwnButEnumerable')).to.be.false()

      // @ts-expect-error not a property
      delete Object.prototype.TEST_NonOwnButEnumerable
      expect('TEST_NonOwnButEnumerable' in result).to.be.false()
  })

  it('ignore non-enumerable properties', () => {
      const optionObject = Object.create(null);
      const key = Symbol('TEST_NonEnumerableButOwn');

      Object.defineProperty(optionObject, key, {
          value: 42,
          configurable: true,
          enumerable: false
      });
      const result = mergeOptions({}, optionObject, {baz: true});

      if (Object.getOwnPropertySymbols) {
          const ownPropertySymbols = Object.getOwnPropertySymbols(result);
          expect(ownPropertySymbols).to.deep.equal([])
      } else {
          expect(key in result).to.be.false()
      }

      expect(result).to.not.deep.equal(optionObject)
      expect(result.baz).to.be.true()
  })
})
