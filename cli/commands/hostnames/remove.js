'use strict';

const Command = require('cmnd').Command;
const APIResource = require('api-res');
const chalk = require('chalk');
const inquirer = require('inquirer');

const config = require('../../config.js');
const ListCommand = require('./list.js');
const tabler = require('../../tabler.js');

class HostnamesRemoveCommand extends Command {

  constructor() {

    super('hostnames', 'remove');

  }

  help() {

    return {
      description: 'Removes a hostname route from a source custom hostname to a target service you own'
    };

  }

  run(params, callback) {

    let host = 'api.autocode.com';
    let port = 443;

    let listCommandFlags = {
      h: params.flags.h,
      p: params.flags.p
    };

    let hostname = (params.flags.h && params.flags.h[0]) || '';
    let matches = hostname.match(/^(https?:\/\/)?(.*?)(:\d+)?$/);

    if (hostname && matches) {
      host = matches[2];
      port = parseInt((matches[3] || '').substr(1) || (hostname.indexOf('https') === 0 ? 443 : 80));
    }

    ListCommand.prototype.run.call(this, {flags: listCommandFlags, vflags: {json: true}}, async (err, results) => {

      if (err) {
        return callback(err);
      }

      let ids = results.map(host => host.id);
      let answers = await inquirer.prompt(
        [
          {
            name: 'route',
            type: 'list',
            pageSize: 100,
            message: `Select a route to ${chalk.bold.red('Destroy (Permanently)')}`,
            choices: tabler(
              ['?', 'Hostname', 'Target', 'Created At'],
              results.map((hostnameRoute, index) => {
                return {
                  '?': ['✖', chalk.bold.red],
                  Hostname: hostnameRoute.formatted_hostname,
                  Target: hostnameRoute.target,
                  'Created At': hostnameRoute.created_at,
                  value: ids[index]
                };
              }),
              true,
              true
            )
              .map(row => (row.value === null ? new inquirer.Separator(row.name) : row))
              .concat({
                name: '○ ' + chalk.grey('(cancel)'),
                value: 0
              })
          },
          {
            name: 'verify',
            type: 'confirm',
            message: answers => {
              return (
                `Are you sure you want to ${chalk.bold.red('permanently destroy')} ` +
                `the route from "${chalk.bold(answers.route.Hostname)}"?`
              );
            },
            when: answers => !!answers.route
          }
        ]
      );

      if (!answers.verify || answers.route === 0) {
        return callback(null);
      }

      let resource = new APIResource(host, port);
      resource.authorize(config.get('ACCESS_TOKEN'));
      resource.request('/v1/hostname_routes').destroy(answers.route.value, {}, (err, response) => {
        if (err) {
          return callback(err);
        }
        console.log();
        console.log('Route successfully deleted');
        console.log();
        return callback(null);
      });

    });

  }

}

module.exports = HostnamesRemoveCommand;
