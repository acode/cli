"use strict";

const Command = require('cmnd').Command;
const APIResource = require('api-res');
const chalk = require('chalk');
const inquirer = require('inquirer');

const config = require('../../config.js');
const tabler = require('../../tabler.js');

const TokensListCommand = require('./list.js');

class TokensCommand extends Command {

  constructor() {
    super('tokens');
  }

  help() {
    return {
      description: 'Selects an active Identity Token for API Authentication',
    };
  }

  run(params, callback) {

    let activeToken = config.get('ACTIVE_LIBRARY_TOKEN');

    let host = params.flags.h ? params.flags.h[0] : 'https://api.autocode.com';
    let port = params.flags.p && params.flags.p[0];

    let resource = new APIResource(host, port);

    resource.authorize(config.get('ACCESS_TOKEN'));
    resource.request('/v1/library_tokens').index({}, async (err, response) => {

      if (err) {
        return callback(err);
      }

      let tokens = (response && response.data) || [];

      if (!tokens.length) {
        console.log();
        console.log(chalk.bold.red('Oops!'));
        console.log();
        console.log(`It doesn't look like you have any Identity Tokens.`);
        console.log(`This usually means you've removed them.`);
        console.log();
        console.log(`Try typing `);
        console.log(`\t${chalk.bold('lib tokens:create')}`);
        console.log();
        console.log(`To create a new Identity Token.`);
        console.log();
        return callback(new Error('No Identity Tokens.'));
      }

      console.log();
      console.log(`Here's a list of your available ${chalk.bold('Identity Tokens')}.`);
      console.log(`These are your API keys that provide authentication and access to functions.`);
      console.log();
      console.log(`Here you can change your active authentication token, simply choose from the list.`);
      console.log();

      let answers = await inquirer.prompt(
        [
          {
            name: 'libraryToken',
            type: 'list',
            pageSize: 100,
            message: `Select a Identity Token to use for Authentication`,
            choices: tabler(
              ['Active', 'User', 'Label', 'Token', 'Valid', 'Created'],
              tokens.map(libraryToken => {
                return {
                  'Active': activeToken === libraryToken.token ? ['(active)', chalk.yellow] : '',
                  'User': libraryToken.user.username,
                  'Label': libraryToken.label ?
                    libraryToken.label.length > 36 ?
                      libraryToken.label.substr(0, 33) + '...' :
                      libraryToken.label :
                      '',
                  'Token': libraryToken.token.substr(0, 16) + '...',
                  'Valid': libraryToken.is_valid ?
                    ['✔', chalk.bold.green] :
                    ['✖', chalk.bold.red],
                  'Created': libraryToken.created_at,
                  'token': libraryToken.token
                };
              }),
              true,
              true
            ).map(row => row.value === null ? new inquirer.Separator(row.name) : row)
            .concat(
              {
                name: '✖ ' + chalk.red('(unset active token)'),
                value: null
              },
              {
                name: '○ ' + chalk.grey('(cancel)'),
                value: 0
              }
            )
          }
        ]
      );

      let libraryToken = answers.libraryToken;

      // If we didn't cancel...
      if (libraryToken !== 0) {
        activeToken = libraryToken ? libraryToken.token : '';
        config.save('ACTIVE_LIBRARY_TOKEN', activeToken);
      }

      // set silent flag.
      params.flags.s = [];
      TokensListCommand.prototype.run.call(this, params, callback);

    });

  }
}

module.exports = TokensCommand;
