'use strict';

const Command = require('cmnd').Command;
const fs = require('fs');
const path = require('path');

const lib = require('lib');

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
        f: 'Specify a file to send (overrides args and kwargs)',
        t: 'Specify a Library Token',
        w: 'Specify a Webhook'
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
    let webhook = (params.flags.w && params.flags.w[0]) || null;
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
        if (result && result.error) {
          let message = result.error.message || '';
          if (result.error.type === 'ParameterError' || result.error.type === 'ValueError') {
            let params = result.error.details;
            params && Object.keys(params).forEach(name => {
              message += `\n[${name}] ${params[name].message}`;
            });
          }
          err.message = message;
        }
        return callback(err);
      }

      if (result instanceof Buffer) {
        console.log(result.toString('binary'));
      } else if (typeof result === 'object') {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(result);
      }

      callback();

    };

    try {
      let cfg = {token: token, host: host, port: port, webhook: webhook,};
      if (Object.keys(kwargs).length) {
        lib(cfg)[params.name](kwargs, ...args, cb);
      } else {
        lib(cfg)[params.name](...args, cb);
      }
    } catch(e) {
      console.error(e);
      return callback(e);
    }

  }

}

module.exports = __nomethod__Command;
