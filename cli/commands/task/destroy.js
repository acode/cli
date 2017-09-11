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
      description: 'Stop a StdLib scheduled task'
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

      let header = results[0][0];
      let ids = results[1];
      let tasks = results[0].slice(1);

      let questions = [{
        name: 'task',
        message: header,
        type: 'list',
        choices: tasks
      }];

      inquirer.prompt(questions, (answers) => {
        
        let id = ids[tasks.indexOf(answers.task)];

        let resource = new APIResource(host, port);

        resource.authorize(Credentials.read('ACCESS_TOKEN'));
        resource.request('/v1/scheduled_tasks').destroy(id, {}, (err, response) => {
          
          if (err) {
            return callback(err);
          }
        
          console.log();
          console.log('Task successfully deleted')
          return callback(null);

        });

      });

    });

  }

}

module.exports = TaskDestroy;
