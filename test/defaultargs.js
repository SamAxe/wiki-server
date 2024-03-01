// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const defaultargs = require('../lib/defaultargs');

describe('defaultargs', () => describe('#defaultargs()', function() {
  it('should not write over give args', () => defaultargs({port: 1234}).port.should.equal(1234));
  it('should write non give args', () => defaultargs().port.should.equal(3000));
  return it('should modify dependant args', () => defaultargs({data: '/tmp/asdf/'}).db.should.equal('/tmp/asdf/pages'));
}));	
