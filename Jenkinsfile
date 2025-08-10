pipeline {
    agent {
        docker {
            image 'docker:24.0.5' // Imagen con cliente Docker
            args '--network host -v /var/run/docker.sock:/var/run/docker.sock'
        }
    }

    environment {
        IMAGE_NAME = "miusuario/demo-open-layers"
        IMAGE_TAG = "latest"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    docker.build("${IMAGE_NAME}:${IMAGE_TAG}")
                }
            }
        }

        stage('Run Container (Optional)') {
            steps {
                script {
                    // Esto solo es para pruebas en Jenkins, no para producción
                    sh "docker run -d -p 8080:8080 --name demo-open-layers ${IMAGE_NAME}:${IMAGE_TAG}"
                }
            }
        }

        stage('Push to Registry (Optional)') {
            when {
                expression { return env.DOCKERHUB_USER && env.DOCKERHUB_PASS }
            }
            steps {
                script {
                    docker.withRegistry('https://index.docker.io/v1/', 'dockerhub-credentials-id') {
                        docker.image("${IMAGE_NAME}:${IMAGE_TAG}").push()
                    }
                }
            }
        }
    }

    post {
        always {
            sh 'docker ps -a'
        }
        cleanup {
            sh 'docker rm -f demo-open-layers || true'
        }
    }
}
