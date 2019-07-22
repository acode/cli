'use strict';

const fs = require('fs');
const path = require('path');

const config = require('../../config.js');
const serviceConfig = require('../../service_config.js');

const Command = require('cmnd').Command;

const chalk = require('chalk');
const inquirer = require('inquirer');
const ncp = require('ncp');

class SourceCommand extends Command {

  constructor() {

    super('source');

  }

  help() {

    return {
      description: 'Converts a local service to Standard Library sourcecode by creating "source.json"',
      args: [],
      flags: {},
      vflags: {}
    };

  }

  run(params, callback) {

    let stdlibJSON;
    let env;

    try {
      stdlibJSON = serviceConfig.get();
    } catch(e) {
      return callback(new Error('Invalid service configuration'));
    }

    if (fs.existsSync('env.json')) {
      try {
        env = require(path.join(process.cwd(), 'env.json'));
      } catch (e) {
        return callback(new Error('Invalid env.json'));
      }
    }

    if (fs.existsSync('source.json')) {
      return callback(new Error('This directory already has a source.json'))
    }

    let pathnames = process.cwd().split(path.sep);
    let newPathnames = pathnames.slice(-2);
    let createDir;

    console.log();
    console.log(chalk.bold.green('Great!') + ` You're ready to create some Standard Library sourcecode.`);

    if (newPathnames[0].startsWith('@')) {
      console.log();
      console.log(`Great, it looks like we're already in a sourcecode directory starting with "@".`);
      console.log(`We just need to create a "source.json" file.`);
      console.log();
    } else {
      let basedir = path.resolve(path.join(process.cwd(), '..', '..'));
      newPathnames[0] = '@' + newPathnames[0];
      createDir = path.join(basedir, newPathnames[0], newPathnames[1]);
      console.log();
      console.log(`To create sourcecode from this service,`);
      console.log(`we will copy the current directory contents to the directory:`);
      console.log(chalk.bold(`  ${createDir}`));
      console.log();
      console.log('And create a "source.json" file.')
      console.log();
    }

    inquirer.prompt(
      {
        name: 'confirm',
        message: 'Continue?',
        type: 'confirm'
      },
      (promptResult) => {

        if (!promptResult.confirm) {
          return callback(new Error('Process aborted.'));
        }

        let json = {
          source: require(path.join(__dirname, `../../templates/source.json`))
        };

        let sourceName = `@${stdlibJSON.name}`;

        json.source.name = sourceName;
        json.source.env = Object.keys(env.local || env.dev || env.release || {}).map(key => {
          return {
            name: key,
            defaultValue: "",
            description: ""
          };
        });

        if (createDir) {

          if (fs.existsSync(createDir)) {
            return callback(new Error(`Directory already exists, cannot create sourcecode.`));
          }

          let firstDir = path.resolve(path.join(createDir, '..'));
          fs.existsSync(firstDir) || fs.mkdirSync(firstDir);
          fs.existsSync(createDir) || fs.mkdirSync(createDir);

          ncp(process.cwd(), createDir, (err) => {

            if (err) {
              return callback(err);
            }

            fs.writeFileSync(path.join(createDir, 'source.json'), JSON.stringify(json.source, null, 2));

            console.log(chalk.bold.green('Success!'));
            console.log();
            console.log(`This service has been converted to source "${chalk.bold(sourceName)}"`);
            console.log();
            console.log(`Use the following command to visit that directory:`)
            console.log(chalk.bold(`  cd ${createDir}`));
            console.log();
            return callback(null);

          });

        } else {

          fs.writeFileSync('source.json', JSON.stringify(json.source, null, 2));

          console.log(chalk.bold.green('Success!'));
          console.log();
          console.log(`This service has been converted to source "${chalk.bold(sourceName)}"`);
          console.log();
          return callback(null);

        }

      }
    );

  }

}

module.exports = SourceCommand;
