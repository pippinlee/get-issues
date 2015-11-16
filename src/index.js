#!/usr/bin/env node
'use strict';
var async = require('async');
var Repo = require('git-tools');
var request = require('request');
var fs = require('fs');
var figlet = require('figlet');
var colors = require('colors');
var options = require('./options');

// set options for github api requests
var options = {
  headers: {
    'User-Agent': 'request'
  }
};

var callURL = function (url, cb){
  var options = {
    url: url,
    headers: {
      'User-Agent': 'request'
    }
  };

  function callback(error, response, body) {
    if (!error && response.statusCode == 200) {
      var info = JSON.parse(body);
      cb(null, info);
    }
  }
  request(options, callback);
};

async.waterfall([

  // check if gh-folder needs to be created
  function init(cb) {
    if ( !fs.existsSync('./issues') ) {
      fs.mkdirSync('./issues');
      // add /issues to .gitignore
      fs.appendFile('./.gitignore', '/issues', function (err) {
        if (err) throw err;
      });
    }

    cb(null, 'gh-folder already exists');
  },

  // get remote github url for use with api
  function getGithubURL(init, cb) {
    var repo = new Repo( "./" );
    repo.remotes(function( error, remotes) {
      if (error) {
        cb(error, null);
      }
      var url = remotes[0].url;
      cb(null, url);
    });
  },

  function makeApiUrl(url, cb) {
    var splitURL = url.split('/');
    var finalURL = 'https://api.github.com/repos/' + splitURL[splitURL.length - 2] + '/' + splitURL[splitURL.length - 1].split('.')[0] + '/issues';
    cb(null, finalURL);
  },

  // make request to remote repo's issue page
  function getIssues(finalURL, cb) {
    options.url = finalURL;
    function callback(error, response, body) {
      if(error) {
        cb(error, null);
      }
      if(!error && response.statusCode === 200) {
        var info = JSON.parse(body);
        var filterOutPR = [];
        info.forEach(function(issue) {
          if (!issue.pull_request) {
            filterOutPR.push(issue);
          }
        });
        cb(null, filterOutPR);
      }
    }

    request(options, callback);

  },

  // create a file for each issue in /issues
  function createIssueFiles(filterOutPR, cb) {
    var commentsURL = [];
    filterOutPR.forEach(function(issue) {
      var issueFilename = 'issues/' + issue.number + ':' + issue.title + '.md';
      var issueTitle = issue.title;
      var issueUsername = '\nIssue filed by: ' + issue.user.login;
      var issueDate = '\n' + Date(issue.created_at);
      var issueContent = '\n\n' + issue.body;
      var originPostBreak = '\n-------------------------------------------------------------------------------';

      var finalIssue = issueTitle + issueUsername + issueDate + issueContent + originPostBreak;

      console.log('⭐️  #' + issue.number + ': ' + issueTitle.cyan);


      fs.writeFile(issueFilename, finalIssue, function(error) {
        if(error) {
          cb(error, null);
        }
      });
      // make sure only get issues that have comments
      // or else request to comments_url will be empty
      if(issue.comments > 0) {
        commentsURL.push(issue.comments_url);
      }

    });
    cb(null, commentsURL);
  },

  // create a new array of responses from each comment url
  // if a issue has a comment value > 0 it will get requested
  function getIssueComments(commentsURL, cb) {
    // take array of comment urls and get content
    // callURL at the top of this file does all the
    // request work for each URL
    async.map(commentsURL, callURL, function(error, results){
        if (error) {
          cb(error, null);
        }
        cb(null, results);
    });
  },

  // create obj to match issue comments and existing file
  function setupIssueComments(results, cb) {

    // list of files in /issues
    var paths = {};
    fs.readdir('./issues/', function(error, files) {
      if(error) {
        throw error;
      }

      // for each url with comments this create a property
      // on the paths object so that we're able to easy
      // find which file comments should go
      files.forEach(function(file) {
        paths[ file.split(':')[0] ]  = './issues/' + file;
      });

      cb(null, paths, results);
    });

  },

  // where we actually write the comments to their correct
  // issue file in /issues directory
  function writeIssueComments(paths, results, cb) {
    results.forEach(function(comment) {
      comment.forEach(function(individualComment) {

        var writeToFile = paths[ individualComment.issue_url.split('/')[7] ];
        var commentUsername = '\n' + individualComment.user.login;
        var commentDate = '\n' + Date(individualComment.created_at);
        var commentContent = '\n\n' + individualComment.body + '\n\n';
        var originPostBreak = '-------------------------------------------------------------------------------';

        var commentFinal = commentUsername + commentDate + commentContent + originPostBreak;

        // append all comments to file
        fs.appendFile(writeToFile, commentFinal, function(error) {
          if(error) {
            cb(error, null);
          }
        });

      });
    });

    cb(null, 'done writing comments'.red);
  }

  ],
  function (err, result) {
    if (err) {
      console.error(err);
      return;
    }
    figlet.text('got issues!', {
        horizontalLayout: 'default',
        verticalLayout: 'default'
    }, function(err, data) {
        if (err) {
            console.log('Something went wrong...');
            console.dir(err);
            return;
        }
        console.log(data);
        console.log('\n    check your new issues/ directory'.green);
        console.log('   (/issues was added to .gitignore)\n');
    });
  }
);