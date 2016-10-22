'use strict';

const Command = require('cmnd').Command;
const APIResource = require('api-res');
const Credentials = require('../credentials.js');

const fs = require('fs');
const async = require('async');
const tar = require('tar-stream');
const zlib = require('zlib');
const path = require('path');

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
        if (pathname === ignore[i]) {
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
      let filename = pathname[0] === '/' ? pathname.substr(1) : pathname;
      let buffer = fs.readFileSync(fullpath);
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
      description: 'Pushes stdlib package to registry and cloud environment',
      args: [
        'environment'
      ],
      flags: {
        r: 'Upload a release package',
      },
      vflags: {
        release: 'Upload a release package',
      }
    };

  }

  run(params, callback) {

    let environment = params.args[0];
    let release = params.flags.r || params.vflags.release;

    if (release && environment) {
      return callback(new Error('Can not release to an environment'));
    }

    if (!environment && !release) {
      return callback(new Error('Please specify an environment'));
    }

    if (release && release[0]) {
      return callback(new Error('Can only release to the version specified in "package.json"'));
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

    let resource = new APIResource(host, port);
    resource.authorize(Credentials.read('ACCESS_TOKEN'));

    !fs.existsSync('/tmp') && fs.mkdirSync('/tmp');
    !fs.existsSync('/tmp/stdlib') && fs.mkdirSync('/tmp/stdlib');
    let tmpPath = `/tmp/stdlib/${pkg.stdlib.name.replace(/\//g, '.')}.${new Date().valueOf()}.tar.gz`;

    let start = new Date().valueOf();

    let tarball = fs.createWriteStream(tmpPath);

    let pack = tar.pack();

    let data = readFiles(
      process.cwd(),
      {
        ignore: [
          '/node_modules',
          '/.stdlib',
          '/.git',
          '.DS_Store'
        ]
      }
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
        // console.log(`Service "${pkg.stdlib.name}" compressed in ${t}ms.`);
        // console.log(`File size: ${result.length} bytes`);

        let endpoint = environment ?
          `${pkg.stdlib.name}@${environment}` :
          `${pkg.stdlib.name}@${pkg.version}`;

        return resource.request(endpoint).stream(
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
              return callback(null);
            }

          }
        );

      });

    });

  }

}

module.exports = UpCommand;
