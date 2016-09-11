var assert = require('assert');

describe('debug', function() {
  it('should be requireable', function() {
    var debug = require('../');
    assert.equal(typeof debug, 'function');
  });
});
