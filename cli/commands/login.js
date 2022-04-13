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
      description: 'Logs in to Autocode',
      vflags: {
        email: 'E-mail',
        password: 'Password'
      }
    };

  }

  run(params, callback) {

    let host = params.flags.h ? params.flags.h[0] : 'https://api.autocode.com';
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

    let resource = new APIResource(host, port);

    let setAccessToken = (accessToken, cb) => {

      config.set('ACCESS_TOKEN', accessToken);
      config.set('ACTIVE_LIBRARY_TOKEN', '');
      config.unset('LIBRARY_TOKENS');
      config.write();

      console.log();
      console.log(chalk.bold.green('Logged in successfully!') + ' Retrieving default Identity Token (API Key)...');

      resource.authorize(config.get('ACCESS_TOKEN'));
      resource.request('/v1/library_tokens').index({default: true}, (err, response) => {

        if (err) {
          return cb(err);
        }

        let tokens = (response && response.data) || [];

        if (!tokens.length) {
          console.log('Logged in, but could not retrieve default Identity Token.');
        } else {
          config.save('ACTIVE_LIBRARY_TOKEN', tokens[0].token);
          console.log(`Active Identity Token (API Key) set to: ${chalk.bold(tokens[0].label)}`);
        }

        console.log();
        return cb();

      });
    }

    let loopCb = async (err) => {

      err && errorLog(err);

      let promptResult = await inquirer.prompt(questions);

      email = promptResult.email || email;
      password = promptResult.password || password;

      resource.request('v1/login').create({}, {grant_type: 'password', username: email, password: password}, (err, response) => {

        if (err) {
          questions.filter(q => q.name === 'email').forEach(q => q.default = email);
          password = null;
          return loopCb(err);
        }

        if (!!response.data[0].factor_identifier) {
          console.log();
          console.log(`Your account has two-factor authentication enabled. Please enter a valid authentication code to finish logging in.`);
          console.log();
          inquirer.prompt({
            name: 'verificationCode',
            type: 'input',
            default: '',
            message: 'Verification Code',
          }).then((promptResult) => {
            resource.request('v1/login').create({}, {
              grant_type: 'password',
              username: email,
              password: password,
              factor_verification_check_sid: response.data[0].sid,
              factor_verification_code: promptResult.verificationCode,
            }, (err, response) => {
              if (err) {
                questions.filter(q => q.name === 'email').forEach(q => q.default = email);
                password = null;
                return loopCb(err);
              }
              setAccessToken(response.data[0].access_token, callback);
            });
          });
        } else {
          setAccessToken(response.data[0].access_token, callback);
        }

      });

    };

    loopCb();

  }

}

module.exports = LoginCommand;
