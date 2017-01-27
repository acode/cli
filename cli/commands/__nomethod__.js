'use strict';

const Command = require('cmnd').Command;
const fs = require('fs');
const lib = require('lib');
const path = require('path');

const env = require('../env.js');

class __nomethod__Command extends Command {

  constructor() {

    super('*');

  }

  help() {

    return {
      description: 'Runs a StdLib Function (requires a period)',
      args: [
        'all arguments converted to params.args'
      ],
      flags: {
        f: 'Specify a file to send (overrides args and kwargs)'
      },
      vflags: {
        '*': 'all verbose flagss converted to params.kwargs'
      }
    };

  }

  run(params, callback) {

    if (params.name.indexOf('.') === -1) {
      if (params.name.indexOf('/') > -1) {
        return callback(new Error(`Deprecated service path usage, please try \`lib ${params.name.split('/').join('.')}\` instead`));
      }
      return callback(new Error(`Command "${params.name}" does not exist.`));
    }

    let args = params.args.slice();
    let kwargs = Object.keys(params.vflags).reduce((kwargs, key) => {
      kwargs[key] = params.vflags[key].join(' ');
      return kwargs
    }, {});

    let cb = (err, result) => {

      if (err) {
        return callback(err);
      }

      if (result instanceof Buffer) {
        console.log(result.toString('binary'));
      } else if (typeof result === 'object') {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(result);
      }

    };

    try {
      process.env = env();
      if (params.flags.f && params.flags.f.length === 1) {
        const buffer = fs.readFileSync(params.flags.f[0]);
        lib[params.name](buffer, cb);
      } else {
        lib[params.name](...args, kwargs, cb);
      }
    } catch(e) {
      return callback(e);
    }

  }

}

module.exports = __nomethod__Command;
