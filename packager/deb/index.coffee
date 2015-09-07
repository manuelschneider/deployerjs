Packager = require(__dirname + "/../Packager")

class DebPackager extends Packager

    constructor: ( payload, appClass, deploymentInfo ) ->
        super(payload, appClass, deploymentInfo)


    package: ( done, changelog, buildOpts ) ->
        require('child_process').exec("debuild --version && tar --version", (err, stdout, stderr) =>
            if err?
                done(new Error("debuild and tar must be available!"))
                return

            require("child_process").exec("dpkg --print-architecture", ( err, stdout, stderr) =>

                if err?
                    done(new Error("could not detect arch"))
                    return

                arch = stdout.replace("\n", "")

                require("child_process").exec(
                    "gpg --list-secret-keys
                    | grep '#{@_shellquote(buildOpts.packager.mail)}'
                    | wc -l",
                    ( err, stdout, stderr) =>

                        if err? or stdout is 0
                            done(new Error("packager #{buildOpts.packager.mail} has not private gpg-key!"))
                            return

                        @_packageNochecks(done, changelog, buildOpts, arch)
                )
            )
        )


    publish: ( done, publishTo, packagePath, buildOpts ) ->
        require('child_process').exec("reprepro --version", (err, stdout, stderr) =>
            if err?
                done(new Error("reprepro must be available!"))
                return

            unless require("fs").existsSync(publishTo.path)
                @_createRepo(
                    @_publishNochecks.bind(@, done, publishTo, packagePath, buildOpts),
                    publishTo.path
                    buildOpts.packager.mail
                )
            else
                @_publishNochecks(done, publishTo, packagePath, buildOpts)
        )


    _placeholders: ( info, arch ) ->
        requiredDbs = null
        if @deploymentInfo.db?
            requiredDbs = ", #{@deploymentInfo.db.type}"
        requiredNet = null
        if @deploymentInfo.net?
            requiredNet = ", authbind"
        {
            'name': info.name
            'author.name': info.author.name
            'author.email': info.author.email
            'description': info.description
            'homepage': info.homepage
            'arch': arch
            requiredDbs
            requiredNet
        }


    _copySync: ( src, target ) ->
        require("fs").writeFileSync(target, require("fs").readFileSync(src))


    _replaceAllPlaceholders: ( target, info ) ->
        for item in require("fs").readdirSync(target)
            for key, value of info
                if item.indexOf("%%#{key}%%") >= 0
                    renamedItem = item.replace("%%#{key}%%", value)
                    require("fs").renameSync(target + item, target + renamedItem)
                    item = renamedItem
            if require("fs").statSync(target + item).isDirectory()
                @_replaceAllPlaceholders(target + item + "/", info)
            else
                content = require('fs').readFileSync(target + item, "utf-8")
                for key, value of info
                    content = content.replace(new RegExp("%%#{key}%%", "g"), value)

                require('fs').writeFileSync(target + item, content, 'utf-8')


    _createDebianChangelog: ( packageInfo, changelog, buildOpts ) ->
        res = ""
        for i in [(changelog.length - 1)..0]
            res += "#{packageInfo.name} (#{changelog[i].version}) #{@_getDist(changelog[i].stable)}; " +
                "urgency=low\n\n"
            for change in changelog[i].changes
                res += "  * #{change.description} (#{change.gitref})\n"
            date = new Date(changelog[i].date)
            days = [ "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat" ]
            day = date.getDate()
            day = " " + day if day < 10
            month = [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ]
            hh = if date.getHours() < 10 then "0" + date.getHours() else date.getHours()
            mm = if date.getMinutes() < 10 then "0" + date.getMinutes() else date.getMinutes()
            ss = if date.getSeconds() < 10 then "0" + date.getSeconds() else date.getSeconds()
            offset = Math.round(date.getTimezoneOffset() * 100 / -60)
            offset = "+" + offset if offset >= 0
            offset = offset.substring(0,1) + "0" + offset.substring(1) if Math.abs(offset) < 1000

            dateString = "#{days[date.getDay()]}, #{day} #{month[date.getMonth()]} #{date.getFullYear()} " +
                "#{hh}:#{mm}:#{ss} #{offset}"
            res += "\n -- #{buildOpts.packager.name} <#{buildOpts.packager.mail}>  #{dateString}\n\n"
        res


    _getDist: ( stable ) ->
        return "production" if stable
        "development"


    _getVersionFromChangelog: ( changelog ) ->
        changelog[changelog.length - 1].version


    _cpApp: ( target, packageInfo ) ->
        require("wrench").copyDirSyncRecursive(@deploymentInfo.dirs.app, target + "app")
        runnerConf = JSON.parse(require('fs').readFileSync(target + "app/runnerConf.json"))
        runnerConf.dirs = {
            conf: "/etc/#{packageInfo.name}/"
            tmp: "/run/#{packageInfo.name}/"
        }
        if @appClass is 'service'
            runnerConf.dirs.data = "/var/lib/#{packageInfo.name}/data/"
            runnerConf.dirs.log = "/var/log/#{packageInfo.name}/bunyan_debug.log"
            runnerConf.logConfig.src = false
            runnerConf.logConfig.streams = [
                { level: "info", path: "/var/log/#{packageInfo.name}/info.log" }
                { level: "error", path: "/var/log/#{packageInfo.name}/error.log" }
            ]
        require('fs').writeFileSync(target + "app/runnerConf.json", JSON.stringify(runnerConf), 'utf-8')
        
        require("wrench").copyDirSyncRecursive(@deploymentInfo.dirs.conf, target + "etc")
        require("wrench").copyDirSyncRecursive(@payload + "/conf", target + "examples")
        for confToGen in ['db', 'net']
            if require('fs').existsSync(target + "etc/#{confToGen}.conf")
                require('fs').unlinkSync(target + "etc/#{confToGen}.conf")
        if require('fs').existsSync("#{@payload}/doc")
            require("wrench").copyDirSyncRecursive("#{@payload}/doc", target + "doc")

        require("wrench").copyDirSyncRecursive(__dirname + "/../../helpers", target + "helpers")
        require('fs').mkdirSync(target + "helpers/node_modules")
        require("wrench").copyDirSyncRecursive(__dirname + "/../../node_modules/cson",
            target + "helpers/node_modules/cson")
        require("wrench").copyDirSyncRecursive(__dirname + "/../../node_modules/selfsigned",
            target + "helpers/node_modules/selfsigned")
        require("wrench").copyDirSyncRecursive(__dirname + "/../../node_modules/wrench",
            target + "helpers/node_modules/wrench")
        require("wrench").copyDirSyncRecursive(__dirname + "/../../node_modules/source-map-support",
            target + "helpers/node_modules/source-map-support")
        require("wrench").copyDirSyncRecursive(__dirname + "/../../node_modules/simplemigration",
            target + "helpers/node_modules/simplemigration")


    _packageNochecks: (  done, changelog, buildOpts, arch ) ->
        debuildTmp = '/tmp/deployer.js_packageDeb_' + Math.round(Math.random() * 10000)
        require('fs').mkdirSync(debuildTmp)
        require("wrench").copyDirSyncRecursive(__dirname + "/#{@appClass}", debuildTmp + "/debuild")
        unless require("fs").existsSync(@deploymentInfo.dirs.app + "/package.json")
            done(new Error("your payload contains no package.json!"))
            return
        packageInfo = JSON.parse(require("fs").readFileSync(@deploymentInfo.dirs.app + "/package.json", "utf-8"))
        packageInfo.name = packageInfo.name.toLowerCase()

        @_replaceAllPlaceholders(debuildTmp + "/debuild/", @_placeholders(packageInfo, arch))

        @_copySync(@deploymentInfo.license, debuildTmp + "/debuild/debian/copyright")

        @_cpApp(debuildTmp + "/debuild/", packageInfo)

        require("fs").writeFileSync(debuildTmp + "/debuild/debian/changelog",
            @_createDebianChangelog(packageInfo, changelog, buildOpts), 'utf-8')

        version = @_getVersionFromChangelog(changelog)

        if require("fs").existsSync(debuildTmp + "/debuild/doc")
            manpages = ""
            for manpage in require("fs").readdirSync(debuildTmp + "/debuild/doc")
                manpages += "doc/#{manpage}\n"
            unless manpages is ""
                require("fs").writeFileSync(debuildTmp + "/debuild/debian/#{packageInfo.name}.manpages",
                    manpages)

        if require('fs').existsSync("#{@payload}/default.cron")
            @_createCron("#{@payload}/default.cron",
                debuildTmp + "/debuild/debian/#{packageInfo.name}.cron.d", packageInfo.name)

        require("fs").mkdirSync("#{debuildTmp}/#{packageInfo.name}-#{version}")
        @_cpApp(debuildTmp + "/#{packageInfo.name}-#{version}/", packageInfo)
        require('child_process').exec(
            "cd #{@_shellquote(debuildTmp)}
            && tar -czf #{@_shellquote("#{packageInfo.name}_#{version}.orig.tar.gz")}
                        #{@_shellquote("#{packageInfo.name}-#{version}")}"
        , (err, stdout, stderr) =>
            if err?
                console.log(stdout, stderr)
                done(new Error("packaging src-tarball failed"))
                return
            require("wrench").rmdirSyncRecursive("#{debuildTmp}/#{packageInfo.name}-#{version}")
            require("fs").renameSync("#{debuildTmp}/debuild",
                "#{debuildTmp}/#{packageInfo.name}-#{version}")
            require('child_process').exec("cd #{@_shellquote("#{debuildTmp}/#{packageInfo.name}-#{version}")}
                                          && debuild -i -b",
                ( err, stdout, stderr ) ->
                    if err?
                        console.log(stdout, stderr)
                        done(new Error("debuild failed"))
                        return
                    console.log(stdout, stderr)
                    files = []
                    for file in require("fs").readdirSync("#{debuildTmp}")
                        if file.substring(file.length - 4) is ".deb" or
                        file.substring(file.length - 8) is ".changes"
                            files.push("#{debuildTmp}/#{file}")
                        else
                            if require('fs').statSync("#{debuildTmp}/#{file}").isDirectory()
                                require("wrench").rmdirSyncRecursive("#{debuildTmp}/#{file}")
                            else
                                require('fs').unlinkSync("#{debuildTmp}/#{file}")
                    done(files)
            )
        )

    _createRepo: ( done, target, packagerMail ) ->

        require("child_process").exec("dpkg --print-architecture", ( err, stdout, stderr) =>
            if err?
                done(new Error("could not detect arch"))
                return

            arch = stdout.replace("\n", "")

            for item in [ target, target + "/incoming", target + "/debian" ]
                require("fs").mkdirSync(item)

            require("wrench").copyDirSyncRecursive(__dirname + "/repo-conf", target + "/conf")
            @_replaceAllPlaceholders(target + "/conf/", { arch })

            @_copySync(__dirname + "/repo-readme", target + "/debian/README.txt")
            @_replaceAllPlaceholders(target + "/debian/", { arch, repoPath: target })

            require("child_process").exec("gpg --export -a #{@_shellquote(packagerMail)}
                                          > #{@_shellquote(target)}/debian/pubkey.asc",
                ( err, stdout, stderr) ->
                    if err?
                        done(new Error("could not export gpg-pubkey for #{packagerMail}"))
                        return

                    done()
            )
        )


    _publishNochecks: ( done, publishTo, packagePath, buildOpts ) ->
        for file in packagePath
            @_copySync(file, publishTo.path + "/incoming/#{require("path").basename(file)}")
        require('child_process').exec(
            "cd #{@_shellquote(publishTo.path)}
            && reprepro -Vb . --outdir +b/debian/ processincoming incoming",
            ( err, stderr, stdout ) ->
                if err?
                    console.log(stderr)
                    console.log(stdout)
                    done(new Error("publish failed"))
                    return
                done()
        )


    _createCron: ( src, dest, pkgName ) ->
        contents = require('fs').readFileSync(src, 'utf8').split("\n")
        cron = ""
        for line in contents
            line = line.replace(/\s+/g, ' ').split(" ")
            for i in [0...5]
                cron += "#{line[i]} "
            if @appClass is 'service'
                cron += "   #{pkgName}     "
                cron += "/usr/bin/nodejs /usr/lib/#{pkgName}/index.js #{line[5]}\n"
            else
                cron += "   root     "
                cron += "/usr/bin/nodejs /usr/lib/#{pkgName}/cronRunner.js #{line[5]}\n"
        require('fs').writeFileSync(dest, cron, 'utf-8')


    _shellquote: ( toquote ) ->
        require("shell-quote").quote([toquote])



module.exports = DebPackager
