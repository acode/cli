"use strict";

const Command = require('cmnd').Command;
const APIResource = require('api-res');
const chalk = require('chalk');
const inquirer = require('inquirer');

const config = require('../../config.js');
const tabler = require('../../tabler.js');

class TokensListCommand extends Command {

  constructor() {
    super('tokens', 'list');
  }

  help() {
    return {
      description: 'Lists your remotely generated Identity Tokens (Authentication)',
      flags: {
        's': 'Silent mode - do not display information',
        'a': 'All - show invalidated tokens as well'
      },
      vflags: {
        'silent': 'Silent mode - do not display information',
        'all': 'All - show invalidated tokens as well'
      }
    };
  }

  run(params, callback) {

    let activeToken = config.get('ACTIVE_LIBRARY_TOKEN');

    let host = params.flags.h ? params.flags.h[0] : 'https://api.autocode.com';
    let port = params.flags.p && params.flags.p[0];
    let silent = !!(params.flags.s || params.vflags.silent);
    let all = !!(params.flags.a || params.vflags.all);

    let resource = new APIResource(host, port);
    let reqParams = {};
    all && (reqParams.all = true);

    resource.authorize(config.get('ACCESS_TOKEN'));
    resource.request('/v1/library_tokens').index(reqParams, (err, response) => {

      if (err) {
        return callback(err);
      }

      let tokens = (response && response.data) || [];

      if (!tokens.length) {
        console.log();
        console.log(chalk.bold.red('Oops!'));
        console.log();
        console.log(`It doesn't look like you have any remotely generated Identity Tokens.`);
        console.log(`This usually means you've removed them.`);
        console.log();
        console.log(`Try typing `);
        console.log(`\t${chalk.bold('lib tokens:create')}`);
        console.log();
        console.log(`To create a new Identity Token (remote).`);
        console.log();
        return callback(new Error('No remotely generated tokens.'));
      }

      if (!silent) {
        console.log();
        console.log(`Here's a list of your available ${chalk.bold('Identity Tokens')}.`);
        console.log(`These are your API keys that provide authentication and access to functions.`);
      }

      return callback(
        null,
        `\n` + tabler(
          ['Active', 'User', 'Label', 'Token', 'Valid', 'Created'],
          tokens.map(libraryToken => {
            let label = libraryToken.label ?
              libraryToken.label.length > 36 ?
                libraryToken.label.substr(0, 33) + '...' :
                libraryToken.label :
                '';
            let Token = libraryToken.token.substr(0, 16) + '...';
            return {
              'Active': activeToken === libraryToken.token ? ['(active)', chalk.yellow] : '',
              'User': libraryToken.is_valid ?
                libraryToken.user.username :
                [libraryToken.user.username, chalk.dim],
              'Label': libraryToken.is_valid ?
                label :
                [label, chalk.dim],
              'Token': libraryToken.is_valid ?
                Token :
                [Token, chalk.dim],
              'Valid': libraryToken.is_valid ?
                ['✔', chalk.bold.green] :
                ['✖', chalk.bold.red],
              'Created': libraryToken.is_valid ?
                libraryToken.created_at :
                [libraryToken.created_at, chalk.dim],
              'token': libraryToken.token
            };
          }),
          true
        ) + `\n`
      );

    });

  }
}

module.exports = TokensListCommand;
