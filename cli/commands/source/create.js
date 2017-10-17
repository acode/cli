'use strict';

const lib = require('lib');
const Command = require('cmnd').Command;
const APIResource = require('api-res');
const Credentials = require('../../credentials.js');
const fileio = require('../../fileio.js');

const async = require('async');
const inquirer = require('inquirer');
const chalk = require('chalk');

const fs = require('fs');
const path = require('path');

const spawnSync = require('child_process').spawnSync;

const DEFAULT_BUILD = 'faaslang';
const OTHER_BUILDS = ['legacy'];

function deepAssign(o1, o2) {
  Object.keys(o2).forEach(k => {
    if (
      o1[k] && o2[k] &&
      typeof o1[k] === 'object' && typeof o2[k] === 'object'
    ) {
      deepAssign(o1[k], o2[k]);
    } else {
      o1[k] = o2[k];
    }
  });
}

class SourceCreateCommand extends Command {

  constructor() {

    super('source', 'create');

  }

  help() {

    return {
      description: 'Creates a new (local) source code',
      args: [
        'source name'
      ],
      flags: {
        n: 'No login - don\'t require an internet connection',
        w: 'Write over - overwrite the current directory contents',
        s: 'Source - StdLib source code to use',
        d: 'Dev Mode - Specify another HTTP address for the source code (e.g. localhost:8170)',
        b: `Build - Specify build, ${DEFAULT_BUILD} (default) or ${OTHER_BUILDS.map(v => `"${v}"`).join(', ')}`
      },
      vflags: {
        'no-login': 'No login - don\'t require an internet connection',
        'write-over': 'Write over - overwrite the current directory contents',
        'source': 'Source - stdlib source code to use',
        'develop': 'Dev Mode - Specify another HTTP address for the source code (e.g. localhost:8170)',
        'build': `Build - Specify build, ${DEFAULT_BUILD} (default) or ${OTHER_BUILDS.map(v => `"${v}"`).join(', ')}`
      }
    };

  }

