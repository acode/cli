'use strict';

const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

const Command = require('cmnd').Command;
const APIResource = require('api-res');
const config = require('../config.js');

const chalk = require('chalk');

class GetCommand extends Command {

  constructor() {

    super('get');

  }

  help() {

    return {
      description: 'Retrieves and extracts StdLib package',
      args: [
        'full service name'
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
    let outputPath = params.flags.o || params.vflags.output || [];
    outputPath = outputPath[0] || '.';

    let write = params.flags.hasOwnProperty('w') || params.vflags.hasOwnProperty('write-over');

    let pathname = path.join(outputPath, service);
    pathname = outputPath[0] !== '/' ? path.join(process.cwd(), pathname) : pathname;

    if (!service) {
      console.log();
      console.log(chalk.bold.red('Oops!'));
      console.log();
      console.log(`Please specify a service name`);
      console.log();
      return callback(null);
    }

    if (!config.location(0)) {
      console.log();
      console.log(chalk.bold.red('Oops!'));
      console.log();
      console.log(`You're trying to retrieve a package,`);
      console.log(`But you're not in your root StdLib project directory.`);
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
      console.log(`Use ${chalk.bold('lib get ' + service + ' --write-over')} to override.`);
      console.log();
      return callback(null);
    }

    let host = 'registry.stdlib.com';
    let port = 443;

    let hostname = (params.flags.h && params.flags.h[0]) || '';
    let matches = hostname.match(/^(https?:\/\/)?(.*?)(:\d+)?$/);

    if (hostname && matches) {
      host = matches[2];
      port = parseInt((matches[3] || '').substr(1) || (hostname.indexOf('https') === 0 ? 443 : 80));
    }

    let info = params.args[0];

    let resource = new APIResource(host, port);
    resource.authorize(config.get('ACCESS_TOKEN'));

    let endpoint = `${service}/package.tgz`;

    console.log();
    console.log(`Retrieving ${chalk.bold(host + '/' + endpoint)}...`);
    console.log();

    return resource.request(endpoint).index({}, (err, response) => {

      if (err) {
        return callback(err);
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

      !fs.existsSync('/tmp') && fs.mkdirSync('/tmp');
      !fs.existsSync('/tmp/stdlib') && fs.mkdirSync('/tmp/stdlib', 0o777);
      let tmpPath = `/tmp/stdlib/${service.replace(/\//g, '.')}.tgz`;
      try {
        fs.writeFileSync(tmpPath, response);
      } catch (e) {
        console.error(e);
        return callback(new Error(`Could not write temporary file ${tmpPath}`));
      }

      child_process.exec(`tar -xzf ${tmpPath} -C ${pathname}`, (err) => {

        // cleanup
        fs.unlinkSync(tmpPath);

        if (err) {
          return callback(`Could not extract from package`);
        }

        console.log(chalk.bold.green('Success!'));
        console.log();
        console.log(`${chalk.bold(service)} package retrieved to:`);
        console.log(`  ${chalk.bold(pathname)}`);
        console.log();
        return callback(null);

      });

    });

  }

}

module.exports = GetCommand;
