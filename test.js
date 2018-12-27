/* eslint-env mocha */

const assert = require('assert');
const debug = require('./src');

describe('debug', () => {
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
				debug.enable('-a, -b, -aa, -ab, -ad, -ae, -abc, ' + ns, {append: false});
				const ist = {
					names: debug.names.join('\n'),
					skips: debug.skips.join('\n')
				};
				expect(ist, 'namespace \'' + ns + '\' should be treated as a literal string, i.e. /' + sollwert + '/').to.eql({
					names: '/^' + sollwert + '$/',
					skips: '/^a$/\n/^b$/\n/^aa$/\n/^ab$/\n/^ad$/\n/^ae$/\n/^abc$/'
				});
			}

			[
				'a:b=a:b, a.c=a\\.c, a(d)=a\\(d\\), a[e]=a\\[e\\], a{2}=a\\{2\\}',
				'a\\s=a\\\\s',
				'$a$=\\$a\\$, ^a^b^=\\^a\\^b\\^',
				'*a*=.*?a.*?, a+=a\\+, a|b=a\\|b'
			].join(', ').split(', ').forEach(s => {
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

			expect(debug('test1').enabled).to.equal(true);
			expect(debug('test2').enabled).to.equal(true);
		});

		it('should keep the log function between extensions', () => {
			const log = debug('foo');
			log.log = () => {};

			const logBar = log.extend('bar');
			expect(log.log).to.be.equal(logBar.log);
		});
	});

	it('skipping and enabling sequence should not get stuck at skipping', () => {
		debug.enable('test1,test2*');
		debug.enable('-test1,-test2*');
		debug.enable('test1,test2*');

		expect(debug('test1').enabled).to.equal(true);
		expect(debug('test2').enabled).to.equal(true);
	});

	describe('disable()', () => {
		beforeEach(() => {
			debug.enable('*');
			debug('should disable');
		});

		it('disable itself', () => {
			debug.disable('*');
			expect(debug.enabled('*')).to.equal(false);
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
});

