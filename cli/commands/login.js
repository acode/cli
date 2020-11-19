'use strict';

const Command = require('cmnd').Command;
const APIResource = require('api-res');
const errorLog = require('../error_log.js');

const inquirer = require('inquirer');
const async = require('async');
const chalk = require('chalk');

const config = require('../config.js');

class LoginCommand extends Command {

  constructor() {

    super('login');

  }

  help() {

    return {
      description: 'Logs in to Autocode in this directory',
      vflags: {
        email: 'E-Mail',
        password: 'Password'
      }
    };

  }

  run(params, callback) {

    let host = params.flags.h ? params.flags.h[0] : 'https://api.polybit.com';
    let port = params.flags.p && params.flags.p[0];

    let email = params.vflags.email || params.vflags.email || []
    email = email[0];
    let password = params.vflags.password || params.vflags.password || [];
    password = password[0];

    let questions = [];

    email || questions.push({
      name: 'email',
      type: 'input',
      default: '',
      message: 'Username or E-mail',
    });

    password || questions.push({
      name: 'password',
      type: 'password',
      message: 'Password',
    });

    let loopCb = (err) => {

      err && errorLog(err);

      inquirer.prompt(questions, (promptResult) => {

        email = promptResult.email || email;
        password = promptResult.password || password;

        let resource = new APIResource(host, port);

        resource.request('v1/access_tokens').create({}, {grant_type: 'password', username: email, password: password}, (err, response) => {

          if (err) {
            questions.filter(q => q.name === 'email').forEach(q => q.default = email);
            password = null;
            return loopCb(err);
          }

          config.set('ACCESS_TOKEN', response.data[0].access_token);
          config.set('ACTIVE_LIBRARY_TOKEN', '');
          config.unset('LIBRARY_TOKENS');
          config.write();

          console.log();
          console.log(chalk.bold.green('Logged in successfully!') + ' Retrieving default Identity Token (API Key)...');

          resource.authorize(config.get('ACCESS_TOKEN'));
          resource.request('/v1/library_tokens').index({default: true}, (err, response) => {

            if (err) {
              return callback(err);
            }

            let tokens = (response && response.data) || [];

            if (!tokens.length) {
              console.log('Logged in, but could not retrieve default Identity Token.');
            } else {
              config.save('ACTIVE_LIBRARY_TOKEN', tokens[0].token);
              console.log(`Active Identity Token (API Key) set to: ${chalk.bold(tokens[0].label)}`);
            }

            console.log();
            return callback();


          });

        });

      });

    };

    loopCb();

  }

}

module.exports = LoginCommand;
