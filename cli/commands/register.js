'use strict';

const Command = require('cmnd').Command;
const APIResource = require('api-res');
const Credentials = require('../credentials.js');
const errorLog = require('../error_log.js');

const inquirer = require('inquirer');
const async = require('async');

class RegisterCommand extends Command {

  constructor() {

    super('register');

  }

  help() {

    return {
      description: 'Registers a new stdlib user account'
    };

  }

  run(params, callback) {

    let host = params.flags.h ? params.flags.h[0] : 'https://api.polybit.com';
    let port = params.flags.p && params.flags.p[0];

    let email = params.flags.e || params.vflags.email || [];
    email = email[0];

    let questions = [];
    let previous = {};

    email || questions.push({
      name: 'email',
      type: 'input',
      default: '',
      message: 'E-mail'
    });

    questions.push({
      name: 'username',
      type: 'input',
      default: '',
      message: 'Desired Username'
    });

    questions.push({
      name: 'password',
      type: 'password',
      message: 'Password'
    });

    questions.push({
      name: 'repeat_password',
      type: 'password',
      message: 'Repeat Password'
    });

    let loopCb = (err) => {

      if (err) {

        errorLog(err);

        if (err.details) {

          if (err.details.hasOwnProperty('password')) {
            delete previous.password;
            delete previous.repeat_password;
          } else {
            for (let i = questions.length - 1; i >= 0; i--) {
              if (questions[i].name === 'password' || questions[i].name === 'repeat_password') {
                questions.splice(i, 1);
              }
            }
          }

          if (err.details.hasOwnProperty('username')) {
            delete previous.username;
          } else {
            for (let i = questions.length - 1; i >= 0; i--) {
              if (questions[i].name === 'username') {
                questions.splice(i, 1);
              }
            }
          }

        }

      }

      inquirer.prompt(questions, (promptResult) => {

        email = email || promptResult.email;
        let password = previous.password || promptResult.password;
        let repeat_password = previous.repeat_password || promptResult.repeat_password;
        let username = previous.username || promptResult.username;

        previous.password = password;
        previous.repeat_password = repeat_password;
        previous.username = username;

        let resource = new APIResource(host, port);
        resource.request('v1/users').create(
          {},
          {
            email: email,
            username: username,
            password: password,
            repeat_password: repeat_password
          },
          (err, response) => {

            if (err) {
              return loopCb(err);
            }

            params.flags.e = [email];
            params.vflags.email = [email];
            params.flags.p = [password];
            params.vflags.password = [password];

            require('./login.js').prototype.run(params, callback);

          }
        );

      });

    };

    loopCb();

  }

}

module.exports = RegisterCommand;
