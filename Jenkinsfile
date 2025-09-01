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
        stage('Run Tests') {
            steps {
                bat 'npx playwright test'
            }
        }
        stage('Publish Allure Report') {
            steps {
                bat 'npx allure generate allure-results --clean -o allure-report'
                bat 'npx allure open allure-report'
            }
        }
    }
/*    post {
        always {
            archiveArtifacts artifacts: 'allure-report/**', allowEmptyArchive: true
        }
        failure {
            mail to: 'vipul.thawait@example.com', subject: 'Build Failed', body: 'The Jenkins build has failed.'
        }
    }
*/
}
