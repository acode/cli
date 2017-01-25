'use strict';

const Command = require('cmnd').Command;
const lib = require('lib');
const path = require('path');

function parseFunctionPath(name, version) {

  let names = name.split('.');
  for (let i = version ? 0 : 1; i < names.length; i++) {
    if (!names[i].match(/^[A-Z0-9\-]+$/gi)) {
      return null;
    }
  }

  return !version ? names : names.slice(0, 2).concat(`@${version}`, names.slice(2));

}

function parseLibPath(name) {

  let version = 'release';
  let versionMatch = name.match(/^[^\.]*?\.[^\.]*?(\[@(.*?)\]).*$/);

  if (versionMatch) {
    version = versionMatch[2];
    name = name.replace(versionMatch[1], '');
  }

  return parseFunctionPath(name, version);

}

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

    let isLocal = params.name[0] === '.';
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

    if (isLocal) {

      let pkg;

      try {
        pkg = require(path.join(process.cwd(), 'package.json'));
      } catch (e) {
        return callback(new Error('Invalid package.json in this directory'));
      }

      if (!pkg.stdlib) {
        return callback(new Error('No "stdlib" property set in package.json'));
      }

      params.name = params.name === '.' && pkg.stdlib.defaultFunction ?
        params.name + pkg.stdlib.defaultFunction :
        params.name;
      let names = parseFunctionPath(params.name);
      let pathname = path.join.apply(null, [process.cwd()].concat('f', names, 'index.js'));
      let fn;

      try {
        fn = require(pathname);
      } catch (e) {
        return callback(e);
      }

      if (typeof fn !== 'function') {
        return callback(new Error(`${params.name}: No valid function exported from "${pathname}"`));
      }

      let fnParams = {args: args, kwargs: kwargs};
      fnParams.buffer = new Buffer(JSON.stringify(fnParams));
      fnParams.env = process.env.ENV || 'dev';
      fnParams.service = '.';
      fnParams.remoteAddress = '::1';
      fn(fnParams, cb);

    } else {

      let names = parseLibPath(params.name);

      if (!names) {
        return callback(new Error(`Invalid service: "${params.name}"`));
      }

      lib(names, args.concat(kwargs, cb));

    }

  }

}

module.exports = __nomethod__Command;
