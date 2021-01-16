'use strict';

const Command = require('cmnd').Command;
const Registry = require('../registry.js');

const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const async = require('async');
const tar = require('tar-stream');
const chalk = require('chalk');
const minimatch = require('minimatch');

const config = require('../config.js');
const serviceConfig = require('../service_config');

const RELEASE_ENV = 'release';

function readFiles(base, properties, dir, data) {

  dir = dir || '/';
  data = data || [];
  properties = properties || {};

  let ignore = properties.ignore || [];

  return fs.readdirSync(path.join(base, dir)).reduce((data, f) => {

    let pathname = path.join(dir, f);
    let fullpath = path.join(base, pathname);

    for (let i = 0; i < ignore.length; i++) {
      let filename = pathname.split(path.sep).join('/').slice(1);
      let pattern = ignore[i];
      if (minimatch(filename, pattern, {matchBase: true, dot: true})) {
        return data;
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
      description: 'Pushes Autocode package to registry and cloud environment',
      args: [
        'environment'
      ],
      flags: {
        r: 'Upload a release package',
        f: 'Force deploy'
      },
      vflags: {
        release: 'Upload a release package',
        force: 'Force deploy'
      }
    };

  }

  run(params, callback) {

    let environment = params.args[0];
    let release = params.flags.r || params.vflags.release;
    let force = params.flags.f || params.vflags.force;
    let version = null;

    if (environment) {
      if (environment === RELEASE_ENV) {
        if (release[0]) {
          version = release[0];
        }
      } else if (release) {
        return callback(new Error('Can not release to an environment'));
      }
    } else if (release) {
      environment = RELEASE_ENV;
      if (release[0]) {
        version = release[0];
      }
    } else {
      return callback(new Error('Please specify an environment'));
    }

    let host = 'packages.stdlib.com';
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

    let registry = new Registry(host, port, config.get('ACCESS_TOKEN'));
    console.log();
    console.log(`Packaging ${pkg.stdlib.name}@${environment === RELEASE_ENV ? version || pkg.stdlib.version : environment}...`);

    !fs.existsSync('/tmp') && fs.mkdirSync('/tmp');
    !fs.existsSync('/tmp/stdlib') && fs.mkdirSync('/tmp/stdlib', 0o777);
    let serviceName = (pkg.stdlib.name).replace(/\//g, '.');
    let tmpPath = `/tmp/stdlib/${serviceName}.${new Date().valueOf()}.tar.gz`;

    let start = new Date().valueOf();

    let tarball = fs.createWriteStream(tmpPath, {mode: 0o777});

    let pack = tar.pack();

    let ignore = ['node_modules/', '.stdlib', '.git', '.DS_Store'];
    if (fs.existsSync(path.join(process.cwd(), '.acignore'))) {
      ignore = ignore.concat(
        fs.readFileSync(path.join(process.cwd(), '.acignore')).toString()
          .split('\n')
          .map(line => line.trim())
          .filter(line => !!line)
      );
    }
    ignore = ignore.map(v => v.endsWith('/') ? `${v}*` : v);

    let data = readFiles(
      process.cwd(),
      {ignore: ignore}
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

        console.log(`Packaging complete, total size is ${result.byteLength} bytes!`);
        console.log(`Uploading ${chalk.bold(`${pkg.stdlib.name}@${environment === RELEASE_ENV ? version || pkg.stdlib.version : environment}`)} to Autocode at ${host}:${port}...`);

        let registryParams = {channel: '1234'};
        if (environment === RELEASE_ENV) {
          registryParams.release = 't';
          if (version) {
            registryParams.version = version;
          }
        } else {
          registryParams.environment = environment;
        }

        if (force) {
          registryParams.force = 't';
        }

        return registry.request(
          'up/verify',
          registryParams,
          result,
          (err, response) => {

            if (err) {
              console.log();
              return callback(err);
            } else {
              let t = new Date().valueOf() - start;
              console.log()
              console.log(`${chalk.bold(`${response.name}@${response.environment || response.version}`)} uploaded successfully in ${t} ms!`);
              console.log(`${chalk.bold.green('Live URL:')} https://${response.name.split('/')[0]}.api.stdlib.com/${response.name.split('/')[1]}@${response.environment || response.version}/`);
              console.log();
              return callback(null);
            }

          },
          (data) => {
            console.log(`Registry :: ${data.message}`);
          }
        );

      });

    });

  }

}

module.exports = UpCommand;
