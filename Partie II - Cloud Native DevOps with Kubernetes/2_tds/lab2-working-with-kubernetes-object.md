## LAB 2 - Working with Kubernetes Objects

> **Auteur** : Badr TAJINI - Cloud-native-DevOps-with-Kubernetes - ESIEE - 2024/2025

---


Dans le **[lab 1]**, vous avez construit et déployé une application sur Kubernetes. Dans ce lab, vous allez découvrir les objets fondamentaux de Kubernetes impliqués dans ce processus : les Pods, les Déploiements (Deployments) et les Services. Vous découvrirez également comment utiliser l'outil essentiel Helm pour gérer les applications dans Kubernetes.

Après avoir suivi l'exemple dans la section ["Exécution de l'application de démonstration"](Lab 1), vous devriez avoir une image de conteneur s'exécutant dans le cluster Kubernetes, mais comment cela fonctionne-t-il réellement ? En coulisses, la commande `kubectl run` crée une ressource Kubernetes appelée Déploiement (Deployment). Alors, qu'est-ce que c'est ? Et comment un Déploiement exécute-t-il réellement votre image de conteneur ?

## Déploiements (Deployments)

Repensez à la façon dont vous avez exécuté l'application de démonstration avec Docker. La commande `docker container run` a démarré le conteneur, et il a fonctionné jusqu'à ce que vous l'arrêtiez avec `docker stop`.

Mais supposons que le conteneur se termine pour une autre raison : peut-être que le programme a planté, qu'il y a eu une erreur système, que votre machine a manqué d'espace disque ou qu'un rayon cosmique a frappé votre CPU au mauvais moment (peu probable, mais cela arrive). En supposant qu'il s'agisse d'une application de production, cela signifie que vous avez maintenant des utilisateurs mécontents, jusqu'à ce que quelqu'un puisse accéder à un terminal et taper `docker container run` pour redémarrer le conteneur.

C'est un arrangement insatisfaisant. Ce que vous voulez vraiment, c'est une sorte de programme superviseur qui vérifie en permanence que le conteneur est en cours d'exécution et, s'il s'arrête, le redémarre immédiatement. Sur les serveurs traditionnels, vous pouvez utiliser un outil comme `systemd`, `runit` ou `supervisord` pour ce faire ; Docker a quelque chose de similaire, et vous ne serez pas surpris d'apprendre que Kubernetes a également une fonction de supervision : le Déploiement (Deployment).

## Supervision et Ordonnancement

Pour chaque programme que Kubernetes doit superviser, il crée un objet Déploiement (Deployment) correspondant, qui enregistre certaines informations sur le programme : le nom de l'image du conteneur, le nombre de réplicas que vous souhaitez exécuter et tout ce qu'il doit savoir pour démarrer le conteneur.

Un type de composant Kubernetes appelé contrôleur travaille en collaboration avec la ressource Déploiement. Les contrôleurs sont essentiellement des morceaux de code qui s'exécutent en boucle continue et surveillent les ressources dont ils sont responsables, en s'assurant qu'elles sont présentes et fonctionnent. Si un Déploiement donné n'exécute pas suffisamment de réplicas, pour une raison quelconque, le contrôleur en créera de nouveaux. (S'il y avait trop de réplicas pour une raison quelconque, le contrôleur arrêterait les réplicas en excès. Quoi qu'il en soit, le contrôleur s'assure que l'état réel correspond à l'état souhaité.)

En fait, un Déploiement ne gère pas directement les réplicas : à la place, il crée automatiquement un objet associé appelé ReplicaSet, qui s'en charge. Nous parlerons plus en détail des ReplicaSets dans un instant dans la section **["ReplicaSets"](section au dessous)**, mais comme vous n'interagissez généralement qu'avec les Déploiements, familiarisons-nous d'abord avec eux.

## Redémarrage des conteneurs

À première vue, la façon dont les Déploiements se comportent peut être un peu surprenante. Si votre conteneur termine son travail et se termine, le Déploiement le redémarrera. S'il plante, ou si vous le tuez avec un signal, ou le terminez avec `kubectl`, le Déploiement le redémarrera. (C'est ainsi que vous devriez y penser conceptuellement ; la réalité est un peu plus compliquée, comme nous le verrons.)

