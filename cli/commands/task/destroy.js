"use strict";

const Command = require('cmnd').Command;
const APIResource = require('api-res');
const Credentials = require('../../credentials.js');
const ListCommand = require('./list.js');

const inquirer = require('inquirer');

class TaskDestroy extends Command {

  constructor() {
    super('task', 'destroy');
  }

  help() {
    return {
      description: 'Stops a StdLib scheduled task'
    };
  }

  run(params, callback) {

    const host = 'api.polybit.com';
    const port = 443;

    params.destroy = true;

    ListCommand.prototype.run.call(this, params, (err, results) => {

      if (err) {
        return callback(err);
      }

      console.log();

      inquirer.prompt(results[0], (answers) => {

        let resource = new APIResource(host, port);

        resource.authorize(Credentials.read('ACCESS_TOKEN'));
        resource.request('/v1/scheduled_tasks').destroy(answers.task, {}, (err, response) => {

          if (err) {
            return callback(err);
          }

          console.log();
          console.log('Task successfully deleted')
          console.log();
          return callback(null);

        });

      });

    });

  }

}

module.exports = TaskDestroy;
