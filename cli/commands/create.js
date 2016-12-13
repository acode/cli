'use strict';

const Command = require('cmnd').Command;
const APIResource = require('api-res');
const Credentials = require('../credentials.js');

const async = require('async');
const inquirer = require('inquirer');
const f = require('f');

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const spawnSync = require('child_process').spawnSync;

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

class CreateCommand extends Command {

  constructor() {

    super('create');

  }

  help() {

    return {
      description: 'Creates a new (local) service',
      args: [
        'service'
      ],
      flags: {
        n: 'No login - don\'t require an internet connection',
        w: 'Write over - overwrite the current directory contents',
        t: 'Template - a stdlib service template to use'
      },
      vflags: {
        'no-login': 'No login - don\'t require an internet connection',
        'write-over': 'Write over - overwrite the current directory contents',
        'template': 'Template - a stdlib service template to use'
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

    let extPkgName = (params.flags.t || params.vflags.template || [])[0];
    let extPkg = null;

    if (!force && !Credentials.location(1)) {
      console.log();
      console.log(chalk.bold.red('Oops!'));
      console.log();
      console.log(`You're trying to create a new service in development,`);
      console.log(`But you're not in a root stdlib project directory.`);
      console.log(`We recommend against this.`);
      console.log();
      console.log(`Use ${chalk.bold('lib create --force')} to override.`);
      console.log();
      return callback(null);
    }

    let questions = [];

    name || questions.push({
      name: 'name',
      type: 'input',
      default: '',
      message: 'Service Name'
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
      let functionName = 'main'; // set default function name
      let username;

      if (name.indexOf('/') > -1) {
        username = name.split('/')[0];
        name = name.split('/').slice(1).join('/').replace(/\//g, '-');
      }

      login = username ? [] : login;

      async.series(login, (err, results) => {

        if (err) {
          return callback(err);
        }

        let user = nologin ? {username: 'dev', email: ''} : results[0];

        username = username || user.username;

        // Do template fetching...
        let extPkgCalls = [];

        if (extPkgName) {

          console.log(`\nFetching template ${chalk.bold.green(extPkgName)}...`);

          extPkgCalls = [
            cb => f(`stdlib/templates@dev/package?name=${extPkgName}`)(cb),
            cb => f(`stdlib/templates@dev/files?name=${extPkgName}`)(cb)
          ];

        }

        async.series(extPkgCalls, (err, results) => {

          if (err) {
            return callback(new Error(`Error retrieving template: ${extPkgName}`));
          }

          if (results.length === 2) {
            extPkg = {
              pkg: results[0],
              files: results[1]
            };
          }

          !fs.existsSync(username) && fs.mkdirSync(username);
          let servicePath = path.join(process.cwd(), username, name);
          let fPath = path.join(servicePath, 'f');
          let functionPath;

          if (fs.existsSync(servicePath)) {

            if (!write) {

              console.log();
              console.log(chalk.bold.red('Oops!'));
              console.log();
              console.log(`The directory you're creating a stdlib project in already exists:`);
              console.log(`  ${chalk.bold(servicePath)}`);
              console.log();
              console.log(`Try removing the existing directory first.`);
              console.log();
              console.log(`Use ${chalk.bold('lib create --write-over')} to override.`);
              console.log();
              return callback(null);

            }

          } else {

            fs.mkdirSync(servicePath);
            fs.mkdirSync(fPath);

          }

          let directories = functionName.split('/');
          for (let i = 0; i < directories.length; i++) {
            let relpath = path.join.apply(path, [fPath].concat(directories.slice(0, i + 1)));
            !fs.existsSync(relpath) && fs.mkdirSync(relpath);
            functionPath = relpath;
          }

          let json = {
            pkg: require(path.join(__dirname, '../templates/package.json')),
            func: require(path.join(__dirname, '../templates/f/function.json'))
          };

          json.pkg.name = name;
          json.pkg.author = user.username + (user.email ? ` <${user.email}>` : '');
          json.pkg.main = ['f', functionName, 'index.js'].join('/');
          json.pkg.stdlib.name = [username, name].join('/');
          json.pkg.stdlib.defaultFunction = functionName;

          // EXTERNAL: Assign package details
          if (extPkg && extPkg.pkg) {
            deepAssign(json.pkg, extPkg.pkg);
          }

          fs.writeFileSync(
            path.join(servicePath, 'package.json'),
            JSON.stringify(json.pkg, null, 2)
          );

          json.func.name = functionName;

          fs.writeFileSync(
            path.join(functionPath, 'function.json'),
            JSON.stringify(json.func, null, 2)
          );

          let files = {
            base: {
              copy: {
                '.gitignore': fs.readFileSync(path.join(__dirname, '../templates/gitignore')),
                'env.json': fs.readFileSync(path.join(__dirname, '../templates/env.json'))
              },
              template: {
                'README.md': fs.readFileSync(path.join(__dirname, '../templates/README.md')).toString()
              }
            },
            func: {
              copy: {
                'index.js': fs.readFileSync(path.join(__dirname, '../templates/f/index.js')),
              }
            }
          };

          let templateData = {
            username: username,
            service: name,
            func: functionName
          };

          Object.keys(files.base.copy).forEach(filename => {
            fs.writeFileSync(path.join(servicePath, filename), files.base.copy[filename])
          });

          Object.keys(files.base.template).forEach(filename => {
            let template = files.base.template[filename];
            Object.keys(templateData).forEach(k => {
              template = template.replace(new RegExp(`\{\{${k}\}\}`, 'gi'), templateData[k]);
            });
            fs.writeFileSync(path.join(servicePath, filename), template);
          });

          Object.keys(files.func.copy).forEach(filename => {
            fs.writeFileSync(path.join(functionPath, filename), files.func.copy[filename])
          });

          // EXTERNAL: Unzip tar
          if (extPkg && extPkg.files && extPkg.files.length) {
            let tmpPath = `/tmp/stdlib-addon.tgz`;
            fs.existsSync(tmpPath) && fs.unlinkSync(tmpPath);
            fs.writeFileSync(tmpPath, extPkg.files);
            let command = spawnSync('tar', `-xzf ${tmpPath} -C ${servicePath}`.split(' '), {stdio: [0, 1, 2]});
            if (command.status !== 0) {
              console.log(chalk.bold.yellow('Warn: ') + 'Error extracting addon package files');
            }
            fs.unlinkSync(tmpPath);
          }

          console.log();
          console.log(chalk.bold.green('Success!'));
          console.log();
          console.log(`Service ${chalk.bold([username, name].join('/'))} created at:`);
          console.log(`  ${chalk.bold(servicePath)}`);
          console.log();
          return callback(null);

        });

      });

    });

  }

}

module.exports = CreateCommand;
