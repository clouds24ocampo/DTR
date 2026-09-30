// .groovy/Deployment.groovy

return { String branch, String appName, String vpsUser, String vpsHost ->

    def envConfig = [
        main: [
            baseDir    : "~/dev/${appName}/backend",
            targetDir  : "/var/www/${appName}/backend",
            buildCmd   : "npm run build:release",
            buildDir   : "build/release",
            pm2App     : appName,
            checkout   : "main",
            msg        : "🚀 Deploying BACKEND to PRODUCTION"
        ],
        develop: [
            baseDir    : "~/dev/${appName}/backend",
            targetDir  : "/var/www/${appName}-staging/backend",
            buildCmd   : "npm run build:debug",
            buildDir   : "build/debug",
            pm2App     : "${appName}-staging",
            checkout   : "develop",
            msg        : "🧪 Deploying BACKEND to STAGING"
        ]
    ]

    if (!envConfig.containsKey(branch)) {
        error "❌ Unsupported branch: ${branch}"
    }

    def cfg = envConfig[branch]

    def deployScript = """
        set -euo pipefail

        echo "${cfg.msg}"
        echo "Branch: ${branch}"

        cd ${cfg.baseDir} || { echo "❌ Directory not found"; exit 1; }
        git fetch origin 
        git checkout ${cfg.checkout}
        git pull --rebase origin ${cfg.checkout}

        rm -rf node_modules build
        npm ci
        ${cfg.buildCmd}

        cp -r ${cfg.buildDir}/* ${cfg.buildDir}/.[!.]* ${cfg.targetDir}
        cp ecosystem.config.js ${cfg.targetDir}

        pm2 startOrRestart ecosystem.config.js --only ${cfg.pm2App}

        echo "✅ Deployment complete for ${cfg.pm2App}"
    """

    sshExec(
        branch  : branch,
        vpsUser: vpsUser,
        vpsHost: vpsHost,
        script : deployScript
    )
}
