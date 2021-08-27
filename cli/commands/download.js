'use strict';

const fs = require('fs');
const path = require('path');
const tar = require('tar-stream');
const zlib = require('zlib');
const stream = require('stream');

const Command = require('cmnd').Command;
const Registry = require('../registry.js');
const config = require('../config.js');

const chalk = require('chalk');

function rmdir(dir) {
  if (!fs.existsSync(dir)) {
    return null;
  }
  fs.readdirSync(dir).forEach(f => {
    let pathname = path.join(dir, f);
    if (!fs.existsSync(pathname)) {
      return fs.unlinkSync(pathname);
    }
    if (fs.statSync(pathname).isDirectory()) {
      return rmdir(pathname);
    } else {
      return fs.unlinkSync(pathname);
    }
  });
  return fs.rmdirSync(dir);
};

class GetCommand extends Command {

  constructor() {

    super('download');

  }

  help() {

    return {
      description: 'Retrieves and extracts Autocode package',
      args: [
        'username/name OR username/name@env OR username/name@version'
      ],
      flags: {
        w: 'Write over - overwrite the target directory contents'
      },
      vflags: {
        'write-over': 'Write over - overwrite the target directory contents'
      }
    };

  }

  run(params, callback) {

    let service = params.args[0] || '';
    if (!service) {
      console.log();
      console.log(chalk.bold.red('Oops!'));
      console.log();
      console.log(`Please specify a service name`);
      console.log(`Use ${chalk.bold('username/name')} for latest release,`);
      console.log(`Or ${chalk.bold('username/name@env')} or ${chalk.bold('username/name@version')} for specific environments and versions`);
      console.log();
      return callback(null);
    }

    let outputPath = params.flags.o || params.vflags.output || [];
    outputPath = outputPath[0] || '.';

    let write = params.flags.hasOwnProperty('w') || params.vflags.hasOwnProperty('write-over');

    let pathname = path.join(outputPath, service);
    pathname = outputPath[0] !== '/' ? path.join(process.cwd(), pathname) : pathname;

    if (!config.location(0)) {
      console.log();
      console.log(chalk.bold.red('Oops!'));
      console.log();
      console.log(`You're trying to retrieve a package,`);
      console.log(`But you're not in your root Autocode project directory.`);
      console.log();
      if (!config.workspace()) {
        console.log(`Initialize a workspace first with:`);
        console.log(`\t${chalk.bold('lib init')}`);
      } else {
        console.log('Visit your workspace directory with:');
        console.log(`\t${chalk.bold('cd ' + config.workspace())}`);
      }
      console.log();
      return callback(null);
    }

    if (!write && fs.existsSync(pathname)) {
      console.log();
      console.log(chalk.bold.red('Oops!'));
      console.log();
      console.log(`The directory you're retrieving to already exists:`);
      console.log(`  ${chalk.bold(pathname)}`);
      console.log();
      console.log(`Try removing the existing directory first.`);
      console.log();
      console.log(`Use ${chalk.bold('lib download ' + service + ' --write-over')} to override.`);
      console.log();
      return callback(null);
    }

    let host = 'packages.stdlib.com';
    let port = 443;

    let hostname = (params.flags.h && params.flags.h[0]) || '';
    let matches = hostname.match(/^(https?:\/\/)?(.*?)(:\d+)?$/);

    if (hostname && matches) {
      host = matches[2];
      port = parseInt((matches[3] || '').substr(1) || (hostname.indexOf('https') === 0 ? 443 : 80));
    }

    console.log();
    console.log(`Retrieving ${chalk.bold(service)}...`);
    console.log();

    let registry = new Registry(host, port, config.get('ACCESS_TOKEN'));
    let name = service.split('@')[0];
    let environment = service.split('@')[1] || null;
    let registryParams = {name: name};
    if (environment) {
      if (environment.indexOf('.') === -1) {
        registryParams.environment = environment;
      } else {
        registryParams.version = environment;
      }
    }
    registryParams.format = 'tgz';

    return registry.request(
      'download',
      registryParams,
      null,
      (err, response) => {

        if (err) {

          return callback(err);

        } else {

          console.log(`${chalk.bold(`${response.name}@${response.environment || response.version}`)} downloaded successfully...`);

          if (err) {
            return callback(err);
          }

          if (fs.existsSync(pathname)) {
            rmdir(pathname);
          }

          let directories = pathname.split(path.sep);
          for (let i = 1; i < directories.length; i++) {
            let relpath = pathname.split(path.sep).slice(0, i + 1).join(path.sep);
            try {
              !fs.existsSync(relpath) && fs.mkdirSync(relpath);
            } catch (e) {
              console.error(e);
              return callback(new Error(`Could not create directory ${relpath}`));
            }
          }

          zlib.gunzip(response, (err, result) => {

            if (err) {
              return callback(new Error(`Error decompressing package`));
            }

            let files = {};
            let extract = tar.extract();
            let tarStream = new stream.PassThrough();

            extract.on('entry', (header, stream, cb) => {
              let buffers = [];
              stream.on('data', data => { buffers.push(data); });
              stream.on('end', () => {
                files[header.name] = Buffer.concat(buffers);
                return cb();
              });
            });

            extract.on('finish', () => {
              Object.keys(files).forEach(filename => {
                let outputPath = path.join(pathname, filename);
                let directories = outputPath.split(path.sep).slice(0, -1);
                for (let i = 1; i < directories.length; i++) {
                  let relpath = outputPath.split(path.sep).slice(0, i + 1).join(path.sep);
                  try {
                    !fs.existsSync(relpath) && fs.mkdirSync(relpath);
                  } catch (e) {
                    console.error(e);
                    return callback(new Error(`Could not create directory ${relpath}`));
                  }
                }
                fs.writeFileSync(outputPath, files[filename], {mode: 0o777});
              });
              console.log(chalk.bold.green('Success!'));
              console.log();
              console.log(`${chalk.bold(service)} package retrieved to:`);
              console.log(`  ${chalk.bold(pathname)}`);
              console.log();
              return callback(null);
            });

            tarStream.end(result);
            tarStream.pipe(extract);

          });

        }

      }
    );

  }

}

module.exports = GetCommand;
