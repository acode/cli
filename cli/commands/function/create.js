'use strict';

const Command = require('cmnd').Command;

const inquirer = require('inquirer');

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

function generateFunction(name, description, params) {

  params = (params || []).map(p => {
    p = p.split(':');
    return {
      name: p[0],
      type: p[1] || 'any'
    };
  });

  return [
    '/**',
    description ? `* ${description}` : '',
    params.map(param => {
      return `* @param {${param.type}} ${param.name}`
    }).join('\n'),
    `* @returns {any}`,
    `*/`,
    `module.exports = async (${params.map(p => p.name).concat('context').join(', ')}) => {`,
    `  return 'hello world';`,
    `};`,
  ].filter(v => !!v).join('\n') + '\n';

}

class FunctionCreateCommand extends Command {

  constructor() {

    super('function', 'create');

  }

  help() {

    return {
      description: 'Creates a new function for a service, locally',
      args: [
        'name',
        'description',
        'param_1',
        'param_2',
        '...',
        'param_n'
      ],
      flags: {
        'n': 'New directory: Create as a __main__.js file, with the name representing the directory'
      },
      vflags: {
        'new': 'New directory: Create as a __main__.js file, with the name representing the directory'
      }
    };

  }

  run(params, callback) {

    let functionName = params.args[0] || '';
    let functionDescription = params.args[1] || '';
    let functionParams = params.args.slice(2) || [];
    let newDir = !!(params.flags.n || params.vflags['new'] || false);

    if (!fs.existsSync('package.json')) {
      return callback(new Error('Not in valid Standard Librarydirectory'));
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

      if (!functionName.split('/').pop().match(/^[A-Z]/i)) {
        return callback(new Error(`Invalid function name: ${functionName}`));
      }

      let fPath = path.join(process.cwd(), 'functions');
      let functionPath = fPath;

      !fs.existsSync(fPath) && fs.mkdirSync(fPath);

      let directories = functionName.split('/');

      for (let i = 0; i < directories.length - 1; i++) {
        let relpath = path.join.apply(path, [fPath].concat(directories.slice(0, i + 1)));
        !fs.existsSync(relpath) && fs.mkdirSync(relpath);
        functionPath = relpath;
      }

      let name = directories[directories.length - 1];
      let checkPaths = [
        path.join(functionPath, `${name}.js`),
        path.join(functionPath, `${name}`, `__main__.js`)
      ];

      for (let i = 0; i < checkPaths.length; i++) {
        let pathname = checkPaths[i];
        if (fs.existsSync(pathname)) {
          console.log();
          console.log(chalk.bold.red('Oops!'));
          console.log();
          console.log(`The function you're trying to create already seems to exist:`);
          console.log(`  ${chalk.bold(pathname)}`);
          console.log();
          console.log(`Try removing the existing file first.`);
          console.log();
          return callback(new Error('Could not create function'));
        }
      }

      if (!newDir) {
        functionPath = checkPaths[0];
      } else {
        let pathname = path.join(functionPath, name);
        !fs.existsSync(pathname) && fs.mkdirSync(pathname);
        functionPath = checkPaths[1];
      }

      fs.writeFileSync(functionPath, generateFunction(functionName, functionDescription, functionParams));

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

module.exports = FunctionCreateCommand;
