'use strict';

const Command = require('cmnd').Command;

const APIResource = require('api-res');
const config = require('../config.js');
const fileio = require('../fileio.js');

const async = require('async');
const inquirer = require('inquirer');

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const spawnSync = require('child_process').spawnSync;

const DEFAULT_BUILD = 'faaslang';

function deepAssign(o1, o2) {
  Object.keys(o2).forEach(k => {
    if (
      o1[k] && o2[k] &&
      typeof o1[k] === 'object' && typeof o2[k] === 'object'
    ) {
      deepAssign(o1[k], o2[k]);
    } else {
      o1[k] = o2[k];
    }
  });
}

class CreateCommand extends Command {

  constructor() {

    super('create');

  }

  help() {

    return {
      description: 'Creates a new (local) service',
      args: [
        'service'
      ],
      flags: {
        n: 'No login - don\'t require an internet connection',
        w: 'Write over - overwrite the current directory contents'
      },
      vflags: {
        'no-login': 'No login - don\'t require an internet connection',
        'write-over': 'Write over - overwrite the current directory contents'
      }
    };

  }

  run(params, callback) {

    let name = params.args[0];

    let host = params.flags.h ? params.flags.h[0] : 'https://api.polybit.com';
    let port = params.flags.p && params.flags.p[0];

    let nologin = params.flags.hasOwnProperty('n') || params.vflags.hasOwnProperty('no-login');

    let write = params.flags.hasOwnProperty('w') || params.vflags.hasOwnProperty('write-over');

    let build = DEFAULT_BUILD;

    if (!config.location(0)) {
      console.log();
      console.log(chalk.bold.red('Oops!'));
      console.log();
      console.log(`You're trying to create a new service in development,`);
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

    console.log();
    console.log(`Awesome! Let's create an ${chalk.bold.green('Autocode')} service!`);
    console.log();

    let questions = [];

    name || questions.push({
      name: 'name',
      type: 'input',
      default: '',
      message: 'Service Name'
    });

    let login = [];
    !nologin && login.push((cb) => {

      let resource = new APIResource(host, port);
      resource.authorize(config.get('ACCESS_TOKEN'));

      resource.request('v1/users').index({me: true}, (err, response) => {

        if (err) {
          return cb(err);
        }
        return cb(null, response.data[0]);

      });

    });

    // NOTE: Not offline friendly. Always log in user...
    // login = username ? [] : login;

    async.series(login, (err, results) => {

      if (err) {
        console.log(chalk.bold.red('Oops!'));
        console.log();
        console.log(`It seems like there's an issue trying to create a service.`);
        console.log(`Are you sure you're logged in? Your access token may have expired.`);
        console.log();
        console.log('Try logging in with:');
        console.log(`\t${chalk.bold('lib login')}`);
        console.log();
        return callback(err);
      }

      let defaultUser = {
        username: 'dev',
        email: ''
      };

      let user = nologin ? defaultUser : results[0];
      user = user || defaultUser;

      inquirer.prompt(questions, (promptResult) => {

        name = name || promptResult.name;
        let username;

        if (name.indexOf('/') > -1) {
          username = name.split('/')[0];
          name = name.split('/').slice(1).join('/').replace(/\//g, '-');
        }

        username = username || user.username;

        !fs.existsSync(username) && fs.mkdirSync(username);
        let serviceName = [username, name].join('/');
        let servicePath = path.join(process.cwd(), username, name);
        let fPath = path.join(servicePath, 'functions');

        if (fs.existsSync(servicePath)) {

          if (!write) {

            console.log();
            console.log(chalk.bold.red('Oops!'));
            console.log();
            console.log(`The directory you're creating a Autocode project in already exists:`);
            console.log(`  ${chalk.bold(servicePath)}`);
            console.log();
            console.log(`Try removing the existing directory first.`);
            console.log();
            console.log(`Use ${chalk.bold('lib create --write-over')} to override.`);
            console.log();
            return callback(null);

          }

        } else {

          fs.mkdirSync(servicePath);
          fs.mkdirSync(fPath);

        }

        let packageJSON = require(path.join(__dirname, `../templates/${build}/package.json`));
        let stdlibJSON = require(path.join(__dirname, `../templates/${build}/stdlib.json`));

        packageJSON.name = name;
        packageJSON.author = user.username + (user.email ? ` <${user.email}>` : '');
        stdlibJSON.name = [username, name].join('/');
        stdlibJSON.build = build;

        fileio.writeFiles(
          serviceName,
          fileio.readTemplateFiles(
            path.join(__dirname, '..', 'templates', build)
          )
        );

        fs.writeFileSync(
          path.join(servicePath, 'package.json'),
          JSON.stringify(packageJSON, null, 2)
        );

        fs.writeFileSync(
          path.join(servicePath, 'stdlib.json'),
          JSON.stringify(stdlibJSON, null, 2)
        );

        if (
          (packageJSON.dependencies && Object.keys(packageJSON.dependencies).length) ||
          (packageJSON.devDependencies && Object.keys(packageJSON.devDependencies).length)
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
        console.log(`Service ${chalk.bold([username, name].join('/'))} created at:`);
        console.log(`  ${chalk.bold(servicePath)}`);
        console.log();
        console.log(`Use the following to enter your service directory:`);
        console.log(`  ${chalk.bold('cd ' + [username, name].join('/'))}`);
        console.log();
        console.log(`Type ${chalk.bold('lib help')} for more commands.`);
        console.log();
        return callback(null);

      });

    });

  }

}

module.exports = CreateCommand;
