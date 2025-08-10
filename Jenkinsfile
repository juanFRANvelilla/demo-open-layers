pipeline {
    agent any

    environment {
        IMAGE_NAME = 'mi-angular-app'
        IMAGE_TAG = 'latest'
    }

    stages {
        stage('Check Docker') {
            steps {
                sh 'docker --version || echo "Docker no está disponible"'
                sh 'which docker || echo "Comando docker no encontrado"'
                sh 'groups || id'
            }
        }
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Docker image') {
            steps {
                script {
                    docker.build("${env.IMAGE_NAME}:${env.IMAGE_TAG}")
                }
            }
        }

        stage('Deploy') {
            steps {
                script {
                    sh "docker rm -f angular-app-container || true"
                    sh "docker run -d --name angular-app-container -p 8080:80 ${env.IMAGE_NAME}:${env.IMAGE_TAG}"
                }
            }
        }
    }
}