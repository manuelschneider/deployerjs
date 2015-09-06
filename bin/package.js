(function() {
  var Deployer, _getChangelogFromGit;

  Deployer = require(__dirname + "/../Deployer");

  _getChangelogFromGit = function(cb) {
    var changelog;
    changelog = {};
    return require("child_process").exec(require("shell-quote").quote([__dirname + "/../helpers/git2changelog"]), function(err, stdout, stderr) {
      if (err != null) {
        console.log("could not run git2changelog: ", stdout, stderr, err);
        throw err;
      }
      return cb(JSON.parse(stdout));
    });
  };

  module.exports = function(args) {
    var deployer;
    if (!((args[1] != null) && (args[2] != null) && (args[3] != null))) {
      console.log("  usage: " + args[0] + " repo name mail");
      process.exit(0);
    }
    deployer = new Deployer('dist/', 'service');
    deployer.setUp();
    return _getChangelogFromGit(function(changelog) {
      return deployer["package"](function(res) {
        deployer.tearDown();
        if (res != null) {
          throw new Error(res);
        }
        return process.exit(0);
      }, changelog, 'deb', {
        path: args[1]
      }, {
        packager: {
          name: args[2],
          mail: args[3]
        }
      });
    });
  };

}).call(this);

//# sourceMappingURL=../bin/package.js.map

/*! deployerjs - v0.0.0 - 2015-09-07
* https://github.com/manuelschneider/deployerjs
* Copyright (c) 2015 Manuel Schneider; All rights reserved. */require('source-map-support').install();