'use strict';

const Command = require('cmnd').Command;
const lib = require('lib');
const path = require('path');

class __nomethod__Command extends Command {

  constructor() {

    super('*');

  }

  help() {

  }

  run(params, callback) {

    if (params.name.indexOf('.') === -1) {
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
      lib[params.name](...args, kwargs, cb);
    } catch(e) {
      return callback(e);
    }

  }

}

module.exports = __nomethod__Command;
