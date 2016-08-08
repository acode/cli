#!/usr/bin/env node

'use strict';

const CLI = require('./cli.js');
CLI.run(['f'].concat(process.argv.slice(2)));