  run(params, callback) {

    let name = params.args[0];

    let host = params.flags.h ? params.flags.h[0] : 'https://api.polybit.com';
    let port = params.flags.p && params.flags.p[0];

    let nologin = params.flags.hasOwnProperty('n') || params.vflags.hasOwnProperty('no-login');
    let force = params.flags.hasOwnProperty('f') || params.vflags.hasOwnProperty('force');
    let write = params.flags.hasOwnProperty('w') || params.vflags.hasOwnProperty('write-over');

    let develop = (params.flags.d || params.vflags.develop || [])[0];
    let build = (params.flags.b || params.vflags.build || [])[0] || DEFAULT_BUILD;

    if ([DEFAULT_BUILD].concat(OTHER_BUILDS).indexOf(build) === -1) {
      return callback(new Error(`Invalid build: "${build}"`));
    }

    let extPkgName = (params.flags.s || params.vflags.source || [])[0];
    let extPkg = null;

    if (!force && !Credentials.location(1)) {
      console.log();
      console.log(chalk.bold.red('Oops!'));
      console.log();
      console.log(`You're trying to create source code in development,`);
      console.log(`But you're not in a root stdlib project directory.`);
      console.log(`We recommend against this.`);
      console.log();
      console.log(`Use ${chalk.bold('lib create --force')} to override.`);
      console.log();
      return callback(null);
    }

    console.log();
    console.log(`Awesome! Let's create new ${chalk.bold.green('stdlib')} source code!`);
    extPkgName && console.log(`We'll use the source code ${chalk.bold.green(extPkgName)} to proceed.`);
    console.log();

    let questions = [];

    name || questions.push({
      name: 'name',
      type: 'input',
      default: '',
      message: 'Source Code Name'
    });

    let login = [];
    !nologin && login.push((cb) => {

      let resource = new APIResource(host, port);
      resource.authorize(Credentials.read('ACCESS_TOKEN'));

      resource.request('v1/users').index({me: true}, (err, response) => {

        if (err) {
          return cb(err);
        }

        return cb(null, response.data[0]);

      });

    });

    inquirer.prompt(questions, (promptResult) => {

      name = name || promptResult.name;
      let username;

      if (name.indexOf('/') > -1) {
        username = name.split('/')[0];
        name = name.split('/').slice(1).join('/').replace(/\//g, '-');
      }

      // NOTE: Not offline friendly. Always log in user...
      // login = username ? [] : login;

      async.series(login, (err, results) => {

        if (err) {
          return callback(err);
        }

        let defaultUser = {username: 'dev', email: ''};
        let user = nologin ? defaultUser : results[0];
        user = user || defaultUser;

        username = username || user.username;

        // Do source fetching...
        let extPkgCalls = [];

        if (extPkgName) {

          console.log(`Fetching source code ${chalk.bold.green(extPkgName)}...`);
          console.log();
          let utils = develop ?
            lib({host: develop.split(':')[0], port: develop.split(':')[1]}).utils :
            lib.utils;

          extPkgCalls = [
            cb => {
              utils.sources[develop ? '@local' : '@release'].package({name: extPkgName}, (err, result) => {
                cb(err, result);
              });
            },
            cb => {
              utils.sources[develop ? '@local' : '@release'].files({name: extPkgName}, (err, result) => {
                cb(err, result);
              });
            }
          ];

        }

        async.series(extPkgCalls, (err, results) => {

          if (err) {
            return callback(new Error(`Error retrieving source code: ${extPkgName}`));
          }

          if (results.length === 2) {
            extPkg = {
              pkg: results[0],
              files: results[1]
            };
          }

          !fs.existsSync(username) && fs.mkdirSync(username);
          let sourceName = [username, name].join('/');
          let sourcePath = path.join(process.cwd(), username, name);
          let fPath = path.join(sourcePath, 'functions');
          let functionPath;

          if (fs.existsSync(sourcePath)) {

            if (!write) {

              console.log();
              console.log(chalk.bold.red('Oops!'));
              console.log();
              console.log(`The directory you're creating a stdlib project in already exists:`);
              console.log(`  ${chalk.bold(sourcePath)}`);
              console.log();
              console.log(`Try removing the existing directory first.`);
              console.log();
              console.log(`Use ${chalk.bold('lib create --write-over')} to override.`);
              console.log();
              return callback(null);

            }

          } else {

            fs.mkdirSync(sourcePath);
            fs.mkdirSync(fPath);

          }

          let json = {
            pkg: require(path.join(__dirname, `../../templates/sourceCode/package.json`)),
            source: require(path.join(__dirname, `../../templates/sourceCode/source.json`))
          };

          json.pkg.name = name;
          json.pkg.author = user.username + (user.email ? ` <${user.email}>` : '');
          json.pkg.stdlib.name = [username, name].join('/');
          json.pkg.stdlib.build = build;

          // EXTERNAL: Assign package details
          if (extPkg && extPkg.pkg) {
            let extBuild = extPkg.pkg &&
              extPkg.pkg.stdlib &&
              extPkg.pkg.stdlib.build ||
              DEFAULT_BUILD;
            if (build !== extBuild) {
              return callback(new Error(
                `Can not use this source with this build\n` +
                `Try \`lib create -t ${extPkgName} -b ${extBuild}\` instead`
              ));
            }
            deepAssign(json.pkg, extPkg.pkg);
            deepAssign(json.source, extPkg.source);
            json.pkg.stdlib.source = extPkgName;
          }

          fileio.writeFiles(
            sourceName,
            fileio.readTemplateFiles(
              path.join(__dirname, '../..', 'templates', build)
            )
          );

          fs.writeFileSync(
            path.join(sourcePath, 'package.json'),
            JSON.stringify(json.pkg, null, 2)
          );

          fs.writeFileSync(
            path.join(sourcePath, 'source.json'),
            JSON.stringify(json.source, null, 2)
          );

          let fns = [];
          if (extPkg && extPkg.files && extPkg.files.length) {
            fns.push(cb => {
              fileio.extract(sourceName, extPkg.files, (err) => {
                if (err) {
                  console.error(err);
                  return cb(new Error(`Could not install source code ${extPkgName}`));
                }
                cb();
              });
            });
          }

          async.series(fns, (err) => {

            if (err) {
              return callback(err);
            }

            if (
              (json.pkg.dependencies && Object.keys(json.pkg.dependencies).length) ||
              (json.pkg.devDependencies && Object.keys(json.pkg.devDependencies).length)
            ) {
              console.log(`Installing npm packages...`);
              console.log();
              let command = spawnSync(
                /^win/.test(process.platform) ? 'npm.cmd' : 'npm',
                ['install'],
                {
                  stdio: [0, 1, 2],
                  cwd: sourcePath,
                  env: process.env
                }
              );
              if (command.status !== 0) {
                console.log(command.error);
                console.log(chalk.bold.yellow('Warn: ') + 'Error with npm install');
              }
            }

            console.log(chalk.bold.green('Success!'));
            console.log();
            console.log(`Source code ${chalk.bold([username, name].join('/'))} created at:`);
            console.log(`  ${chalk.bold(sourcePath)}`);
            console.log();
            console.log(`Use the following to enter your Source directory:`);
            console.log(`  ${chalk.bold('cd ' + [username, name].join('/'))}`);
            console.log();
            console.log(`Type ${chalk.bold('lib help')} for more commands.`);
            console.log();
            return callback(null);

          });

        });

      });

    });

  }

}

module.exports = SourceCreateCommand;
