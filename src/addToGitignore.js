'use strict'

var fs = require('fs')

// add "issues/" to .gitignore
(function () {
  if (!fs.existsSync('.gitignore')) {
    fs.writeFile('.gitignore', 'issues/', function (err) {
      if (err) throw err
    })
  } else {
    fs.readFile('.gitignore', function (err, data) {
      if (err) throw err

      var readLines = data.toString().split('\n')

      if (readLines.indexOf('issues/') < 0) {
        fs.appendFile('.gitignore', '\nissues/', function (err) {
          if (err) throw err
        })
      }
    })
  }
}())
