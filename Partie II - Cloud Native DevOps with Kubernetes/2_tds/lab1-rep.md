# lancement du docker demo
![alt text](lab1/Screenshot_1.png)

# Creation image myhello
![alt text](lab1/Screenshot_2.png)

# Exercice
![alt text](lab1/Screenshot_3.png)

# changer port
![alt text](lab1/Screenshot_4.png)

# Connexion ID
docker login        
Authenticating with existing credentials... [Username: warrikard]
i Info → To login with a different account, run 'docker logout' followed by 'docker login'
Login Succeeded

# push image
docker image push warrikard/myhello
Using default tag: latest
The push refers to repository [docker.io/warrikard/myhello]
7b4e15e4c7fd: Pushed
924d0f7a9be3: Pushed
latest: digest: sha256:04245b7f615e762611927cb6514425e80bc663fed9fb11eeacbf89a0e25a2618 size: 855
![alt text](lab1/Screenshot_5.png)

# Exécution de l'application de démonstration
![alt text](lab1/Screenshot_6.png)
![alt text](lab1/Screenshot_7.png)
kubectl port-forward pod/demo 9999:8888
Forwarding from 127.0.0.1:9999 -> 8888
Forwarding from [::1]:9999 -> 8888
Handling connection for 9999
Handling connection for 9999








