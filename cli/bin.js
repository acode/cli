#!/usr/bin/env node

'use strict';

let cmd = process.argv[1];

const CLI = require('./cli.js');
CLI.run(process.argv.slice(2));
