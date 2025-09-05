pipeline {
    agent any
    tools {
        nodejs 'NodeJS 24' // Use the name you configured in Global Tool Configuration
    }
    environment {
        NODE_ENV = 'test'
    }
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        stage('Install Dependencies') {
            steps {
                bat 'npm install'
            }
        }
        stage('Preflight Secrets') {
            steps {
                withCredentials([
                    string(credentialsId: 'openai-api-key', variable: 'OPENAI_API_KEY'),
                    string(credentialsId: 'langfuse-public', variable: 'LANGFUSE_PUBLIC_KEY'),
                    string(credentialsId: 'langfuse-secret', variable: 'LANGFUSE_SECRET_KEY'),
                    string(credentialsId: 'langfuse-base-url', variable: 'LANGFUSE_BASE_URL')
                ]) {
                    bat '''
@echo off
setlocal EnableExtensions
set "missing="
if "%OPENAI_API_KEY%"=="" set "missing=1"
if "%LANGFUSE_PUBLIC_KEY%"=="" set "missing=1"
if "%LANGFUSE_SECRET_KEY%"=="" set "missing=1"
if "%LANGFUSE_BASE_URL%"=="" set "missing=1"
if defined missing (
  echo Required secrets are not configured. Please set OPENAI_API_KEY, LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY, and LANGFUSE_BASE_URL in Jenkins Credentials.
  exit /b 1
)
echo Secrets preflight passed (values are not printed).
'''
                }
            }
        }
        stage('Run Tests') {
            steps {
                withCredentials([
                    string(credentialsId: 'openai-api-key', variable: 'OPENAI_API_KEY'),
                    string(credentialsId: 'langfuse-public', variable: 'LANGFUSE_PUBLIC_KEY'),
                    string(credentialsId: 'langfuse-secret', variable: 'LANGFUSE_SECRET_KEY'),
                    string(credentialsId: 'langfuse-base-url', variable: 'LANGFUSE_BASE_URL')
                ]) {
                    bat 'npx playwright test'
                }
            }
        }
        stage('Publish Allure Report') {
            steps {
                bat 'npx allure generate allure-results --clean -o allure-report'
                bat 'npx allure open allure-report'
            }
        }
    }
    post {
        always {
            archiveArtifacts artifacts: 'allure-results/**', allowEmptyArchive: true
            archiveArtifacts artifacts: 'allure-report/**', allowEmptyArchive: true
        }
/*        failure {
            mail to: 'vipul.thawait@generativeai.com', subject: 'Build Failed', body: 'The Jenkins build has failed.'
        }
*/
    }
}
