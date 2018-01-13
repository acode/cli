"use strict";

const Command = require('cmnd').Command;
const APIResource = require('api-res');
const chalk = require('chalk');
const inquirer = require('inquirer');

const config = require('../../config.js');
const tabler = require('../../tabler.js');

const TokensListCommand = require('./list.js');

class TokensDestroyCommand extends Command {

  constructor() {
    super('tokens', 'destroy');
  }

  help() {
    return {
      description: 'Selects an active Library Token for API Authentication',
    };
  }

  run(params, callback) {

    let activeToken = config.get('ACTIVE_LIBRARY_TOKEN');

    let host = params.flags.h ? params.flags.h[0] : 'https://api.polybit.com';
    let port = params.flags.p && params.flags.p[0];

    let resource = new APIResource(host, port);

    resource.authorize(config.get('ACCESS_TOKEN'));
    resource.request('/v1/library_tokens').index({}, (err, response) => {

      if (err) {
        return callback(err);
      }

      let tokens = (response && response.data) || [];

      if (!tokens.length) {
        console.log();
        console.log(chalk.bold.red('Oops!'));
        console.log();
        console.log(`It doesn't look like you have any Library Tokens.`);
        console.log(`This usually means you've removed them.`);
        console.log();
        console.log(`Try typing `);
        console.log(`\t${chalk.bold('lib tokens:create')}`);
        console.log();
        console.log(`To create a new Library Token.`);
        console.log();
        return callback(new Error('No Library Tokens.'));
      }

      console.log();
      console.log(`Here's a list of your available ${chalk.bold('Library Tokens')}.`);
      console.log(`These are your API keys that provide authentication and access to functions.`);
      console.log();
      console.log(`Here you can ${chalk.bold.red('permanently destroy')} authentication tokens, simply choose from the list.`);
      console.log();

      inquirer.prompt(
        [
          {
            name: 'libraryToken',
            type: 'list',
            pageSize: 100,
            message: `Select a Library Token to ${chalk.bold.red('Destroy (Permanently)')}`,
            choices: tabler(
              ['?', 'Active', 'User', 'Label', 'Token', 'Valid', 'Created'],
              tokens.map(libraryToken => {
                return {
                  '?': ['✖', chalk.bold.red],
                  'Active': activeToken === libraryToken.token ? ['(active)', chalk.yellow] : '',
                  'User': libraryToken.user.username,
                  'Label': libraryToken.label ?
                    libraryToken.label.length > 16 ?
                      libraryToken.label.substr(0, 13) + '...' :
                      libraryToken.label :
                      '',
                  'Token': libraryToken.token.substr(0, 8) + '...',
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
                name: '○ ' + chalk.grey('(cancel)'),
                value: 0
              }
            )
          },
          {
            name: 'verify',
            type: 'confirm',
            message: (answers) => {
              return `Are you sure you want to ${chalk.bold.red('permanently destroy')} ` +
                `token "${chalk.bold(answers.libraryToken.Label)}"?`;
            },
            when: (answers) => !!answers.libraryToken
          }
        ],
        answers => {

          let libraryToken = answers.libraryToken;

          // If we cancelled or didn't verify.
          if (!libraryToken || !answers.verify) {
            // set silent flag.
            params.flags.s = [];
            return TokensListCommand.prototype.run.call(this, params, callback);
          }

          resource.authorize(config.get('ACCESS_TOKEN'));
          resource.request('/v1/library_tokens').destroy(
            null,
            {token: libraryToken.token},
            (err, response) => {

              if (err) {
                console.log('There was an error destroying your token.');
                return callback(err);
              }

              if (libraryToken.token === activeToken) {
                config.save('ACTIVE_LIBRARY_TOKEN', '');
              }

              params.flags.s = [];
              return TokensListCommand.prototype.run.call(this, params, callback);

            }
          );

        }
      );

    });

  }
}

module.exports = TokensDestroyCommand;
