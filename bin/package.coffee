Deployer = require(__dirname + "/../Deployer")

_getChangelogFromGit = ( cb ) ->
    changelog = {}
    require("child_process").exec(require("shell-quote").quote([__dirname + "/../helpers/git2changelog"]),
        ( err, stdout, stderr) ->
            if err?
                console.log("could not run git2changelog: ", stdout, stderr, err)
                throw err
            cb(JSON.parse(stdout))
    )


module.exports = ( args ) ->

    unless args[1]? and args[2]? and args[3]?
        console.log("  usage: #{args[0]} repo name mail")
        process.exit(0)

#     deployer = new Deployer('dist/', 'command')
    deployer = new Deployer('dist/', 'service')

    deployer.setUp()

    _getChangelogFromGit( ( changelog ) ->
        deployer.package(( res ) ->
            deployer.tearDown()
            if res?
                throw new Error(res)
            process.exit(0)
        , changelog, 'deb', { path: args[1] },
        { packager: { name: args[2], mail: args[3] }})
    )
