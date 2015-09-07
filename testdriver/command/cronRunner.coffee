process.on('uncaughtException', (err) ->
    console.error("ERROR: ", err.stack)
    process.exit(1)
)

runnerConf = JSON.parse(require("fs").readFileSync(__dirname + "/runnerConf.json", "utf-8"))

payload = require("./lib/index")

netConfig = null
if require("fs").existsSync(runnerConf.dirs.conf + "net.conf")
    netConfig = require("cson").parseSync(require("fs").readFileSync(runnerConf.dirs.conf + "net.conf", "utf-8"))

dbConfig = null
if require("fs").existsSync(runnerConf.dirs.conf + "db.conf")
    dbConfig = require("cson").parseSync(require("fs").readFileSync(runnerConf.dirs.conf + "db.conf", "utf-8"))

info = JSON.parse(require("fs").readFileSync(__dirname + "/package.json"))


if process.argv[2]
    payload[process.argv[2]](runnerConf.dirs, info, netConfig, dbConfig)
else
    payload.run(runnerConf.dirs, info, netConfig, dbConfig)