La plupart des applications Kubernetes sont conçues pour être durables et fiables, donc ce comportement a du sens : les conteneurs peuvent se terminer pour toutes sortes de raisons, et dans la plupart des cas, tout ce qu'un opérateur humain ferait est de les redémarrer, c'est donc ce que Kubernetes fait par défaut.

Il est possible de modifier cette politique pour un conteneur individuel : par exemple, pour ne jamais le redémarrer, ou pour le redémarrer uniquement en cas d'échec, et non s'il s'est terminé normalement (voir **["Politiques de redémarrage"](Lab 4)**). Cependant, le comportement par défaut (redémarrer toujours) est généralement ce que vous voulez.

Le travail d'un Déploiement est de surveiller les conteneurs qui lui sont associés et de s'assurer que le nombre spécifié d'entre eux est toujours en cours d'exécution. S'il y en a moins, il en démarrera plus. S'il y en a trop, il en arrêtera certains. C'est beaucoup plus puissant et flexible qu'un programme de type superviseur traditionnel.

## Création de Déploiements (Deployments)

Allez-y et créez un Déploiement en utilisant notre image de conteneur de démonstration dans votre environnement Kubernetes local afin que nous puissions plonger dans leur fonctionnement :

```bash
kubectl create deployment demo --image=cloudnatived/demo:hello
deployment.apps/demo created
```

Vous pouvez voir tous les Déploiements actifs dans votre espace de noms actuel (voir **["Utilisation des espaces de noms"](Lab 3)**) en exécutant la commande suivante :

```bash
kubectl get deployments
NAME   READY   UP-TO-DATE   AVAILABLE   AGE
demo   1/1     1            1           37s
```

Pour obtenir des informations plus détaillées sur ce Déploiement spécifique, exécutez la commande suivante :

```bash
kubectl describe deployments/demo
Name:                   demo
Namespace:              default
...
Labels:                 app=demo
Annotations:            deployment.kubernetes.io/revision: 1
Selector:               app=demo
...
```

Comme vous pouvez le voir, il y a beaucoup d'informations ici, dont la plupart ne sont pas importantes pour le moment. Examinons de plus près la section `Pod Template`, cependant :

```yaml
Pod Template:
  Labels:  app=demo
  Containers:
   demo:
    Image:        cloudnatived/demo:hello
    Port:         <none>
    Host Port:    <none>
    Environment:  <none>
    Mounts:       <none>
  Volumes:        <none>
...
```

Vous savez qu'un Déploiement contient les informations dont Kubernetes a besoin pour exécuter le conteneur, et les voici. Mais qu'est-ce qu'un `Pod Template` ? En fait, avant de répondre à cela, qu'est-ce qu'un Pod ?

## Pods

