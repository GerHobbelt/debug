/* global describe, it, context, beforeEach */
'use strict';

var chai
  , expect
  , debug
  , sinon
  , sinonChai;

if (typeof module !== 'undefined') {
  chai = require('chai');
  expect = chai.expect;

  debug = require('../src/index');
  sinon = require('sinon');
  sinonChai = require("sinon-chai");
  chai.use(sinonChai);
}


describe('debug', function () {
  var log = debug('test');

  log.log = sinon.stub();

  it('passes a basic sanity check', function () {
    expect(log('hello world')).to.not.throw;
  });

  it('allows namespaces to be a non-string value', function () {
    expect(debug.enable(true)).to.not.throw;
  });

  it('accepts namespace names with embedded dots and other regex chars', function () {
    function test(ns, sollwert) {
      debug.enable('-a, -b, -aa, -ab, -ad, -ae, -abc, ' + ns, { append: false });
      var ist = {
        names: debug.names.join('\n'),
        skips: debug.skips.join('\n'),
      };
      expect(ist, "namespace '" + ns + "' should be treated as a literal string, i.e. /" + sollwert + "/").to.eql({ 
        names: '/^' + sollwert + '$/',
        skips: '/^a$/\n/^b$/\n/^aa$/\n/^ab$/\n/^ad$/\n/^ae$/\n/^abc$/' 
      });
    }

    [
      'a:b=a:b, a.c=a\\.c, a(d)=a\\(d\\), a[e]=a\\[e\\], a{2}=a\\{2\\}',
      'a\\s=a\\\\s',
      '$a$=\\$a\\$, ^a^b^=\\^a\\^b\\^',
      '*a*=.*?a.*?, a+=a\\+, a|b=a\\|b'
    ].join(', ').split(', ').forEach(function (s) {
      if (!s) return;
      s = s.split('=');
      test(s[0], s[1]);
    });
  });

  context('with log function', function () {

    beforeEach(function () {
      debug.enable('test');
      log = debug('test');
    });

    it('uses it', function () {
      log.log = sinon.stub();
      log('using custom log function');

      expect(log.log).to.have.been.calledOnce;
    });
  });

  describe('custom functions', function () {
    var log;

    beforeEach(function () {
      debug.enable('test');
      log = debug('test');
    });

    context('with log function', function () {
      it('uses it', function () {
        log.log = sinon.spy();
        log('using custom log function');

        expect(log.log).to.have.been.calledOnce;
      });
    });
  });

   context('disable()', function () {
     beforeEach(function () {
       debug.enable('*');
       debug('should disable')
     });

     it('disable itself', function () {
       debug.disable('*');
       expect(debug.enabled('*')).to.be.false;
     });
   });

   it('should avoid namespace conflict', function () {
     debug.enable('test1*');
     debug.enable('test2*');

     expect(debug('test1').enabled).to.be.true;
     expect(debug('test2').enabled).to.be.true;
   });

   it('skipping and enabling sequence should not get stuck at skipping', function () {
     debug.enable('test1,test2*');
     debug.enable('-test1,-test2*');
     debug.enable('test1,test2*');

     expect(debug('test1').enabled).to.be.true;
     expect(debug('test2').enabled).to.be.true;
   });
});
