/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
/*
 * Federated Wiki : Node Server
 *
 * Copyright Ward Cunningham and other contributors
 * Licensed under the MIT license.
 * https://github.com/fedwiki/wiki-server/blob/master/LICENSE.txt
*/

// **sitemap.coffee**

let exports;
const fs = require('fs');
const path = require('path');
const events = require('events');
const writeFileAtomic = require('write-file-atomic');
const _ = require('lodash');
const xml2js = require('xml2js');

const mkdirp = require('mkdirp');

const synopsis = require('wiki-client/lib/synopsis');

const asSlug = name => name.replace(/\s/g, '-').replace(/[^A-Za-z0-9-]/g, '').toLowerCase();


module.exports = (exports = function(argv) {

  const wikiName = new URL(argv.url).hostname;

  let sitemap = [];

  const queue = [];

  let sitemapPageHandler = null;

  // ms since last update we will remove sitemap from memory
  const sitemapTimeoutMs = 120000;
  let sitemapTimeoutHandler = null;

  const sitemapLoc = path.join(argv.status, 'sitemap.json');
  const xmlSitemapLoc = path.join(argv.status, 'sitemap.xml');

  let working = false;

  const lastEdit = function(journal) {
    const iterable = journal || [];
    for (let i = iterable.length - 1; i >= 0; i--) {
      var action = iterable[i];
      if (action.date && (action.type !== 'fork')) { return action.date; }
    }
    return undefined;
  };

  const sitemapUpdate = function(file, page, cb) {

    let pageLinks, pageLinksMap;
    const extractPageLinks = function(collaborativeLinks, currentItem, currentIndex, array) {
      // extract collaborative links 
      // - this will need extending if we also extract the id of the item containing the link
      try {
        const linkRe = /\[\[([^\]]+)\]\]/g;
        let match = undefined;
        while ((match = linkRe.exec(currentItem.text)) !== null) {
          if (!collaborativeLinks.has(asSlug(match[1]))) {
            collaborativeLinks.set(asSlug(match[1]), currentItem.id);
          }
        }
        if ('reference' === currentItem.type) {
          if (!collaborativeLinks.has(currentItem.slug)) {
            collaborativeLinks.set(currentItem.slug, currentItem.id);
          }
        }
      } catch (err) {
        console.log(`METADATA *** ${wikiName} Error extracting links from ${currentIndex} of ${JSON.stringify(array)}`, err.message);
      }
      return collaborativeLinks;
    };

    try {
      pageLinksMap = page.story.reduce( extractPageLinks, new Map());
    } catch (error) {
      const err = error;
      console.log(`METADATA *** ${wikiName} reduce to extract links on ${file} failed`, err.message);
      pageLinksMap = [];
    }
    //
    if (pageLinksMap.size > 0) {
      pageLinks = Object.fromEntries(pageLinksMap);
    } else {
      pageLinks = undefined;
    }

    const entry = {
      'slug': file,
      'title': page.title,
      'date': lastEdit(page.journal),
      'synopsis': synopsis(page),
      'links': pageLinks
    };

    const slugs = sitemap.map(page => page.slug);

    const idx = slugs.indexOf(file);

    if (~idx) {
      sitemap[idx] = entry;
    } else {
      sitemap.push(entry);
    }

    return cb();
  };

  const sitemapRemovePage = function(file, cb) {
    const slugs = sitemap.map(page => page.slug);
    const idx = slugs.indexOf(file);

    if (~idx) {
      _.pullAt(sitemap, idx);
    }

    return cb();
  };

  const sitemapSave = (sitemap, cb) => fs.exists(argv.status, function(exists) {
    if (exists) {
      return writeFileAtomic(sitemapLoc, JSON.stringify(sitemap), function(e) {
        if (e) { return cb(e); }
        return cb();
      });
    } else {
      return mkdirp(argv.status, () => writeFileAtomic(sitemapLoc, JSON.stringify(sitemap), function(e) {
        if (e) { return cb(e); }
        return cb();
      }));
    }
  });

  const sitemapRestore = cb => fs.exists(sitemapLoc, function(exists) {
    if (exists) {
      return fs.readFile(sitemapLoc, function(err, data) {
        if (err) { return cb(err); }
        try {
          sitemap = JSON.parse(data);
        } catch (e) {
          return cb(e);
        }
        return process.nextTick( () => serial(queue.shift()));
      });
    } else {
      // sitemap file does not exist, so needs creating
      return itself.createSitemap(sitemapPageHandler);
    }
  });

  const xmlSitemapSave = function(sitemap, cb) {
    let xmlmap = [];
    _.each(sitemap, function(page) {
      const result = {};
      result["loc"] = argv.url + "/" + page.slug + ".html";
      if (page.date != null) {
        const date = new Date(page.date);
        if (!(isNaN(date.valueOf()))) {
          result["lastmod"] = date.toISOString().substring(0,10);
        }
      }
      return xmlmap.push(result);
    });
    xmlmap = {'urlset': {"$": {"xmlns": "http://www.sitemaps.org/schemas/sitemap/0.9"},'url': xmlmap}};
    const builder = new xml2js.Builder();
    const xml = builder.buildObject(xmlmap);
    return fs.exists(argv.status, function(exists) {
      if (exists) {
        return writeFileAtomic(xmlSitemapLoc, xml, function(e) {
          if (e) { return cb(e); }
          return cb();
        });
      } else {
        return mkdirp(argv.status, () => writeFileAtomic(xmlSitemapLoc, xml, function(e) {
          if (e) { return cb(e); }
          return cb();
        }));
      }
    });
  };

  var serial = function(item) {
    if (item) {
      switch (item.action) {
        case "update":
          itself.start();
          return sitemapUpdate(item.file, item.page, e => process.nextTick( () => serial(queue.shift())));
        case "remove":
          itself.start();
          return sitemapRemovePage(item.file, e => process.nextTick( () => serial(queue.shift())));
        default:
          console.log(`Sitemap unexpected action ${item.action} for ${item.page} in ${wikiName}`);
          return process.nextTick( () => serial(queue.shift));
      }
    } else {
      sitemapSave(sitemap, function(e) {
        if (e) { console.log(`Problems saving sitemap ${wikiName}: `+ e); }
        return itself.stop();
      });
      return xmlSitemapSave(sitemap, function(e) {
        if (e) { return console.log(`Problems saving sitemap(xml) ${wikiName}`+ e); }
      });
    }
  };


  //### Public stuff ####

  var itself = new events.EventEmitter;
  itself.start = function() {
    clearTimeout(sitemapTimeoutHandler);
    working = true;
    return this.emit('working');
  };
  itself.stop = function() {
    const clearsitemap = function() {
      console.log(`removing sitemap ${wikiName} from memory`);
      sitemap = [];
      return clearTimeout(sitemapTimeoutHandler);
    };
    sitemapTimeoutHandler = setTimeout(clearsitemap, sitemapTimeoutMs);
    working = false;
    return this.emit('finished');
  };

  itself.isWorking = () => working;

  itself.createSitemap = function(pagehandler) {

    itself.start();

    // we save the pagehandler, so we can recreate the sitemap if it is removed
    if ((sitemapPageHandler == null)) { sitemapPageHandler = pagehandler; }

    return pagehandler.pages(function(e, newsitemap) {
      if (e) {
        console.log(`createSitemap ${wikiName} : error ` + e);
        itself.stop();
        return e;
      }
      sitemap = newsitemap;

      return process.nextTick(( () => serial(queue.shift()))
      );
    });
  };

  itself.removePage = function(file) {
    const action = "remove";
    queue.push({action, file, "": ""});
    if ((sitemap.length === 0) && !working) {
      itself.start();
      return sitemapRestore(function(e) {
        if (e) { console.log(`Problems restoring sitemap ${wikiName} : ` + e); }
        return itself.createSitemap(sitemapPageHandler);
      });
    } else {
      if (!working) { return serial(queue.shift()); }
    }
  };


  itself.update = function(file, page) {
    const action = "update";
    queue.push({action, file, page});
    if ((sitemap.length === 0) && !working) {
      itself.start();
      return sitemapRestore(function(e) {
        if (e) { console.log(`Problems restoring sitemap ${wikiName} : ` + e); }
        return itself.createSitemap(sitemapPageHandler);
      });
    } else {
      if (!working) { return serial(queue.shift()); }
    }
  };



  return itself;
});
