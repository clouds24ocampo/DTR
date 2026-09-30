pipeline {
    agent any
    options {
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
    }
    parameters {
        string(name: 'ROLLBACK_RELEASE', defaultValue: '', description: 'Timestamp of release to rollback to (e.g., 20260203120000). Leave empty to skip rollback.')
    }
    environment {
        PROJECT_NAME = 'test-backend'
        VPS_BASE_PATH = "/var/www/${PROJECT_NAME}"
    }
    stages {
        stage('Pipeline Guard') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                }
            }
            steps {
                echo "✅ Branch is main or develop. Proceeding..."
            }
        }
        stage('Inject Environment') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                }
            }
            steps {
                script {
                    // Decide which Jenkins secret file to use based on branch
                    def envSecretId = (env.BRANCH_NAME == 'main') ? 'PROD_ENV' : 'STAGING_ENV'
                    def envFilePath = (env.BRANCH_NAME == 'main') ? '.env.production' : '.env.staging'

                    // Use withCredentials to copy the secret file into the workspace
                    withCredentials([file(credentialsId: envSecretId, variable: 'ENV_FILE')]) {
                        sh """
                            echo "📄 Injecting environment file for ${env.BRANCH_NAME}"
                            cp \$ENV_FILE ${env.WORKSPACE}/${envFilePath}
                            cat ${env.WORKSPACE}/${envFilePath}
                        """
                    }
                }
            }
        }
        stage('Checkout & Build') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                }
            }
            steps {
                echo "📦 Cleaning old node_modules and build..."
                sh 'rm -rf node_modules build || true'
                sh 'npm ci'

                script {
                    if (env.BRANCH_NAME == 'main') {
                        sh 'npm run build:release || { echo "❌ Build failed"; exit 1; }'
                    } else {
                        sh 'npm run build:debug || { echo "❌ Build failed"; exit 1; }'
                    }
                }
            }
        }
        stage('Package Build') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                }
            }
            steps {
                script {
                    // Generate timestamp
                    env.TIMESTAMP = sh(returnStdout: true, script: 'date +%Y%m%d%H%M%S').trim()

                    // Determine build directory
                    def BUILD_DIR = (env.BRANCH_NAME == 'main') ? 'build/release' : 'build/debug'

                    // Define package name
                    env.PACKAGE_NAME = "release_${env.TIMESTAMP}.tar.gz"

                    // Copy ecosystem.config.js into build folder temporarily
                    sh """
                        cp ecosystem.config.js ${BUILD_DIR}/ || echo "⚠️ ecosystem.config.js not found, skipping"
                        tar -czf ${env.PACKAGE_NAME} -C ${BUILD_DIR} .
                        # Optional: remove the copied ecosystem.config.js from build folder if you want to keep build clean
                        rm -f ${BUILD_DIR}/ecosystem.config.js
                    """

                    echo "✅ Package created: ${env.PACKAGE_NAME} (including ecosystem.config.js if it exists)"
                }
            }
        }

        stage('Deploy to VPS') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                }
            }
            steps {
                sshagent(credentials: ['VPS_CREDENTIAL']) {
                    script {
                        def VPS_HOST = env.VPS1_HOST
                        def VPS_USER = env.VPS1_USER
                        def VPS_RELEASES_PATH = (env.BRANCH_NAME == 'main') ? "${VPS_BASE_PATH}/releases" : "${VPS_BASE_PATH}-staging/releases"
                        def PM2_APP = (env.BRANCH_NAME == 'main') ? "${PROJECT_NAME}" : "${PROJECT_NAME}-staging"

                        sh """
                            ssh ${VPS_USER}@${VPS_HOST} "mkdir -p ${VPS_RELEASES_PATH}"
                            scp ${env.PACKAGE_NAME} ${VPS_USER}@${VPS_HOST}:${VPS_RELEASES_PATH}/
                            ssh ${VPS_USER}@${VPS_HOST} '
                                cd ${VPS_RELEASES_PATH}
                                mkdir ${env.TIMESTAMP}
                                tar -xzf ${env.PACKAGE_NAME} -C ${env.TIMESTAMP}
                                ln -sfn ${env.TIMESTAMP} current
                                # pm2 startOrRestart ecosystem.config.js --only ${PM2_APP}
                                echo "pm2 startOrRestart ecosystem.config.js --only ${PM2_APP}"
                                rm ${env.PACKAGE_NAME}
                                echo "✅ Deployment completed: ${env.TIMESTAMP} at ${VPS_BASE_PATH}/current"
                            '

                        """
                    }
                }
            }
        }
        stage('Rollback (Manual)') {
            when {
                allOf {
                    expression { return params.ROLLBACK_RELEASE?.trim() }
                    anyOf {
                        branch 'main'
                        branch 'develop'
                    }
                }
            }
            steps {
                sshagent(credentials: ['VPS_CREDENTIAL']) {
                    script {
                        def  VPS_HOST = env.VPS1_HOST
                        def VPS_USER = env.VPS1_USER
                        def VPS_RELEASES_PATH = (env.BRANCH_NAME == 'main') ? "${VPS_BASE_PATH}/releases" : "${VPS_BASE_PATH}-staging/releases"
                        def PM2_APP = (env.BRANCH_NAME == 'main') ? "${PROJECT_NAME}" : "${PROJECT_NAME}-staging"

                        echo "⚠️ Rolling back to release: ${params.ROLLBACK_RELEASE}"
                        sh """
                            ssh ${VPS_USER}@${VPS_HOST} '
                                cd ${VPS_RELEASES_PATH}
                                if [ ! -d "${params.ROLLBACK_RELEASE}" ]; then
                                    echo "❌ Release not found: ${params.ROLLBACK_RELEASE}" && exit 1
                                fi
                                ln -sfn ${params.ROLLBACK_RELEASE} current
                                # pm2 restart ${PM2_APP}
                                echo "pm2 restart ${PM2_APP}"
                                echo "✅ Rollback completed to ${params.ROLLBACK_RELEASE}"
                            '
                        """
                    }
                }
            }
        }
    }
    post {
        failure {
            echo "❌ Pipeline failed!"
        }
        success {
            echo "✅ Pipeline completed successfully!"
        }
    }
}
