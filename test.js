/* eslint-env mocha */
'use strict';

let chai;

let expect;

let debug;

if (typeof module !== 'undefined') {
	chai = require('chai');
	expect = chai.expect;
	debug = require('./src');
}

describe('debug', () => {
	it('passes a basic sanity check', () => {
		const log = debug('test');
		log.enabled = true;
		log.log = () => {};

		expect(() => log('hello world')).to.not.throw();
	});

	it('allows namespaces to be a non-string value', () => {
		const log = debug('test');
		log.enabled = true;
		log.log = () => {};

		expect(() => debug.enable(true)).to.not.throw();
	});

	it('honors global debug namespace enable calls', () => {
		expect(debug('test:12345').enabled).to.equal(false);
		expect(debug('test:67890').enabled).to.equal(false);

		debug.enable('test:12345');
		expect(debug('test:12345').enabled).to.equal(true);
		expect(debug('test:67890').enabled).to.equal(false);
	});

	it('uses custom log function', () => {
		const log = debug('test');
		log.enabled = true;

		const messages = [];
		log.log = (...args) => messages.push(args);

		log('using custom log function');
		log('using custom log function again');
		log('%O', 12345);

		expect(messages.length).to.equal(3);
	});

	describe('extend namespace', () => {
		it('should extend namespace', () => {
			const log = debug('foo');
			log.enabled = true;
			log.log = () => {};

			const logBar = log.extend('bar');
			expect(logBar.namespace).to.be.equal('foo:bar');
		});

		it('should extend namespace with custom delimiter', () => {
			const log = debug('foo');
			log.enabled = true;
			log.log = () => {};

			const logBar = log.extend('bar', '--');
			expect(logBar.namespace).to.be.equal('foo--bar');
		});

		it('should extend namespace with empty delimiter', () => {
			const log = debug('foo');
			log.enabled = true;
			log.log = () => {};

			const logBar = log.extend('bar', '');
			expect(logBar.namespace).to.be.equal('foobar');
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
});

