// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
/*
 * Federated Wiki : Node Server
 *
 * Copyright Ward Cunningham and other contributors
 * Licensed under the MIT license.
 * https://github.com/fedwiki/wiki-server/blob/master/LICENSE.txt
*/


// **defaultargs.coffee** when called on the argv object this
// module will create reasonable defaults for options not supplied,
// based on what information is provided.
const path = require('path');

const getUserHome = () => process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;

module.exports = function(argv) {
  if (!argv) { argv = {}; }
  if (!argv.root) { argv.root = __dirname; }
  // the directory that contains all the packages that makeup the wiki
  if (!argv.packageDir) { argv.packageDir = path.join(argv.root, ".."); }
  if (!argv.port) { argv.port = 3000; }
  if (!argv.home) { argv.home = 'welcome-visitors'; }
  if (!argv.data) { argv.data = path.join(getUserHome(), '.wiki'); } // see also cli
  if (!argv.client) { argv.client = path.join(argv.packageDir, 'wiki-client', 'client'); }
  if (!argv.db) { argv.db = path.join(argv.data, 'pages'); }
  if (!argv.status) { argv.status = path.join(argv.data, 'status'); }
  if (!argv.assets) { argv.assets = path.join(argv.data, 'assets'); }
  if (!argv.recycler) { argv.recycler = path.join(argv.data, 'recycle'); }
  if (!argv.commons) { argv.commons = path.join(argv.data, 'commons'); }
  if (!argv.url) { argv.url = 'http://localhost' + (argv.port === 80 ? '' : ':' + argv.port); }
  if (!argv.id) { argv.id = path.join(argv.status, 'owner.json'); }
  if (!argv.uploadLimit) { argv.uploadLimit = '5mb'; }
  if (!argv.cookieSecret) { argv.cookieSecret = require('crypto').randomBytes(64).toString('hex'); }
  if (!argv.secure_cookie) { argv.secure_cookie = false; }
  if (!argv.session_duration) { argv.session_duration = 7; }
  if (!argv.neighbors) { argv.neighbors = ''; }
  if (!argv.debug) { argv.debug = false; }

  if (typeof(argv.database) === 'string') {
    argv.database = JSON.parse(argv.database);
  }
  if (!argv.database) { argv.database = {}; }
  if (!argv.database.type) { argv.database.type = './page'; }
  if (argv.database.type.charAt(0) === '.') {
    if (argv.database.type !== './page') {
      console.log("\n\nWARNING: This storage option is depeciated.");
      console.log("    See ReadMe for details of the changes required.\n\n");
    }
  } else {
    argv.database.type = 'wiki-storage-' + argv.database.type;
  }

  if (!argv.security_type) { argv.security_type = './security'; }
  if (argv.security_type === './security') {
    console.log("\n\nINFORMATION: Using default security module.");
  } else {
    argv.security_type = 'wiki-security-' + argv.security_type;
  }
  if (!argv.security_legacy) { argv.security_legacy = false; }

  //resolve all relative paths
  argv.root = path.resolve(argv.root);
  argv.packageDir = path.resolve(argv.packageDir);
  argv.data = path.resolve(argv.data);
  argv.client = path.resolve(argv.client);
  argv.db = path.resolve(argv.db);
  argv.status = path.resolve(argv.status);
  argv.assets = path.resolve(argv.assets);
  argv.recycler = path.resolve(argv.recycler);
  argv.commons = path.resolve(argv.commons);
  argv.id = path.resolve(argv.id);

  if (/node_modules/.test(argv.data)) {
    console.log("\n\nWARNING : The dafault data path is not a safe place.");
    console.log("       : by using ", argv.data, " your pages will be lost when packages are updated.");
    console.log("       : You are strongly advised to use an alternative directory.");
    console.log("       : See the wiki package ReadMe for how to do this.\n\n");
  }

  return argv;
};
