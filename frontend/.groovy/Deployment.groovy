// .groovy/Deployment.groovy

return { String branch, String appName, String vpsUser, String vpsHost ->

    def envConfig = [
        main: [
            baseDir   : "~/dev/${appName}/frontend",
            checkout  : "main",
            buildCmd  : "npm run build:release",
            buildDir  : "build/release",
            targetDir : "/var/www/${appName}/frontend",
            msg       : "🚀 Deploying FRONTEND to PRODUCTION"
        ],
        develop: [
            baseDir   : "~/dev/${appName}/frontend",
            checkout  : "develop",
            buildCmd  : "npm run build:debug",
            buildDir  : "build/debug",
            targetDir : "/var/www/${appName}-staging/frontend",
            msg       : "🧪 Deploying FRONTEND to STAGING"
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

        rm -rf node_modules ${cfg.buildDir}
        npm ci
        ${cfg.buildCmd}

        cp -r ${cfg.buildDir}/* ${cfg.targetDir}

        rm -rf node_modules ${cfg.buildDir}

        sudo systemctl restart nginx

        echo "✅ Frontend deployment completed (${branch})"
    """

    sshExec(
        branch  : branch,
        vpsUser: vpsUser,
        vpsHost: vpsHost,
        script : deployScript
    )
}
