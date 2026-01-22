// =============================================================================
// FX Weekly Lease - Jenkins CI/CD Pipeline
// =============================================================================
// Follows FX homelab patterns for:
// - Nexus container registry integration
// - Vault secrets management
// - Multi-environment deployments (dev/staging/prod)
// - Image tagging convention (VERSION-COMMIT, latest-ENV)
// =============================================================================

pipeline {
    agent {
        label 'docker-capable-agent'
    }

    options {
        disableConcurrentBuilds()
        timestamps()
        ansiColor('xterm')
        timeout(time: 1, unit: 'HOURS')
    }

    parameters {
        booleanParam(name: 'SKIP_TESTS', defaultValue: false, description: 'Skip running tests')
        booleanParam(name: 'BUILD_FRONTEND', defaultValue: true, description: 'Build frontend image')
        booleanParam(name: 'BUILD_BACKEND', defaultValue: true, description: 'Build backend image')
        choice(name: 'ENVIRONMENT', choices: ['dev', 'staging', 'prod'], description: 'Deployment environment')
    }

    environment {
        // Application information
        APP_NAME = 'fx-weekly-lease'
        BACKEND_APP_NAME = 'fx-weekly-lease-backend'
        FRONTEND_APP_NAME = 'fx-weekly-lease-frontend'
        GIT_COMMIT_SHORT = sh(script: 'git rev-parse --short HEAD 2>/dev/null || echo "unknown"', returnStdout: true).trim()

        // Version management - Following FX pattern
        MAJOR_VERSION = '1'
        MINOR_VERSION = '0'
        IMAGE_VERSION = "${MAJOR_VERSION}.${MINOR_VERSION}.${env.BUILD_NUMBER}"

        // Docker configuration - Use Nexus registry (FX pattern)
        DOCKER_REGISTRY = 'nexus.strategybase.io:8082'
        DOCKER_REPO = 'sb-custom-docker-images'
        DOCKER_GROUP_REGISTRY = 'nexus.strategybase.io:18088'
        BACKEND_DOCKER_IMAGE = "${DOCKER_REGISTRY}/${DOCKER_REPO}/${BACKEND_APP_NAME}"
        FRONTEND_DOCKER_IMAGE = "${DOCKER_REGISTRY}/${DOCKER_REPO}/${FRONTEND_APP_NAME}"
        DOCKER_TAG_FULL = "${IMAGE_VERSION}-${GIT_COMMIT_SHORT}"

        // Vault configuration (FX pattern)
        VAULT_URL = 'http://vault.strategybase.io:8200'
        VAULT_CREDENTIALS_ID = 'Vault-App-Role-Creds'

        // Environment detection for tagging
        DEPLOY_ENV = sh(script: """
            if [ "${env.BRANCH_NAME}" = "master" ] || [ "${env.BRANCH_NAME}" = "main" ]; then
                echo "prod"
            elif [ "${env.BRANCH_NAME}" = "staging" ]; then
                echo "staging"
            else
                echo "dev"
            fi
        """, returnStdout: true).trim()

        // Nexus Registry credentials
        NEXUS_CREDENTIALS = credentials('nexus-credentials')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                sh 'git log -1 --pretty=format:"%h - %s (%an)" || true'
            }
        }

        stage('Detect Environment') {
            steps {
                script {
                    echo "Branch: ${env.BRANCH_NAME ?: 'unknown'}"
                    echo "Environment: ${DEPLOY_ENV}"
                    echo "Version: ${IMAGE_VERSION}"
                    echo "Commit: ${GIT_COMMIT_SHORT}"
                    echo "Full Tag: ${DOCKER_TAG_FULL}"
                }
            }
        }

        stage('Run Tests') {
            when {
                expression { return !params.SKIP_TESTS }
            }
            parallel {
                stage('Backend Tests') {
                    when {
                        expression { return params.BUILD_BACKEND }
                    }
                    steps {
                        dir('backend') {
                            sh '''
                                echo "Running backend tests..."
                                # python -m pytest tests/ -v || true
                                echo "Backend tests completed (placeholder)"
                            '''
                        }
                    }
                }
                stage('Frontend Tests') {
                    when {
                        expression { return params.BUILD_FRONTEND }
                    }
                    steps {
                        dir('frontend') {
                            sh '''
                                echo "Running frontend tests..."
                                # npm run test || true
                                echo "Frontend tests completed (placeholder)"
                            '''
                        }
                    }
                }
            }
        }

        stage('Build Images') {
            parallel {
                stage('Build Backend') {
                    when {
                        expression { return params.BUILD_BACKEND }
                    }
                    steps {
                        script {
                            def tags = [
                                "${DOCKER_TAG_FULL}",
                                "latest-${DEPLOY_ENV}"
                            ]

                            echo "Building backend image with tags: ${tags.join(', ')}"

                            docker.build("${BACKEND_DOCKER_IMAGE}:${DOCKER_TAG_FULL}", """
                                --build-arg BUILD_DATE=\$(date -u +"%Y-%m-%dT%H:%M:%SZ")
                                --build-arg VERSION=${IMAGE_VERSION}
                                --build-arg GIT_COMMIT=${GIT_COMMIT_SHORT}
                                --label org.opencontainers.image.created=\$(date -u +"%Y-%m-%dT%H:%M:%SZ")
                                --label org.opencontainers.image.version=${IMAGE_VERSION}
                                --label org.opencontainers.image.revision=${GIT_COMMIT_SHORT}
                                -f backend/Dockerfile
                                backend/
                            """)

                            // Tag with latest-ENV
                            sh "docker tag ${BACKEND_DOCKER_IMAGE}:${DOCKER_TAG_FULL} ${BACKEND_DOCKER_IMAGE}:latest-${DEPLOY_ENV}"
                        }
                    }
                }
                stage('Build Frontend') {
                    when {
                        expression { return params.BUILD_FRONTEND }
                    }
                    steps {
                        script {
                            def tags = [
                                "${DOCKER_TAG_FULL}",
                                "latest-${DEPLOY_ENV}"
                            ]

                            echo "Building frontend image with tags: ${tags.join(', ')}"

                            docker.build("${FRONTEND_DOCKER_IMAGE}:${DOCKER_TAG_FULL}", """
                                --build-arg BUILD_DATE=\$(date -u +"%Y-%m-%dT%H:%M:%SZ")
                                --build-arg VERSION=${IMAGE_VERSION}
                                --build-arg GIT_COMMIT=${GIT_COMMIT_SHORT}
                                --label org.opencontainers.image.created=\$(date -u +"%Y-%m-%dT%H:%M:%SZ")
                                --label org.opencontainers.image.version=${IMAGE_VERSION}
                                --label org.opencontainers.image.revision=${GIT_COMMIT_SHORT}
                                -f frontend/Dockerfile
                                frontend/
                            """)

                            // Tag with latest-ENV
                            sh "docker tag ${FRONTEND_DOCKER_IMAGE}:${DOCKER_TAG_FULL} ${FRONTEND_DOCKER_IMAGE}:latest-${DEPLOY_ENV}"
                        }
                    }
                }
            }
        }

        stage('Push to Nexus') {
            steps {
                script {
                    // Login to Nexus registry
                    withCredentials([usernamePassword(credentialsId: 'nexus-credentials', usernameVariable: 'NEXUS_USER', passwordVariable: 'NEXUS_PASS')]) {
                        sh "echo \$NEXUS_PASS | docker login -u \$NEXUS_USER --password-stdin ${DOCKER_REGISTRY}"
                    }

                    if (params.BUILD_BACKEND) {
                        echo "Pushing backend image to Nexus..."
                        sh "docker push ${BACKEND_DOCKER_IMAGE}:${DOCKER_TAG_FULL}"
                        sh "docker push ${BACKEND_DOCKER_IMAGE}:latest-${DEPLOY_ENV}"
                        echo "Backend image pushed: ${BACKEND_DOCKER_IMAGE}:${DOCKER_TAG_FULL}"
                    }

                    if (params.BUILD_FRONTEND) {
                        echo "Pushing frontend image to Nexus..."
                        sh "docker push ${FRONTEND_DOCKER_IMAGE}:${DOCKER_TAG_FULL}"
                        sh "docker push ${FRONTEND_DOCKER_IMAGE}:latest-${DEPLOY_ENV}"
                        echo "Frontend image pushed: ${FRONTEND_DOCKER_IMAGE}:${DOCKER_TAG_FULL}"
                    }
                }
            }
        }

        stage('Deploy to Kubernetes') {
            when {
                anyOf {
                    branch 'main'
                    branch 'master'
                    branch 'staging'
                    branch 'dev'
                }
            }
            steps {
                script {
                    echo "Deploying to ${DEPLOY_ENV} environment..."

                    // Update Kubernetes manifests with new image tags
                    sh """
                        if [ -d "k8s/manifests" ]; then
                            # Update image tags in deployment manifests
                            sed -i "s|image:.*${BACKEND_APP_NAME}:.*|image: ${DOCKER_GROUP_REGISTRY}/${DOCKER_REPO}/${BACKEND_APP_NAME}:${DOCKER_TAG_FULL}|g" k8s/manifests/*.yaml || true
                            sed -i "s|image:.*${FRONTEND_APP_NAME}:.*|image: ${DOCKER_GROUP_REGISTRY}/${DOCKER_REPO}/${FRONTEND_APP_NAME}:${DOCKER_TAG_FULL}|g" k8s/manifests/*.yaml || true

                            echo "Updated K8s manifests with image tag: ${DOCKER_TAG_FULL}"
                        fi
                    """

                    // Note: Actual kubectl apply would be done here or via ArgoCD
                    echo "Deployment manifest update complete"
                }
            }
        }
    }

    post {
        success {
            echo "Build and push successful!"
            echo "Backend Image: ${BACKEND_DOCKER_IMAGE}:${DOCKER_TAG_FULL}"
            echo "Frontend Image: ${FRONTEND_DOCKER_IMAGE}:${DOCKER_TAG_FULL}"
        }
        failure {
            echo "Build failed. Check logs for details."
        }
        always {
            // Clean up Docker images
            sh 'docker image prune -f || true'
        }
    }
}
