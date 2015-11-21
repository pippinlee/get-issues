'use strict'

var program = require('commander')

require('colors')

module.exports = program
  .version(require('../package.json').version)
  .option('run get-issues in any directory to download all github issues'.yellow, '')
  .parse(process.argv)
