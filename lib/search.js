// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
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

// **search.coffee**

let exports;
const fs = require('fs');
const path = require('path');
const events = require('events');
const writeFileAtomic = require('write-file-atomic');
const mkdirp = require('mkdirp');

const miniSearch = require('minisearch');

module.exports = (exports = function(argv) {
  
  const wikiName = new URL(argv.url).hostname;

  let siteIndex = [];

  const queue = [];

  let searchPageHandler = null;

  // ms since last update we will remove index from memory
  // orig - searchTimeoutMs = 1200000
  const searchTimeoutMs = 120000;     // temp reduce to 2 minutes
  let searchTimeoutHandler = null;

  const siteIndexLoc = path.join(argv.status, 'site-index.json');
  const indexUpdateFlag = path.join(argv.status, 'index-updated');

  let working = false;

  const touch = (file, cb) => fs.stat(file, function(err, stats) {
    if (err === null) { return cb(); }
    return fs.open(file, 'w', function(err,fd) {
      if (err) { cb(err); }
      return fs.close(fd, err => cb(err));
    });
  });

  const searchPageUpdate = function(slug, page, cb) {
    // to update we have to remove the page first, and then readd it
    let pageText;
    try {
      pageText = page.story.reduce( extractPageText, '');
    } catch (err) {
      console.log(`SITE INDEX *** ${wikiName} reduce to extract the text on ${slug} failed`, err.message);
      pageText = "";
    }
    if (siteIndex.has(slug)) {
      siteIndex.replace({
        'id': slug,
        'title': page.title,
        'content': pageText
      });
    } else {
      siteIndex.add({
        'id': slug,
        'title': page.title,
        'content': pageText
      });
    }
    return cb();
  };

  const searchPageRemove = function(slug, cb) {
    // remove page from index
    const timeLabel = `SITE INDEX page remove ${slug} - ${wikiName}`;
    try {
      siteIndex.discard(slug); 
    } catch (err) {
      // swallow error, if the page was not in index
      if (!err.message.includes('not in the index')) { console.log(`removing ${slug} from index ${wikiName} failed`, err); }
    }
    return cb();
  };

  const searchSave = (siteIndex, cb) => // save index to file
  fs.exists(argv.status, function(exists) {
    if (exists) {
      return writeFileAtomic(siteIndexLoc, JSON.stringify(siteIndex), function(e) {
        if (e) { return cb(e); }
        return touch(indexUpdateFlag, err => cb());
      });
    } else {
      return mkdirp(argv.status, () => writeFileAtomic(siteIndexLoc, JSON.stringify(siteIndex), function(e) {
        if (e) { return cb(e); }
        return touch(indexUpdateFlag, err => cb());
      }));
    }
  });


  const searchRestore = cb => // restore index, or create if it doesn't already exist
  fs.exists(siteIndexLoc, function(exists) {
    if (exists) {
      return fs.readFile(siteIndexLoc, function(err, data) {
        if (err) { return cb(err); }
        try {
          siteIndex = miniSearch.loadJSON(data,
            {fields: ['title', 'content']});
        } catch (e) {
          return cb(e);
        }
        return process.nextTick( () => serial(queue.shift()));
    });
    }
  });

  var serial = function(item) {
    if (item) {
      switch (item.action) {
        case "update":
          itself.start();
          return searchPageUpdate(item.slug, item.page, e => process.nextTick( () => serial(queue.shift())));
        case "remove":
          itself.start();
          return searchPageRemove(item.slug, e => process.nextTick( () => serial(queue.shift())));
        default:
          console.log(`SITE INDEX *** unexpected action ${item.action} for ${item.page}`);
          return process.nextTick( () => serial(queue.shift));
      }
    } else {
      return searchSave(siteIndex, function(e) {
        if (e) { console.log("SITE INDEX *** save failed: " + e); }
        return itself.stop();
      });
    }
  };

  var extractPageText = function(pageText, currentItem, currentIndex, array) {
    // console.log('extractPageText', pageText, currentItem, currentIndex, array)
    try {
      if (currentItem.text != null) {
        switch (currentItem.type) {
          case 'paragraph': case 'markdown': case 'html': case 'reference':
            var noLinks = currentItem.text.replace(/\[{2}|\[(?:[\S]+)|\]{1,2}/g, '');
            // strip out all tags.
            pageText += noLinks.replace(/<(?:"[^"]*"['"]*|'[^']*'['"]*|[^'">])+>/g, ' ');
            break;
          default:
            if (currentItem.text != null) {
              for (var line of Array.from(currentItem.text.split(/\r\n?|\n/))) {
                if (!line.match(/^[A-Z]+[ ].*/)) { pageText += ' ' + line.replace(/\[{2}|\[(?:[\S]+)|\]{1,2}/g, ''); }
              }
            }
        }
      }
    } catch (err) {
      throw new Error(`Error extracting text from ${currentIndex}, ${err}, ${err.stack}`);
    }
    return pageText;
  };


  //### Public stuff ####

  var itself = new events.EventEmitter;
  itself.start = function() {
    clearTimeout(searchTimeoutHandler);
    working = true;
    return this.emit('indexing');
  };
  itself.stop = function() {
    const clearsearch = function() {
      console.log(`SITE INDEX ${wikiName} : removed from memory`);
      siteIndex = [];
      return clearTimeout(searchTimeoutHandler);
    };
    searchTimeoutHandler = setTimeout(clearsearch, searchTimeoutMs);
    working = false;
    return this.emit('indexed');
  };

  itself.isWorking = () => working;

  itself.createIndex = function(pagehandler) {

    itself.start();

    // we save the pagehandler, so we can recreate the site index if it is removed
    if ((searchPageHandler == null)) { searchPageHandler = pagehandler; }

    //timeLabel = "SITE INDEX #{wikiName} : Created"
    //console.time timeLabel

    return pagehandler.slugs(function(e, slugs) {
      if (e) {
        console.log(`SITE INDEX *** createIndex ${wikiName} error:`, e);
        itself.stop();
        return e;
      }
      
      siteIndex = new miniSearch({
        fields: ['title', 'content']
      });

      const indexPromises = slugs.map(slug => new Promise(resolve => pagehandler.get(slug, function(err, page) {
        let pageText;
        if (err) {
          console.log(`SITE INDEX *** ${wikiName}: error reading page`, slug);
          return;
        }
        // page
        try {
          pageText = page.story.reduce( extractPageText, '');
        } catch (error) {
          err = error;
          console.log(`SITE INDEX *** ${wikiName} reduce to extract text on ${slug} failed`, err.message);
          // console.log "page", page
          pageText = "";
        }
        siteIndex.add({
          'id': slug,
          'title': page.title,
          'content': pageText
        });
        return resolve();
      })));
  
      return Promise.all(indexPromises)
      .then(() => // console.timeEnd timeLabel
      process.nextTick(() => serial(queue.shift())));
    });
  };
      
  itself.removePage = function(slug) {
    const action = "remove";
    queue.push({action, slug });
    if (Array.isArray(siteIndex) && !working) {
      itself.start();
      return searchRestore(function(e) {
        if (e) { console.log(`SITE INDEX *** Problems restoring search index ${wikiName}:` + e); }
        return itself.createIndex(searchPageHandler);
      });
    } else {
      if (!working) { return serial(queue.shift()); }
    }
  };

  itself.update = function(slug, page) {
    const action = "update";
    queue.push({action, slug, page});
    if (Array.isArray(siteIndex) && !working) {
      itself.start();
      return searchRestore( function(e) {
        if (e) { console.log(`SITE INDEX *** Problems restoring search index ${wikiName}:` + e); }
        return itself.createIndex(searchPageHandler);});
    } else {
      if (!working) { return serial(queue.shift()); }
    }
  };

  itself.startUp = function(pagehandler) {
    // called on server startup, here we check if wiki already is index
    // we only create an index if there is either no index or there have been updates since last startup
    console.log(`SITE INDEX ${wikiName} : StartUp`);
    return fs.stat(siteIndexLoc, function(err, stats) {
      if (err === null) {
        // site index exists, but has it been updated?
        return fs.stat(indexUpdateFlag, function(err, stats) {
          if (!err) {
            // index has been updated, so recreate it. 
            itself.createIndex(pagehandler);
            // remove the update flag once the index has been created
            return itself.once('indexed', () => fs.unlink(indexUpdateFlag, function(err) {
              if (err) { return console.log(`+++ SITE INDEX ${wikiName} : unable to delete update flag`); }
            }));
          } else {
            // not been updated, but is it the correct version?
            return fs.readFile(siteIndexLoc, function(err, data) {
              if (!err) {
                let testIndex;
                try {
                  testIndex = JSON.parse(data);
                } catch (error) {
                  err = error;
                  testIndex = {};
                }
                if (testIndex.serializationVersion !== 2) {
                  console.log(`+++ SITE INDEX ${wikiName} : updating to latest version.`);
                  itself.createIndex(pagehandler);
                  // remove the update flag once the index has been created
                  return itself.once('indexed', () => fs.unlink(indexUpdateFlag, function(err) {
                    if (err) { return console.log(`+++ SITE INDEX ${wikiName} : unable to delete update flag`); }
                  }));
                }
              } else {
                console.log(`+++ SITE INDEX ${wikiName} : error reading index - attempting creating`);
                itself.createIndex(pagehandler);
                // remove the update flag once the index has been created
                return itself.once('indexed', () => fs.unlink(indexUpdateFlag, function(err) {
                  if (err) { return console.log(`+++ SITE INDEX ${wikiName} : unable to delete update flag`); }
                }));
              }
            });
          }
        });
      } else {
        // index does not exist, so create it
        itself.createIndex(pagehandler);
        // remove the update flag once the index has been created
        return itself.once('indexed', () => fs.unlink(indexUpdateFlag, function(err) {
          if (err) { return console.log(`+++ SITE INDEX ${wikiName} : unable to delete update flag`); }
        }));
      }
    });
  };


        
  return itself;
});
