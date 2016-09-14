'use strict';

const Command = require('cmnd').Command;
const https = require('https');
const http = require('http');
const stdlib = require('../../index.js');

class FCommand extends Command {

  constructor() {

    super('f');

  }

  help() {

    return {
      description: 'Runs a stdlib function'
    };

  }

  run(params, callback) {

    let fnName = params.args.shift() || '';
    let buffer = params.buffer;
    let data = buffer.toString().split(' ').slice(1).join(' ');

    stdlib.f(fnName)(data, callback);

  }

}

module.exports = FCommand;
