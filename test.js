/* eslint-env mocha */

const assert = require('assert');
const debug = require('./src');

describe('debug', () => {
	beforeEach(() => {
		// debug.enable('', {
		//  append: false
		// });
		debug.disable();
	});

	it('passes a basic sanity check', () => {
		const log = debug('test');
		log.enabled = true;
		log.log = () => {};

		assert.doesNotThrow(() => log('hello world'));
	});

	it('allows namespaces to be a non-string value', () => {
		const log = debug('test');
		log.enabled = true;
		log.log = () => {};

		assert.doesNotThrow(() => debug.enable(true));
	});

	it('honors global debug namespace enable calls', () => {
		assert.deepStrictEqual(debug('test:12345').enabled, false);
		assert.deepStrictEqual(debug('test:67890').enabled, false);

		debug.enable('test:12345');
		assert.deepStrictEqual(debug('test:12345').enabled, true);
		assert.deepStrictEqual(debug('test:67890').enabled, false);
	});

	it('coerces Error instances', () => {
		const log = debug('test');
		log.enabled = true;
		log.useColors = false;

		const messages = [];
		log.log = (...args) => messages.push(args);

		log(new Error('ex'));

		assert.deepStrictEqual(messages.length, 1);
		assert.deepStrictEqual(messages[0].length, 3);
		assert(messages[0].join(' :: ').indexOf('Error: ex\n') > 0);
	});

	it('uses custom log function', () => {
		const log = debug('test');
		log.enabled = true;

		const messages = [];
		log.log = (...args) => messages.push(args);

		log('using custom log function');
		log('using custom log function again');
		log('%O', 12345);

		assert.deepStrictEqual(messages.length, 3);
	});

	it('handles %-formatter transformations', () => {
		const log = debug('test');
		log.enabled = true;
		log.useColors = false;

		const messages = [];
		log.log = (...args) => messages.push(args);

		log('%O %% %j', 12345, { a: 1 });
		console.warn('messages:', messages[0].join(' :: '));

		assert.deepStrictEqual(messages.length, 1);
		assert(messages[0].join(' :: ').indexOf('%% {"a":1}') > 0);
	});

	it('handles non-string first arguments for logging', () => {
		const log = debug('test');
		log.enabled = true;
		log.useColors = false;

		let messages = [];
		log.log = (...args) => messages.push(args);

		log(['xyz']);

		assert.deepStrictEqual(messages.length, 1);
		assert(messages.join('#').indexOf('xyz') > 0);
	});

	describe('extend namespace', () => {
		it('should extend namespace', () => {
			const log = debug('foo');
			log.enabled = true;
			log.log = () => {};

			const logBar = log.extend('bar');
			assert.deepStrictEqual(logBar.namespace, 'foo:bar');
		});

		it('should extend namespace with custom delimiter', () => {
			const log = debug('foo');
			log.enabled = true;
			log.log = () => {};

			const logBar = log.extend('bar', '--');
			assert.deepStrictEqual(logBar.namespace, 'foo--bar');
		});

		it('should extend namespace with empty delimiter', () => {
			const log = debug('foo');
			log.enabled = true;
			log.log = () => {};

			const logBar = log.extend('bar', '');
			assert.deepStrictEqual(logBar.namespace, 'foobar');
		});

		it('should keep the log function between extensions', () => {
			const log = debug('foo');
			log.log = () => {};

			const logBar = log.extend('bar');
			assert.deepStrictEqual(log.log, logBar.log);
		});

		it('accepts namespace names with embedded dots and other regex chars', () => {
			function test(ns, sollwert) {
				debug.enable('-a, -b, -aa, -ab, -ad, -ae, -abc, ' + ns, {
					append: false
				});
				const ist = {
					names: debug.names.join('\n'),
					skips: debug.skips.join('\n')
				};
				assert.deepStrictEqual(
					ist,
					{
						names: '/^' + sollwert + '$/',
						skips: '/^a$/\n/^b$/\n/^aa$/\n/^ab$/\n/^ad$/\n/^ae$/\n/^abc$/'
					},
					"namespace '" +
						ns +
						"' should be treated as a literal string, i.e. /" +
						sollwert +
						'/'
				);
			}

			[
				'a:b=a:b, a.c=a\\.c, a(d)=a\\(d\\), a[e]=a\\[e\\], a{2}=a\\{2\\}',
				'a\\s=a\\\\s',
				'$a$=\\$a\\$, ^a^b^=\\^a\\^b\\^',
				'*a*=.*?a.*?, a+=a\\+, a|b=a\\|b'
			]
				.join(', ')
				.split(', ')
				.forEach(s => {
					if (!s) {
						return;
					}

					s = s.split('=');
					test(s[0], s[1]);
				});
		});

		it('should avoid namespace conflict', () => {
			debug.enable('test1*');
			debug.enable('test2*');

			assert.deepStrictEqual(debug('test1').enabled, true);
			assert.deepStrictEqual(debug('test2').enabled, true);
		});

		it('should keep the log function between extensions', () => {
			const log = debug('foo');
			log.log = () => {};

			const logBar = log.extend('bar');
			assert.deepStrictEqual(log.log, logBar.log);
		});
	});

	it('skipping and enabling sequence should not get stuck at skipping', () => {
		debug.enable('test1,test2*');
		debug.enable('-test1,-test2*');
		debug.enable('test1,test2*');

		assert.deepStrictEqual(debug('test1').enabled, true);
		assert.deepStrictEqual(debug('test2').enabled, true);
	});

	describe('disable()', () => {
		beforeEach(() => {
			debug.enable('*');
			debug('should disable');
		});

		it('disable itself', () => {
			debug.disable();
			assert.deepStrictEqual(debug.enabled('*'), false);
		});
	});

	describe('rebuild namespaces string (disable)', () => {
		it('handle names, skips, and wildcards', () => {
			debug.enable('test,abc*,-abc');
			const namespaces = debug.disable();
			assert.deepStrictEqual(namespaces, 'test,abc*,-abc');
		});

		it('handles empty', () => {
			debug.enable('');
			const namespaces = debug.disable();
			assert.deepStrictEqual(namespaces, '');
			assert.deepStrictEqual(debug.names, []);
			assert.deepStrictEqual(debug.skips, []);
		});

		it('handles all', () => {
			debug.enable('*');
			const namespaces = debug.disable();
			assert.deepStrictEqual(namespaces, '*');
		});

		it('handles skip all', () => {
			debug.enable('-*');
			const namespaces = debug.disable();
			assert.deepStrictEqual(namespaces, '-*');
		});

		it('names+skips same with new string', () => {
			debug.enable('test,abc*,-abc');
			const oldNames = [...debug.names];
			const oldSkips = [...debug.skips];
			const namespaces = debug.disable();
			assert.deepStrictEqual(namespaces, 'test,abc*,-abc');
			debug.enable(namespaces);
			assert.deepStrictEqual(oldNames.map(String), debug.names.map(String));
			assert.deepStrictEqual(oldSkips.map(String), debug.skips.map(String));
		});
	});

	describe('check if a name is enabled', () => {
		it('handles a name', () => {
			debug.enable('test');
			assert(debug.enabled('test'));
			assert(!debug.enabled('abc'));
		});

		it('handles skip', () => {
			debug.enable('test,abc*,-abc');
			assert(debug.enabled('test'));
			assert(!debug.enabled('abc'));
		});

		it('handles wildcards', () => {
			debug.enable('test,abc*');
			assert(!debug.enabled('foo:*'));
			assert(debug.enabled('test'));
			assert(debug.enabled('abc'));

			debug.enable('abc:*');
			assert(!debug.enabled('test:*'));
			assert(!debug.enabled('tesX'));
			assert(debug.enabled('test'));
			assert(!debug.enabled('testX'));
			assert(!debug.enabled('ab'));
			assert(!debug.enabled('cabc'));
			assert(debug.enabled('abc'));
			assert(debug.enabled('abcd'));
			assert(debug.enabled('abcdef'));
			assert(debug.enabled('abc:*'));
			assert(debug.enabled('abc:d'));
			assert(debug.enabled('abc:def'));
			assert(debug.enabled('abc:'));
			assert(debug.enabled('abc:###'));

			debug.enable('abc:*', {
				append: false
			});
			assert(debug.enabled('abc:foo'));
			assert(!debug.enabled('test'));
			assert(!debug.enabled('abc'));
		});

		it('handles the * wildcard', () => {
			debug.enable('test,abc*');
			assert(debug.enabled('*'));

			debug.enable('');
			assert(debug.enabled('*'));

			debug.enable('-*');
			assert(debug.enabled('*'));
		});
	});

	describe('destroy()', () => {
		it('destroys a debug instance', () => {
			const log = debug('foo');
			log.log = (a) => console.warn('a', this.namespace, '-->', a);
			const alt = log.extend('bar');

			assert.doesNotThrow(() => {
				log('x');
			});
			assert.doesNotThrow(() => {
				alt('x');
			});
			// destroying one instance should not impact the other instance:
			assert(log.destroy() === true);
			assert.throws(() => {
				log('x');
			});
			assert.doesNotThrow(() => {
				alt('x');
			});
			assert.throws(() => {
				log.extend('x');
			});
			// can still invoke `destroy()` on the nuked instance though:
			assert(log.destroy() === false);
			assert.throws(() => {
				log('x');
			});
			assert.doesNotThrow(() => {
				alt('x');
			});
			assert.throws(() => {
				log.extend('x');
			});
			// will barf hairball when destroyed namespace has got a fresh instance
			// and you're still trying to nuke the old already-destroyed one:
			const log2 = debug('foo');
			assert.throws(() => {
				log.destroy();
			});
			assert.throws(() => {
				log('x');
			});
			assert.doesNotThrow(() => {
				log2('x');
			});
		});
	});
});
