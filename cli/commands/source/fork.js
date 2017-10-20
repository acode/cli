'use strict';

const fs = require('fs');
const path = require('path');
const Command = require('cmnd').Command;
const spawnSync = require('child_process').spawnSync;

const APIResource = require('api-res');
const Credentials = require('../../credentials.js');
const fileio = require('../../fileio.js');

const async = require('async');
const inquirer = require('inquirer');
const chalk = require('chalk');

class SourceForkCommand extends Command {

  constructor() {

    super('source', 'fork');

  }

  help() {

    return {
      description: 'Downloads and Forks Sourcecode from StdLib',
      args: [],
      flags: {
        f: 'Force command if not in root directory',
        w: 'Write over - overwrite the target directory contents',
        s: 'Source (Required) - The name of the sourcecode to fork',
        a: 'Alias (Optional) - The new alias of the source',
        i: 'Install - install this sourcecode as a new library service'
      },
      vflags: {
        'force': 'Force command if not in root directory',
        'write-over': 'Write over - overwrite the target directory contents',
        'source': 'Source (Required) - The name of the sourcecode to fork',
        'alias': 'Alias (Optional) - The new alias of the source',
        'install': 'Install - install this sourcecode as a new library service'
      }
    };

  }

  run(params, callback) {

    let sourceName = (params.flags.s || params.vflags.source || [])[0];
    let aliasName = (params.flags.a || params.vflags.alias || [])[0];
    let version = 'release';

    let write = params.flags.hasOwnProperty('w') || params.vflags.hasOwnProperty('write-over');
    let force = params.flags.hasOwnProperty('f') || params.vflags.hasOwnProperty('force');
    let install = params.flags.hasOwnProperty('i') || params.vflags.hasOwnProperty('install');
    let user = params.user || null;

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
    } else if (!install && !aliasName.startsWith('@')) {
      // Require aliasName to start with '@' if not installing
      return callback(new Error(`Please prefix alias name with "@", i.e. "@${aliasName}"`))
    } else if (install && aliasName.startsWith('@')) {
      return callback(new Error(`When installing service, alias name cannot start with "@", use "${aliasName.substr(1)}"`))
    }

    let sourcePath = `${sourceName}/${version}`;

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
      console.log(`You're trying to fork sourcecode in your local environment,`);
      console.log(`But you're not in a root stdlib project directory.`);
      console.log(`We recommend against this.`);
      console.log();
      if (install) {
        console.log(`Use ${chalk.bold('lib create ' + aliasName + ' -s ' + sourceName + ' --force')} to override.`);
      } else {
        console.log(`Use ${chalk.bold(`lib source:fork -s ${sourceName} --force`)} to override.`);
      }
      console.log();
      return callback(null);
    }

    if (!write && fs.existsSync(aliasName)) {
      console.log();
      console.log(chalk.bold.red('Oops!'));
      console.log();
      console.log(`The directory you're ${install ? 'creating' : 'forking'} to already exists:`);
      console.log(`  ${chalk.bold(aliasName)}`);
      console.log();
      console.log(`Try removing the existing directory first.`);
      console.log();
      if (install) {
        console.log(`Use ${chalk.bold('lib create ' + aliasName + ' -s ' + sourceName + ' --write-over')} to override.`);
      } else {
        console.log(`Use ${chalk.bold('lib source:fork -s ' + sourceName + ' --write-over')} to override.`);
      }
      console.log();
      return callback(null);
    }

    let resource = new APIResource(host, port);
    resource.authorize(Credentials.read('ACCESS_TOKEN'));

    let endpoint = `~src/${sourcePath}/package.tgz`;

    console.log();
    console.log(`Retrieving sourcecode ${chalk.bold.green(sourceName)} from:`);
    console.log(`  ${chalk.bold(host + '/' + endpoint)} ...`);
    console.log();

    return resource.request(endpoint).index({}, (err, response) => {

      if (err) {
        return callback(err);
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

      fileio.extract(aliasName, response, (err) => {

        if (err) {
          console.error(err);
          return callback(new Error(`Could not fetch source "${sourceName}"`));
        }

        let pkg;
        let src;
        let servicePath = path.join(process.cwd(), aliasName);

        try {
          pkg = require(path.join(servicePath, 'package.json'));
        } catch(e) {
          return callback(new Error('Malformed Sourcecode - Invalid package.json'));
        }

        if (!pkg.stdlib) {
          return callback(new Error('Malformed Sourcecode - No stdlib information set in "package.json"'));
        }

        // Set defaults for service
        let serviceName = aliasName.startsWith('@') ?
          aliasName.substr(1) :
          aliasName;
        pkg.name = serviceName.split('/')[1];
        pkg.version = '0.0.0';
        install && (pkg.author = user ? (user.username + (user.email ? ` <${user.email}>` : '')) : 'none');
        pkg.stdlib.name = serviceName;
        pkg.stdlib.build = 'faaslang';
        pkg.stdlib.publish = true;

        fs.writeFileSync(path.join(servicePath, 'package.json'), JSON.stringify(pkg, null, 2));

        try {
          src = require(path.join(servicePath, 'source.json'));
        } catch (e) {
          return callback(new Error('Malformed Sourcecode - Invalid source.json'));
        }

        let env = {local: {}, dev: {}, release: {}};
        Object.keys(env).forEach(envName => {
          if (!src.env) {
            return;
          }
          env[envName] = src.env.reduce((data, entry) => {
            data[entry.name] = entry.defaultValue || '';
            return data;
          }, {});
        });

        fs.writeFileSync(path.join(servicePath, 'env.json'), JSON.stringify(env, null, 2));

        if (install) {

          fs.unlinkSync(path.join(servicePath, 'source.json'));

          if (
            (pkg.dependencies && Object.keys(pkg.dependencies).length) ||
            (pkg.devDependencies && Object.keys(pkg.devDependencies).length)
          ) {
            console.log(`Installing npm packages...`);
            console.log();
            let command = spawnSync(
              /^win/.test(process.platform) ? 'npm.cmd' : 'npm', ['install'], {
                stdio: [0, 1, 2],
                cwd: servicePath,
                env: process.env
              }
            );
            if (command.status !== 0) {
              console.log(command.error);
              console.log(chalk.bold.yellow('Warn: ') + 'Error with npm install');
            }
          }

          console.log(chalk.bold.green('Success!'));
          console.log();
          console.log(`Service ${chalk.bold(aliasName)} created from source ${chalk.bold(sourceName)}!`);
          console.log(`  ${chalk.bold('./' + aliasName)}`);
          console.log();
          console.log(`Use the following to enter your service directory:`);
          console.log(`  ${chalk.bold('cd ./' + aliasName)}`);
          console.log();
          callback();

        } else {

          src.name = aliasName;
          fs.writeFileSync(path.join(servicePath, 'source.json'), JSON.stringify(src, null, 2));

          console.log(chalk.bold.green('Success!'));
          console.log();
          console.log(`Source ${chalk.bold(sourceName)} downloaded and forked to:`);
          console.log(`  ${chalk.bold('./' + aliasName)}`);
          console.log();
          console.log(`Use the following to enter your sourcecode directory:`);
          console.log(`  ${chalk.bold('cd ./' + aliasName)}`);
          console.log();
          callback();

        }

      });

    });

  }

}

module.exports = SourceForkCommand;
