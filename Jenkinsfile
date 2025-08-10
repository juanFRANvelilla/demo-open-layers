pipeline {
    agent any

    environment {
        IMAGE_NAME = 'mi-angular-app'
        IMAGE_TAG = 'latest'
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main', url: 'https://github.com/juanFRANvelilla/demo-open-layers.git'
            }
        }

        stage('Install dependencies') {
            steps {
                sh 'npm install'
            }
        }

        stage('Build Angular app') {
            steps {
                sh 'npm run build -- --configuration development'
            }
        }

        stage('Build Docker image') {
            steps {
                script {
                    docker.build("${env.IMAGE_NAME}:${env.IMAGE_TAG}")
                }
            }
        }

        /*
        stage('Push Docker image') {
            steps {
                script {
                    docker.withRegistry('https://registry.hub.docker.com', 'docker-hub-credentials-id') {
                        docker.image("${env.IMAGE_NAME}:${env.IMAGE_TAG}").push()
                    }
                }
            }
        }
        */

        /*
        stage('Deploy') {
            steps {
                // Aquí comandos para desplegar
            }
        }
        */
    }
}
