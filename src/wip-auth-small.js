'use strict';

const config = require('./config');
const inquirer = require('inquirer');

inquirer.prompt(config.questions.twofactor, function(answers) {
  config.github.authenticate({
    type: 'basic',
    username: answers.username,
    password: answers.password
  });

  config.github.authorization.create({
    scopes: [
      "repo",
      "public_repo",
    ],
    note: 'get-issues token',
    headers: {
      'User-Agent': 'get-issues',
      'X-GitHub-OTP': answers.code
    }
  }, function auth_cb(err, res) {
    if (err) {
      console.log('\nerr: ', err);
      console.log('\nerr.message: ', JSON.parse(err.message));
      console.log('\nerr.code: ', err.code);
    } else {
      console.log('res: ', res);
    }
  });
});