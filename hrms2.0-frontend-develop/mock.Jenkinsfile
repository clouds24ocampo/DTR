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
        PROJECT_NAME = 'test-frontend'
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
                    def envSecretId = (env.BRANCH_NAME == 'main') ? 'PROD_ENV' : 'STAGING_ENV'
                    def envFilePath = (env.BRANCH_NAME == 'main') ? '.env.production' : '.env.staging'

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
                    env.TIMESTAMP = sh(returnStdout: true, script: 'date +%Y%m%d%H%M%S').trim()
                    def BUILD_DIR = (env.BRANCH_NAME == 'main') ? 'build/release' : 'build/debug'
                    env.PACKAGE_NAME = "release_${env.TIMESTAMP}.tar.gz"

                    sh """
                        tar -czf ${env.PACKAGE_NAME} -C ${BUILD_DIR} .
                    """

                    echo "✅ Package created: ${env.PACKAGE_NAME}"
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

                        sh """
                            ssh ${VPS_USER}@${VPS_HOST} "mkdir -p ${VPS_RELEASES_PATH}"
                            scp ${env.PACKAGE_NAME} ${VPS_USER}@${VPS_HOST}:${VPS_RELEASES_PATH}/
                            ssh ${VPS_USER}@${VPS_HOST} '
                                cd ${VPS_RELEASES_PATH}
                                mkdir ${env.TIMESTAMP}
                                tar -xzf ${env.PACKAGE_NAME} -C ${env.TIMESTAMP}
                                ln -sfn ${env.TIMESTAMP} current
                                rm ${env.PACKAGE_NAME}
                                echo "✅ Deployment completed: ${env.TIMESTAMP} at ${VPS_BASE_PATH}/current"

                                echo "🔄 Reloading Nginx..."
                                sudo systemctl reload nginx
                                echo "✅ Nginx reloaded successfully"
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
                        def VPS_HOST = env.VPS1_HOST
                        def VPS_USER = env.VPS1_USER
                        def VPS_RELEASES_PATH = (env.BRANCH_NAME == 'main') ? "${VPS_BASE_PATH}/releases" : "${VPS_BASE_PATH}-staging/releases"

                        echo "⚠️ Rolling back to release: ${params.ROLLBACK_RELEASE}"
                        sh """
                            ssh ${VPS_USER}@${VPS_HOST} '
                                cd ${VPS_RELEASES_PATH}
                                if [ ! -d "${params.ROLLBACK_RELEASE}" ]; then
                                    echo "❌ Release not found: ${params.ROLLBACK_RELEASE}" && exit 1
                                fi
                                ln -sfn ${params.ROLLBACK_RELEASE} current
                                echo "✅ Rollback completed to ${params.ROLLBACK_RELEASE}"

                                echo "🔄 Reloading Nginx..."
                                sudo systemctl reload nginx
                                echo "✅ Nginx reloaded successfully"
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
