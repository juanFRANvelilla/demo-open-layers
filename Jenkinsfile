pipeline {
    agent {
        kubernetes {
            inheritFrom 'kaniko'
            defaultContainer 'kaniko'
            yaml """
            apiVersion: v1
            kind: Pod
            spec:
              containers:
              - name: kaniko
                image: 'gcr.io/kaniko-project/executor:debug'
                command: ['sleep']
                args: ['infinity']
                volumeMounts:
                - name: docker-config
                  mountPath: /kaniko/.docker
                - name: ca-certificate
                  mountPath: /kaniko/.docker/certs/
              restartPolicy: Never
              volumes:
              - name: docker-config
                configMap:
                  name: docker-auth-config
              - name: ca-certificate
                hostPath:
                  path: /nfs/lab-jenkins/certs/
            """
        }
    }

    environment {
        REGISTRY_URL = "harbor.server.local"
        IMAGE_NAME = "danielbeltejar/demo-open-layers"
        IMAGE_TAG = "${BUILD_NUMBER}"
    }

    stages {
        stage('Checkout') {
            steps {
                container('kaniko') {
                    checkout scm
                }
            }
        }

        stage('Build & Push Docker Image') {
            steps {
                container('kaniko') {
                    sh """
                    /kaniko/executor \
                      --context=`pwd` \
                      --dockerfile=`pwd`/Dockerfile \
                      --destination=${REGISTRY_URL}/${IMAGE_NAME}:${IMAGE_TAG} \
                      --destination=${REGISTRY_URL}/${IMAGE_NAME}:latest \
                      --registry-certificate "${REGISTRY_URL}=/kaniko/.docker/certs/ca.crt" \
                      --cache=false
                    """
                }
            }
        }
    }
}
