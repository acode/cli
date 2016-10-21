'use strict';

const Command = require('cmnd').Command;
const Credentials = require('../../credentials.js');

const inquirer = require('inquirer');

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class FCreateCommand extends Command {

  constructor() {

    super('f', 'create');

  }

  help() {

    return {
      description: 'Creates a new function for a (local) service'
    };

  }

  run(params, callback) {

    let functionName = params.args[0];

    let write = params.flags.hasOwnProperty('w') || params.vflags.hasOwnProperty('write-over');

    if (!fs.existsSync('package.json') || !Credentials.location()) {
      console.log();
      console.log(chalk.bold.red('Oops!'));
      console.log();
      console.log(`You're trying to create a new function in development,`);
      console.log(`But you're either not in a stdlib workspace,`);
      console.log(`  or not in a service directory with a "package.json"`);
      console.log();
      return callback(null);
    }

    let questions = [];

    functionName || questions.push({
      name: 'functionName',
      type: 'input',
      default: '',
      message: 'Function Name'
    });

    inquirer.prompt(questions, (promptResult) => {

      functionName = functionName || promptResult.functionName;

      let fPath = path.join(process.cwd(), 'f');
      let functionPath;

      !fs.existsSync(fPath) && fs.mkdirSync(fPath);

      let directories = functionName.split('/');

      for (let i = 0; i < directories.length; i++) {
        let relpath = path.join.apply(path, [fPath].concat(directories.slice(0, i + 1)));
        if (i === directories.length - 1 && fs.existsSync(relpath)) {
          if (!write) {
            console.log();
            console.log(chalk.bold.red('Oops!'));
            console.log();
            console.log(`The function you're trying to create already seems to exist:`);
            console.log(`  ${chalk.bold(pathname)}`);
            console.log();
            console.log(`Try removing the existing directory first.`);
            console.log();
            console.log(`Use ${chalk.bold('stdlib f:create ' + functionName + ' --write-over')} to override.`);
            console.log();
            return callback(null);
          }
        }
        !fs.existsSync(relpath) && fs.mkdirSync(relpath);
        functionPath = relpath;
      }

      let json = {
        func: require(path.join(__dirname, '../../templates/f/function.json'))
      };

      json.func.name = functionName;

      fs.writeFileSync(
        path.join(functionPath, 'function.json'),
        JSON.stringify(json.func, null, 2)
      );

      let files = {
        func: {
          copy: {
            'index.js': fs.readFileSync(path.join(__dirname, '../../templates/f/index.js')),
          }
        }
      };

      Object.keys(files.func.copy).forEach(filename => {
        fs.writeFileSync(path.join(functionPath, filename), files.func.copy[filename])
      });

      console.log();
      console.log(chalk.bold.green('Success!'));
      console.log();
      console.log(`Function ${chalk.bold(functionName)} created at:`);
      console.log(`  ${chalk.bold(functionPath)}`);
      console.log();
      return callback(null);

    });

  }

}

module.exports = FCreateCommand;
