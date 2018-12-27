/* eslint-env mocha */
'use strict';

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

var chai;
var expect;
var debug;

if (typeof module !== 'undefined') {
  chai = require('chai');
  expect = chai.expect;
  debug = require('./src');
}

describe('debug', function () {
  it('passes a basic sanity check', function () {
    var log = debug('test');
    log.enabled = true;

    log.log = function () {};

    expect(function () {
      return log('hello world');
    }).to.not.throw();
  });
  it('allows namespaces to be a non-string value', function () {
    var log = debug('test');
    log.enabled = true;

    log.log = function () {};

    expect(function () {
      return debug.enable(true);
    }).to.not.throw();
  });
  it('honors global debug namespace enable calls', function () {
    expect(debug('test:12345').enabled).to.equal(false);
    expect(debug('test:67890').enabled).to.equal(false);
    debug.enable('test:12345');
    expect(debug('test:12345').enabled).to.equal(true);
    expect(debug('test:67890').enabled).to.equal(false);
  });
  it('uses custom log function', function () {
    var log = debug('test');
    log.enabled = true;
    var messages = [];

    log.log = function () {
      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      return messages.push(args);
    };

    log('using custom log function');
    log('using custom log function again');
    log('%O', 12345);
    expect(messages.length).to.equal(3);
  });
  describe('extend namespace', function () {
    it('should extend namespace', function () {
      var log = debug('foo');
      log.enabled = true;

      log.log = function () {};

      var logBar = log.extend('bar');
      expect(logBar.namespace).to.be.equal('foo:bar');
    });
    it('should extend namespace with custom delimiter', function () {
      var log = debug('foo');
      log.enabled = true;

      log.log = function () {};

      var logBar = log.extend('bar', '--');
      expect(logBar.namespace).to.be.equal('foo--bar');
    });
    it('should extend namespace with empty delimiter', function () {
      var log = debug('foo');
      log.enabled = true;

      log.log = function () {};

      var logBar = log.extend('bar', '');
      expect(logBar.namespace).to.be.equal('foobar');
    });
    it('accepts namespace names with embedded dots and other regex chars', function () {
      function test(ns, sollwert) {
        debug.enable('-a, -b, -aa, -ab, -ad, -ae, -abc, ' + ns, {
          append: false
        });
        var ist = {
          names: debug.names.join('\n'),
          skips: debug.skips.join('\n')
        };
        expect(ist, 'namespace \'' + ns + '\' should be treated as a literal string, i.e. /' + sollwert + '/').to.eql({
          names: '/^' + sollwert + '$/',
          skips: '/^a$/\n/^b$/\n/^aa$/\n/^ab$/\n/^ad$/\n/^ae$/\n/^abc$/'
        });
      }

      ['a:b=a:b, a.c=a\\.c, a(d)=a\\(d\\), a[e]=a\\[e\\], a{2}=a\\{2\\}', 'a\\s=a\\\\s', '$a$=\\$a\\$, ^a^b^=\\^a\\^b\\^', '*a*=.*?a.*?, a+=a\\+, a|b=a\\|b'].join(', ').split(', ').forEach(function (s) {
        if (!s) {
          return;
        }

        s = s.split('=');
        test(s[0], s[1]);
      });
    });
    it('should avoid namespace conflict', function () {
      debug.enable('test1*');
      debug.enable('test2*');
      expect(debug('test1').enabled).to.equal(true);
      expect(debug('test2').enabled).to.equal(true);
    });
    it('should keep the log function between extensions', function () {
      var log = debug('foo');

      log.log = function () {};

      var logBar = log.extend('bar');
      expect(log.log).to.be.equal(logBar.log);
    });
  });
  it('skipping and enabling sequence should not get stuck at skipping', function () {
    debug.enable('test1,test2*');
    debug.enable('-test1,-test2*');
    debug.enable('test1,test2*');
    expect(debug('test1').enabled).to.equal(true);
    expect(debug('test2').enabled).to.equal(true);
  });
  describe('disable()', function () {
    beforeEach(function () {
      debug.enable('*');
      debug('should disable');
    });
    it('disable itself', function () {
      debug.disable('*');
      expect(debug.enabled('*')).to.equal(false);
    });
  });
  describe('rebuild namespaces string (disable)', function () {
    it('handle names, skips, and wildcards', function () {
      debug.enable('test,abc*,-abc');
      var namespaces = debug.disable();
      expect(namespaces).to.equal('test,abc*,-abc');
    });
    it('handles empty', function () {
      debug.enable('');
      var namespaces = debug.disable();
      expect(namespaces).to.equal('');
      expect(debug.names).to.deep.equal([]);
      expect(debug.skips).to.deep.equal([]);
    });
    it('handles all', function () {
      debug.enable('*');
      var namespaces = debug.disable();
      expect(namespaces).to.equal('*');
    });
    it('handles skip all', function () {
      debug.enable('-*');
      var namespaces = debug.disable();
      expect(namespaces).to.equal('-*');
    });
    it('names+skips same with new string', function () {
      debug.enable('test,abc*,-abc');

      var oldNames = _toConsumableArray(debug.names);

      var oldSkips = _toConsumableArray(debug.skips);

      var namespaces = debug.disable();
      expect(namespaces).to.equal('test,abc*,-abc');
      debug.enable(namespaces);
      expect(oldNames.map(String)).to.deep.equal(debug.names.map(String));
      expect(oldSkips.map(String)).to.deep.equal(debug.skips.map(String));
    });
  });
});