#!/usr/bin/env node

'use strict';

let cmd = process.argv[1];

if (cmd[cmd.length - 1] === 'f') {
  let name = 'username.service';
  if (process.argv[2]) {
    name = process.argv[2];
    if (name.indexOf('/') > -1) {
      name = name.replace(/\@(.*?)(\/|$)/gi, '[@$1]$2').split('/').join('.');
      if (name.substr(0, 2) === '..') {
        name = name.substr(1);
      }
    } else if (name !== '.') {
      name = 'username.service';
    }
  }
  let args = process.argv.slice(3).join(' ');
  console.log(`\nThe \`f\` command has been deprecated, use the following instead:\n\n\t\lib ${name} ${args}\n`);
  process.exit(1);
}

const CLI = require('./cli.js');
CLI.run(process.argv.slice(2));
