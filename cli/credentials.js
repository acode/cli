'use strict';

const path = require('path');
const fs = require('fs');
const FILENAME = '.stdlib';

function findPath(maxDepth) {

  maxDepth = parseInt(maxDepth) || 0;

  let cwd = process.cwd();
  let directories = cwd.split(path.sep);
  let stdlibPath = '';

  for (let i = directories.length; i > 0; i--) {
    let relpath = path.join(directories.slice(0, i).join(path.sep), FILENAME);
    if (fs.existsSync(relpath)) {
      stdlibPath = relpath;
      break;
    }
    if (!(--maxDepth)) {
      break;
    }
  }

  return stdlibPath;

}

function readCredentials() {

  if(process.env.STDLIB_ACCESS_TOKEN) {
    return {
      ACCESS_TOKEN: process.env.STDLIB_ACCESS_TOKEN
    };
  } else {
    let cred = '';
    let stdlibPath = findPath();

    if (!stdlibPath) {
      throw new Error(`Please initialize stdlib in directory tree or set STDLIB_ACCESS_TOKEN as environment variable`);
    }

    cred = fs.readFileSync(stdlibPath).toString();

    return cred
      .split('\n')
      .filter(v => v)
      .map(l => l.split('='))
      .reduce((p, c) => {
        p[c[0]] = c[1];

        return p;
      }, {});
  }
}

function writeCredentials(obj, pathname) {

  let stdlibPath = pathname ? path.join(pathname, FILENAME) : findPath();

  if (!stdlibPath) {
    throw new Error(`Please initialize stdlib in directory tree`);
  }

  let str = Object.keys(obj).map(k => `${k}=${obj[k]}`).join('\n') + '\n';
  fs.writeFileSync(stdlibPath, str);

}

module.exports = {

  create: () => {

    writeCredentials({CREATED_AT: Math.floor(new Date().valueOf() / 1000)}, process.cwd());
    return true;

  },

  location: (depth) => {

    let loc = findPath(depth).split(path.sep);
    loc.pop();
    return loc.join(path.sep);

  },

  read: (key) => {

    return readCredentials()[key];

  },

  write: (key, value) => {

    let cred = readCredentials();
    cred[key] = value;
    writeCredentials(cred);
    return true;

  }

};
