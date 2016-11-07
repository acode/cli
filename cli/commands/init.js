'use strict';

const Command = require('cmnd').Command;
const APIResource = require('api-res');
const Credentials = require('../credentials.js');

const inquirer = require('inquirer');
const async = require('async');
const chalk = require('chalk');

class InitCommand extends Command {

  constructor() {

    super('init');

  }

  help() {

    return {
      description: 'Initializes stdlib workspace',
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

    let cloc = Credentials.location();

    if (!force && cloc) {
      console.log();
      console.log(chalk.bold.red('Oops!'));
      console.log();
      console.log(`A stdlib workspace already exists.`);
      console.log(`We recommend you do not initialize another.`);
      console.log(`The path of the stdlib workspace is:`)
      console.log(`  ${chalk.bold(cloc)}`);
      console.log();
      console.log(`Use ${chalk.bold('lib init --force')} to override.`);
      console.log();
      return callback(null);
    }

    Credentials.create();

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
    console.log(chalk.bold.green('Welcome to stdlib! :)'))
    console.log();
    console.log(`To use the ${chalk.bold('stdlib')} registry, you must have a registered Polybit account.`);
    console.log(`It will allow you to push your services to the cloud and manage environments.`);
    console.log(`It\'s ${chalk.bold.underline.green('free')} to create an account. Let's get started!`);
    console.log();
    console.log(`Please enter your e-mail to login or register.`);
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
          console.log(`${chalk.bold.green('Welcome!')} It appears you do not yet have an account.`);
          console.log('Please create a username and password.');
          console.log();
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
