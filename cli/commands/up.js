'use strict';

const Command = require('cmnd').Command;
const APIResource = require('api-res');

const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const async = require('async');
const tar = require('tar-stream');

const config = require('../config.js');
const scripts = require('../scripts.js');
const serviceConfig = require('../service_config');

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

class UpCommand extends Command {

  constructor() {

    super('up');

  }

  help() {

    return {
      description: 'Pushes Standard Library package to registry and cloud environment',
      args: [
        'environment'
      ],
      flags: {
        r: 'Upload a release package'
      },
      vflags: {
        release: 'Upload a release package',
      }
    };

  }

  run(params, callback) {

    let environment = params.args[0];
    let release = params.flags.r || params.vflags.release;

    if (environment) {
      if (environment === RELEASE_ENV) {
        release = [];
      } else if (release) {
        return callback(new Error('Can not release to an environment'));
      }
    } else if (release) {
      environment = RELEASE_ENV;
      if (release[0]) {
        return callback(new Error('Can only release to the version specified in "package.json"'));
      }
    } else {
      return callback(new Error('Please specify an environment'));
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
      pkg = serviceConfig.get();
    } catch(err) {
      return callback(err);
    }

    scripts.run(pkg, 'preup', environment, {version: pkg.version}, err => {

      if (err) {
        return callback(err);
      }

      let resource = new APIResource(host, port);
      resource.authorize(config.get('ACCESS_TOKEN'));

      !fs.existsSync('/tmp') && fs.mkdirSync('/tmp');
      !fs.existsSync('/tmp/stdlib') && fs.mkdirSync('/tmp/stdlib', 0o777);
      let serviceName = (pkg.stdlib.name).replace(/\//g, '.');
      let tmpPath = `/tmp/stdlib/${serviceName}.${new Date().valueOf()}.tar.gz`;

      let start = new Date().valueOf();

      let tarball = fs.createWriteStream(tmpPath, {mode: 0o777});

      let pack = tar.pack();

      let defignore = ['/node_modules', '/.stdlib', '/.git', '.DS_Store'];
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

          let endpoint = environment === RELEASE_ENV
            ? `${pkg.stdlib.name}@${pkg.version}`
            : `${pkg.stdlib.name}@${environment}`;

          let build = pkg.stdlib.build;

          return resource
            .request(endpoint)
            .headers({'X-Stdlib-Build': build || ''})
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
                  return callback(new Error('There was an error processing your request, try logging in again.'));
                } else {
                  scripts.run(pkg, 'postup', environment, {version: pkg.version}, err => callback(err));
                }

              }
            );

        });

      });

    });

  }

}

module.exports = UpCommand;
