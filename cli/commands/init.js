'use strict';

const Command = require('cmnd').Command;
const APIResource = require('api-res');

const inquirer = require('inquirer');
const async = require('async');
const chalk = require('chalk');

const config = require('../config.js');

class InitCommand extends Command {

  constructor() {

    super('init');

  }

  help() {

    return {
      description: 'Initializes Standard Library workspace',
      args: [
        'environment'
      ],
      flags: {
        f: 'Force command to overwrite existing workspace',
        n: 'No login - don\'t require an internet connection'
      },
      vflags: {
        'force': 'Force command to overwrite existing workspace',
        'no-login': 'No login - don\'t require an internet connection'
      }
    };

  }

  run(params, callback) {

    let host = params.flags.h ? params.flags.h[0] : 'https://api.polybit.com';
    let port = params.flags.p && params.flags.p[0];

    let force = params.flags.hasOwnProperty('f') || params.vflags.hasOwnProperty('force');
    let nologin = params.flags.hasOwnProperty('n') || params.vflags.hasOwnProperty('no-login');

    if (!force && config.workspace()) {
      console.log();
      console.log(chalk.bold.red('Oops!'));
      console.log();
      console.log(`A stdlib workspace has already been set.`);
      console.log(`The path of the stdlib workspace is:`)
      console.log(`  ${chalk.bold(config.workspace())}`);
      console.log();
      console.log(`Use ${chalk.bold('lib init --force')} to override and set a new workspace.`);
      console.log();
      return callback(null);
    }

    config.initialize(process.cwd());

    let cb = (err) => {
      if (err) {
        return callback(err);
      }
      console.log();
      console.log(chalk.bold.green(`Congratulations!`));
      console.log(`Your stdlib development environment has been initialized.`);
      console.log();
      console.log(`Use ${chalk.bold('lib create <service>')} to create a new (local) service package.`);
      console.log(`or type ${chalk.bold('lib get <service>')} to download an existing service package.`);
      console.log()
      console.log(`Additionally, use ${chalk.bold('lib help')} to see more commands.`)
      console.log();
      console.log(chalk.bold('Happy building! :)'));
      console.log();
      callback(null);
    };

    if (nologin) {
      return cb();
    }

    console.log();
    console.log(chalk.bold.green('Welcome to Standard Library! :)'))
    console.log();
    console.log(`To use the ${chalk.bold('Standard Library')} registry, you must have a registered account.`);
    console.log(`It will allow you to push your services to the cloud and manage environments.`);
    console.log(`If you don\'t have an account, it\'s ${chalk.bold.underline.green('free')} to sign up! Please go to https://stdlib.com/ to get started.`);
    console.log();
    console.log(`If you already have an account, please enter your e-mail to login.`);
    console.log();

    let questions = [];

    questions.push({
      name: 'email',
      type: 'input',
      default: '',
      message: 'E-mail'
    });

    inquirer.prompt(questions, (promptResult) => {

      let email = promptResult.email;

      let resource = new APIResource(host, port);
      resource.request('v1/user_exists').index({email: email}, (err, response) => {

        if (err) {
          return callback(err);
        }

        params.flags.e = [email];
        params.vflags.email = [email];

        if (!response.data.length) {
          console.log();
          console.log(`It appears you do not yet have an account.`);
          require('./register.js').prototype.run(params, cb);
        } else {
          console.log();
          console.log(`Welcome back, ${chalk.bold.green(response.data[0].username)}!`);
          console.log('Please enter your password.');
          console.log();
          require('./login.js').prototype.run(params, cb);
        }

      });

    });

  }

}

module.exports = InitCommand;
