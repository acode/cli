'use strict';

const Command = require('cmnd').Command;
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');

class SourceAdd extends Command {

  constructor() {

    super('source', 'add');

  }

  help() {

    return {
      description: 'Converts a StdLib service into a source code'
    };

  }

  run(params, callback) {

    let pkgJSON;

    try {
      pkgJSON = require(path.join(process.cwd(), 'package.json'));
    } catch(e) {
      return callback(new Error('Invalid package.json'));
    }

    let sourceTemplate = require(path.join(__dirname,`../../templates/sourceCode/source.json`));
    let sourcePath = path.join(process.cwd(), 'source.json');

    if (fs.existsSync(sourcePath)) {
      return callback(new Error('source.json already exists'));
    }

    let envJSON;

    try {
      envJSON = require(path.join(process.cwd(), 'env.json'));
    } catch(e) {
      return callback(new Error('Invalid env.json'));
    }

    sourceTemplate.environmentVariables = {};

    // prioritize release, then dev, then local
    let envVars = envJSON.release || envJSON.dev || envJSON.local;
    Object.keys(envVars).map((field) => {
        sourceTemplate.environmentVariables[field] = { default: '', description: '' }
    });

    fs.writeFileSync(
      sourcePath,
      JSON.stringify(sourceTemplate, null, 2)
    );

    console.log();
    console.log(chalk.bold.green('Success!'));
    console.log();
    console.log(`source.json created at:`);
    console.log(`  ${chalk.bold(sourcePath)}`);
    console.log();

    return callback(null);
  }

}

module.exports = SourceAdd;
