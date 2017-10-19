'use strict';

const Command = require('cmnd').Command;
const APIResource = require('api-res');
const Credentials = require('../../credentials.js');
const scripts = require('../../scripts.js');

const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const async = require('async');
const tar = require('tar-stream');

const RELEASE_ENV = 'release';

function readFiles(base, properties, dir, data) {

  dir = dir || '/';
  data = data || [];
  properties = properties || {};

  let ignore = properties.ignore || {};

  return fs.readdirSync(path.join(base, dir)).reduce((data, f) => {

    let pathname = path.join(dir, f);
    let fullpath = path.join(base, pathname);

    for (let i = 0; i < ignore.length; i++) {
      if (ignore[i][0] === '/') {
        if (pathname.split(path.sep).join('/') === ignore[i]) {
          return data;
        }
      } else {
        if (f === ignore[i]) {
          return data;
        }
      }
    }

    if (fs.statSync(fullpath).isDirectory()) {
      return readFiles(base, properties, pathname, data);
    } else {
      let filename = pathname[0] === path.sep ? pathname.substr(1) : pathname;
      let buffer = fs.readFileSync(fullpath);
      filename = filename.split(path.sep).join('/'); // Windows
      data.push({filename: filename, buffer: buffer});
      return data;
    }

  }, data);

};

class SourceDraftCommand extends Command {

  constructor() {

    super('source', 'draft');

  }

  help() {

    return {
      description: 'Pushes a draft of StdLib source code to the registry ',
      args: [
        'draftName'
      ],
      flags: {
        p: 'Publishes as a release'
      },
      vflags: {
        publish: 'Publishes as a release',
      }
    };

  }

  run(params, callback) {

    let environment = params.args[0];
    let publish = params.flags.p || params.vflags.publish;

    if (environment) {
      if (environment === RELEASE_ENV) {
        publish = [];
      } else if (publish) {
        return callback(new Error('Can not publish a release with a draft name'));
      }
    } else if (publish) {
      environment = RELEASE_ENV;
      if (publish[0]) {
        return callback(new Error('Can only publish a release with the version specified in "source.json"'));
      }
    } else {
      return callback(new Error('Please specify a draft name'));
    }

    let host = 'registry.stdlib.com';
    let port = 443;

    let hostname = (params.flags.h && params.flags.h[0]) || '';
    let matches = hostname.match(/^(https?:\/\/)?(.*?)(:\d+)?$/);

    if (hostname && matches) {
      host = matches[2];
      port = parseInt((matches[3] || '').substr(1) || (hostname.indexOf('https') === 0 ? 443 : 80));
    }

    let pkg;

    try {
      pkg = require(path.join(process.cwd(), 'package.json'));
    } catch(e) {
      return callback(new Error('Invalid package.json'));
    }

    if (!pkg.stdlib) {
      return callback(new Error('No stdlib information set in "package.json"'));
    }

    if (!pkg.stdlib.name) {
      return callback(new Error('No stdlib name set in "package.json"'));
    }

    let source;

    try {
      source = require(path.join(process.cwd(), 'source.json'));
    } catch(e) {
      return callback(new Error('Invalid source.json'));
    }

    let resource = new APIResource(host, port);
    resource.authorize(Credentials.read('ACCESS_TOKEN'));

    !fs.existsSync('/tmp') && fs.mkdirSync('/tmp');
    !fs.existsSync('/tmp/stdlib') && fs.mkdirSync('/tmp/stdlib', 0o777);
    let tmpPath = `/tmp/stdlib/${pkg.stdlib.name.replace(/\//g, '.')}.${new Date().valueOf()}.tar.gz`;

    let start = new Date().valueOf();

    let tarball = fs.createWriteStream(tmpPath, {mode: 0o777});

    let pack = tar.pack();

    let defignore = ['/node_modules', '/.stdlib', '/.git', '.DS_Store', 'env.json'];
    let libignore = fs.existsSync('.libignore') ? fs.readFileSync('.libignore').toString() : '';
    libignore = libignore.split('\n').map(v => v.replace(/^\s(.*)\s$/, '$1')).filter(v => v);
    while (defignore.length) {
      let ignore = defignore.pop();
      (libignore.indexOf(ignore) === -1) && libignore.push(ignore);
    }

    let data = readFiles(
      process.cwd(),
      {ignore: libignore}
    );

    // pipe the pack stream to your file
    pack.pipe(tarball);

    // Run everything in parallel...

    async.parallel(data.map((file) => {
      return (callback) => {
        pack.entry({name: file.filename}, file.buffer, callback);
      };
    }), (err) => {

      if (err) {
        return callback(err);
      }

      pack.finalize();

    });

    tarball.on('close', () => {

      let buffer = fs.readFileSync(tmpPath);
      fs.unlinkSync(tmpPath);

      zlib.gzip(buffer, (err, result) => {

        if (err) {
          return callback(err);
        }

        let t = new Date().valueOf() - start;

        let endpoint = environment === RELEASE_ENV ?
          `~src/${source.name}/${source.version}` :
          `~src/${source.name}/${environment}`;

        return resource
          .request(endpoint)
          .headers({'X-Stdlib-Build': pkg.stdlib.build || ''})
          .stream(
            'POST',
            result,
            (data) => {
              data.length > 1 && process.stdout.write(data.toString());
            },
            (err, response) => {
              if (err) {
                return callback(err);
              }

              if (response[response.length - 1] === 1) {
                return callback(new Error('There was an error processing your request'));
              } else {
                callback();
              }

            }
          );

      });

    });

  }

}

module.exports = SourceDraftCommand;
