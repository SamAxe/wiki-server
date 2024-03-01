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
// **page.coffee**
// Module for interacting with pages persisted on the server.
// Everything is stored using json flat files.

//### Requires ####
let exports;
const fs = require('fs');
const path = require('path');
const events = require('events');
const glob = require('glob');

const mkdirp = require('mkdirp');
const async = require('async');

const random_id = require('./random_id');
const synopsis = require('wiki-client/lib/synopsis');

const asSlug = name => name.replace(/\s/g, '-').replace(/[^A-Za-z0-9-]/g, '').toLowerCase();


// Export a function that generates a page handler
// when called with options object.
module.exports = (exports = function(argv) {

  const wikiName = new URL(argv.url).hostname;

  mkdirp(argv.db, function(e) {
    if (e) { throw e; }
  });

  //### Private utility methods. ####
  const load_parse = function(loc, cb, annotations) {
    if (annotations == null) { annotations = {}; }
    return fs.readFile(loc, function(err, data) {
      let page;
      if (err) { return cb(err); }
      try {
        page = JSON.parse(data);
      } catch (e) {
        const errorPage = path.basename(loc);
        const errorPagePath = path.dirname(loc);
        const recyclePage = path.resolve(errorPagePath, '..', 'recycle', errorPage);
        fs.exists(path.dirname(recyclePage), function(exists) {
          if (exists) {
            return fs.rename(loc, recyclePage, function(err) {
              if (err) {
                return console.log(`ERROR: moving problem page ${loc} to recycler`, err);
              } else {
                return console.log(`ERROR: problem page ${loc} moved to recycler`);
              }
              });
          } else {
            return mkdirp(path.dirname(recyclePage), function(err) {
              if (err) {
                return console.log("ERROR: creating recycler", err);
              } else {
                return fs.rename(loc, recyclePage, function(err) {
                  if (err) {
                    return console.log(`ERROR: moving problem page ${loc} to recycler`, err);
                  } else {
                    return console.log(`ERROR: problem page ${loc} moved to recycler`);
                  }
                  });
              }
              });
          }
            });
        return cb(null, 'Error Parsing Page', 404);
      }
      for (var key in annotations) {
        var val = annotations[key];
        page[key] = val;
      }
      return cb(null, page);
    });
  };

  const load_parse_copy = (defloc, file, cb) => fs.readFile(defloc, function(err, data) {
    let page;
    if (err) { cb(err); }
    try {
      page = JSON.parse(data);
    } catch (e) {
      return cb(e);
    }
    cb(null, page);
    return itself.put(file, page, function(err) {
      if (err) { return cb(err); }
    });
  });

  // Reads and writes are async, but serially queued to avoid race conditions.
  const queue = [];

  const tryDefaults = function(file, cb) {
    const lastDefault = function(cb) {
      const defloc = path.join(argv.root, 'default-data', 'pages', file);
      return fs.exists(defloc, function(exists) {
        if (exists) {
          return cb(defloc);
        } else {
          return cb(null);
        }
      });
    };
    if (argv.defaults) {
      const defloc = path.join(argv.data, '..', argv.defaults, 'pages', file);
      console.log('firstDefault', defloc);
      return fs.exists(defloc, function(exists) {
        if (exists) {
          return cb(defloc);
        } else {
          return lastDefault(cb);
        }
      });
    } else {
      return lastDefault(cb);
    }
  };

  // Main file io function, when called without page it reads,
  // when called with page it writes.
  const fileio = function(action, file, page, cb) {
    let loc;
    if (file.startsWith('recycler/')) {
      loc = path.join(argv.recycler, file.split('/')[1]);
    } else {
      loc = path.join(argv.db, file);
    }
    switch (action) {
      case 'delete':
        if (file.startsWith('recycler/')) {
          // delete from recycler
          return fs.exists(loc, function(exists) {
            if (exists) {
              return fs.unlink(loc, err => cb(err));
            }
          });
        } else {
          // move page to recycler
          return fs.exists(loc, function(exists) {
            if (exists) {
              const recycleLoc = path.join(argv.recycler, file);
              return fs.exists(path.dirname(recycleLoc), function(exists) {
                if (exists) {
                  return fs.rename(loc, recycleLoc, err => cb(err));
                } else {
                  return mkdirp(path.dirname(recycleLoc), function(err) {
                    if (err) { cb(err); }
                    return fs.rename(loc, recycleLoc, err => cb(err));
                  });
                }
              });
            } else {
              return cb('page does not exist');
            }
          });
        }
      case 'recycle':
        var copyFile = function(source, target, cb) {

          const done = function(err) {
            if (!cbCalled) {
              cb(err);
              var cbCalled = true;
            }
          };

          const cbCalled = false;

          const rd = fs.createReadStream(source);
          rd.on('error', function(err) {
            done(err);
          });

          const wr = fs.createWriteStream(target);
          wr.on('error', function(err) {
            done(err);
          });
          wr.on('close', function(ex) {
            done();
          });
          rd.pipe(wr);
        };

        return fs.exists(loc, function(exists) {
          if (exists) {
            const recycleLoc = path.join(argv.recycler, file);
            return fs.exists(path.dirname(recycleLoc), function(exists) {
              if (exists) {
                return copyFile(loc, recycleLoc, err => cb(err));
              } else {
                return mkdirp(path.dirname(recycleLoc), function(err) {
                  if (err) { cb(err); }
                  return copyFile(loc, recycleLoc, err => cb(err));
                });
              }
            });
          } else {
            return cb('page does not exist');
          }
        });
      case 'get':
        return fs.exists(loc, function(exists) {
          if (exists) {
            return load_parse(loc, cb, {plugin: undefined});
          } else {
            return tryDefaults(file, function(defloc) {
              if (defloc) {
                return load_parse(defloc, cb);
              } else {
                return glob("wiki-plugin-*/pages", {cwd: argv.packageDir}, function(e, plugins) {
                  if (e) { return cb(e); }

                  // if no plugins found
                  if (plugins.length === 0) {
                    cb(null, 'Page not found', 404);
                  }

                  const giveUp = (function() {
                    let count = plugins.length;
                    return function() {
                      count -= 1;
                      if (count === 0) {
                        return cb(null, 'Page not found', 404);
                      }
                    };
                  })();

                  return Array.from(plugins).map((plugin) =>
                    (function() {
                      const pluginName = plugin.slice(12, -6);
                      const pluginloc = path.join(argv.packageDir, plugin, file);
                      return fs.exists(pluginloc, function(exists) {
                        if (exists) {
                          return load_parse(pluginloc, cb, {plugin: pluginName});
                        } else {
                          return giveUp();
                        }
                      });
                    })());
              });
              }
            });
          }
        });
      case 'put':
        page = JSON.stringify(page, null, 2);
        return fs.exists(path.dirname(loc), function(exists) {
          if (exists) {
            return fs.writeFile(loc, page, function(err) {
              if (err) {
                console.log(`ERROR: write file ${loc} `, err);
              }
              return cb(err);
            });
          } else {
            return mkdirp(path.dirname(loc), function(err) {
              if (err) { cb(err); }
              return fs.writeFile(loc, page, function(err) {
                if (err) {
                  console.log(`ERROR: write file ${loc} `, err); 
                }
                return cb(err);
              });
            });
          }
        });
      default:
        return console.log(`pagehandler: unrecognized action ${action}`);
    }
  };

  // Control variable that tells if the serial queue is currently working.
  // Set back to false when all jobs are complete.
  let working = false;

  // Keep file io working on queued jobs, but don't block the main thread.
  var serial = function(item) {
    if (item) {
      itself.start();
      return fileio(item.action, item.file, item.page, function(err, data, status) {
        process.nextTick( () => serial(queue.shift()));
        return item.cb(err, data, status);
      });
    } else {
      return itself.stop();
    }
  };

  //### Public stuff ####
  // Make the exported object an instance of EventEmitter
  // so other modules can tell if it is working or not.
  var itself = new events.EventEmitter;
  itself.start = function() {
    working = true;
    return this.emit('working');
  };
  itself.stop = function() {
    working = false;
    return this.emit('finished');
  };

  itself.isWorking = () => working;

  // get method takes a slug and a callback, adding them to the queue,
  // starting serial if it isn't already working.
  itself.get = function(file, cb) {
    queue.push({action: 'get', file, page: null, cb});
    if (!working) { return serial(queue.shift()); }
  };

  // put takes a slugged name, the page as a json object, and a callback.
  // adds them to the queue, and starts it unless it is working.
  itself.put =  function(file, page, cb) {
    queue.push({action: 'put', file, page, cb});
    if (!working) { return serial(queue.shift()); }
  };

  itself.delete = function(file, cb) {
    queue.push({action: 'delete', file, page: null, cb});
    if (!working) { return serial(queue.shift()); }
  };

  itself.saveToRecycler = function(file, cb) {
    queue.push({action: 'recycle', file, page: null, cb});
    if (!working) { return serial(queue.shift()); }
  };

  const editDate = function(journal) {
    const iterable = journal || [];
    for (let i = iterable.length - 1; i >= 0; i--) {
      var action = iterable[i];
      if (action.date && (action.type !== 'fork')) { return action.date; }
    }
    return undefined;
  };

  itself.pages = function(cb) {

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

    return fs.readdir(argv.db, function(e, files) {
      if (e) { return cb(e); }
      // used to make sure all of the files are read
      // and processesed in the site map before responding
      const doSitemap = (file, cb) => itself.get(file, function(e, page, status) {
        let pageLinks, pageLinksMap;
        if (file.match(/^\./)) { return cb(); }
        if (e || (status === 404)) {
          console.log('Problem building sitemap:', file, 'e: ', e, 'status:', status);
          return cb(); // Ignore errors in the pagehandler get.
        }

        try {
          pageLinksMap = page.story.reduce( extractPageLinks, new Map());
        } catch (err) {
          console.log(`METADATA *** ${wikiName} reduce to extract links on ${file} failed`, err.message);
          pageLinksMap = [];
        }
        //
        if (pageLinksMap.size > 0) {
          pageLinks = Object.fromEntries(pageLinksMap);
        } else {
          pageLinks = undefined;
        }
      
        return cb(null, {
          slug     : file,
          title    : page.title,
          date     : editDate(page.journal),
          synopsis : synopsis(page),
          links    : pageLinks
        });
    });

      return async.map(files, doSitemap, function(e, sitemap) {
        if (e) { return cb(e); }
        return cb(null, sitemap.filter(function(item) { if (item != null) { return true; } }));
      });
    });
  };

  itself.slugs = cb => fs.readdir(argv.db, {withFileTypes: true}, function(e, files) {
    if (e) {
      console.log('Problem reading pages directory', e);
      return cb(e);
    } else {
      const onlyFiles = files.map(function(i) {
        if (i.isFile()) { 
          return i.name; 
        } else {
          return null;
        }
        }).filter(i => (i !== null) && !(i != null ? i.startsWith('.') : undefined));
      return cb(null, onlyFiles);
    }
  });

  return itself;
});
