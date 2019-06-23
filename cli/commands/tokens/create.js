"use strict";

const Command = require('cmnd').Command;
const APIResource = require('api-res');
const chalk = require('chalk');
const inquirer = require('inquirer');

const config = require('../../config.js');
const tabler = require('../../tabler.js');

const TokensListCommand = require('./list.js');

class TokensCreateCommand extends Command {

  constructor() {
    super('tokens', 'create');
  }

  help() {
    return {
      description: 'Creates a Library Token for API Authentication',
    };
  }

  run(params, callback) {

    let activeToken = config.get('ACTIVE_LIBRARY_TOKEN');

    let host = params.flags.h ? params.flags.h[0] : 'https://api.polybit.com';
    let port = params.flags.p && params.flags.p[0];

    let resource = new APIResource(host, port);
    resource.authorize(config.get('ACCESS_TOKEN'));

    console.log();
    console.log(`We'll now create a ${chalk.bold('Library Token')}.`);
    console.log(`These are your API keys that provide authentication and access to functions.`);
    console.log();
    console.log(`We first ask that you specify a name (label) for your Library Token.`);
    console.log(`This should be something descriptive like, "my test token"`);
    console.log();

    inquirer.prompt(
      [
        {
          name: 'label',
          type: 'input',
          message: `Enter a Label`
        }
      ],
      answers => {

        let label = answers.label;

        resource.request('/v1/library_tokens').create(
          {},
          {label: label},
          (err, response) => {

            if (err) {
              console.log('There was an error creating your token.');
              return callback(err);
            }

            let token = (response && response.data && response.data[0]) || null;

            if (!token) {
              return callback(new Error('There was a problem fetching your created token.'));
            }

            if (!activeToken) {
              config.save('ACTIVE_LIBRARY_TOKEN', token.token);
            }

            params.flags.s = [];
            return TokensListCommand.prototype.run.call(this, params, callback);

          }
        );

      }
    );

  }
}

module.exports = TokensCreateCommand;
