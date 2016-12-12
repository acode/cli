'use strict';

const Command = require('cmnd').Command;
const path = require('path');

const parser = require('../parser.js');

class HTTPCommand extends Command {

  constructor() {

    super('http');

  }

  help() {

    return {
      description: 'Creates HTTP Server for Current Service',
      flags: {p: 'Port (Default 8170)'},
      vflags: {port: 'Port (Default 8170)'}
    };

  }

  run(params, callback) {

    let port = (params.flags.p || params.vflags.port || [])[0] || 8170;
    let offline = !!(params.flags.o || params.vflags.offline);
    let pkg = {};

    try {
      pkg = require(path.join(process.cwd(), 'package.json'));
    } catch (e) {
      throw new Error('Invalid package.json in this directory');
      return true;
    }

    if (!offline) {
      parser.check(err => parser.createServer(pkg, port, !!err));
    } else {
      parser.createServer(pkg, port, offline);
    }

  }

}

module.exports = HTTPCommand;
