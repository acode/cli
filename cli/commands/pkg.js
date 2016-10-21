'use strict';

const fs = require('fs');
const path = require('path');

const Command = require('cmnd').Command;
const APIResource = require('api-res');
const Credentials = require('../credentials.js');

const chalk = require('chalk');

class PkgCommand extends Command {

  constructor() {

    super('pkg');

  }

  help() {

    return {
      description: 'Downloads stdlib tarball'
    };

  }

  run(params, callback) {

    let service = params.args[0] || '';
    let outputPath = params.flags.o || params.vflags.output || [];
    outputPath = outputPath[0] || '.';

    let force = params.flags.hasOwnProperty('f') || params.vflags.hasOwnProperty('force');

    if (!force && !Credentials.location(1)) {
      console.log();
      console.log(chalk.bold.red('Oops!'));
      console.log();
      console.log(`You're trying to download a tarball,`);
      console.log(`But you're not in a root stdlib project directory.`);
      console.log(`We recommend against this.`);
      console.log();
      console.log(`Use ${chalk.bold('stdlib pkg ' + service + ' --force')} to override.`);
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
    resource.authorize(Credentials.read('ACCESS_TOKEN'));

    let endpoint = `${service}/package.tgz`;

    console.log();
    console.log(`Downloading ${chalk.bold(host + '/' + endpoint)}...`);
    console.log();

    return resource.request(endpoint).index({}, (err, response) => {

      if (err) {
        return callback(err);
      }

      let pathname = path.join(outputPath, `${service.replace(/\//g, '.')}.package.tgz`);
      pathname = outputPath[0] !== '/' ? path.join(process.cwd(), pathname) : pathname;

      let directories = pathname.split(path.sep);
      for (let i = 1; i < directories.length - 1; i++) {
        let relpath = pathname.split(path.sep).slice(0, i + 1).join(path.sep);
        try {
          !fs.existsSync(relpath) && fs.mkdirSync(relpath);
        } catch (e) {
          console.error(e);
          return callback(new Error(`Could not create directory ${relpath}`));
        }
      }

      try {
        fs.writeFileSync(pathname, response);
      } catch (e) {
        console.error(e);
        return callback(new Error(`Could not write file ${pathname}`));
      }

      console.log(chalk.bold.green('Success!'));
      console.log();
      console.log(`${chalk.bold(service)} package saved to:`);
      console.log(`  ${chalk.bold(pathname)}`);
      console.log();
      return callback(null);

    });

  }

}

module.exports = PkgCommand;
