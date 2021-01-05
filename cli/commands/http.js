'use strict';

const Command = require('cmnd').Command;
const path = require('path');
const child_process = require('child_process');

const parser = require('../parser.js');
const serviceConfig = require('../service_config');

const DEFAULT_BUILD = 'faaslang';

class HTTPCommand extends Command {

  constructor() {

    super('http');

  }

  help() {

    return {
      description: 'Creates HTTP Server for Current Service',
      flags: {
        p: 'Port (default 8170)'
      },
      vflags: {
        port: 'Port (default 8170)'
      }
    };

  }

  run(params, callback) {

    let pkg;
    let env;

    try {
      pkg = serviceConfig.get();
    } catch(err) {
      return callback(err);
    }

    try {
      env = require(path.join(process.cwd(), 'env.json'));
    } catch (e) {
      console.error(e);
      return callback(new Error('Invalid env.json in this directory'));
    }

    let build = pkg.stdlib.build;
    let serviceName = pkg.stdlib.name;
    let localRoute = pkg.stdlib.local.route;
    let route = localRoute || serviceName;
    let port = (params.flags.p || params.vflags.port || [])[0] || parseInt(pkg.stdlib.local.port) || 8170;

    route = route.startsWith('/') ? route : '/' + route;

    if (build !== 'legacy') {
      child_process.fork(path.join(__dirname, '../local_http.js'), [`PORT=${port}`, `ROUTE=${route}`, `NAME=${serviceName}`]);
    } else {
      parser.check(err => parser.createServer(pkg, port, !!err));
    }

  }

}

module.exports = HTTPCommand;
