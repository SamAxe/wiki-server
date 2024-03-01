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

// support server-side plugins

let exports;
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const events = require('events');
// forward = require './forward'

module.exports = (exports = function(argv) {

// NOTE: plugins are now in their own package directories alongside this one...
// Plugins are in directories of the form wiki-package-*
// those with a server component will have a server directory

	const plugins = {};

	// http://stackoverflow.com/questions/10914751/loading-node-js-modules-dynamically-based-on-route

	const startServer = function(params, plugin) {
		const server = `${argv.packageDir}/${plugin}/server/server.js`;
		return fs.exists(server, function(exists) {
			if (exists) {
				console.log('starting plugin', plugin);
				try {
					plugins[plugin] = require(server);
					return (typeof plugins[plugin].startServer === 'function' ? plugins[plugin].startServer(params) : undefined);
				} catch (e) {
					return console.log('failed to start plugin', plugin, (e != null ? e.stack : undefined) || e);
				}
			}
		});
	};

	const startServers = params => // emitter = new events.EventEmitter()
    // forward.init params.app, emitter
    // params.emitter = emitter
    glob(
        "wiki-plugin-*",
        {cwd: argv.packageDir},
        (e, plugins) => Array.from(plugins).map((plugin) => startServer(params, plugin))
    );


	return {startServers};
});
