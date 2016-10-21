'use strict';

const Command = require('cmnd').Command;
const APIResource = require('api-res');
const Credentials = require('../credentials.js');
const errorLog = require('../error_log.js');

const inquirer = require('inquirer');
const async = require('async');

class PolyLoginCommand extends Command {

  constructor() {

    super('login');

  }

  help() {

    return {
      description: 'Logs in to stdlib in this directory'
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
      message: 'E-mail',
    });

    password || questions.push({
      name: 'password',
      type: 'password',
      message: 'Password',
    });

    let loopCb = (err) => {

      err && errorLog(err);

      inquirer.prompt(questions, (promptResult) => {

        email = email || promptResult.email;
        password = password || promptResult.password;

        let resource = new APIResource(host, port);

        resource.request('v1/access_tokens').create({}, {grant_type: 'password', username: email, password: password}, (err, response) => {

          if (err) {
            return loopCb(err);
          }

          Credentials.write('ACCESS_TOKEN', response.data[0].access_token);
          return callback(null, 'Logged in successfully');

        });

      });

    };

    loopCb();

  }

}

module.exports = PolyLoginCommand;
