'use strict';

const fs = require('fs');
const path = require('path');
const child_process = require('child_process');
const inquirer = require('inquirer');
const Command = require('cmnd').Command;
const APIResource = require('api-res');
const Credentials = require('../../credentials.js');

const chalk = require('chalk');

function getUserName(port, callback) {

    let host = 'api.polybit.com';
    let resource = new APIResource(host, port);

    resource.authorize(Credentials.read('ACCESS_TOKEN'));
    resource.request('v1/users').index({me: true}, (err, response) => {

      if (err) {
        return callback(err);
      }

      return callback(null, response.data[0].username);

    });

}

class SourceGetCommand extends Command {

  constructor() {

    super('source', 'get');

  }

  help() {

    return {
      description: 'Retrieves and extracts StdLib source code',
      args: [
        'full source code name'
      ],
      flags: {
        f: 'Force command if not in root directory',
        w: 'Write over - overwrite the target directory contents',
        s: 'Service - create a service from the source code',
      },
      vflags: {
        'force': 'Force command if not in root directory',
        'write-over': 'Write over - overwrite the target directory contents',
        'service': 'Service - create a service from the source code',
      }
    };

  }

  run(params, callback) {

    let sourceName = params.args[0] || '';

    if (!sourceName) {
      return callback(new Error('Please specify a source code name'));
    }

    let serviceName;

    if (params.flags.hasOwnProperty('s') || params.vflags.hasOwnProperty('service')) {

      serviceName = params.flags.s || params.vflags.service || '';

      if (!serviceName) {
        return callback(new Error('Please specify a name for your service'));
      }

    }

    let force = params.flags.hasOwnProperty('f') || params.vflags.hasOwnProperty('force');
    let write = params.flags.hasOwnProperty('w') || params.vflags.hasOwnProperty('write-over');

    let hostname = (params.flags.h && params.flags.h[0]) || '';
    let matches = hostname.match(/^(https?:\/\/)?(.*?)(:\d+)?$/);

    let host = 'registry.stdlib.com';
    let port = 443;

    if (hostname && matches) {
      host = matches[2];
      port = parseInt((matches[3] || '').substr(1) || (hostname.indexOf('https') === 0 ? 443 : 80));
    }

    getUserName(port, (err, username) => {

      if (err) {
        return callback(err);
      }

      if (!force && !Credentials.location(1)) {
        console.log();
        console.log(chalk.bold.red('Oops!'));
        console.log();
        console.log(`You're trying to retrieve source code,`);
        console.log(`But you're not in a root stdlib project directory.`);
        console.log(`We recommend against this.`);
        console.log();
        console.log(`Use ${chalk.bold('lib get ' + sourceName + ' --force')} to override.`);
        console.log();
        return callback(null);
      }

      let pathname = serviceName ? `${username}/${serviceName}` : sourceName;

      if (!write && fs.existsSync(pathname)) {
        console.log();
        console.log(chalk.bold.red('Oops!'));
        console.log();
        console.log(`The directory you're retrieving to already exists:`);
        console.log(`  ${chalk.bold(pathname)}`);
        console.log();
        console.log(`Try removing the existing directory first.`);
        console.log();
        console.log(`Use ${chalk.bold('lib get ' + sourceName + ' --write-over')} to override.`);
        console.log();
        return callback(null);
      }

      let resource = new APIResource(host, port);
      resource.authorize(Credentials.read('ACCESS_TOKEN'));

      let endpoint = `sources/${sourceName}/package.tgz`;

      console.log();
      console.log(`Retrieving ${chalk.bold(host + '/' + endpoint)}...`);
      console.log();

      return resource.request(endpoint).index({}, (err, response) => {

        if (err) {
          return callback(err);
        }

        let directories = pathname.split(path.sep);

        for (let i = 1; i < directories.length; i++) {

          let relpath = pathname.split(path.sep).slice(0, i + 1).join(path.sep);

          try {

            let user, service;
            [user, service] = relpath.split(path.sep);

            if (!fs.existsSync(user)) {
              fs.mkdirSync(user)
            }

            !fs.existsSync(relpath) && fs.mkdirSync(relpath);

          } catch (e) {
            return callback(new Error(`Could not create directory ${relpath}`));
          }

        }

        let tmpPath = `/tmp/${sourceName.replace(/\//g, '.')}.tgz`;

        try {
          fs.writeFileSync(tmpPath, response);
        } catch (e) {
          return callback(new Error(`Could not write temporary file ${tmpPath}`));
        }

        child_process.exec(`tar -xzf ${tmpPath} -C ${pathname}`, (err) => {

          // cleanup
          fs.unlinkSync(tmpPath);

          if (err) {
            return callback(`Could not extract from package`);
          }

          console.log(chalk.bold.green('Success!'));
          console.log();

          if (serviceName) {
            // create a service from the source code

            let sourceJSON = JSON.parse(fs.readFileSync(path.join(pathname, 'source.json'), 'utf8'));
            let pkgJSON = JSON.parse(fs.readFileSync(path.join(pathname, 'package.json'), 'utf8'));
            let envJSON = {
              local: {},
              dev: {},
              release: {},
            }

            let envVarPrompts = [];
            Object.keys(envJSON).forEach((env) => {

              let prompts = Object.keys(sourceJSON.environmentVariables).map((variable) => {
                return {
                  name: `${env}.${variable}`,
                  message: `${env} - ${variable}: ${sourceJSON.environmentVariables[variable].description}`,
                  type: 'input',
                  default: sourceJSON.environmentVariables[variable].default,
                };
              });

              envVarPrompts = envVarPrompts.concat(prompts);

            });

            console.log('Enter Environment Variables [environment] - [variable]');
            inquirer.prompt(envVarPrompts, function (answers) {

              for (let answer in answers){
                let env, variable;
                [env, variable] = answer.split('.');
                envJSON[env][variable] = answers[answer];
              }

              fs.writeFileSync(
                path.join(pathname, 'env.json'),
                JSON.stringify(envJSON, null, 2)
              );

              fs.unlinkSync(path.join(pathname, 'source.json'));

              pkgJSON.stdlib.source = sourceName.indexOf('@') !== -1
                ? sourceName
                : `${sourceName}@${pkgJSON.version}`;

              pkgJSON.version = '0.0.0';
              pkgJSON.name = serviceName;
              pkgJSON.stdlib.name = `${username}/${serviceName}`;

              fs.writeFileSync(
                path.join(pathname, 'package.json'),
                JSON.stringify(pkgJSON, null, 2)
              );

              console.log();
              console.log(`Service created from source code: ${chalk.bold(sourceName)} at:`);
              console.log(`  ${chalk.bold(pathname)}`);
              console.log();

              return callback(null)

            });

          } else {
            // just leave the extracted source code as is

            console.log(`Source code ${chalk.bold(sourceName)} retrieved to:`);
            console.log(`  ${chalk.bold(pathname)}`);
            console.log();

            return callback(null);

          }

        });

      });

    });

  }

}

module.exports = SourceGetCommand;
