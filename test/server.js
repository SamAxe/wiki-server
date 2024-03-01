// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
let request = require('supertest');
const fs = require('fs');
const server = require('..');
const path = require('path');
const random = require('../lib/random_id');
const testid = random();
const argv = require('../lib/defaultargs.coffee')({data: path.join('/tmp', 'sfwtests', testid), packageDir: path.join(__dirname, '..', 'node_modules'), port: 55557, security_legacy: true});

describe('server', function() {
  let app = {};
  before(function(done) {
    // as starting the server this was does not create a sitemap file, create an empty one
    const sitemapLoc = path.join('/tmp', 'sfwtests', testid, 'status', 'sitemap.json');
    fs.mkdirSync(path.join('/tmp', 'sfwtests', testid));
    fs.mkdirSync(path.join('/tmp', 'sfwtests', testid, 'status'));
    fs.writeFileSync(sitemapLoc, JSON.stringify([]));

    app = server(argv);
    return app.once("owner-set", () => app.listen(app.startOpts.port, app.startOpts.host, done));});


  request = request('http://localhost:55557');

  // location of the test page
  const loc = path.join('/tmp', 'sfwtests', testid, 'pages', 'adsf-test-page');

  it('factories should return a list of plugin', () => await(request)
    .get('/system/factories.json')
    .expect(200)
    .expect('Content-Type', /json/)
    .then(function(res) {
      res.body[1].name.should.equal('Video');
      return res.body[1].category.should.equal('format');
  }));

  it('new site should have an empty list of pages', () => await(request)
    .get('/system/slugs.json')
    .expect(200)
    .expect('Content-Type', /json/)
    .then(res => res.body.should.be.empty
    , function(error) {
      throw error;
  }).catch(function(error) {
      throw error;
  }));

  it('should create a page', function() {
    const body = JSON.stringify({
      type: 'create',
      item: {
        title: "Asdf Test Page",
        story: [
          {id: "a1", type: "paragraph", text: "this is the first paragraph"},
          {id: "a2", type: "paragraph", text: "this is the second paragraph"},
          {id: "a3", type: "paragraph", text: "this is the third paragraph"},
          {id: "a4", type: "paragraph", text: "this is the fourth paragraph"}
          ]
      },
      date: 1234567890123
      });

    return request
      .put('/page/adsf-test-page/action')
      .send("action=" + body)
      .expect(200)
      .catch(function(err) {
        throw err;
    });
  });

  it('should move the paragraphs to the order given ', function() {
    const body = '{ "type": "move", "order": [ "a1", "a3", "a2", "a4"] }';

    return request
      .put('/page/adsf-test-page/action')
      .send("action=" + body)
      .expect(200)
      .then(function(res) {
        let page;
        if (err) {
          throw err;
        }
        try {
          page = JSON.parse(fs.readFileSync(loc));
        } catch (error) {
          var err = error;
          throw err;
        }
        page.story[1].id.should.equal('a3');
        page.story[2].id.should.equal('a2');
        return page.journal[1].type.should.equal('move');
      }
      , function(err) {
        throw err;
    }).catch(function(err) {
        throw err;
    });
  });

  it('should add a paragraph', function() {
    const body = JSON.stringify({
      type: 'add',
      after: 'a2',
      item: {id: 'a5', type: 'paragraph', text: 'this is the NEW paragrpah'}
    });

    return request
      .put('/page/adsf-test-page/action')
      .send("action=" + body)
      .expect(200)
      .then(function(res) {
        let page;
        try {
          page = JSON.parse(fs.readFileSync(loc));
        } catch (err) {
          throw err;
        }
        page.story.length.should.equal(5);
        page.story[3].id.should.equal('a5');
        return page.journal[2].type.should.equal('add');
      }
      , function(err) {
        throw err;
    }).catch(function(err) {
        throw err;
    });
  });

  it('should remove a paragraph with given id', function() {
    const body = JSON.stringify({
      type: 'remove',
      id: 'a2'
    });

    return request
      .put('/page/adsf-test-page/action')
      .send("action=" + body)
      .expect(200)
      .then(function(res) {
        let page;
        try {
          page = JSON.parse(fs.readFileSync(loc));
        } catch (err) {
          throw err;
        }
        page.story.length.should.equal(4);
        page.story[1].id.should.equal('a3');
        page.story[2].id.should.not.equal('a2');
        page.story[2].id.should.equal('a5');
        return page.journal[3].type.should.equal('remove');
      }
      , function(err) {
        throw err;
    }).catch(function(err) {
        throw err;
    });
  });

  it('should edit a paragraph in place', function() {
    const body = JSON.stringify({
      type: 'edit',
      item: {id: 'a3', type: 'paragraph', text: 'edited'},
      id: 'a3'
    });

    return request
      .put('/page/adsf-test-page/action')
      .send("action=" + body)
      .expect(200)
      .then(function(res) {
        let page;
        try {
          page = JSON.parse(fs.readFileSync(loc));
        } catch (err) {
          throw err;
        }
        page.story[1].text.should.equal('edited');
        return page.journal[4].type.should.equal('edit');
      }
      , function(err) {
        throw err;
    }).catch(function(err) {
        throw err;
    });
  });

  it('should default to no change', function() {
    const body = JSON.stringify({
      type: 'asdf'
      });

    return request
      .put('/page/adsf-test-page/action')
      .send("action=" + body)
      .expect(500)
      .then(function(res) {
        let page;
        try {
          page = JSON.parse(fs.readFileSync(loc));
        } catch (err) {
          throw err;
        }
        page.story.length.should.equal(4);
        page.journal.length.should.equal(5);
        page.story[0].id.should.equal('a1');
        page.story[3].text.should.equal('this is the fourth paragraph');
        return page.journal[4].type.should.equal('edit');
      }
      , function(err) {
        throw err;
    }).catch(function(err) {
        throw err;
    });
  });

  it('should refuse to create over a page', function() {
    const body = JSON.stringify({
      type: 'create',
      item: { title: 'Doh'},
      id: 'c1'
    });

    return request
      .put('/page/adsf-test-page/action')
      .send("action=" + body)
      .expect(409)
      .then(function(res) {
        let page;
        try {
          page = JSON.parse(fs.readFileSync(loc));
        } catch (err) {
          throw err;
        }
        return page.title.should.not.equal('Doh');
      }
      , function(err) {
        throw err;
    }).catch(function(err) {
        throw err;
    });
  });

  it('site should now have one page', () => request
    .get('/system/slugs.json')
    .expect(200)
    .expect('Content-Type', /json/)
    .then(function(res) {
      res.body.length.should.equal[1];
      return res.body[0].should.equal['adsf-test-page'];
    }
    , function(err) {
      throw err;
  }).catch(function(err) {
      throw err;
  }));



  return after( function() {
    if (app.close) { return app.close(); }});
});
