#!/usr/bin/env node

'use strict'

var async = require('async')
var Repo = require('git-tools')
var request = require('request')
var fs = require('fs-extra')
var figlet = require('figlet')
var slug = require('slug')
var util = require('util')
var url = require('url')
var sshURL = require('ssh-url')
var options = require('./options')
var inquirer = require('inquirer')
var github = new (require('github'))({version: '3.0.0'})
var os = require('os')
var path = require('path')

// attempt at a platform agnostic place to store auth tokens
var configDir = path.resolve(os.homedir(), '.config' , 'get-issues')
var configFile = path.resolve(configDir, 'setup.json')

require('./addToGitignore.js')
require('colors')

// set options for github api requests
var options = {
  headers: {
    'User-Agent': 'request'
  }
}

var callURL = function (url, cb) {
  var options = {
    url: url,
    headers: {
      'User-Agent': 'request'
    }
  }

  function callback (error, response, body) {
    if (!error && response.statusCode === 200) {
      var info = JSON.parse(body)
      cb(null, info)
    }
  }
  request(options, callback)
}


async.waterfall([

  // check if /issues folder needs to be created
  function init (cb) {
    if (!fs.existsSync('./issues')) {
      fs.mkdirSync('./issues')
    }

    cb(null, 'gh-folder already exists')
  },

  // get remote github url for use with api
  function getGithubURL (init, cb) {
    var repo = new Repo(__dirname)
    repo.remotes(function ( error, remotes) {
      if (error) {
        cb(error, null)
      }
      var remoteURL = remotes[0].url
      cb(null, remoteURL)
    })
  },

  function makeApiUrl (remoteURL, cb) {
    var parsedURL = url.parse(remoteURL)
    var currentRepoInfo = {}

    // handle ssh remote URL
    if (!parsedURL.protocol) {
      parsedURL = sshURL.parse(remoteURL)
      var finalURL = url.format({
        protocol: 'https',
        host: util.format('api.%s', parsedURL.hostname),
        pathname: `repos${parsedURL.pathname.split('.')[0]}/issues`
      })
      currentRepoInfo.username = parsedURL.pathname.split('/')[1]
      currentRepoInfo.repo = path.basename(remoteURL, '.git')
    } else {
      // handle https remote URL
      var splitURL = parsedURL.pathname.split('/')
      var finalURL = url.format({
        protocol: parsedURL.protocol,
        host: util.format('api.%s', parsedURL.host),
        pathname: `/repos/${splitURL[1]}/${splitURL[2].split('.')[0]}/issues`
      })
      currentRepoInfo.username = parsedURL.pathname.split('/')[1]
      currentRepoInfo.repo = path.basename(remoteURL, '.git')
    }

    cb(null, finalURL, currentRepoInfo)
  },

  // make request to remote repo's issue page
  function getIssues (finalURL, currentRepoInfo, cb) {

    options.url = finalURL
    function callback (error, response, body) {
      if (error) {
        cb(error, null)
      }
      if (!error && response.statusCode !== 200 ) {
        cb(error, 'invalid repo', currentRepoInfo)
      }
      if (!error && response.statusCode === 200) {
        var info = JSON.parse(body)
        var filterOutPR = []
        info.forEach(function (issue) {
          if (!issue.pull_request) {
            filterOutPR.push(issue)
          }
        })
        cb(null, filterOutPR, currentRepoInfo)
      }
    }

    request(options, callback)
  },

  // if repo is private, checks for github auth token
  function checkIfPrivateRepo (filterOutPR, currentRepoInfo, cb) {

    if (filterOutPR === 'invalid repo') {
      // let's check if this token already exits
      fs.readJSON(configFile, function(err, obj) {
          if (err) {
            var tokenCheck = true
            // no token found
            cb(null, filterOutPR, tokenCheck, currentRepoInfo)
          } else {
            var tokenCheck = obj.token
            // found token that exits already
            cb(null, filterOutPR, tokenCheck, currentRepoInfo)
          }
        })
    } else if (filterOutPR) {
      var tokenCheck = false
      cb(null, filterOutPR, tokenCheck, currentRepoInfo)
    }
  },

  // if token is need and doesn't exists create it
  function getTokenIfNeeded(filterOutPR, tokenCheck, currentRepoInfo, cb) {
    var tokenFinal

    // if tokenCheck is true, need to get token prompts user
    if (tokenCheck === true){
      // it's a private repo
      var questions = [
        {
          type: "input",
          name: "token",
          message: "https://github.com/settings/tokens/new?scopes=repo&description=get%20issues%20CLI".red.underline +  "\n\n  This token will be stored locally for future use. \n  Use above link to create a github access token and paste it here: "
        }
      ]
      // get user to past github activity token with "repo" privileges
      inquirer.prompt( questions, function( answers ) {
        var tokenFinal = answers.token
        fs.outputJSON(configFile, {token: tokenFinal}, function(err){
          if (err) throw err
          cb(null, tokenFinal, filterOutPR, currentRepoInfo)
        })
      })
    } else if (!tokenCheck) {
      // not private repo, no auth needed
      tokenFinal = 'public'
      cb(null, tokenFinal, filterOutPR, currentRepoInfo)
    } else {
      // token already exists, just read it
      tokenFinal = tokenCheck
      cb(null, tokenFinal, filterOutPR, currentRepoInfo)
    }

  },

  function githubAuthIfNeed(tokenFinal, filterOutPR, currentRepoInfo, cb) {

    // skip github auth if public repo
    if (tokenFinal === 'public') {
      cb(null, filterOutPR)
    } else if (tokenFinal) {

      github.authenticate({
          type: "oauth",
          token: tokenFinal
      })
      github.issues.repoIssues({
          user: currentRepoInfo.username,
          repo: currentRepoInfo.repo,
          state: 'open',
          per_page: 100
      }, function(err, res) {
          if (err) {
            // bad credentials
            fs.remove(configFile, function(err){if (err) throw err})
          } else {
            // good credentials
            var filterOutPR = []

            res.forEach(function (issue) {
              if (!issue.pull_request) {
                filterOutPR.push(issue)
              }
            })
            cb(null, filterOutPR)
          }
      })
    }
  },

  // create a file for each issue in /issues
  function createIssueFiles (filterOutPR, cb) {

    var commentsURL = []
    filterOutPR.forEach(function (issue) {
      // slugify title to get rid of characters that can cause filename problems
      var issueFilename = util.format('issues/%s-%s.md', String(issue.number), slug(issue.title))
      // template strings use indents, to avoid indents we must forgo code readability
      var finalIssue = `${issue.title}
Issue filed by: ${issue.user.login}
${Date(issue.created_at)}

${issue.body}
-------------------------------------------------------------------------------
`

      console.log('⭐️  #%s: %s', issue.number, issue.title.cyan)

      fs.writeFile(issueFilename, finalIssue, function (error) {
        if (error) {
          cb(error, null)
        }
      })
      // make sure only get issues that have comments
      // or else request to comments_url will be empty
      if (issue.comments > 0) {
        commentsURL.push(issue.comments_url)
      }
    })
    cb(null, commentsURL)
  },

  // create a new array of responses from each comment url
  // if a issue has a comment value > 0 it will get requested
  function getIssueComments (commentsURL, cb) {
    // take array of comment urls and get content
    // callURL at the top of this file does all the
    // request work for each URL
    async.map(commentsURL, callURL, function (error, results) {
      if (error) {
        cb(error, null)
      }
      cb(null, results)
    })
  },

  // create obj to match issue comments and existing file
  function setupIssueComments (results, cb) {
    // list of files in /issues
    var paths = {}
    fs.readdir('issues/', function (error, files) {
      if (error) {
        throw error
      }

      // for each url with comments this create a property
      // on the paths object so that we're able to easy
      // find which file comments should go
      files.forEach(function (file) {
        paths[ file.split('-')[0] ] = 'issues/' + file
      })

      cb(null, paths, results)
    })
  },

  // where we actually write the comments to their correct
  // issue file in /issues directory
  function writeIssueComments (paths, results, cb) {
    results.forEach(function (comment) {
      comment.forEach(function (individualComment) {
        var writeToFile = paths[ individualComment.issue_url.split('/')[7] ]
        var commentFinal = `${individualComment.user.login}
${Date(individualComment.created_at)}

${individualComment.body}

-------------------------------------------------------------------------------
`

        // append all comments to file
        fs.appendFile(writeToFile, commentFinal, function (error) {
          if (error) {
            cb(error, null)
          }
        })
      })
    })
    cb(null, 'done writing comments'.red)
  }

],
  function (err, result) {
    if (err) {
      console.error(err)
      return
    }
    // fancy ouput
    figlet.text('got issues!', {
      horizontalLayout: 'default',
      verticalLayout: 'default'
    }, function (err, data) {
      if (err) {
        console.log('Something went wrong...')
        console.dir(err)
        return
      }
      console.log(data)
      console.log('\n    check your new issues/ directory'.green)
      console.log('    (issues/ was added to .gitignore)\n')
    })
  }
)