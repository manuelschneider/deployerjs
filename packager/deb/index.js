(function() {
  var DebPackager, Packager,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Packager = require(__dirname + "/../Packager");

  DebPackager = (function(_super) {
    __extends(DebPackager, _super);

    function DebPackager(payload, appClass, deploymentInfo) {
      DebPackager.__super__.constructor.call(this, payload, appClass, deploymentInfo);
    }

    DebPackager.prototype["package"] = function(done, changelog, buildOpts) {
      var _this = this;
      return require('child_process').exec("debuild --version && tar --version", function(err, stdout, stderr) {
        if (err != null) {
          done(new Error("debuild and tar must be available!"));
          return;
        }
        return require("child_process").exec("dpkg --print-architecture", function(err, stdout, stderr) {
          var arch;
          if (err != null) {
            done(new Error("could not detect arch"));
            return;
          }
          arch = stdout.replace("\n", "");
          return require("child_process").exec("gpg --list-secret-keys                    | grep '" + (_this._shellquote(buildOpts.packager.mail)) + "'                    | wc -l", function(err, stdout, stderr) {
            if ((err != null) || stdout === 0) {
              done(new Error("packager " + buildOpts.packager.mail + " has not private gpg-key!"));
              return;
            }
            return _this._packageNochecks(done, changelog, buildOpts, arch);
          });
        });
      });
    };

    DebPackager.prototype.publish = function(done, publishTo, packagePath, buildOpts) {
      var _this = this;
      return require('child_process').exec("reprepro --version", function(err, stdout, stderr) {
        if (err != null) {
          done(new Error("reprepro must be available!"));
          return;
        }
        if (!require("fs").existsSync(publishTo.path)) {
          return _this._createRepo(_this._publishNochecks.bind(_this, done, publishTo, packagePath, buildOpts), publishTo.path, buildOpts.packager.mail);
        } else {
          return _this._publishNochecks(done, publishTo, packagePath, buildOpts);
        }
      });
    };

    DebPackager.prototype._placeholders = function(info, arch) {
      var requiredDbs, requiredNet;
      requiredDbs = null;
      if (this.deploymentInfo.db != null) {
        requiredDbs = ", " + this.deploymentInfo.db.type;
      }
      requiredNet = null;
      if (this.deploymentInfo.net != null) {
        requiredNet = ", authbind";
      }
      return {
        'name': info.name,
        'author.name': info.author.name,
        'author.email': info.author.email,
        'description': info.description,
        'homepage': info.homepage,
        'arch': arch,
        requiredDbs: requiredDbs,
        requiredNet: requiredNet
      };
    };

    DebPackager.prototype._copySync = function(src, target) {
      return require("fs").writeFileSync(target, require("fs").readFileSync(src));
    };

    DebPackager.prototype._replaceAllPlaceholders = function(target, info) {
      var content, item, key, renamedItem, value, _i, _len, _ref, _results;
      _ref = require("fs").readdirSync(target);
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        item = _ref[_i];
        for (key in info) {
          value = info[key];
          if (item.indexOf("%%" + key + "%%") >= 0) {
            renamedItem = item.replace("%%" + key + "%%", value);
            require("fs").renameSync(target + item, target + renamedItem);
            item = renamedItem;
          }
        }
        if (require("fs").statSync(target + item).isDirectory()) {
          _results.push(this._replaceAllPlaceholders(target + item + "/", info));
        } else {
          content = require('fs').readFileSync(target + item, "utf-8");
          for (key in info) {
            value = info[key];
            content = content.replace(new RegExp("%%" + key + "%%", "g"), value);
          }
          _results.push(require('fs').writeFileSync(target + item, content, 'utf-8'));
        }
      }
      return _results;
    };

    DebPackager.prototype._createDebianChangelog = function(packageInfo, changelog, buildOpts) {
      var change, date, dateString, day, days, hh, i, mm, month, offset, res, ss, _i, _j, _len, _ref, _ref1;
      res = "";
      for (i = _i = _ref = changelog.length - 1; _ref <= 0 ? _i <= 0 : _i >= 0; i = _ref <= 0 ? ++_i : --_i) {
        res += ("" + packageInfo.name + " (" + changelog[i].version + ") " + (this._getDist(changelog[i].stable)) + "; ") + "urgency=low\n\n";
        _ref1 = changelog[i].changes;
        for (_j = 0, _len = _ref1.length; _j < _len; _j++) {
          change = _ref1[_j];
          res += "  * " + change.description + " (" + change.gitref + ")\n";
        }
        date = new Date(changelog[i].date);
        days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        day = date.getDate();
        if (day < 10) {
          day = " " + day;
        }
        month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        hh = date.getHours() < 10 ? "0" + date.getHours() : date.getHours();
        mm = date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes();
        ss = date.getSeconds() < 10 ? "0" + date.getSeconds() : date.getSeconds();
        offset = Math.round(date.getTimezoneOffset() * 100 / -60);
        if (offset >= 0) {
          offset = "+" + offset;
        }
        if (Math.abs(offset) < 1000) {
          offset = offset.substring(0, 1) + "0" + offset.substring(1);
        }
        dateString = ("" + days[date.getDay()] + ", " + day + " " + month[date.getMonth()] + " " + (date.getFullYear()) + " ") + ("" + hh + ":" + mm + ":" + ss + " " + offset);
        res += "\n -- " + buildOpts.packager.name + " <" + buildOpts.packager.mail + ">  " + dateString + "\n\n";
      }
      return res;
    };

    DebPackager.prototype._getDist = function(stable) {
      if (stable) {
        return "production";
      }
      return "development";
    };

    DebPackager.prototype._getVersionFromChangelog = function(changelog) {
      return changelog[changelog.length - 1].version;
    };

    DebPackager.prototype._cpApp = function(target, packageInfo) {
      var confToGen, runnerConf, _i, _len, _ref;
      require("wrench").copyDirSyncRecursive(this.deploymentInfo.dirs.app, target + "app");
      runnerConf = JSON.parse(require('fs').readFileSync(target + "app/runnerConf.json"));
      runnerConf.dirs = {
        conf: "/etc/" + packageInfo.name + "/",
        tmp: "/run/" + packageInfo.name + "/"
      };
      if (this.appClass === 'service') {
        runnerConf.dirs.data = "/var/lib/" + packageInfo.name + "/data/";
        runnerConf.dirs.log = "/var/log/" + packageInfo.name + "/bunyan_debug.log";
        runnerConf.logConfig.src = false;
        runnerConf.logConfig.streams = [
          {
            level: "info",
            path: "/var/log/" + packageInfo.name + "/info.log"
          }, {
            level: "error",
            path: "/var/log/" + packageInfo.name + "/error.log"
          }
        ];
      }
      require('fs').writeFileSync(target + "app/runnerConf.json", JSON.stringify(runnerConf), 'utf-8');
      require("wrench").copyDirSyncRecursive(this.deploymentInfo.dirs.conf, target + "etc");
      require("wrench").copyDirSyncRecursive(this.payload + "/conf", target + "examples");
      _ref = ['db', 'net'];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        confToGen = _ref[_i];
        if (require('fs').existsSync(target + ("etc/" + confToGen + ".conf"))) {
          require('fs').unlinkSync(target + ("etc/" + confToGen + ".conf"));
        }
      }
      if (require('fs').existsSync("" + this.payload + "/doc")) {
        require("wrench").copyDirSyncRecursive("" + this.payload + "/doc", target + "doc");
      }
      require("wrench").copyDirSyncRecursive(__dirname + "/../../helpers", target + "helpers");
      require('fs').mkdirSync(target + "helpers/node_modules");
      require("wrench").copyDirSyncRecursive(__dirname + "/../../node_modules/cson", target + "helpers/node_modules/cson");
      require("wrench").copyDirSyncRecursive(__dirname + "/../../node_modules/selfsigned", target + "helpers/node_modules/selfsigned");
      require("wrench").copyDirSyncRecursive(__dirname + "/../../node_modules/wrench", target + "helpers/node_modules/wrench");
      require("wrench").copyDirSyncRecursive(__dirname + "/../../node_modules/source-map-support", target + "helpers/node_modules/source-map-support");
      return require("wrench").copyDirSyncRecursive(__dirname + "/../../node_modules/simplemigration", target + "helpers/node_modules/simplemigration");
    };

    DebPackager.prototype._packageNochecks = function(done, changelog, buildOpts, arch) {
      var debuildTmp, manpage, manpages, packageInfo, version, _i, _len, _ref,
        _this = this;
      debuildTmp = '/tmp/deployer.js_packageDeb_' + Math.round(Math.random() * 10000);
      require('fs').mkdirSync(debuildTmp);
      require("wrench").copyDirSyncRecursive(__dirname + ("/" + this.appClass), debuildTmp + "/debuild");
      if (!require("fs").existsSync(this.deploymentInfo.dirs.app + "/package.json")) {
        done(new Error("your payload contains no package.json!"));
        return;
      }
      packageInfo = JSON.parse(require("fs").readFileSync(this.deploymentInfo.dirs.app + "/package.json", "utf-8"));
      packageInfo.name = packageInfo.name.toLowerCase();
      this._replaceAllPlaceholders(debuildTmp + "/debuild/", this._placeholders(packageInfo, arch));
      this._copySync(this.deploymentInfo.license, debuildTmp + "/debuild/debian/copyright");
      this._cpApp(debuildTmp + "/debuild/", packageInfo);
      require("fs").writeFileSync(debuildTmp + "/debuild/debian/changelog", this._createDebianChangelog(packageInfo, changelog, buildOpts), 'utf-8');
      version = this._getVersionFromChangelog(changelog);
      if (require("fs").existsSync(debuildTmp + "/debuild/doc")) {
        manpages = "";
        _ref = require("fs").readdirSync(debuildTmp + "/debuild/doc");
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          manpage = _ref[_i];
          manpages += "doc/" + manpage + "\n";
        }
        if (manpages !== "") {
          require("fs").writeFileSync(debuildTmp + ("/debuild/debian/" + packageInfo.name + ".manpages"), manpages);
        }
      }
      if (require('fs').existsSync("" + this.payload + "/default.cron")) {
        this._createCron("" + this.payload + "/default.cron", debuildTmp + ("/debuild/debian/" + packageInfo.name + ".cron.d"), packageInfo.name);
      }
      require("fs").mkdirSync("" + debuildTmp + "/" + packageInfo.name + "-" + version);
      this._cpApp(debuildTmp + ("/" + packageInfo.name + "-" + version + "/"), packageInfo);
      return require('child_process').exec("cd " + (this._shellquote(debuildTmp)) + "            && tar -czf " + (this._shellquote("" + packageInfo.name + "_" + version + ".orig.tar.gz")) + "                        " + (this._shellquote("" + packageInfo.name + "-" + version)), function(err, stdout, stderr) {
        if (err != null) {
          console.log(stdout, stderr);
          done(new Error("packaging src-tarball failed"));
          return;
        }
        require("wrench").rmdirSyncRecursive("" + debuildTmp + "/" + packageInfo.name + "-" + version);
        require("fs").renameSync("" + debuildTmp + "/debuild", "" + debuildTmp + "/" + packageInfo.name + "-" + version);
        return require('child_process').exec("cd " + (_this._shellquote("" + debuildTmp + "/" + packageInfo.name + "-" + version)) + "                                          && debuild -i -b", function(err, stdout, stderr) {
          var file, files, _j, _len1, _ref1;
          if (err != null) {
            console.log(stdout, stderr);
            done(new Error("debuild failed"));
            return;
          }
          console.log(stdout, stderr);
          files = [];
          _ref1 = require("fs").readdirSync("" + debuildTmp);
          for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
            file = _ref1[_j];
            if (file.substring(file.length - 4) === ".deb" || file.substring(file.length - 8) === ".changes") {
              files.push("" + debuildTmp + "/" + file);
            } else {
              if (require('fs').statSync("" + debuildTmp + "/" + file).isDirectory()) {
                require("wrench").rmdirSyncRecursive("" + debuildTmp + "/" + file);
              } else {
                require('fs').unlinkSync("" + debuildTmp + "/" + file);
              }
            }
          }
          return done(files);
        });
      });
    };

    DebPackager.prototype._createRepo = function(done, target, packagerMail) {
      var _this = this;
      return require("child_process").exec("dpkg --print-architecture", function(err, stdout, stderr) {
        var arch, item, _i, _len, _ref;
        if (err != null) {
          done(new Error("could not detect arch"));
          return;
        }
        arch = stdout.replace("\n", "");
        _ref = [target, target + "/incoming", target + "/debian"];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          item = _ref[_i];
          require("fs").mkdirSync(item);
        }
        require("wrench").copyDirSyncRecursive(__dirname + "/repo-conf", target + "/conf");
        _this._replaceAllPlaceholders(target + "/conf/", {
          arch: arch
        });
        _this._copySync(__dirname + "/repo-readme", target + "/debian/README.txt");
        _this._replaceAllPlaceholders(target + "/debian/", {
          arch: arch,
          repoPath: target
        });
        return require("child_process").exec("gpg --export -a " + (_this._shellquote(packagerMail)) + "                                          > " + (_this._shellquote(target)) + "/debian/pubkey.asc", function(err, stdout, stderr) {
          if (err != null) {
            done(new Error("could not export gpg-pubkey for " + packagerMail));
            return;
          }
          return done();
        });
      });
    };

    DebPackager.prototype._publishNochecks = function(done, publishTo, packagePath, buildOpts) {
      var file, _i, _len;
      for (_i = 0, _len = packagePath.length; _i < _len; _i++) {
        file = packagePath[_i];
        this._copySync(file, publishTo.path + ("/incoming/" + (require("path").basename(file))));
      }
      return require('child_process').exec("cd " + (this._shellquote(publishTo.path)) + "            && reprepro -Vb . --outdir +b/debian/ processincoming incoming", function(err, stderr, stdout) {
        if (err != null) {
          console.log(stderr);
          console.log(stdout);
          done(new Error("publish failed"));
          return;
        }
        return done();
      });
    };

    DebPackager.prototype._createCron = function(src, dest, pkgName) {
      var contents, cron, i, line, _i, _j, _len;
      contents = require('fs').readFileSync(src, 'utf8').split("\n");
      cron = "";
      for (_i = 0, _len = contents.length; _i < _len; _i++) {
        line = contents[_i];
        line = line.replace(/\s+/g, ' ').split(" ");
        for (i = _j = 0; _j < 5; i = ++_j) {
          cron += "" + line[i] + " ";
        }
        if (this.appClass === 'service') {
          cron += "   " + pkgName + "     ";
          cron += "/usr/bin/nodejs /usr/lib/" + pkgName + "/index.js " + line[5] + "\n";
        } else {
          cron += "   root     ";
          cron += "/usr/bin/nodejs /usr/lib/" + pkgName + "/cronRunner.js " + line[5] + "\n";
        }
      }
      return require('fs').writeFileSync(dest, cron, 'utf-8');
    };

    DebPackager.prototype._shellquote = function(toquote) {
      return require("shell-quote").quote([toquote]);
    };

    return DebPackager;

  })(Packager);

  module.exports = DebPackager;

}).call(this);

//# sourceMappingURL=../../packager/deb/index.js.map

/*! deployerjs - v0.0.0
* https://github.com/manuelschneider/deployerjs
* Copyright (c) 2015 Manuel Schneider; All rights reserved. */require('source-map-support').install();