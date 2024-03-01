// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const random = require('../lib/random_id');

describe('random', () => describe('#random_id', function() {
  it('should not be the same twice', () => random().should.not.equal(random()));
  return it('should be 16 digits', () => random().length.should.equal(16));
}));