Un Pod est l'objet Kubernetes qui représente un groupe d'un ou plusieurs conteneurs (pod est également le nom d'un groupe de baleines, ce qui correspond à la saveur vaguement maritime des métaphores de Kubernetes).

Pourquoi un Déploiement ne gère-t-il pas simplement un conteneur individuel directement ? La réponse est que parfois un ensemble de conteneurs doit être planifié ensemble, s'exécutant sur le même nœud et communiquant localement, partageant peut-être du stockage. C'est là que Kubernetes commence à dépasser la simple exécution de conteneurs directement sur un hôte en utilisant quelque chose comme Docker. Il gère des combinaisons entières de conteneurs, leur configuration et leur stockage, etc. sur un cluster de nœuds.

Par exemple, une application de blog peut avoir un conteneur qui synchronise le contenu avec un référentiel Git et un conteneur de serveur Web NGINX qui sert le contenu du blog aux utilisateurs. Puisqu'ils partagent des données, les deux conteneurs doivent être planifiés ensemble dans un Pod. En pratique, cependant, de nombreux Pods n'ont qu'un seul conteneur, comme dans ce cas. (Voir **["Que doit contenir un Pod ?"](Lab 8)** pour en savoir plus à ce sujet.)

Donc, une spécification de Pod (spec en abrégé) a une liste de `containers`, et dans notre exemple, il n'y a qu'un seul conteneur, `demo` :

```yaml
demo:
 Image:        cloudnatived/demo:hello
```

La spécification `Image` est notre image de conteneur Docker de démonstration de Docker Hub, qui est toute l'information dont un Déploiement Kubernetes a besoin pour démarrer le Pod et le maintenir en fonctionnement.

Et c'est un point important. La commande `kubectl create deployment` n'a pas réellement créé le Pod directement. Au lieu de cela, elle a créé un Déploiement, puis le Déploiement a créé un ReplicaSet, qui a créé le Pod. Le Déploiement est une déclaration de votre état souhaité : "Un Pod devrait être en cours d'exécution avec le conteneur de démonstration à l'intérieur."

## ReplicaSets

Les Déploiements ne gèrent pas les Pods directement. C'est le travail de l'objet ReplicaSet.

Un ReplicaSet est responsable d'un groupe de Pods identiques, ou réplicas. S'il y a trop peu (ou trop) de Pods, par rapport à la spécification, le contrôleur ReplicaSet démarrera (ou arrêtera) certains Pods pour rectifier la situation.

Les Déploiements, à leur tour, gèrent les ReplicaSets et contrôlent la façon dont les réplicas se comportent lorsque vous les mettez à jour, en déployant une nouvelle version de votre application. Lorsque vous mettez à jour le Déploiement, un nouveau ReplicaSet est créé pour gérer les nouveaux Pods, et lorsque la mise à jour est terminée, l'ancien ReplicaSet et ses Pods sont terminés.

Ainsi, chaque ReplicaSet (V1, V2, V3) par exemple, représente une version différente de l'application, avec ses Pods correspondants.


Habituellement, vous n'interagirez pas directement avec les ReplicaSets, car les Déploiements font le travail pour vous, mais il est utile de savoir ce qu'ils sont.

## Maintien de l'état souhaité

Les contrôleurs Kubernetes vérifient continuellement l'état souhaité spécifié par chaque ressource par rapport à l'état réel du cluster, et apportent les ajustements nécessaires pour les maintenir synchronisés. Ce processus est appelé la boucle de réconciliation, car il boucle pour toujours, essayant de réconcilier l'état réel avec l'état souhaité.

Par exemple, lorsque vous créez le Déploiement de démonstration pour la première fois, il n'y a pas de Pod de démonstration en cours d'exécution. Kubernetes démarrera donc le Pod requis immédiatement. S'il s'arrête, Kubernetes le redémarrera, tant que le Déploiement existe toujours.

Vérifions cela dès maintenant en supprimant le Pod manuellement. Tout d'abord, vérifiez que le Pod est bien en cours d'exécution :

```bash
kubectl get pods --selector app=demo
NAME                    READY   STATUS    RESTARTS   AGE
demo-794889fc8d-5ddsg   1/1     Running   0          33s
```

Notez que le nom du Pod sera unique pour vous. Vous pouvez également voir le ReplicaSet qui a créé ce Pod en exécutant :

```bash
kubectl get replicaset --selector app=demo
NAME              DESIRED   CURRENT   READY   AGE
demo-794889fc8d   1         1         1       64s
```

Voyez-vous comment le ReplicaSet a un ID généré aléatoirement qui correspond à la partie initiale du nom du Pod de démonstration ci-dessus ? Dans cet exemple, le ReplicaSet `demo-794889fc8d` a créé un Pod nommé `demo-794889fc8d-5ddsg`.

Maintenant, exécutez la commande suivante pour supprimer le Pod :

```bash
kubectl delete pods --selector app=demo
pod "demo-794889fc8d-bdbcp" deleted
```

Listez les Pods à nouveau :

```bash
kubectl get pods --selector app=demo
NAME                    READY     STATUS        RESTARTS   AGE
demo-794889fc8d-qbcxm   1/1       Running       0          5s
demo-794889fc8d-bdbcp   0/1       Terminating   0          1h
```

Vous pouvez attraper le Pod d'origine en train de s'arrêter (son statut est `Terminating`), mais il a déjà été remplacé par un nouveau Pod, qui n'a que cinq secondes. Vous pouvez également voir que le nouveau Pod a le même ReplicaSet, `demo-794889fc8d`, mais un nouveau nom de Pod unique `demo-794889fc8d-qbcxm`. C'est la boucle de réconciliation au travail.

Vous avez dit à Kubernetes, au moyen du Déploiement que vous avez créé, que le Pod de démonstration devrait toujours exécuter un réplica. Il vous prend au mot, et même si vous supprimez le Pod vous-même, Kubernetes suppose que vous avez dû faire une erreur, et démarre un nouveau Pod pour le remplacer pour vous.

Une fois que vous avez fini d'expérimenter avec le Déploiement, arrêtez-le et nettoyez en utilisant la commande suivante :

```bash
kubectl delete all --selector app=demo
pod "demo-794889fc8d-qbcxm" deleted
deployment.apps "demo" deleted
replicaset.apps "demo-794889fc8d" deleted
```

## L'ordonnanceur (Scheduler) de Kubernetes

Nous avons dit des choses comme le Déploiement créera des Pods et Kubernetes démarrera le Pod requis, sans vraiment expliquer comment cela se passe.

L'ordonnanceur de Kubernetes est le composant responsable de cette partie du processus. Lorsqu'un Déploiement (via son ReplicaSet associé) décide qu'un nouveau réplica est nécessaire, il crée une ressource Pod dans la base de données Kubernetes. Simultanément, ce Pod est ajouté à une file d'attente, qui est comme la boîte de réception de l'ordonnanceur.

Le travail de l'ordonnanceur est de surveiller sa file d'attente de Pods non planifiés, de prendre le prochain Pod de celle-ci et de trouver un nœud sur lequel l'exécuter. Il utilisera quelques critères différents, y compris les demandes de ressources du Pod, pour choisir un nœud approprié, en supposant qu'il y en ait un de disponible nous parlerons plus en détail de ce processus dans le **[lab 3]**.

Une fois que le Pod a été planifié sur un nœud, la kubelet s'exécutant sur ce nœud le récupère et s'occupe de démarrer réellement ses conteneurs.

Lorsque vous avez supprimé un Pod dans **["Maintien de l'état souhaité"](vori section au-dessus)**, c'est le ReplicaSet qui l'a repéré et a démarré un remplacement. Il sait qu'un Pod de démonstration devrait être en cours d'exécution sur son nœud, et s'il n'en trouve pas, il en démarrera un. (Que se passerait-il si vous arrêtiez complètement le nœud ? Ses Pods deviendraient non planifiés et retourneraient dans la file d'attente de l'ordonnanceur, pour être réaffectés à d'autres nœuds.)

L'ingénieure de Stripe, Julia Evans, a écrit une explication délicieusement claire de [la façon dont la planification fonctionne dans Kubernetes](https://jvns.ca/blog/2017/07/27/how-does-the-kubernetes-scheduler-work/).

## Manifestes de ressources au format YAML

Maintenant que vous savez comment exécuter une application dans Kubernetes, est-ce tout ? Avez-vous terminé ? Pas tout à fait. Utiliser la commande `kubectl create` pour créer un Déploiement est utile, mais limité. Supposons que vous souhaitiez modifier quelque chose dans la spécification du Déploiement : le nom ou la version de l'image, par exemple. Vous pourriez supprimer le Déploiement existant (en utilisant `kubectl delete`) et en créer un nouveau avec les bons champs. Mais voyons si nous pouvons faire mieux.

Parce que Kubernetes est intrinsèquement un système déclaratif, réconciliant continuellement l'état réel avec l'état souhaité, tout ce que vous avez à faire est de modifier l'état souhaité (la spécification du Déploiement) et Kubernetes fera le reste. Comment faites-vous cela ?

## Les ressources sont des données

Toutes les ressources Kubernetes, telles que les Déploiements ou les Pods, sont représentées par des enregistrements dans sa base de données interne. La boucle de réconciliation surveille la base de données pour tout changement apporté à ces enregistrements et prend les mesures appropriées. En fait, tout ce que fait la commande `kubectl create` est d'ajouter un nouvel enregistrement dans la base de données correspondant à un Déploiement, et Kubernetes fait le reste.

Mais vous n'avez pas besoin d'utiliser `kubectl create` pour interagir avec Kubernetes. Vous pouvez également créer et modifier le manifeste de la ressource (la spécification de l'état souhaité de la ressource) directement. Vous pouvez (et devriez) conserver le fichier manifeste dans un système de contrôle de version, et au lieu d'exécuter des commandes impératives pour effectuer des modifications à la volée, vous pouvez modifier vos fichiers manifestes, puis dire à Kubernetes de lire les données mises à jour.

## Manifestes de Déploiement (Deployment)

Le format habituel des fichiers manifestes Kubernetes est YAML, bien qu'il puisse également comprendre le format JSON. Alors, à quoi ressemble le manifeste YAML pour un Déploiement ?

Jetez un œil à notre exemple pour l'application de démonstration (`hello-k8s/k8s/deployment.yaml`) :

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: demo
  labels:
    app: demo
spec:
  replicas: 1
  selector:
    matchLabels:
      app: demo
  template:
    metadata:
      labels:
        app: demo
    spec:
      containers:
        - name: demo
          image: cloudnatived/demo:hello
          ports:
          - containerPort: 8888
```

À première vue, cela semble compliqué, mais c'est principalement du boilerplate. Les seules parties intéressantes sont les mêmes informations que vous avez déjà vues sous différentes formes : le nom de l'image du conteneur et le port. Lorsque vous avez donné ces informations à `kubectl create` plus tôt, il a créé l'équivalent de ce manifeste YAML en coulisses et l'a soumis à Kubernetes.

## Utilisation de `kubectl apply`

Pour utiliser toute la puissance de Kubernetes en tant que système d'infrastructure déclarative en tant que code, soumettez vous-même des manifestes YAML au cluster, en utilisant la commande `kubectl apply`.

Essayez-le avec l'exemple de manifeste de Déploiement, `hello-k8s/k8s/deployment.yaml` - **code joint avec le lab**.

Exécutez les commandes suivantes dans votre copie clonée du référentiel de démonstration :

```bash
cd hello-k8s
kubectl apply -f k8s/deployment.yaml
deployment.apps "demo" created
```

Après quelques secondes, un Pod de démonstration devrait être en cours d'exécution :

```bash
kubectl get pods --selector app=demo
NAME                   READY   STATUS    RESTARTS   AGE
demo-c77cc8d6f-nc6fm   1/1     Running   0          13s
```

Nous n'avons pas tout à fait terminé, cependant, car pour nous connecter au Pod de démonstration avec un navigateur Web, nous allons créer un Service, qui est une ressource Kubernetes qui vous permet de vous connecter à vos Pods déployés (plus d'informations à ce sujet dans un instant).

Tout d'abord, explorons ce qu'est un Service et pourquoi nous en avons besoin.

## Ressources de Service

Supposons que vous souhaitiez établir une connexion réseau à un Pod (comme notre exemple d'application). Comment faites-vous cela ? Vous pourriez trouver l'adresse IP du Pod et vous connecter directement à cette adresse et au numéro de port de l'application. Mais l'adresse IP peut changer lorsque le Pod est redémarré, vous devrez donc continuer à la rechercher pour vous assurer qu'elle est à jour.

Pire encore, il peut y avoir plusieurs réplicas du Pod, chacun avec des adresses différentes. Chaque autre application qui doit contacter le Pod devrait maintenir une liste de ces adresses, ce qui ne semble pas être une bonne idée.

Heureusement, il existe un meilleur moyen : une ressource Service vous donne une adresse IP unique et immuable ou un nom DNS qui sera automatiquement acheminé vers n'importe quel Pod correspondant. Plus loin dans **["Ingress"](Lab 3)**, nous parlerons de la ressource Ingress, qui permet un routage plus avancé et l'utilisation de certificats TLS.

Mais pour l'instant, examinons de plus près le fonctionnement d'un Service Kubernetes.

Vous pouvez considérer un Service comme étant un proxy Web ou un équilibreur de charge, transmettant les requêtes à un ensemble de Pods backend. Cependant, il n'est pas limité aux ports Web : un Service peut transférer le trafic de n'importe quel port vers n'importe quel autre port, comme détaillé dans la partie `ports` de la spécification.

Voici le manifeste YAML du Service pour notre application de démonstration :

```yaml
apiVersion: v1
kind: Service
metadata:
  name: demo
  labels:
    app: demo
spec:
  ports:
  - port: 8888
    protocol: TCP
    targetPort: 8888
  selector:
    app: demo
  type: ClusterIP
```

Vous pouvez voir qu'il ressemble quelque peu à la ressource de Déploiement que nous avons montrée plus tôt. Cependant, le `kind` est `Service`, au lieu de `Deployment`, et la `spec` inclut simplement une liste de `ports`, plus un `selector` et un `type`.

Si vous zoomez un peu, vous pouvez voir que le Service transmet son port 8888 au port 8888 du Pod :

```yaml
...
ports:
- port: 8888
  protocol: TCP
  targetPort: 8888
```

Le `selector` est la partie qui indique au Service comment acheminer les requêtes vers des Pods particuliers. Les requêtes seront transmises à tous les Pods correspondant à l'ensemble spécifié d'étiquettes ; dans ce cas, juste `app: demo` (voir **["Étiquettes"](Lab 3)**. Dans notre exemple, il n'y a qu'un seul Pod qui correspond, mais s'il y avait plusieurs Pods, le Service enverrait chaque requête à un Pod sélectionné au hasard.

À cet égard, un Service Kubernetes est un peu comme un équilibreur de charge traditionnel, et, en fait, les Services et les Ingresses peuvent automatiquement créer des équilibreurs de charge cloud (voir **["Ingress"](Lab 3)**.

Pour l'instant, la principale chose à retenir est qu'un Déploiement gère un ensemble de Pods pour votre application, et un Service vous donne un point d'entrée unique pour les requêtes vers ces Pods.

Allez-y et appliquez le manifeste maintenant, pour créer le Service :

```bash
kubectl apply -f k8s/service.yaml
service "demo" created

kubectl port-forward service/demo 9999:8888
Forwarding from 127.0.0.1:9999 -> 8888
Forwarding from [::1]:9999 -> 8888
```

Comme auparavant, `kubectl port-forward` connectera le pod de démonstration à un port de votre machine locale afin que vous puissiez vous connecter à _http://localhost:9999/_ avec votre navigateur Web.

Une fois que vous êtes satisfait que tout fonctionne correctement, exécutez la commande suivante pour nettoyer avant de passer à la section suivante :

```bash
kubectl delete -f k8s/
deployment.apps "demo" deleted
service "demo" deleted
```

Astuce
Vous pouvez utiliser `kubectl delete` avec un sélecteur d'étiquette, comme nous l'avons fait plus tôt, pour supprimer toutes les ressources qui correspondent au sélecteur (voir **["Étiquettes"](Lab 3)**. Alternativement, vous pouvez utiliser `kubectl delete -f`, comme ici, avec un répertoire de manifestes. Toutes les ressources décrites par les fichiers manifestes seront supprimées.

## Exercice
Modifiez le fichier `k8s/deployment.yaml` pour changer le nombre de réplicas à 3. Réappliquez le manifeste en utilisant `kubectl apply` et vérifiez que vous obtenez trois Pods de démonstration au lieu d'un, en utilisant `kubectl get pods`.
## Interrogation du cluster avec `kubectl`

L'outil `kubectl` est le couteau suisse de Kubernetes : il applique la configuration, crée, modifie et détruit des ressources, et peut également interroger le cluster pour obtenir des informations sur les ressources qui existent, ainsi que sur leur état.

Nous avons déjà vu comment utiliser `kubectl get` pour interroger les Pods et les Déploiements. Vous pouvez également l'utiliser pour voir quels nœuds existent dans votre cluster.

Si vous exécutez minikube, cela devrait ressembler à ceci :

```bash
kubectl get nodes
NAME       STATUS   ROLES                  AGE   VERSION
minikube   Ready    control-plane,master   17d   v1.21.2
```

Si vous souhaitez voir les ressources de tous types, utilisez `kubectl get all`. (En fait, cela n'affiche pas littéralement toutes les ressources, juste les types les plus courants, mais nous n'allons pas chicaner à ce sujet pour le moment.)

Pour voir des informations complètes sur un Pod individuel (ou toute autre ressource), utilisez `kubectl describe` :

```bash
kubectl describe pod/demo-dev-6c96484c48-69vss
Name:         demo-794889fc8d-7frgb
Namespace:    default
Priority:     0
Node:         minikube/192.168.49.2
Start Time:   Mon, 02 Aug 2021 13:21:25 -0700
...
Containers:
  demo:
    Container ID:   docker://646aaf7c4baf6d...
    Image:          cloudnatived/demo:hello
...
Conditions:
  Type           Status
  Initialized    True
  Ready          True
  PodScheduled   True
...
Events:
  Type    Reason     Age   From               Message
  ----    ------     ----  ----               -------
  Normal  Scheduled  1d    default-scheduler  Successfully assigned demo-dev...
  Normal  Pulling    1d    kubelet            pulling image "cloudnatived/demo...
...
```

Dans l'exemple de sortie, vous pouvez voir que `kubectl` vous donne des informations de base sur le conteneur lui-même, y compris son identifiant d'image et son état, ainsi qu'une liste ordonnée d'événements qui sont arrivés au conteneur. 

## Faire passer les ressources au niveau supérieur

Vous savez maintenant tout ce que vous devez savoir pour déployer des applications sur des clusters Kubernetes à l'aide de manifestes YAML déclaratifs. Mais il y a beaucoup de répétitions dans ces fichiers : par exemple, vous avez répété le nom `demo`, le sélecteur d'étiquette `app: demo` et le port `8888` plusieurs fois.

Ne devriez-vous pas être en mesure de spécifier ces valeurs une seule fois, puis de les référencer partout où elles apparaissent dans les manifestes Kubernetes ?

Par exemple, il serait formidable de pouvoir définir des variables appelées quelque chose comme `container.name` et `container.port`, puis de les utiliser partout où elles sont nécessaires dans les fichiers YAML. Ensuite, si vous deviez modifier le nom de l'application ou le numéro de port sur lequel elle écoute, vous n'auriez qu'à les modifier à un seul endroit, et tous les manifestes seraient mis à jour automatiquement.

Heureusement, il existe un outil pour cela, et dans la dernière section de ce lab, nous allons vous montrer un peu de ce qu'il peut faire.

## Helm : un gestionnaire de paquets Kubernetes

Un gestionnaire de paquets populaire pour Kubernetes s'appelle Helm, et il fonctionne exactement comme nous l'avons décrit dans la section précédente. Vous pouvez utiliser l'outil de ligne de commande `helm` pour installer et configurer des applications (les vôtres ou celles de n'importe qui d'autre), et vous pouvez créer des paquets appelés charts Helm, qui spécifient complètement les ressources nécessaires pour exécuter l'application, ses dépendances et ses paramètres configurables.

Helm fait partie de la famille de projets de la Cloud Native Computing Foundation, ce qui reflète sa stabilité et son adoption généralisée.

Remarque
Il est important de réaliser qu'un chart Helm, contrairement aux paquets logiciels binaires utilisés par des outils comme APT ou Yum, n'inclut pas réellement l'image du conteneur elle-même. Au lieu de cela, il contient simplement des métadonnées sur l'endroit où l'image peut être trouvée, tout comme le fait un Déploiement Kubernetes.

Lorsque vous installez le chart, Kubernetes lui-même localisera et téléchargera l'image du conteneur binaire à partir de l'endroit que vous avez spécifié. En fait, un chart Helm n'est vraiment qu'un wrapper pratique autour des manifestes YAML Kubernetes.

## Installation de Helm

Suivez les [instructions d'installation de Helm](https://helm.sh/docs/intro/install/) pour votre système d'exploitation.

Pour vérifier que Helm est installé et fonctionne, exécutez :

```bash
helm version
version.BuildInfo{Version:"v3...GoVersion:"go1.16.5"}
```

Une fois que cette commande réussit, vous êtes prêt à commencer à utiliser Helm.

## Installation d'un chart Helm

À quoi ressemblerait le chart Helm pour notre application de démonstration ? Dans le répertoire `hello-helm3`, vous verrez un sous-répertoire `k8s`, qui dans l'exemple précédent (`hello-k8s`) ne contenait que les fichiers manifestes Kubernetes pour déployer l'application. Maintenant, il contient un chart Helm, dans le répertoire `demo` :

```bash
ls k8s/demo
Chart.yaml  production-values.yaml  staging-values.yaml  templates  values.yaml
```

Nous verrons à quoi servent tous ces fichiers, mais pour l'instant, utilisons Helm pour installer l'application de démonstration. Tout d'abord, nettoyez les ressources de tous les déploiements précédents :

```bash
kubectl delete all --selector app=demo
```

Ensuite, exécutez la commande suivante :

```bash
helm upgrade --install demo ./k8s/demo
NAME: demo
LAST DEPLOYED: Mon Aug  2 13:37:21 2021
NAMESPACE: default
STATUS: deployed
REVISION: 1
TEST SUITE: None
```

Si vous utilisez vos commandes `kubectl get deployment` et `kubectl get service` que vous avez apprises plus tôt, vous verrez que Helm a créé une ressource de Déploiement (qui démarre un Pod) et un Service, tout comme dans les exemples précédents. La commande `helm upgrade --install` crée également un Secret Kubernetes avec un type de `helm.sh/release.v1` pour suivre la release.

## Charts, référentiels et releases

Ce sont les trois termes Helm les plus importants que vous devez connaître :

*   Un **chart** est un paquet Helm, contenant toutes les définitions de ressources nécessaires pour exécuter une application dans Kubernetes.
*   Un **référentiel** est un endroit où les charts peuvent être collectés et partagés.
*   Une **release** est une instance particulière d'un chart s'exécutant dans un cluster Kubernetes.

Il existe quelques parallèles avec les ressources Helm aux conteneurs Docker :

*   Un **référentiel Helm** est un serveur où les charts sont stockés et téléchargés à partir de clients, de la même manière qu'un registre de conteneurs stocke et sert des images de conteneurs, comme Docker Hub.
*   Une **release Helm** est lorsqu'un chart est installé dans un cluster, un peu comme lorsqu'une image Docker publiée est lancée en tant que conteneur en cours d'exécution.

Les charts Helm peuvent être téléchargés et installés à partir de serveurs de référentiel, ou installés directement en pointant vers un chemin local d'un répertoire contenant les fichiers YAML Helm sur le système de fichiers.

Un chart peut être installé plusieurs fois dans le même cluster. Par exemple, vous pouvez exécuter plusieurs copies du chart Redis pour diverses applications, chacune servant de backend pour différents sites Web. Chaque instance distincte du chart Helm est une release distincte.

Vous pouvez également installer quelque chose de manière centralisée dans votre cluster utilisé par toutes vos applications, comme **[Prometheus](https://github.com/prometheus-community/helm-charts)** pour la surveillance centralisée, ou le **[contrôleur Ingress NGINX](https://github.com/kubernetes/ingress-nginx)** pour gérer les requêtes Web entrantes.

## Liste des releases Helm

Pour vérifier quelles releases vous avez en cours d'exécution à tout moment, exécutez `helm list` :

```bash
helm list
NAME  NAMESPACE REVISION  UPDATED STATUS    CHART
demo  default   1         ...     deployed  demo-1.0.1
```

Pour voir l'état exact d'une release particulière, exécutez `helm status` suivi du nom de la release. Vous verrez les mêmes informations que celles que vous avez vues lorsque vous avez déployé la release pour la première fois.

***INFO** : Pour l'instant, sachez simplement que Helm est un moyen pratique d'installer des applications à partir de charts publics.
De nombreuses applications populaires sont hébergées dans divers référentiels Helm et maintenues par les fournisseurs de paquets. Vous pouvez ajouter des référentiels Helm et installer leurs charts, et vous pouvez également héberger et publier vos propres charts Helm pour vos propres applications.*

###### Astuce

Vous pouvez voir de nombreux exemples de charts Helm populaires hébergés sur [Artifact Hub](https://artifacthub.io/), un autre projet CNCF.

## Résumé

Les points clés que vous devez connaître pour le moment sont les suivants :

*   Le Pod est l'unité de travail fondamentale dans Kubernetes, spécifiant un seul conteneur ou un groupe de conteneurs communicants qui sont planifiés ensemble.
*   Un Déploiement est une ressource Kubernetes de haut niveau qui gère les Pods de manière déclarative, les déployant, les planifiant, les mettant à jour et les redémarrant si nécessaire.
*   Un Service est l'équivalent Kubernetes d'un équilibreur de charge ou d'un proxy, acheminant le trafic vers ses Pods correspondants via une adresse IP ou un nom DNS unique, bien connu et durable.
*   L'ordonnanceur Kubernetes surveille les Pods qui ne sont pas encore exécutés sur un nœud, trouve un nœud approprié pour eux et demande à la kubelet de ce nœud d'exécuter le Pod.
*   Les ressources telles que les Déploiements sont représentées par des enregistrements dans la base de données interne de Kubernetes. Extérieurement, ces ressources peuvent être représentées par des fichiers texte (appelés *manifestes*) au format YAML. Le manifeste est une déclaration de l'état souhaité de la ressource.
*   `kubectl` est le principal outil d'interaction avec Kubernetes, vous permettant d'appliquer des manifestes, d'interroger des ressources, d'effectuer des modifications, de supprimer des ressources et d'effectuer de nombreuses autres tâches.
*   Helm est un gestionnaire de paquets Kubernetes. Il simplifie la configuration et le déploiement des applications Kubernetes, vous permettant d'utiliser un seul ensemble de manifestes et de modèles groupés utilisés pour générer des fichiers YAML Kubernetes paramétrés, au lieu de devoir maintenir vous-même les fichiers YAML bruts.



