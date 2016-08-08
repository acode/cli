'use strict';

const Command = require('cmnd').Command;
const APIResource = require('api-res');
const Credentials = require('../credentials.js');

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

    let questions = [];

    questions.push({
      name: 'email',
      type: 'input',
      default: '',
      message: 'e-mail'
    });

    questions.push({
      name: 'username',
      type: 'input',
      default: '',
      message: 'username'
    });

    questions.push({
      name: 'password',
      type: 'password',
      message: 'password'
    });

    questions.push({
      name: 'repeat_password',
      type: 'password',
      message: 'repeat password'
    });

    inquirer.prompt(questions, (promptResult) => {

      let email = promptResult.email;
      let password = promptResult.password;
      let repeat = promptResult.repeat_password;


      let resource = new APIResource(host, port);
      resource.request('v1/users').create({}, {email: email, password: password, repeat_password: repeat}, (err, response) => {

        if (err) {
          return callback(err);
        }

        require('./login.js').prototype.run({
          args: params.args,
          flags: params.flags,
          vflags: {email: [email], password: [password]}
        }, callback);

      });

    });

  }

}

module.exports = RegisterCommand;
