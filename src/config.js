'use strict';

var fs = require('fs');
var path = require('path');
var GitHubApi = require('github');

var github = new GitHubApi({
  version: '3.0.0',
  debug: false,
  protocol: 'https',
  host: 'api.github.com',
  timeout: 5000,
  headers: {
    'user-agent': 'get-issues'
  }
});

function addGitIgnore() {
  fs.appendFile('.gitignore', 'issues/', function(err) {
    if (err) { throw err; }
  });
};

module.exports = {
  genReqObj: function(uri, baseUrl, method) {
    return {
      uri: uri || '',
      baseUrl: baseUrl || 'https://api.github.com',
      method: method || 'GET',
      headers: {
        'User-Agent': 'get-issues'
      }
    };
  },
  checkGitIgnore: function() {

    // INFO: check if .gitignore exists
    fs.stat('.gitignore', function(err) {
      if (err) {

        // INFO: doesn't exist, create it
        addGitIgnore();
      } else {

        // INFO: .gitignore exists
        // INFO: check if contains 'issues/'
        fs.readFile('.gitignore', 'utf8', function(err, data) {
          if (data.indexOf('issues/') === 0) {

            // INFO: .gitignore contains 'issues/'
          } else {

            // INFO: .gitignore does not contain 'issues/'
            addGitIgnore();
          }
        });
      }
    });
  },
  github: github,
  curRepoInfo: {
    username: '',
    repo: ''
  }
};