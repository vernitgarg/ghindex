/**
 * This file indexes followers of popular repositories.
 *
 * Usage:
 *   node followersIndexer.js repositories.json followers.json --tokens="A,B,C"
 */

var tokens = require('./lib/tokens')();
var fs = require('fs');

if (tokens.enabled === 0) {
  printTokenHelp();
  return -1;
}

var githubClient = require('./lib/ghclient')(tokens);
var repositoriesFileName = process.argv[2];
var inputArgumentsValid = fs.existsSync(repositoriesFileName);

if (!inputArgumentsValid) {
  printInputArgumentsHelp();
  return -2;
}

var allRepositories = getIndexedRepositories(repositoriesFileName);
var processedRepositoriesFileName = getProcessedRepositoriesFileName(process.argv[3], repositoriesFileName);
var processedRepositories = getProcessedRepositories(processedRepositoriesFileName);
var remainingRepositories = getRemainingRepositories(allRepositories, processedRepositories);
printStats(allRepositories, processedRepositories, remainingRepositories);

var indexFollowers = require('./lib/indexFollowers');
var db = require('./lib/fsdb')(processedRepositoriesFileName);
indexFollowers(remainingRepositories, db, githubClient, processedRepositories);

function printTokenHelp() {
  [
    'Github access token is not present in environment variables',
    'Go to https://github.com/settings/applications and click "Create new token"',
    'Pass tokens as a comma-separated argument --tokens="A,B,C"'
  ].forEach(function (line) { console.log(line); });
}

function printInputArgumentsHelp() {
  [
    'GitHub popuplar projects followers indexer.',
    'Usage:',
    '  node followersIndexer repositories.json followers.json',
    '',
    'Where: ',
    ' - repositories.json: file generated by repoIndexer.js',
    ' - followers.json: file where to save indexed followers'
  ].forEach(function (line) { console.log(line); });
}

function printStats(allRepositories, processedRepositories, remainingRepositories) {
  console.log('Statistics:');
  console.log('  Total:', allRepositories.length);
  console.log('  Processed:', Object.keys(processedRepositories).length);
  console.log('  Remaining:', remainingRepositories.length);
}

function readJson(fileName) {
  return JSON.parse(fs.readFileSync(fileName, 'utf8'));
}

function getIndexedRepositories(repositoriesFileName) {
  console.log('Reading repositories file', repositoriesFileName);
  var repositories = readJson(repositoriesFileName);
  console.log('Read', repositories.length, 'repositories');
  return repositories;
}

function getProcessedRepositories(followersFileName) {
  console.log('Reading followers file', followersFileName);
  var records = [];
  try {
    records = readJson(followersFileName);
    console.log('Read', Object.keys(records).length, 'processed repositories');
  }
  catch (e) {
    console.log('Could not read followers file. Assuming nothing indexed...');
  }

  return records;
}

function getRemainingRepositories(allRepositories, indexedRepositories) {
  return allRepositories.filter(function (x) { return !indexedRepositories[x.name]; });
}

function getProcessedRepositoriesFileName(followersFileName, repositoriesFileName) {
  if (fs.existsSync(followersFileName)) {
    console.log('Indexed followers file:', followersFileName);
    return followersFileName;
  }

  console.log('Indexed followers file is not fond.');
  var path = require('path');
  var absoluteRepositoriesFileName = path.resolve(repositoriesFileName);
  var repoPath = path.dirname(absoluteRepositoriesFileName);
  followersFileName = path.join(repoPath, path.basename(absoluteRepositoriesFileName, '.json') + 'Followers.json');
  console.log('Trying to use', followersFileName, 'as indexed followers file.');
  if (fs.existsSync(followersFileName)) {
    console.error('Indexed followers file already exists. Did you forget to pass it as third argument?');
    console.error('  node followersIndexer repositories.json followers.json');
  }
  return followersFileName;
}
