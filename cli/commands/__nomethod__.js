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
        '*': 'all verbose flags converted to params.kwargs'
      }
    };

  }

  run(params, callback) {

    if (params.name.indexOf('.') === -1) {
      if (params.name.indexOf('/') > -1) {
        let names = params.name.split('/');
        if (names[1].indexOf('@') > -1) {
          names[1] = names[1].split('@');
          if (names[1].length > 1) {
            names[1][1] = names[1][1] && `[@${names[1][1]}]`;
          }
          names[1] = names[1].slice(0, 2).join('');
        }
        return callback(new Error(`Deprecated service path usage, please try \`lib ${names.join('.')}\` instead`));
      }
      return callback(new Error(`Command "${params.name}" does not exist.`));
    }

    let args = params.args.slice();
    let kwargs = Object.keys(params.vflags).reduce((kwargs, key) => {
      kwargs[key] = params.vflags[key].join(' ');
      return kwargs
    }, {});

    let token = (params.flags.t && params.flags.t[0]) || null;
    let hostname = (params.flags.h && params.flags.h[0]) || '';
    let matches = hostname.match(/^(https?:\/\/)?(.*?)(:\d+)?$/);
    let host;
    let port;

    if (hostname && matches) {
      host = matches[2];
      port = parseInt((matches[3] || '').substr(1) || (hostname.indexOf('https') === 0 ? 443 : 80));
    }

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
        const filepath = params.flags.f[0];
        const filename = filepath.split('/').pop();
        const buffer = fs.readFileSync(filepath);
        kwargs.filename = kwargs.hasOwnProperty('filename') ? kwargs.filename : filename;
        lib({token: token, host: host, port: port})[params.name](buffer, kwargs, cb);
      } else {
        lib({token: token, host: host, port: port})[params.name](...args, kwargs, cb);
      }
    } catch(e) {
      return callback(e);
    }

  }

}

module.exports = __nomethod__Command;
