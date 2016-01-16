'use strict';

var os = require('os');
var fs = require('fs');
var path = require('path');
var GitHubApi = require('github');

// INFO: Instanciate the GitHub Api module
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

var config = {
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
          if (data.indexOf('issues/') >= 0) {

            // INFO: .gitignore contains 'issues/'
          } else {

            // INFO: .gitignore does not contain 'issues/'
            addGitIgnore();
          }
        });
      }
    });
  },
  tokenDir: function() {
    return path.join(os.homedir(), '.config', 'get-issues');
  },
  tokenFile: function() {
    return path.join(this.tokenDir, 'oauth-token.json');
  },
  github: github,
  questions: {
    auth: [
      {
        type: 'input',
        name: 'username',
        message: 'GitHub Username'
      },
      {
        type: 'password',
        name: 'password',
        message: 'GitHub Password'
      }
    ]
  },
  curRepoInfo: {
    remoteUrl: '',
    username: '',
    repo: ''
  }
};

module.exports = config;