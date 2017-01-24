'use strict';

const Command = require('cmnd').Command;
const lib = require('lib');

function parseLibPath(name) {

  let version = 'release';
  let versionMatch = name.match(/^[^\.]*?\.[^\.]*?(\[@(.*?)\]).*$/);

  if (versionMatch) {
    version = versionMatch[2];
    name = name.replace(versionMatch[1], '');
  }

  let names = name.split('.');
  for (let i = 0; i < names.length; i++) {
    if (!names[i].match(/^[A-Z0-9\-]+$/gi)) {
      return null;
    }
  }

  return names.slice(0, 2).concat(`@${version}`, names.slice(2));

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

    if (isLocal) {
      // do a thing
      console.log('LOCAL');
    } else {
      let names = parseLibPath(params.name);
      if (!names) {
        return callback(new Error(`Invalid service: "${params.name}"`));
      }
      let func = lib(names);
      func({q: 'ATGC'}, (err, result) => {
        console.log(err);
        console.log(result);
        callback();
      });
    }

  }

}

module.exports = __nomethod__Command;
