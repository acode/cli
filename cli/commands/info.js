'use strict';

const Command = require('cmnd').Command;
const APIResource = require('api-res');

const chalk = require('chalk');

const config = require('../config.js');

let formatDigits = (num, figs) => {

    num = (parseInt(Math.max(num, 0)) || 0).toString();
    let zeroes = Math.max(figs - num.length, 0);
    return `${Array(zeroes + 1).join('0')}${num}`;

  };

let formatDate = function(str) {

  let date = new Date(str);
  let months = 'January February March April May June July August September October November December'.split(' ');
  let ends = ['th', 'st', 'nd', 'rd', 'th'];

  let y = chalk.bold(date.getFullYear());
  let m = chalk.bold(months[date.getMonth()]);
  let d = chalk.bold(date.getDate());
  let e = chalk.bold(ends[d] || 'th');
  let hh = chalk.bold(formatDigits(date.getHours(), 2));
  let mm = chalk.bold(formatDigits(date.getMinutes(), 2));
  let ss = chalk.bold(formatDigits(date.getSeconds(), 2));
  let ms = chalk.bold(formatDigits(date.valueOf() % 1000, 3));

  return `${m} ${d}${e}, ${y} at ${hh}:${mm}:${ss}.${ms}`;

};

class InfoCommand extends Command {

  constructor() {

    super('info');

  }

  help() {

    return {
      description: 'Retrieves information about a user or package',
      args: [
        'username | full service name'
      ]
    };

  }

  run(params, callback) {

    let service = params.args[0] || '';

    let host = 'registry.stdlib.com';
    let port = 443;

    let hostname = (params.flags.h && params.flags.h[0]) || '';
    let matches = hostname.match(/^(https?:\/\/)?(.*?)(:\d+)?$/);

    if (hostname && matches) {
      host = matches[2];
      port = parseInt((matches[3] || '').substr(1) || (hostname.indexOf('https') === 0 ? 443 : 80));
    }

    let info = params.args[0];

    let resource = new APIResource(host, port);
    resource.authorize(config.get('ACCESS_TOKEN'));

    return resource.request(service).index({}, (err, response) => {

      if (err) {
        return callback(err);
      }

      if (response instanceof Array) {
        // list of packages
        let list = response;

        console.log();
        console.log(`User ${chalk.bold(service)} has ${chalk.bold(list.length)} service packages.`);
        console.log();

        list.forEach(pkg => {

          console.log(`Package: ${chalk.bold(pkg.identifier)} ` + (pkg.publish ? chalk.green('(Published)') : chalk.red('(Unpublished)')));
          console.log(`Service: ${chalk.bold(pkg.url)}`);
          console.log(`This package was created on ${formatDate(pkg.created)}.`);
          console.log();

        });

      } else {
        // specific package
        let pkg = response;

        console.log();
        console.log(`Package: ${chalk.bold(pkg.identifier)} ` + (pkg.publish ? chalk.green('(Published)') : chalk.red('(Unpublished)')));
        console.log(`Service: ${chalk.bold(pkg.url)}`);
        console.log(`This package was created on ${formatDate(pkg.created)}.`);
        console.log(`This package has ${chalk.bold(pkg.functionCount)} functions.`);
        console.log();

        Object.keys(pkg.functions).forEach((name) => {
          let fn = pkg.functions[name];
          console.log([
            `  ${chalk.bold([pkg.identifier, fn.name].join('/'))}`,
            `    ${fn.description}`,
            ``,
            (fn.args || []).map((arg, i) => `      [${i}] ${arg}`).join('\n'),
            Object.keys(fn.kwargs || {}).map(k => `      {${k}} ${fn.kwargs[k]}`).join('\n'),
            ``
          ].join('\n'));
        });

      }

      return callback(null);

    });

  }

}

module.exports = InfoCommand;
