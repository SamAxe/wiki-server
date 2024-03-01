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
 * https://github.com/fedwiki/wiki-node-server/blob/master/LICENSE.txt
*/
// **security.coffee**
// Module for default site security.
//
// This module is not intented for use, but is here to catch a problem with
// configuration of security. It does not provide any authentication, but will
// allow the server to run read-only.

//### Requires ####
let exports;
const fs = require('fs');


// Export a function that generates security handler
// when called with options object.
module.exports = (exports = function(log, loga, argv) {
  const security={};

  //### Private utility methods. ####

  const user = '';

  let owner = '';

  const {
    admin
  } = argv;

  // save the location of the identity file
  const idFile = argv.id;

  //### Public stuff ####

  security.authenticate_session = () => (function(req, res, next) {
    // not possible to login, so always false
    req.isAuthenticated = () => false;
    return next();
  });

  // Retrieve owner infomation from identity file in status directory
  security.retrieveOwner = cb => fs.exists(idFile, function(exists) {
    if (exists) {
      return fs.readFile(idFile, function(err, data) {
        if (err) { return cb(err); }
        owner += data;
        return cb();
    });
    } else {
      owner = '';
      return cb();
    }
  });

  // Return the owners name
  security.getOwner = function() {
    let ownerName;
    if ((owner.name == null)) {
      ownerName = '';
    } else {
      ownerName = owner.name;
    }
    return ownerName;
  };

  security.getUser = req => '';

  security.isAuthorized = function(req) {
    // nobody is authorized - everything is read-only
    // unless legacy support, when unclaimed sites can be editted.
    if (owner === '') {
      if (argv.security_legacy) {
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  };

  // Wiki server admin
  security.isAdmin = () => false;

  security.defineRoutes = function(app, cors, updateOwner) {};
    // default security does not have any routes


  return security;
});
