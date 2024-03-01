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
const argv = require('../lib/defaultargs.coffee')({data: path.join('/tmp', 'sfwtests', testid), port: 55556, security_legacy: true});

describe('sitemap', function() {
  let app = {};
  let runningServer = null;
  beforeEach(function(done) {
    app = server(argv);
    return app.once("owner-set", () => runningServer = app.listen(app.startOpts.port, app.startOpts.host, done));});
  afterEach(() => runningServer.close());


  request = request('http://localhost:55556');
  fs.mkdirSync(path.join('/tmp', 'sfwtests', testid, 'pages'), {recursive: true});

  // location of the sitemap
  const sitemapLoc = path.join('/tmp', 'sfwtests', testid, 'status', 'sitemap.json');

  it('new site should have an empty sitemap', () => request
  .get('/system/sitemap.json')
  .expect(200)
  .expect('Content-Type', /json/)
  .then(res => res.body.should.be.empty
  , function(err) {
    throw err;
  }));


  it('creating a page should add it to the sitemap', function() {
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
      .then(res => // sitemap update does not happen until after the put has returned, so wait for it to finish
    app.sitemaphandler.once('finished', function() {
      let sitemap;
      try {
        sitemap = JSON.parse(fs.readFileSync(sitemapLoc));
      } catch (err) {
        throw err;
      }
      sitemap[0].slug.should.equal['adsf-test-page'];
      return sitemap[0].synopsis.should.equal['this is the first paragraph'];
  })
      , function(err) {
        throw err;
    });
  });

  it('synopsis should reflect edit to first paragraph', function() {
    const body = JSON.stringify({
      type: 'edit',
      item: {id: 'a1', type: 'paragraph', text: 'edited'},
      id: 'a1'
    });

    return request
      .put('/page/adsf-test-page/action')
      .send("action=" + body)
      .expect(200)
      .then(res => app.sitemaphandler.once('finished', function() {
      let sitemap;
      try {
        sitemap = JSON.parse(fs.readFileSync(sitemapLoc));
      } catch (err) {
        throw err;
      }
      sitemap[0].slug.should.equal['adsf-test-page'];
      return sitemap[0].synopsis.should.equal['edited'];
  })
      , function(err) {
        throw err;
    });
  });

  it('deleting a page should remove it from the sitemap', () => request
    .delete('/adsf-test-page.json')
    .send()
    .expect(200)
    .then(res => app.sitemaphandler.once('finished', function() {
    let sitemap;
    try {
      sitemap = JSON.parse(fs.readFileSync(sitemapLoc));
    } catch (error) {
      throw err;
    }
    return sitemap.should.be.empty;
  })
    , function(err) {
      throw err;
  }));



  return after( function() {
    if (app.close) { return app.close(); }});
});
