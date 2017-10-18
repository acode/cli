'use strict';

const fs = require('fs');
const path = require('path');
const Command = require('cmnd').Command;

const APIResource = require('api-res');
const Credentials = require('../../credentials.js');
const fileio = require('../../fileio.js');

const async = require('async');
const inquirer = require('inquirer');
const chalk = require('chalk');

class SourceDownloadCommand extends Command {

  constructor() {

    super('source', 'download');

  }

  help() {

    return {
      description: 'Downloads Sourcecode from StdLib',
      args: [],
      flags: {
        f: 'Force command if not in root directory',
        w: 'Write over - overwrite the target directory contents',
        s: 'Source (Required) - The name of the sourcecode to fork',
        a: 'Alias (Optional) - The new alias of the source'
      },
      vflags: {
        'force': 'Force command if not in root directory',
        'write-over': 'Write over - overwrite the target directory contents',
        'source': 'Source (Required) - The name of the sourcecode to fork',
        'alias': 'Alias (Optional) - The new alias of the source'
      }
    };

  }

  run(params, callback) {

    let sourceName = (params.flags.s || params.vflags.source || [])[0];
    let aliasName = (params.flags.a || params.vflags.alias || [])[0];
    let version = 'release';

    if (!sourceName) {
      return callback(new Error('Please specify a source name with -s or --source'));
    } else if (sourceName.split('/').length < 2 || sourceName.split('/').length > 3) {
      return callback(new Error(`Source name must be of format "@user/source" or "@user/source/version"`))
    }

    if (sourceName.split('/').length === 3) {
      version = sourceName.split('/')[2];
      sourceName = sourceName.split('/').slice(0, 2).join('/');
    }

    aliasName = aliasName || sourceName;

    if (!sourceName.startsWith('@')) {
      return callback(new Error(`Please prefix source name with "@", i.e. "@${sourceName}"`))
    } else if (!aliasName.startsWith('@')) {
      return callback(new Error(`Please prefix alias name with "@", i.e. "@${aliasName}"`))
    }

    let sourcePath = `${sourceName}/${version}`;

    let write = params.flags.hasOwnProperty('w') || params.vflags.hasOwnProperty('write-over');
    let force = params.flags.hasOwnProperty('f') || params.vflags.hasOwnProperty('force');

    let hostname = (params.flags.h && params.flags.h[0]) || '';
    let matches = hostname.match(/^(https?:\/\/)?(.*?)(:\d+)?$/);

    let host = 'registry.stdlib.com';
    let port = 443;

    if (hostname && matches) {
      host = matches[2];
      port = parseInt((matches[3] || '').substr(1) || (hostname.indexOf('https') === 0 ? 443 : 80));
    }

    if (!force && !Credentials.location(1)) {
      console.log();
      console.log(chalk.bold.red('Oops!'));
      console.log();
      console.log(`You're trying to fork sourcecode in development,`);
      console.log(`But you're not in a root stdlib project directory.`);
      console.log(`We recommend against this.`);
      console.log();
      console.log(`Use ${chalk.bold(`lib source:download -s ${sourceName} --force`)} to override.`);
      console.log();
      return callback(null);
    }

    if (!write && fs.existsSync(aliasName)) {
      console.log();
      console.log(chalk.bold.red('Oops!'));
      console.log();
      console.log(`The directory you're retrieving to already exists:`);
      console.log(`  ${chalk.bold(aliasName)}`);
      console.log();
      console.log(`Try removing the existing directory first.`);
      console.log();
      console.log(`Use ${chalk.bold('lib source:download -s ' + sourceName + ' --write-over')} to override.`);
      console.log();
      return callback(null);
    }

    // Create directory for Alias
    if (!fs.existsSync(aliasName)) {
      let paths = aliasName.split('/');
      let newPaths = [];
      while (paths.length) {
        newPaths = newPaths.concat(paths.shift());
        if (!fs.existsSync(path.join.apply(path, newPaths))) {
          fs.mkdirSync(path.join.apply(path, newPaths));
        }
      }
    }

    let resource = new APIResource(host, port);
    resource.authorize(Credentials.read('ACCESS_TOKEN'));

    let endpoint = `~src/${sourcePath}/package.tgz`;

    console.log();
    console.log(`Retrieving ${chalk.bold(host + '/' + endpoint)}...`);
    console.log();

    return resource.request(endpoint).index({}, (err, response) => {

      if (err) {
        return callback(err);
      }

      fileio.extract(aliasName, response, (err) => {
        if (err) {
          console.error(err);
          return callback(new Error(`Could not fetch source "${sourceName}"`));
        }
        console.log(chalk.bold.green('Success!'));
        console.log();
        console.log(`Source ${chalk.bold(sourceName)} downloaded at:`);
        console.log(`  ${chalk.bold('./' + aliasName)}`);
        console.log();
        console.log(`Use the following to enter your sourcecode directory:`);
        console.log(`  ${chalk.bold('cd ./' + aliasName)}`);
        console.log();
        callback();
      });

    });

  }

}

module.exports = SourceDownloadCommand;
