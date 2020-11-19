"use strict";

const Command = require('cmnd').Command;
const APIResource = require('api-res');
const chalk = require('chalk');
const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');

const config = require('../../config.js');
const tabler = require('../../tabler.js');
const serviceConfig = require('../../service_config');


const TokensListCommand = require('./list.js');

class TokensRetrieveCommand extends Command {

  constructor() {
    super('tokens', 'retrieve');
  }

  help() {
    return {
      description: 'Retrieve an Identity Token for use in the local environment of the current service',
    };
  }

  run(params, callback) {

    let host = params.flags.h ? params.flags.h[0] : 'https://api.polybit.com';
    let port = params.flags.p && params.flags.p[0];

    let resource = new APIResource(host, port);

    let pkg;
    let env;

    try {
      pkg = serviceConfig.get();
    } catch (e) {
      return callback(e);
    }

    try {
      env = require(path.join(process.cwd(), 'env.json'));
    } catch (e) {
      return callback(new Error(`Could not parse the "env.json" file in this directory.`))
    }

    let serviceName = pkg.stdlib.name;
    if (!serviceName) {
      return callback(new Error(`No "name" field found in package.json`));
    }

    resource.authorize(config.get('ACCESS_TOKEN'));
    resource.request('/v1/library_tokens').index({
      environment: 'dev'
    }, (err, response) => {

      if (err) {
        return callback(err);
      }

      let libraryTokens = response.data;
      let matchingLibraryToken = libraryTokens.find((libraryToken) => {
        return libraryToken.cachedToken &&
          libraryToken.cachedToken.services &&
          libraryToken.cachedToken.services.find((service) => {
            return service.name === serviceName.toLowerCase() && service.environment === 'dev';
          });
      });

      if (!!matchingLibraryToken) {
        let newEnv = {
          local: env.local || {}
        };
        Object.keys(env).forEach((key) => {
          newEnv[key] = env[key];
        });
        newEnv.local.STDLIB_SECRET_TOKEN = matchingLibraryToken.token;
        fs.writeFileSync(path.join(process.cwd(), 'env.json'), JSON.stringify(newEnv, null, 2));
        console.log();
        console.log(chalk.bold.green('Success!'));
        console.log();
        console.log(`Added the Development Identity Token associated with ${chalk.bold(serviceName)}\nto your local "env.json" file as ${chalk.bold('STDLIB_SECRET_TOKEN')}.`);
        console.log();
        console.log(`Your API will now use this token when you test locally with ${chalk.bold('lib .')}`);
        console.log();
        return callback();
      } else {
        console.log();
        console.log(`There is currently no Development Identity Token associated with ${chalk.bold(serviceName)}.`);
        console.log();
        console.log(`Please select one from this list that you would like to use with ${chalk.bold(serviceName)}:`);
        console.log();

        inquirer.prompt(
          [
            {
              name: 'libraryToken',
              type: 'list',
              pageSize: 100,
              message: `Select a Development Identity Token to use for Authenticated API calls`,
              choices: tabler(
                ['User', 'Label', 'Token', 'Valid', 'Created'],
                libraryTokens.filter((libraryToken) => {
                  return libraryToken.cachedToken && !libraryToken.cachedToken.is_project_token;
                }).map(libraryToken => {
                  return {
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
                  name: '○ ' + chalk.grey('(cancel)'),
                  value: 0
                }
              )
            }
          ],
          answers => {

            let libraryToken = answers.libraryToken;

            // If we didn't cancel...
            if (libraryToken !== 0) {

              console.log();
              console.log(`Your Development Identity Token value is:`);
              console.log();
              console.log(chalk.bold(libraryToken.token));
              console.log();
              console.log(`Please add it to your local "env.json" file.`);
              console.log();

            }

            return callback();

          }
        );
      }

    });

  }
}

module.exports = TokensRetrieveCommand;
