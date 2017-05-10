'use strict';

const Command = require('cmnd').Command;
const fs = require('fs');
const path = require('path');

const LocalGateway = require('../local_gateway.js');
const FunctionParser = require('faaslang').FunctionParser;

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
        b: 'Execute as a Background Function',
        d: 'Specify debug mode (prints Gateway logs)',
        f: 'Specify a file to send (overrides args and kwargs)',
        t: 'Specify a Library Token',
        w: 'Specify a Webhook (Deprecated)'
      },
      vflags: {
        '*': 'all verbose flags converted to named keyword parameters'
      }
    };

  }

  run(params, callback) {

    let debug = !!params.flags.d;
    let gateway;

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
    } else if (params.name[0] === '.') {
      let pkg;
      let env;
      try {
        pkg = require(path.join(process.cwd(), 'package.json'));
      } catch (e) {
        console.error(e);
        return callback(new Error('Invalid package.json in this directory'));
      }
      try {
        env = require(path.join(process.cwd(), 'env.json'));
      } catch (e) {
        console.error(e);
        return callback(new Error('Invalid env.json in this directory'));
      }
      if (pkg.stdlib.build === 'faaslang') {
        gateway = new LocalGateway({debug: debug});
        let fp = new FunctionParser();
        try {
          gateway.service(pkg.stdlib.name);
          gateway.environment(env.local || {});
          gateway.define(fp.load(process.cwd(), 'functions'));
        } catch (e) {
          return callback(e);
        }
        gateway.listen();
        params.name = `${pkg.stdlib.name.replace(/\//gi, '.')}[@local]${params.name.length > 1 ? params.name : ''}`;
      }
    }

    let args = params.args.slice();
    let kwargs = Object.keys(params.vflags).reduce((kwargs, key) => {
      kwargs[key] = params.vflags[key].join(' ');
      return kwargs
    }, {});

    let token = (params.flags.t && params.flags.t[0]) || null;
    let webhook = (params.flags.w && params.flags.w[0]) || null;
    let bg = params.flags.b ? (params.flags.b[0] || true) : null;
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
      } else {
        if (result instanceof Buffer) {
          console.log(result.toString('binary'));
        } else {
          console.log(JSON.stringify(result, null, 2));
        }
      }

      if (gateway && gateway._requestCount) {
        gateway.once('empty', () => callback(err));
      } else {
        callback(err);
      }

    };

    try {
      let cfg = {token: token, host: host, port: port, webhook: webhook, bg: bg, convert: true};
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
