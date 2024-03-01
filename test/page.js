/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const path = require('path');
const random = require('../lib/random_id');
const testid = random();
const argv = require('../lib/defaultargs.coffee')({data: path.join('/tmp', 'sfwtests', testid), root: path.join(__dirname, '..'), packageDir: path.join(__dirname, '..', 'node_modules'), security_legacy: true});
const page = require('../lib/page.coffee')(argv);
const fs = require('fs');

const testpage = {title: 'Asdf'};

describe('page', function() {
  describe('#page.put()', () => it('should save a page', done => page.put('asdf', testpage, e => done(e))));
  return describe('#page.get()', function() {
    it('should get a page if it exists', done => page.get('asdf', function(e, got) {
      if (e) { throw e; }
      got.title.should.equal('Asdf');
      return done();
    }));
    it('should copy a page from default if nonexistant in db', done => page.get('welcome-visitors', function(e, got) {
      if (e) { throw e; }
      got.title.should.equal('Welcome Visitors');
      return done();
    }));
    // note: here we assume the wiki-plugin-activity repo has been cloned into an adjacent directory
    it('should copy a page from plugins if nonexistant in db', done => page.get('recent-changes', function(e, got) {
      if (e) { throw e; }
      got.title.should.equal('Recent Changes');
      return done();
    }));
    // note: here we assume the wiki-plugin-activity repo has been cloned into an adjacent directory
    it('should mark a page from plugins with the plugin name', done => page.get('recent-changes', function(e, got) {
      if (e) { throw e; }
      got.plugin.should.equal('activity');
      return done();
    }));
    it('should create a page if it exists nowhere', done => page.get(random(), function(e, got) {
      if (e) { throw e; }
      got.should.equal('Page not found');
      return done();
    }));
    return it('should eventually write the page to disk', function(done) {
      const test = () => fs.readFile(path.join(argv.db, 'asdf'), function(err, data) {
        if (err) { throw err; }
        const readPage = JSON.parse(data);
        return page.get('asdf', function(e, got) {
          readPage.title.should.equal(got.title);
          return done();
        });
      });
      if (page.isWorking()) {
        return page.on('finished', () => test());
      } else { return test(); }
    });
  });
});
