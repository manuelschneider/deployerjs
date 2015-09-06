#!/usr/bin/env node

if (require('fs').existsSync("dbMigrations")) {
    var adminCreds = null;
    if (typeof(process.argv[3]) === "string") {
        adminCreds = {
            "user": process.argv[3],
            "pw": process.argv[4]
        };
    }
    var migrator = new (require("simplemigration"))(
        JSON.parse(process.argv[2]),
        adminCreds
    );

    migrator.isAccessable(function (accessable) {
        if (accessable || (adminCreds !== null)) {
            migrator.ensureReadiness(function (err) {
                if (typeof(err) !== "undefined" && err !== null) {
                    console.error(err);
                    process.exit(1);
                }
                console.log("db is ready for use now.");
                process.exit(0);
            }, process.cwd() + "/dbMigrations/");
        } else {
            console.error("db is not accessable");
            process.exit(1);
        }

    });

} else {

    console.log("no dbMigrations found -> no db required.");
    process.exit(0);

}
