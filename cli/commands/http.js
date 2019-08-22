'use strict';

const Command = require('cmnd').Command;
const path = require('path');

const LocalGateway = require('../local_gateway.js');
const FunctionParser = require('functionscript').FunctionParser;

const parser = require('../parser.js');
const scripts = require('../scripts.js');
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

    scripts.run(pkg, 'prehttp', null, null, err => {

      if (err) {
        return callback(err);
      }

      scripts.run(pkg, '+http', null, null);

      let build = pkg.stdlib.build;
      let serviceName = pkg.stdlib.name;
      let localRoute = pkg.stdlib.local.route;
      let route = localRoute || serviceName;
      let port = (params.flags.p || params.vflags.port || [])[0] || parseInt(pkg.stdlib.local.port) || 8170;

      if (build !== 'legacy') {
        console.log();
        console.log(`Service starting on:`);
        console.log(`\tlocalhost:${port}/${route.replace(/^\//gi, '')}`);
        console.log();
        let gateway = new LocalGateway({debug: true});
        let fp = new FunctionParser();
        try {
          gateway.service(route);
          gateway.environment(env.local || {});
          gateway.define(fp.load(process.cwd(), 'functions'));
        } catch (e) {
          return callback(e);
        }
        gateway.listen(port);
      } else {
        parser.check(err => parser.createServer(pkg, port, !!err));
      }

    });

  }

}

module.exports = HTTPCommand;
