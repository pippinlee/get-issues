'use strict'

var program = require('commander')
var chalk = require('chalk')

module.exports = program
  .version(require('../package.json').version)
  .option(chalk.yellow('run get-issues in any directory to download all github issues'), '')
  .parse(process.argv)
