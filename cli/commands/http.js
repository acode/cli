'use strict';

const Command = require('cmnd').Command;
const path = require('path');

const LocalGateway = require('../local_gateway.js');

const parser = require('../parser.js');
const scripts = require('../scripts.js');

class HTTPCommand extends Command {

  constructor() {

    super('http');

  }

  help() {

    return {
      description: 'Creates HTTP Server for Current Service',
      flags: {},
      vflags: {}
    };

  }

  run(params, callback) {

    let gateway = new LocalGateway({debug: true});
    gateway.start();

    // try {
    //   pkg = require(path.join(process.cwd(), 'package.json'));
    // } catch (e) {
    //   throw new Error('Invalid package.json in this directory');
    //   return true;
    // }
    //
    // scripts.run(pkg, 'prehttp', null, null, err => {
    //
    //   if (err) {
    //     return callback(err);
    //   }
    //
    //   scripts.run(pkg, '+http', null, null);
    //
    //   if (!offline) {
    //     parser.check(err => parser.createServer(pkg, port, !!err));
    //   } else {
    //     parser.createServer(pkg, port, offline);
    //   }
    //
    // });

  }

}

module.exports = HTTPCommand;
