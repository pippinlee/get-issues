#! /usr/bin/env node
'use strict';

var request = require('request');
var Repo = require( 'git-tools');

var options = {
  url: 'https://api.github.com/repos/k88hudson/react-formation/issues',
  headers: {
    'User-Agent': 'request'
  }
};

function callback(error, response, body) {
  if (!error && response.statusCode == 200) {
    var info = JSON.parse(body);
    info.forEach(function(issue) {
      // check if actually pull request
      if (!issue.pull_request) {
        // console.log('submitted by: ' + issue.user.login);
        // console.log('problem: ' + issue.title);
        // console.log(issue.body);
        // console.log('------------------------------');
      }
    });
  }
}

request(options, callback);

// find url of current repo

var repo = new Repo('./');
repo.remotes(function( error, remotes ) {
    var url = remotes[0].url;
    var splitURL = url.split('/');
    // final is user and repo name
    var final = 'https://api.github.com/repos/' + splitURL[splitURL.length - 2] + '/' + splitURL[splitURL.length - 1].split('.')[0] + '/issues';
    console.log(final);
});


/*
var request = require('request');

var options = {
  url: 'repos/k88hudson/react-formation/issues',
  headers: {
    'User-Agent': 'request'
  }
};

function callback(error, response, body) {
  if (!error && response.statusCode == 200) {
    var info = JSON.parse(body);
    // returns array of all open issues and PRs
    info.forEach(function(issue) {
      console.log('submitted by: ' + issue.user.login);
      console.log('problem: ' + issue.title);
      console.log('------------------------------');
    });
  }
}

request(options, callback);
*/