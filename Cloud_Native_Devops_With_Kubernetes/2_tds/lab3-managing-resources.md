## LAB 3 - Managing Resources

> **Auteur** : Badr TAJINI - Cloud-native-DevOps-with-Kubernetes - ESIEE - 2024/2025

---


Dans ce lab, nous verrons comment tirer le meilleur parti de votre cluster : comment gérer et optimiser l'utilisation des ressources, comment gérer le cycle de vie des conteneurs et comment partitionner le cluster à l'aide d'espaces de noms. Nous décrirons également certaines techniques et meilleures pratiques pour maîtriser le coût de votre cluster, tout en optimisant le retour sur investissement.

Vous apprendrez à utiliser les demandes de ressources, les limites et les valeurs par défaut, et à les optimiser avec le `Vertical Pod Autoscaler` ; à utiliser les sondes de préparation, les sondes d'activité et les budgets d'interruption de `Pod` pour gérer les conteneurs ; à optimiser le stockage dans le cloud ; et comment et quand utiliser des instances préemptives ou réservées pour contrôler les coûts.

## Comprendre les ressources

Supposons que vous ayez un cluster Kubernetes d'une capacité donnée, avec un nombre raisonnable de nœuds de la bonne taille. Comment en tirer le meilleur parti ? Autrement dit, comment obtenir la meilleure utilisation possible des ressources de cluster disponibles pour votre charge de travail, tout en vous assurant que vous disposez de suffisamment de marge pour faire face aux pics de demande, aux défaillances de nœuds et aux mauvais déploiements ?

Pour répondre à cela, mettez-vous à la place du planificateur Kubernetes et essayez de voir les choses de son point de vue. Le travail du planificateur est de décider où exécuter un `Pod` donné. Y a-t-il des nœuds avec suffisamment de ressources libres pour exécuter le `Pod` ?

Il est impossible de répondre à cette question à moins que le planificateur ne sache de combien de ressources le `Pod` aura besoin pour fonctionner. Un `Pod` qui a besoin de 1 Gio de mémoire ne peut pas être planifié sur un nœud avec seulement 100 Mio de mémoire libre.

De même, le planificateur doit être capable d'agir lorsqu'un `Pod` gourmand accapare trop de ressources et affame d'autres `Pods` sur le même nœud. Mais qu'est-ce qui est considéré comme « trop » ? Afin de planifier efficacement les `Pods`, le planificateur doit connaître les besoins en ressources minimum et maximum autorisés pour chaque `Pod`.

C'est là qu'interviennent les demandes et les limites de ressources Kubernetes. Kubernetes comprend comment gérer deux types de ressources : le CPU et la mémoire. Il existe également d'autres types de ressources importants, tels que la bande passante réseau, les opérations d'E/S disque (IOPS) et l'espace disque, qui peuvent entraîner des conflits dans le cluster, mais Kubernetes n'a pas encore de moyen de décrire les besoins des `Pods` pour ces ressources.

## Unités de ressources

L'utilisation du CPU pour les `Pods` est exprimée, comme vous vous en doutez, en unités de CPU. Une unité CPU Kubernetes équivaut à un CPU virtuel AWS (vCPU), un cœur Google Cloud, un vCore Azure ou un *hyperthread* sur un processeur bare-metal prenant en charge l'hyperthreading. En d'autres termes, *1 CPU* en termes Kubernetes signifie ce que vous pensez.

Étant donné que la plupart des `Pods` n'ont pas besoin d'un CPU entier, les demandes et les limites sont généralement exprimées en *millicpus* (parfois appelés *millicores*). La mémoire est mesurée en octets, ou plus commodément, en *mébioctets* (Mio).

## Demandes de ressources

Une *demande de ressource* Kubernetes spécifie la quantité minimale de cette ressource dont le `Pod` a besoin pour s'exécuter. Par exemple, une demande de ressource de `100m` (100 millicpus) et `250Mi` (250 Mio de mémoire) signifie que le `Pod` ne peut pas être planifié sur un nœud avec moins de ressources disponibles. S'il n'y a pas de nœud avec une capacité suffisante disponible, le `Pod` restera dans un état `pending` jusqu'à ce qu'il y en ait un.

Par exemple, si tous les nœuds de votre cluster ont deux cœurs de CPU et 4 Gio de mémoire, un conteneur qui demande 2,5 CPU ne sera jamais planifié, pas plus qu'un conteneur qui demande 5 Gio de mémoire.

Voyons à quoi ressembleraient les demandes de ressources, appliquées à notre application de démonstration :

```yaml
spec:
  containers:
  - name: demo
    image: cloudnatived/demo:hello
    ports:
    - containerPort: 8888
    resources:
      requests:
        memory: "10Mi"
        cpu: "100m"
```

## Limites de ressources

Une *limite de ressource* spécifie la quantité maximale de ressource qu'un `Pod` est autorisé à utiliser. Un `Pod` qui tente d'utiliser plus que sa limite de CPU allouée sera *bridé*, ce qui réduira ses performances.

Un `Pod` qui tente d'utiliser plus que la limite de mémoire autorisée, cependant, sera arrêté. Si le `Pod` arrêté peut être replanifié, il le sera. En pratique, cela peut signifier que le `Pod` est simplement redémarré sur le même nœud.

Certaines applications, telles que les serveurs réseau, peuvent consommer de plus en plus de ressources au fil du temps en réponse à une demande croissante. Spécifier des limites de ressources est un bon moyen d'empêcher ces `Pods` gourmands d'utiliser plus que leur juste part de la capacité du cluster.

Voici un exemple de définition de limites de ressources sur l'application de démonstration :

```yaml
spec:
  containers:
  - name: demo
    image: cloudnatived/demo:hello
    ports:
    - containerPort: 8888
    resources:
      limits:
        memory: "20Mi"
        cpu: "250m"
```

Savoir quelles limites définir pour une application particulière est une question d'observation et de jugement (voir [« Optimisation des Pods »](section ci-dessous)).

Kubernetes permet aux ressources d'être *sur-allouées* ; c'est-à-dire que la somme de toutes les limites de ressources des conteneurs sur un nœud peut dépasser les ressources totales de ce nœud. C'est une sorte de pari : le planificateur parie que, la plupart du temps, la plupart des conteneurs n'auront pas besoin d'atteindre leurs limites de ressources.

Si ce pari échoue et que l'utilisation totale des ressources commence à approcher de la capacité maximale du nœud, Kubernetes commencera à être plus agressif dans l'arrêt des conteneurs. Dans des conditions de pression sur les ressources, les conteneurs qui ont dépassé leurs demandes, mais pas leurs limites, peuvent toujours être arrêtés.

## Qualité de service (Quality of Service)

En fonction des demandes et des limites d'un `Pod`, Kubernetes le classera dans l'une des classes de [qualité de service (QoS)](https://kubernetes.io/docs/tasks/configure-pod-container/quality-service-pod/) suivantes : *Guaranteed*, *Burstable* ou *BestEffort*.

Lorsque les demandes correspondent aux limites, un `Pod` est classé dans la classe `Guaranteed`, ce qui signifie qu'il est considéré par le plan de contrôle comme l'un des `Pods` les plus importants à planifier, et il fera de son mieux pour s'assurer que le `Pod` n'est tué que s'il dépasse les limites spécifiées. Pour les charges de travail de production hautement critiques, vous pouvez envisager de définir vos limites et vos demandes pour qu'elles correspondent afin de prioriser la planification de ces conteneurs.

Les `Pods` `Burstable` ont une priorité inférieure à celle des `Pods` `Guaranteed`, et Kubernetes leur permettra de « dépasser » leur demande jusqu'à leur limite si la capacité du nœud est disponible. Si le `Pod` utilise plus de ressources que demandé, le `Pod` *peut* être tué, si le plan de contrôle doit faire de la place pour planifier un `Pod` d'une classe QoS supérieure.

Si un `Pod` ne spécifie aucune demande ni limite, il est considéré comme *BestEffort*, ce qui correspond à la priorité la plus basse. Les `Pods` sont autorisés à utiliser le CPU et la mémoire disponibles sur le nœud, mais ils seront les premiers à être tués lorsque le cluster devra faire de la place pour des `Pods` de QoS supérieure.

## Meilleure pratique

**Spécifiez toujours les demandes et les limites de ressources pour vos conteneurs.** Cela aide Kubernetes à planifier et à gérer correctement vos `Pods`.

## Gestion du cycle de vie des conteneurs

Nous avons vu que Kubernetes peut gérer au mieux vos `Pods` lorsqu'il connaît leurs besoins en CPU et en mémoire. Mais il doit également savoir quand un conteneur fonctionne : c'est-à-dire quand il fonctionne correctement et est prêt à traiter les demandes.

Il est assez courant que les applications conteneurisées se retrouvent dans un état bloqué, où le processus est toujours en cours d'exécution, mais il ne traite aucune demande. Kubernetes a besoin d'un moyen de détecter cette situation afin de pouvoir redémarrer le conteneur pour résoudre le problème.

## Sondes d'activité (`Liveness Probes`)

Kubernetes vous permet de spécifier une sonde *d'activité* dans le cadre de la spécification du conteneur : un contrôle de santé qui détermine si le conteneur est actif (c'est-à-dire s'il fonctionne).

Pour un conteneur de serveur HTTP, la spécification de la sonde d'activité ressemble généralement à ceci :

```yaml
livenessProbe:
  httpGet:
    path: /healthz
    port: 8888
  initialDelaySeconds: 3
  periodSeconds: 3
  failureThreshold: 2
```

La sonde `httpGet` effectue une requête HTTP vers une URI et un port que vous spécifiez ; dans ce cas, `/healthz` sur le port 8888.

Si votre application n'a pas de point de terminaison spécifique pour un contrôle de santé, vous pouvez utiliser `/` ou n'importe quelle URL valide pour votre application. Il est courant, cependant, de créer un point de terminaison `/healthz` juste à cet effet. (Pourquoi le `z` ? Juste pour s'assurer qu'il n'entre pas en collision avec un chemin existant comme `health`, qui pourrait être une page sur des informations de santé, par exemple).

Si l'application répond avec un code d'état HTTP 2xx ou 3xx, Kubernetes la considère comme active. Si elle répond avec autre chose ou ne répond pas du tout, le conteneur est considéré comme mort et sera redémarré.

## Délai et fréquence de la sonde

Quand Kubernetes doit-il commencer à vérifier votre sonde d'activité ? Aucune application ne peut démarrer instantanément. Si Kubernetes essayait la sonde d'activité immédiatement après le démarrage du conteneur, elle échouerait probablement, ce qui entraînerait le redémarrage du conteneur - et cette boucle se répéterait indéfiniment !

Le champ `initialDelaySeconds` vous permet d'indiquer à Kubernetes combien de temps attendre avant d'essayer la première sonde d'activité, évitant ainsi cette situation de *boucle de la mort*. Depuis la version 1.20 de Kubernetes, il existe également une fonctionnalité `startupProbe` dédiée pour configurer une sonde afin de déterminer quand une application a terminé son démarrage. Voir [« Sondes de démarrage »](section ci-dessous) pour plus de détails.

Ce ne serait pas une bonne idée que Kubernetes martèle votre application avec des requêtes pour le point de terminaison `healthz` des milliers de fois par seconde. Vos points de terminaison de contrôle de santé doivent être rapides et ne pas ajouter de charge notable à l'application. Vous ne voudriez pas que votre expérience utilisateur souffre parce que votre application est occupée à répondre à un flot de contrôles de santé. Le champ `periodSeconds` spécifie la fréquence à laquelle la sonde d'activité doit être vérifiée ; dans cet exemple, toutes les trois secondes.

`failureThreshold` vous permet de définir combien de fois la sonde peut échouer avant que Kubernetes ne considère l'application comme non saine. La valeur par défaut est de trois, ce qui permet quelques ratés dans votre application, mais vous devrez peut-être la réduire ou l'augmenter en fonction de l'agressivité que vous souhaitez que le planificateur ait lorsqu'il prend des décisions concernant la détermination de l'état de santé d'une application.

## Autres types de sondes

`httpGet` n'est pas le seul type de sonde disponible ; pour les serveurs réseau qui ne parlent pas HTTP, vous pouvez utiliser `tcpSocket` :

```yaml
livenessProbe:
  tcpSocket:
    port: 8888
```

Si une connexion TCP au port spécifié réussit, le conteneur est actif.

Vous pouvez également exécuter une commande arbitraire sur le conteneur, en utilisant une sonde `exec` :

```yaml
livenessProbe:
  exec:
    command:
    - cat
    - /tmp/healthy
```

La sonde `exec` exécute la commande spécifiée à l'intérieur du conteneur, et la sonde réussit si la commande réussit (c'est-à-dire qu'elle se termine avec un code de statut zéro). `exec` est généralement plus utile en tant que sonde de préparation, et nous verrons comment elles sont utilisées dans la section suivante.

## Sondes de préparation (`Readiness Probes`)

Liée à la sonde d'activité, mais avec une sémantique différente, se trouve la *sonde de préparation*. Parfois, une application doit signaler à Kubernetes qu'elle est temporairement incapable de traiter les requêtes ; peut-être parce qu'elle effectue un long processus d'initialisation ou qu'elle attend la fin d'un sous-processus. La sonde de préparation remplit cette fonction.

Si votre application ne commence pas à écouter les requêtes HTTP tant qu'elle n'est pas prête à les traiter, votre sonde de préparation peut être la même que votre sonde d'activité :

```yaml
readinessProbe:
  httpGet:
    path: /healthz
    port: 8888
  initialDelaySeconds: 3
  periodSeconds: 3
```

Un conteneur qui échoue à sa sonde de préparation sera retiré de tous les `Services` qui correspondent au `Pod`. C'est comme retirer un nœud défaillant d'un pool d'équilibrage de charge : aucun trafic ne sera envoyé au `Pod` tant que sa sonde de préparation ne recommencera pas à réussir. Notez que ceci est différent d'une `livenessProbe` car une `readinessProbe` défaillante ne tue pas et ne redémarre pas le `Pod`.

Normalement, lorsqu'un `Pod` démarre, Kubernetes commence à lui envoyer du trafic dès que le conteneur est dans un état `running`. Cependant, si le conteneur a une sonde de préparation, Kubernetes attendra que la sonde réussisse avant de lui envoyer des requêtes afin que les utilisateurs ne voient pas d'erreurs provenant de conteneurs non prêts. Ceci est d'une importance capitale pour les mises à niveau sans interruption de service.

Un conteneur qui n'est pas prêt sera toujours affiché comme `Running`, mais la colonne `READY` affichera un ou plusieurs conteneurs non prêts dans le `Pod` :

```bash
kubectl get pods
NAME             READY     STATUS    RESTARTS   AGE
readiness-test   0/1       Running   0          56s
```

**Note**

Les sondes de préparation doivent uniquement renvoyer le statut HTTP `200 OK`. Bien que Kubernetes lui-même considère les codes de statut 2xx et 3xx comme *prêts*, les équilibreurs de charge cloud peuvent ne pas le faire. Si vous utilisez une ressource `Ingress` couplée à un équilibreur de charge cloud (voir **[« Ingress »](Lab 5)**), et que votre sonde de préparation renvoie une redirection 301, par exemple, l'équilibreur de charge peut signaler tous vos `Pods` comme non sains. Assurez-vous que vos sondes de préparation ne renvoient qu'un code de statut 200.

## Sondes de démarrage (`Startup Probes`)

En plus des sondes d'activité avec `initialDelaySeconds`, Kubernetes offre un autre moyen de déterminer quand une application a fini de démarrer. Certaines applications nécessitent une période plus longue pour s'initialiser, ou peut-être souhaitez-vous instrumenter un point de terminaison spécial dans votre application pour vérifier l'état de démarrage qui est différent de vos autres vérifications d'activité et de préparation.

Lorsqu'une `startupProbe` est configurée, la `livenessProbe` attendra qu'elle réussisse avant de commencer les vérifications d'activité. Si elle ne réussit jamais, Kubernetes tuera et redémarrera le `Pod`.

La syntaxe d'une `startupProbe` est similaire aux sondes d'activité et de préparation :

```yaml
livenessProbe:
  httpGet:
    path: /healthz
    port: 8888
  failureThreshold: 2

startupProbe:
  httpGet:
    path: /healthz
    port: 8888
  failureThreshold: 10
```

Dans cet exemple, remarquez comment notre `livenessProbe` considérera le `Pod` comme non sain après deux échecs en raison du `failureThreshold`, mais nous donnons plus de temps à l'application pour démarrer avec `failureThreshold : 10` dans la `startupProbe`. Cela permettrait d'éviter, espérons-le, la situation où le `Pod` pourrait ne pas démarrer suffisamment rapidement et la `livenessProbe` abandonnerait et le redémarrerait avant qu'il n'ait une chance de s'exécuter.

## Sondes gRPC

Bien que de nombreuses applications et services communiquent via HTTP, il est de plus en plus courant d'utiliser le protocole [Google Remote Procedure Call (gRPC)](https://grpc.io/) à la place, en particulier pour les microservices. gRPC est un protocole réseau binaire efficace, portable, développé par Google et hébergé par la Cloud Native Computing Foundation.

Les sondes `httpGet` ne fonctionneront pas avec les serveurs gRPC, et bien que vous puissiez utiliser une sonde `tcpSocket` à la place, cela vous indique seulement que vous pouvez établir une connexion au socket, pas que le serveur lui-même fonctionne.

gRPC a un protocole de vérification de santé standard, que la plupart des services gRPC prennent en charge, et pour interroger ce contrôle de santé avec une sonde d'activité Kubernetes, vous pouvez utiliser l'outil [`grpc-health-probe`](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/). Si vous ajoutez l'outil à votre conteneur, vous pouvez le vérifier à l'aide d'une sonde `exec`.

## Sondes de préparation basées sur des fichiers

Alternativement, vous pouvez demander à l'application de créer un fichier sur le système de fichiers du conteneur appelé quelque chose comme */tmp/healthy*, et utiliser une sonde de préparation `exec` pour vérifier la présence de ce fichier.

Ce type de sonde de préparation peut être utile car si vous souhaitez mettre temporairement le conteneur hors service pour déboguer un problème, vous pouvez vous connecter au conteneur et supprimer le fichier */tmp/healthy*. La prochaine sonde de préparation échouera et Kubernetes retirera le conteneur de tous les `Services` correspondants. (Une meilleure façon de procéder, cependant, est d'ajuster les étiquettes du conteneur afin qu'il ne corresponde plus au service : voir **[« Ressources de service »](Lab 2)**.)

Vous pouvez maintenant inspecter et dépanner le conteneur à votre guise. Une fois que vous avez terminé, vous pouvez soit terminer le conteneur et déployer une version corrigée, soit remettre le fichier de sonde en place afin que le conteneur recommence à recevoir du trafic.

## Meilleure pratique

**Utilisez des sondes de préparation et des sondes d'activité pour informer Kubernetes lorsque votre application est prête à traiter les requêtes ou lorsqu'elle a un problème et doit être redémarrée.** Il est également important de réfléchir à la manière dont votre application fonctionne dans le contexte de l'écosystème plus large et à ce qui devrait se passer en cas de défaillance. Vous pouvez vous retrouver dans un scénario de défaillance en cascade si vos sondes sont interconnectées et partagent des dépendances.

## `minReadySeconds`

Par défaut, un conteneur ou un `Pod` est considéré comme prêt dès que sa sonde de préparation réussit. Dans certains cas, vous souhaiterez peut-être exécuter le conteneur pendant une courte période pour vous assurer qu'il est stable. Lors d'un déploiement, Kubernetes attend que chaque nouveau `Pod` soit prêt avant de démarrer le suivant. Si un conteneur défectueux plante immédiatement, cela arrêtera le déploiement, mais s'il met quelques secondes à planter, toutes ses répliques pourraient être déployées avant que vous ne découvriez le problème.

Pour éviter cela, vous pouvez définir le champ `minReadySeconds` sur le conteneur. Un conteneur ou un `Pod` ne sera pas considéré comme prêt tant que sa sonde de préparation n'aura pas été active pendant `minReadySeconds` (0 par défaut).

## Budgets d'interruption de `Pod` (`Pod Disruption Budgets`)

Parfois, Kubernetes doit arrêter vos `Pods` même s'ils sont actifs et prêts (un processus appelé *éviction*). Peut-être que le nœud sur lequel ils s'exécutent est en cours de drainage avant une mise à niveau, par exemple, et que les `Pods` doivent être déplacés vers un autre nœud.

Cependant, cela ne doit pas entraîner de temps d'arrêt pour votre application, à condition qu'un nombre suffisant de répliques puisse être maintenu en fonctionnement. Vous pouvez utiliser la ressource `PodDisruptionBudget` pour spécifier, pour une application donnée, combien de `Pods` vous pouvez vous permettre de perdre à un moment donné.

Par exemple, vous pouvez spécifier qu'au plus 10 % des `Pods` de votre application peuvent être interrompus à la fois. Ou peut-être souhaitez-vous spécifier que Kubernetes peut expulser n'importe quel nombre de `Pods`, à condition qu'au moins trois répliques soient toujours en cours d'exécution.

### `minAvailable`

Voici un exemple de `PodDisruptionBudget` qui spécifie un nombre minimum de `Pods` à maintenir en fonctionnement, à l'aide du champ `minAvailable` :

```yaml
apiVersion: policy/v1beta1
kind: PodDisruptionBudget
metadata:
  name: demo-pdb
spec:
  minAvailable: 3
  selector:
    matchLabels:
      app: demo
```

Dans cet exemple, `minAvailable: 3` spécifie qu'au moins trois `Pods` correspondant à l'étiquette `app: demo` doivent toujours être en cours d'exécution. Kubernetes peut expulser autant de `Pods` `demo` qu'il le souhaite, tant qu'il en reste toujours au moins trois.

### `maxUnavailable`

Inversement, vous pouvez utiliser `maxUnavailable` pour limiter le nombre total ou le pourcentage de `Pods` que Kubernetes est autorisé à expulser :

```yaml
apiVersion: policy/v1beta1
kind: PodDisruptionBudget
metadata:
  name: demo-pdb
spec:
  maxUnavailable: 10%
  selector:
    matchLabels:
      app: demo
```

Ici, pas plus de 10 % des `Pods` `demo` ne peuvent être expulsés à un moment donné. Cela ne s'applique toutefois qu'aux *évictions volontaires*, c'est-à-dire aux évictions initiées par Kubernetes. Si un nœud subit une défaillance matérielle ou est supprimé, par exemple, les `Pods` qui s'y trouvent seront expulsés involontairement, même si cela viole le budget d'interruption.

Étant donné que Kubernetes aura tendance à répartir les `Pods` uniformément sur les nœuds, toutes choses égales par ailleurs, il est important de garder cela à l'esprit lorsque vous déterminez le nombre de nœuds dont votre cluster a besoin. Si vous avez trois nœuds, la défaillance de l'un d'eux peut entraîner la perte d'un tiers de tous vos `Pods`, ce qui peut ne pas laisser suffisamment de `Pods` pour maintenir un niveau de service acceptable.

## Meilleure pratique

**Définissez des `PodDisruptionBudgets` pour vos applications critiques afin de vous assurer qu'il y a toujours suffisamment de répliques pour maintenir le service, même lorsque des `Pods` sont expulsés.**

## Utilisation des espaces de noms (`Namespaces`)

Une autre façon très utile de gérer l'utilisation des ressources sur votre cluster consiste à utiliser des *espaces de noms*. Un espace de noms Kubernetes est un moyen de partitionner votre cluster en subdivisions distinctes, à des fins que vous déterminez.

Par exemple, vous pouvez avoir différents espaces de noms pour tester différentes versions d'une application ou un espace de noms distinct par équipe. Comme le terme *espace de noms* le suggère, les noms d'un espace de noms ne sont pas visibles depuis un autre espace de noms.

Cela signifie que vous pouvez avoir un service appelé `demo` dans l'espace de noms `prod` et un service différent appelé `demo` dans l'espace de noms `test`, et il n'y aura aucun conflit.

Pour voir les espaces de noms qui existent sur votre cluster, exécutez la commande suivante :

```bash
kubectl get namespaces
NAME           STATUS    AGE
default        Active    1y
kube-public    Active    1y
kube-system    Active    1y
```

Vous pouvez considérer les espaces de noms comme des dossiers sur le disque dur de votre ordinateur. Bien que vous *puissiez* conserver tous vos fichiers dans le même dossier, ce ne serait pas pratique. La recherche d'un fichier particulier prendrait du temps et il ne serait pas facile de voir quels fichiers vont avec quels autres. Un espace de noms regroupe les ressources associées et facilite leur utilisation. Contrairement aux dossiers, cependant, les espaces de noms ne peuvent pas être imbriqués.

## Travailler avec les espaces de noms

Jusqu'à présent, lorsque nous travaillions avec Kubernetes, nous avons toujours utilisé l'*espace de noms par défaut*. Si vous ne spécifiez pas d'espace de noms lors de l'exécution d'une commande `kubectl`, telle que `kubectl run`, votre commande s'exécutera sur l'espace de noms par défaut. Si vous vous demandez ce qu'est l'espace de noms `kube-system`, c'est là que les composants internes du système Kubernetes s'exécutent afin qu'ils soient séparés de vos propres applications.

Si, au lieu de cela, vous spécifiez un espace de noms avec l'indicateur `--namespace` (ou `-n` en abrégé), votre commande utilisera cet espace de noms. Par exemple, pour obtenir une liste de `Pods` dans l'espace de noms `prod`, exécutez :

```bash
kubectl get pods --namespace prod
```

## Quels espaces de noms dois-je utiliser ?

C'est à vous de décider comment diviser votre cluster en espaces de noms. Une idée qui a du sens intuitivement est d'avoir un espace de noms par application ou par équipe. Par exemple, vous pouvez créer un espace de noms `demo` pour exécuter l'application de démonstration. Vous pouvez créer un espace de noms à l'aide d'une ressource d'espace de noms Kubernetes comme celle-ci :

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: demo
```

Pour appliquer ce manifeste de ressource, utilisez la commande `kubectl apply -f` (voir **[« Manifestes de ressources au format YAML »](Lab 2)** pour en savoir plus.) Vous trouverez les manifestes YAML pour tous les exemples de cette section dans le dépôt de l'application de démonstration, dans le répertoire *hello-namespace* :

```bash
cd demo/hello-namespace
ls k8s
deployment.yaml    limitrange.yaml    namespace.yaml     resourcequota.yaml
service.yaml
```

Vous pouvez aller plus loin et créer des espaces de noms pour chaque environnement dans lequel votre application s'exécute, tels que `demo-prod`, `demo-staging`, `demo-test`, etc. Vous pouvez utiliser un espace de noms comme une sorte de *cluster virtuel* temporaire et supprimer l'espace de noms lorsque vous en avez terminé avec lui. Mais attention ! La suppression d'un espace de noms supprime toutes les ressources qu'il contient. Vous ne voulez vraiment pas exécuter cette commande sur le mauvais espace de noms. (Voir **[« Présentation du contrôle d'accès basé sur les rôles (RBAC) »](Lab 6)** pour savoir comment accorder ou refuser des autorisations utilisateur sur des espaces de noms individuels.)

Dans la version actuelle de Kubernetes, il n'y a aucun moyen de *protéger* une ressource telle qu'un espace de noms contre la suppression (bien qu'une [proposition](https://github.com/kubernetes/kubernetes/issues/10179) pour une telle fonctionnalité soit en discussion). Ne supprimez donc pas les espaces de noms à moins qu'ils ne soient vraiment temporaires et que vous soyez sûr qu'ils ne contiennent aucune ressource de production.

## Meilleure pratique

**Créez des espaces de noms distincts pour chacune de vos applications ou chaque composant logique de votre infrastructure.** N'utilisez pas l'espace de noms par défaut : il est trop facile de faire des erreurs.

Si vous devez bloquer tout le trafic réseau entrant ou sortant d'un espace de noms particulier, vous pouvez utiliser les [Kubernetes Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/) pour appliquer cela.

## Adresses de service

Bien que les espaces de noms soient logiquement isolés les uns des autres, ils peuvent toujours communiquer avec les `Services` dans d'autres espaces de noms. Vous vous souviendrez peut-être de **[« Ressources de service »](Lab 2)** que chaque `Service` Kubernetes a un nom DNS associé que vous pouvez utiliser pour lui parler. La connexion au nom d'hôte `demo` vous connectera au `Service` dont le nom est `demo`. Comment cela fonctionne-t-il sur différents espaces de noms ?

Les noms DNS de service suivent toujours ce modèle :

```yaml
SERVICE.NAMESPACE.svc.cluster.local
```

La partie `.svc.cluster.local` est facultative, tout comme l'espace de noms. Mais si vous souhaitez parler au service `demo` dans l'espace de noms `prod`, par exemple, vous pouvez utiliser :

`demo.prod`

Même si vous avez une douzaine de services différents appelés `demo`, chacun dans son propre espace de noms, vous pouvez ajouter l'espace de noms au nom DNS du service pour spécifier exactement de quel service vous parlez.

## Quotas de ressources (`Resource Quotas`)

En plus de restreindre l'utilisation du CPU et de la mémoire des conteneurs individuels, ce que vous avez appris dans **[« Demandes de ressources »](Lab 3)**, vous pouvez (et devriez) restreindre l'utilisation des ressources d'un espace de noms donné. La façon de le faire est de créer un `ResourceQuota` dans l'espace de noms.

Voici un exemple de `ResourceQuota` :

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: demo-resourcequota
spec:
  hard:
    pods: "100"
```

L'application de ce manifeste à un espace de noms particulier (par exemple, `demo`) définit une limite stricte de cent `Pods` s'exécutant simultanément dans cet espace de noms. (Notez que le `metadata.name` du `ResourceQuota` peut être ce que vous voulez. Les espaces de noms qu'il affecte dépendent des espaces de noms auxquels vous appliquez le manifeste.)

```bash
cd demo/hello-namespace
kubectl create namespace demo
namespace "demo" created
kubectl apply --namespace demo -f k8s/resourcequota.yaml
resourcequota "demo-resourcequota" created
```

Désormais, Kubernetes bloquera toutes les opérations d'API dans l'espace de noms `demo` qui dépasseraient le quota. L'exemple `ResourceQuota` limite l'espace de noms à 100 `Pods`, donc s'il y a 100 `Pods` déjà en cours d'exécution et que vous essayez d'en démarrer un nouveau, vous verrez un message d'erreur comme celui-ci :

```yaml
Error from server (Forbidden): pods "demo" is forbidden: exceeded quota: demo-resourcequota, requested: pods=1, used: pods=100, limited: pods=100
```

L'utilisation de `ResourceQuotas` est un bon moyen d'empêcher les applications d'un espace de noms de s'approprier trop de ressources et d'affamer celles des autres parties du cluster.

Vous pouvez également limiter l'utilisation totale du CPU et de la mémoire des `Pods` dans un espace de noms. Cela peut être utile pour la budgétisation dans les grandes organisations où de nombreuses équipes différentes partagent un cluster Kubernetes. Les équipes peuvent être tenues de définir le nombre de CPU qu'elles utiliseront pour leur espace de noms, et si elles dépassent ce quota, elles ne pourront pas utiliser plus de ressources de cluster tant que le `ResourceQuota` n'aura pas été augmenté.

Une limite de `Pod` peut être utile pour empêcher une mauvaise configuration ou une erreur de frappe de générer un nombre potentiellement illimité de `Pods`. Il est facile d'oublier de nettoyer un objet d'une tâche régulière, et de se retrouver un jour avec des milliers d'entre eux qui encombrent votre cluster.

## Meilleure pratique

**Utilisez des `ResourceQuotas` dans chaque espace de noms pour appliquer une limite au nombre de `Pods` qui peuvent s'exécuter dans l'espace de noms.**

Pour vérifier si un `ResourceQuota` est actif dans un espace de noms particulier, utilisez la commande `kubectl describe resourcequotas` :

```bash
kubectl describe resourcequota -n demo
Name:       demo-resourcequota
Namespace:  demo
Resource    Used  Hard
--------    ----  ----
pods        1     100
```

## Demandes et limites de ressources par défaut

Il n'est pas toujours facile de savoir à l'avance quels seront les besoins en ressources de votre conteneur. Vous pouvez définir des demandes et des limites par défaut pour tous les conteneurs d'un espace de noms à l'aide d'une ressource `LimitRange` :

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: demo-limitrange
spec:
  limits:
  - default:
      cpu: "500m"
      memory: "256Mi"
    defaultRequest:
      cpu: "200m"
      memory: "128Mi"
    type: Container
```

**Astuce**

Comme pour les `ResourceQuotas`, le `metadata.name` du `LimitRange` peut être ce que vous voulez. Il ne correspond pas à un espace de noms Kubernetes. Un `LimitRange` ou un `ResourceQuota` ne prend effet dans un espace de noms particulier que lorsque vous appliquez le manifeste à cet espace de noms.

Tout conteneur de l'espace de noms qui ne spécifie pas de limite ou de demande de ressource héritera de la valeur par défaut du `LimitRange`. Par exemple, un conteneur sans demande `cpu` spécifiée héritera de la valeur de `200m` du `LimitRange`. De même, un conteneur sans limite `memory` spécifiée héritera de la valeur de `256Mi` du `LimitRange`.

En théorie, vous pourriez donc définir les valeurs par défaut dans un `LimitRange` et ne pas vous soucier de spécifier des demandes ou des limites pour les conteneurs individuels. Cependant, ce n'est pas une bonne pratique : il devrait être possible de regarder une spécification de conteneur et de voir quelles sont ses demandes et ses limites, sans avoir à savoir si un `LimitRange` est en vigueur ou non. Utilisez le `LimitRange` uniquement comme un filet de sécurité pour éviter les problèmes avec les conteneurs dont les propriétaires ont oublié de spécifier les demandes et les limites.

## Meilleure pratique

**Utilisez des `LimitRanges` dans chaque espace de noms pour définir les demandes et les limites de ressources par défaut pour les conteneurs, mais ne vous y fiez pas ; traitez-les comme un filet de sécurité. Spécifiez toujours des demandes et des limites explicites dans la spécification du conteneur lui-même.**

## Optimisation des coûts du cluster

Nous avons présenté quelques considérations pour choisir la taille initiale de votre cluster et le mettre à l'échelle au fil du temps à mesure que vos charges de travail évoluent. Mais, en supposant que votre cluster soit correctement dimensionné et ait une capacité suffisante, comment devriez-vous l'exécuter de la manière la plus rentable ?

## Kubecost

Il peut souvent être difficile d'avoir une idée générale du coût lié à l'exécution de l'infrastructure Kubernetes lorsque plusieurs applications et équipes partagent les mêmes clusters.

Heureusement, il existe un outil appelé [Kubecost](https://github.com/kubecost) pour suivre les coûts par espace de noms, par étiquette ou même jusqu'au niveau du conteneur. [Kubecost](https://www.kubecost.com/) est actuellement gratuit pour un seul cluster et il existe des versions payantes avec prise en charge d'environnements plus vastes.

## Optimisation des déploiements

Avez-vous vraiment besoin d'autant de répliques ? Cela peut sembler évident, mais chaque `Pod` de votre cluster utilise des ressources qui ne sont donc pas disponibles pour un autre `Pod`.

Il peut être tentant d'exécuter un grand nombre de répliques pour tout afin que la qualité de service ne soit jamais réduite en cas de défaillance de `Pods` individuels ou lors de mises à niveau progressives. De plus, plus il y a de répliques, plus vos applications peuvent gérer de trafic.

Mais vous devez utiliser les répliques à bon escient. Votre cluster ne peut exécuter qu'un nombre fini de `Pods`. Donnez-les aux applications qui ont vraiment besoin d'une disponibilité et de performances maximales.

Si une interruption de quelques secondes d'un `Deployment` lors d'une mise à niveau n'a pas d'impact significatif, il n'est pas nécessaire d'avoir un grand nombre de répliques. Un nombre surprenant d'applications et de services peuvent fonctionner parfaitement avec une ou deux répliques.

Passez en revue le nombre de répliques configurées pour chaque `Deployment` et posez-vous les questions suivantes :

*   Quelles sont les exigences de l'entreprise en matière de performance et de disponibilité pour ce service ?
*   Pouvons-nous répondre à ces exigences avec moins de répliques ?

Si une application a du mal à gérer la demande ou si les utilisateurs rencontrent trop d'erreurs lorsque vous mettez à niveau le `Deployment`, il faut augmenter le nombre de répliques. Mais dans de nombreux cas, vous pouvez réduire considérablement la taille d'un `Deployment` avant que la dégradation ne devienne perceptible.


## Meilleure pratique

**Utilisez le nombre minimum de `Pods` pour un `Deployment` donné qui répondra à vos exigences de performance et de disponibilité. Réduisez progressivement le nombre de répliques jusqu'à un niveau juste au-dessus de celui où vos objectifs de niveau de service sont atteints.**

## Optimisation des `Pods`

Plus tôt dans ce lab, nous avons souligné l'importance de définir correctement les demandes et les limites de ressources pour vos conteneurs. Si les demandes de ressources sont trop faibles, vous le constaterez rapidement : les `Pods` commenceront à échouer. En revanche, si elles sont trop élevées, vous risquez de ne le découvrir qu'au moment de recevoir votre facture mensuelle de cloud.

Vous devez régulièrement examiner les demandes et les limites de ressources pour vos différentes charges de travail et les comparer à l'utilisation réelle.

La plupart des services Kubernetes gérés proposent un tableau de bord affichant l'utilisation du CPU et de la mémoire de vos conteneurs au fil du temps. Nous en verrons plus à ce sujet dans **[« Surveillance de l'état du cluster »](Lab 11)**.

Vous pouvez également créer vos propres tableaux de bord et statistiques à l'aide de Prometheus et Grafana.

Définir les demandes et les limites de ressources optimales relève d'un certain art, et la réponse sera différente pour chaque type de charge de travail. Certains conteneurs peuvent être inactifs la plupart du temps, avec des pics d'utilisation occasionnels pour gérer les requêtes, tandis que d'autres peuvent être constamment occupés et utiliser progressivement de plus en plus de mémoire jusqu'à atteindre leurs limites.

En général, vous devez définir les limites de ressources d'un conteneur légèrement au-dessus de son utilisation maximale en fonctionnement normal. Par exemple, si l'utilisation de la mémoire d'un conteneur ne dépasse jamais 500 Mio sur plusieurs jours, vous pouvez définir sa limite de mémoire à 600 Mio.

**Note**

Les conteneurs doivent-ils avoir des limites ? Une école de pensée suggère que les conteneurs ne devraient *pas* avoir de limites en production, ou que les limites devraient être fixées si haut qu'elles ne seront jamais atteintes. Avec des conteneurs très volumineux et gourmands en ressources, coûteux à redémarrer, cela peut sembler logique, mais nous pensons qu'il est préférable de définir des limites. Sans elles, un conteneur présentant une fuite de mémoire ou utilisant trop de CPU peut monopoliser toutes les ressources d'un nœud, affamant les autres conteneurs.

Pour éviter ce scénario de *Pac-Man des ressources*, définissez les limites d'un conteneur à un peu plus de 100 % de l'utilisation normale. Cela garantira qu'il ne sera pas tué tant qu'il fonctionne correctement, tout en minimisant l'impact en cas de problème.

Les paramètres de demande sont moins critiques que les limites, mais ils ne doivent pas être définis trop haut (le `Pod` ne sera jamais planifié) ni trop bas (les `Pods` dépassant leurs demandes sont les premiers candidats à l'éviction).

## `Vertical Pod Autoscaler`

Kubernetes dispose d'un module complémentaire appelé [Vertical Pod Autoscaler](https://github.com/kubernetes/autoscaler/tree/master/vertical-pod-autoscaler), qui peut vous aider à déterminer les valeurs idéales pour les demandes de ressources. Il surveille un `Deployment` spécifié et ajuste automatiquement les demandes de ressources pour ses `Pods` en fonction de leur utilisation réelle. Il possède un mode d'exécution à sec qui se contente de faire des suggestions sans modifier les `Pods` en cours d'exécution, ce qui peut être utile.

## Optimisation des nœuds

Kubernetes peut fonctionner avec un large éventail de tailles de nœuds, mais certaines offrent de meilleures performances que d'autres. Pour optimiser la capacité de votre cluster par rapport à son coût, vous devez observer les performances de vos nœuds en pratique, dans des conditions de demande réelles, avec vos charges de travail spécifiques. Cela vous aidera à déterminer les types d'instances les plus rentables.

Il ne faut pas oublier que chaque nœud doit héberger un système d'exploitation, qui consomme des ressources disque, mémoire et CPU. Il en va de même pour les composants du système Kubernetes et le runtime du conteneur. Plus le nœud est petit, plus la proportion de ressources totales consacrée à cette surcharge est importante.

Par conséquent, les nœuds plus grands peuvent être plus rentables, car une plus grande proportion de leurs ressources est disponible pour vos charges de travail. Le compromis est que la perte d'un nœud individuel a un impact plus important sur la capacité disponible de votre cluster.

Les petits nœuds ont également un pourcentage plus élevé de *ressources inutilisées* : des blocs d'espace mémoire et de temps CPU inutilisés, mais trop petits pour être réclamés par un `Pod` existant.

Une bonne [règle empirique](https://medium.com/@dyachuk/why-do-kubernetes-clusters-in-aws-cost-more-than-they-should-fa510c1964c6) est que les nœuds doivent être suffisamment grands pour exécuter au moins cinq de vos `Pods` typiques, en maintenant la proportion de ressources inutilisées à environ 10 % ou moins. Si le nœud peut exécuter 10 `Pods` ou plus, les ressources inutilisées seront inférieures à 5 %.

La limite par défaut dans Kubernetes est de 110 `Pods` par nœud. Bien que vous puissiez augmenter cette limite en ajustant le paramètre `--max-pods` du `kubelet`, cela peut ne pas être possible avec certains services gérés, et il est conseillé de s'en tenir aux valeurs par défaut de Kubernetes, sauf raison impérieuse de les modifier.

La limite de `Pods` par nœud signifie que vous ne pourrez peut-être pas tirer parti des plus grandes tailles d'instances de votre fournisseur de cloud. Envisagez plutôt d'exécuter un [plus grand nombre de nœuds plus petits](https://medium.com/@brendanrius/scaling-kubernetes-for-25m-users-a7937e3536a0) pour une meilleure utilisation. Par exemple, au lieu de 6 nœuds avec 8 vCPU, exécutez 12 nœuds avec 4 vCPU.

**Astuce**

Examinez le pourcentage d'utilisation des ressources de chaque nœud à l'aide du tableau de bord de votre fournisseur de cloud ou de la commande `kubectl top nodes`. Plus le pourcentage d'utilisation du CPU est élevé, meilleure est l'utilisation. Si les nœuds les plus grands de votre cluster présentent une meilleure utilisation, il peut être judicieux de supprimer certains des nœuds plus petits et de les remplacer par des nœuds plus grands.

D'un autre côté, si les nœuds plus grands ont une faible utilisation, votre cluster est peut-être surdimensionné et vous pouvez donc supprimer des nœuds ou les réduire, ce qui réduira la facture totale.

## Meilleure pratique

**Les nœuds plus grands ont tendance à être plus rentables, car une plus petite partie de leurs ressources est consommée par la surcharge du système. Dimensionnez vos nœuds en fonction des chiffres d'utilisation réels de votre cluster, en visant entre 10 et 100 `Pods` par nœud.**

## Optimisation du stockage

Un coût cloud souvent négligé est celui du stockage disque. Les fournisseurs de cloud proposent des quantités variables d'espace disque pour chaque taille d'instance, et le prix du stockage à grande échelle varie également.

S'il est possible d'atteindre une utilisation élevée du CPU et de la mémoire grâce aux demandes et aux limites de ressources Kubernetes, ce n'est pas le cas pour le stockage, et de nombreux nœuds de cluster sont surprovisionnés en espace disque.

Non seulement de nombreux nœuds disposent de plus d'espace de stockage que nécessaire, mais la classe de stockage peut également être un facteur. La plupart des fournisseurs de cloud proposent différentes classes de stockage en fonction du nombre d'opérations d'E/S par seconde (IOPS), ou de la bande passante, allouées.

Par exemple, les bases de données utilisant des volumes de disques persistants nécessitent souvent un classement IOPS très élevé pour un accès rapide et à haut débit au stockage. Ceci est coûteux. Vous pouvez économiser sur les coûts du cloud en provisionnant un stockage à faible IOPS pour les charges de travail qui ne nécessitent pas autant de bande passante. D'un autre côté, si votre application est peu performante car elle passe beaucoup de temps à attendre les E/S de stockage, vous pouvez envisager de provisionner davantage d'IOPS.

La console de votre fournisseur de cloud ou Kubernetes peut généralement afficher le nombre d'IOPS réellement utilisées sur vos nœuds, et vous pouvez utiliser ces chiffres pour vous aider à décider où réduire les coûts.

Idéalement, vous pourriez définir des demandes de ressources pour les conteneurs nécessitant une bande passante élevée ou de grandes quantités de stockage. Cependant, Kubernetes ne prend pas encore en charge cette fonctionnalité, bien qu'une prise en charge des demandes IOPS puisse être ajoutée à l'avenir.

## Meilleure pratique

**N'utilisez pas de types d'instances avec plus de stockage que nécessaire. Provisionnez les volumes de disques les plus petits et les plus faibles en IOPS possibles, en fonction du débit et de l'espace que vous utilisez réellement.**

## Nettoyage des ressources inutilisées

À mesure que vos clusters Kubernetes se développent, vous trouverez de nombreuses ressources inutilisées, ou *perdues*, qui traînent. Au fil du temps, si ces ressources perdues ne sont pas nettoyées, elles représenteront une part significative de vos coûts globaux.

Au niveau le plus élevé, vous pouvez trouver des instances cloud qui ne font partie d'aucun cluster. Il est facile d'oublier de terminer une machine lorsqu'elle n'est plus utilisée.

D'autres types de ressources cloud, tels que les équilibreurs de charge, les adresses IP publiques et les volumes de disques, vous coûtent également de l'argent même s'ils ne sont pas utilisés. Vous devez examiner régulièrement votre utilisation de chaque type de ressource pour trouver et supprimer les instances inutilisées.

De même, il peut y avoir des `Deployments` et des `Pods` dans votre cluster Kubernetes qui ne sont pas référencés par un `Service` et ne peuvent donc pas recevoir de trafic.

Même les images de conteneurs qui ne sont pas en cours d'exécution occupent de l'espace disque sur vos nœuds. Heureusement, Kubernetes nettoie automatiquement les images inutilisées lorsque le nœud commence à manquer d'espace disque.

### Recherche de ressources sous-utilisées

Certaines ressources peuvent recevoir très peu de trafic, voire aucun. Peut-être qu'elles ont été déconnectées d'un `Service` frontal suite à une modification des étiquettes, ou peut-être qu'elles étaient temporaires ou expérimentales.

Chaque `Pod` doit exposer le nombre de requêtes qu'il reçoit comme une métrique. Utilisez ces métriques pour identifier les `Pods` qui reçoivent peu ou pas de trafic et dressez une liste des ressources susceptibles d'être supprimées.

Vous pouvez également vérifier les chiffres d'utilisation du CPU et de la mémoire pour chaque `Pod` dans votre console Web et trouver les `Pods` les moins utilisés dans votre cluster. Les `Pods` inactifs ne constituent probablement pas une bonne utilisation des ressources.

Si les `Pods` ont des métadonnées de propriétaire, contactez leurs propriétaires pour savoir si ces `Pods` sont réellement nécessaires (par exemple, ils peuvent être destinés à une application encore en développement).

Vous pouvez utiliser une autre annotation Kubernetes personnalisée (`example.com/lowtraffic` par exemple) pour identifier les `Pods` qui ne reçoivent aucune requête, mais qui sont toujours nécessaires pour une raison ou une autre.

## Meilleure pratique

**Examinez régulièrement votre cluster pour trouver les ressources sous-utilisées ou abandonnées et les supprimer. Les annotations de propriétaire peuvent vous aider.**

### Nettoyage des `Jobs` terminés

Les `Jobs` Kubernetes (voir **[« Jobs »](Lab 5))** sont des `Pods` qui s'exécutent une fois jusqu'à la fin et ne sont pas redémarrés. Cependant, les objets `Job` existent toujours dans la base de données Kubernetes, et lorsqu'un nombre important de `Jobs` terminés s'accumule, cela peut affecter les performances de l'API. Vous pouvez demander à Kubernetes de supprimer automatiquement les `Jobs` après leur achèvement grâce au paramètre `ttlSecondsAfterFinished` :

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: demo-job
spec:
  ttlSecondsAfterFinished: 60
  template:
    spec:
      containers:
        # ... spécification du conteneur ...
```

Dans cet exemple, votre `Job` sera automatiquement supprimé 60 secondes après sa fin.

## Vérification de la capacité disponible

Il doit toujours y avoir suffisamment de capacité disponible dans le cluster pour gérer la défaillance d'un seul nœud worker. Pour vérifier cela, essayez de drainer votre plus gros nœud. Une fois que tous les `Pods` ont été expulsés du nœud, vérifiez que toutes vos applications fonctionnent toujours correctement avec le nombre de répliques configuré. Si ce n'est pas le cas, vous devez ajouter de la capacité au cluster.

S'il n'y a pas d'espace pour replanifier les charges de travail en cas de défaillance d'un nœud, vos services pourraient être dégradés, voire indisponibles.

## Utilisation d'instances réservées

Certains fournisseurs de cloud proposent différentes classes d'instances en fonction du cycle de vie de la machine. Les instances *réservées* offrent un compromis entre prix et flexibilité.

Par exemple, les instances réservées AWS coûtent environ la moitié du prix des instances *à la demande* (le type par défaut). Vous pouvez réserver des instances pour différentes périodes : un an, trois ans, etc. Les instances réservées AWS ont une taille fixe. Par conséquent, s'il s'avère que vous avez besoin d'une instance plus grande dans trois mois, votre réservation sera en grande partie gaspillée.

L'équivalent Google Cloud des instances réservées est les *remises sur engagement d'utilisation*, qui vous permettent de payer à l'avance un certain nombre de vCPU et une quantité de mémoire. Cette option est plus flexible que les réservations AWS, car vous pouvez utiliser plus de ressources que ce que vous avez réservé. Vous payez simplement le prix à la demande normal pour les ressources non couvertes par votre réservation.

Les instances réservées et les remises sur engagement d'utilisation peuvent être un bon choix lorsque vous connaissez vos besoins à court et moyen terme. Cependant, il n'y a pas de remboursement pour les réservations que vous n'utilisez pas et vous devez payer à l'avance pour toute la période de réservation. Vous ne devez donc choisir de réserver des instances que pour une période pendant laquelle vos besoins ne sont pas susceptibles de changer de manière significative.

Si vous pouvez planifier un an ou deux à l'avance, l'utilisation d'instances réservées peut générer des économies considérables.

## Meilleure pratique

**Utilisez des instances réservées lorsque vos besoins ne sont pas susceptibles de changer pendant un an ou deux, mais choisissez judicieusement vos réservations, car elles ne peuvent pas être modifiées ni remboursées une fois effectuées.**

## Utilisation d'instances préemptives (Spot)

Les instances *Spot*, comme les appelle AWS, ou les *machines virtuelles préemptives* dans la terminologie de Google, n'offrent aucune garantie de disponibilité et ont souvent une durée de vie limitée. Elles représentent donc un compromis entre prix et disponibilité.

Une instance Spot est bon marché, mais peut être suspendue ou reprise à tout moment, et peut être résiliée complètement. Heureusement, Kubernetes est conçu pour fournir des services haute disponibilité malgré la perte de nœuds de cluster individuels.

### Prix variable ou préemption variable

Les instances Spot peuvent donc être un choix rentable pour votre cluster. Avec les instances Spot AWS, la tarification horaire varie en fonction de la demande. Lorsque la demande est élevée pour un type d'instance donné dans une région et une zone de disponibilité particulières, le prix augmente.

Les machines virtuelles préemptives de Google Cloud, quant à elles, sont facturées à un taux fixe, mais le taux de préemption varie. Google indique qu'en moyenne, [environ 5 à 15 % de vos nœuds seront préemptés au cours d'une semaine donnée](https://cloud.google.com/compute/docs/instances/preemptible?hl=fr). Cependant, les machines virtuelles préemptives peuvent être jusqu'à 80 % moins chères que les instances à la demande, selon le type d'instance.

### Les nœuds préemptifs peuvent réduire vos coûts de moitié

L'utilisation de nœuds préemptifs pour votre cluster Kubernetes peut donc être un moyen très efficace de réduire les coûts. Bien que vous puissiez avoir besoin d'exécuter quelques nœuds supplémentaires pour vous assurer que vos charges de travail peuvent survivre à la préemption, des données anecdotiques suggèrent qu'une réduction globale de 50 % du coût par nœud est réalisable.

Vous constaterez peut-être également que l'utilisation de nœuds préemptifs est un bon moyen d'intégrer un peu d'ingénierie du chaos dans votre cluster, à condition que votre application soit prête pour les tests de chaos.

N'oubliez pas, cependant, que vous devez toujours disposer de suffisamment de nœuds non préemptifs pour gérer la charge de travail minimale de votre cluster. Ne pariez jamais plus que ce que vous pouvez vous permettre de perdre. Si vous avez beaucoup de nœuds préemptifs, il peut être judicieux d'utiliser la mise à l'échelle automatique du cluster pour garantir que les nœuds préemptés sont remplacés dès que possible.

En théorie, *tous* vos nœuds préemptifs pourraient disparaître en même temps. Malgré les économies, il est donc conseillé de limiter vos nœuds préemptifs à deux tiers de votre cluster, par exemple.

## Meilleure pratique

**Maintenez des coûts bas en utilisant des instances préemptives ou Spot pour certains de vos nœuds, mais pas plus que ce que vous pouvez vous permettre de perdre. Conservez toujours des nœuds non préemptifs.**

### Utilisation des affinités de nœuds pour contrôler la planification

Vous pouvez utiliser les *affinités de nœuds* Kubernetes pour vous assurer que les `Pods` qui ne tolèrent pas les pannes ne sont [pas planifiés sur des nœuds préemptifs](https://medium.com/google-cloud/using-preemptible-vms-to-cut-kubernetes-engine-bills-in-half-de2481b8e814) (voir **[« Affinités de nœuds »](Lab 5)**).

Par exemple, les nœuds préemptifs Google Kubernetes Engine (GKE) portent l'étiquette `cloud.google.com/gke-preemptible`. Pour indiquer à Kubernetes de ne jamais planifier un `Pod` sur l'un de ces nœuds, ajoutez ce qui suit à la spécification du `Pod` ou du `Deployment` :

```yaml
affinity:
  nodeAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      nodeSelectorTerms:
      - matchExpressions:
        - key: cloud.google.com/gke-preemptible
          operator: DoesNotExist
```

L'affinité `requiredDuringScheduling...` est obligatoire : un `Pod` avec cette affinité ne sera *jamais* planifié sur un nœud qui ne correspond pas à l'expression du sélecteur (appelée *affinité dure*).

Alternativement, vous pouvez indiquer à Kubernetes que certains de vos `Pods` moins critiques, qui tolèrent des pannes occasionnelles, doivent être planifiés préférentiellement sur des nœuds préemptifs. Dans ce cas, vous pouvez utiliser une *affinité douce* dans le sens opposé :

```yaml
affinity:
  nodeAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
    - preference:
        matchExpressions:
        - key: cloud.google.com/gke-preemptible
          operator: Exists
      weight: 100
```

Cela signifie en réalité : « Veuillez planifier ce `Pod` sur un nœud préemptif si possible ; sinon, peu importe. »

## Meilleure pratique

**Si vous utilisez des nœuds préemptifs, utilisez les affinités de nœuds Kubernetes pour vous assurer que les charges de travail critiques ne sont pas préemptées.**

## Maintenir l'équilibre de vos charges de travail

Nous avons évoqué le travail du planificateur Kubernetes, qui consiste à s'assurer que les charges de travail sont réparties équitablement sur autant de nœuds que possible et à essayer de placer les `Pods` de répliques sur différents nœuds pour une haute disponibilité.

En général, le planificateur fait un excellent travail, mais il existe des cas limites auxquels vous devez prêter attention.

Par exemple, supposons que vous ayez deux nœuds et deux services, A et B, chacun avec deux répliques. Dans un cluster équilibré, il y aura une réplique du service A sur chaque nœud et une réplique du service B sur chaque nœud. Si un nœud tombe en panne, A et B resteront disponibles.

Jusqu'ici, tout va bien. Mais supposons que le nœud 2 tombe en panne. Le planificateur remarquera que A et B ont besoin d'une réplique supplémentaire, et comme il n'y a qu'un seul nœud disponible pour les créer, il le fera. Le nœud 1 exécute maintenant deux répliques du service A et deux du service B.

Supposons maintenant que nous démarrions un nouveau nœud pour remplacer le nœud 2 défaillant. Même une fois disponible, il n'y aura pas de `Pods` dessus. Le planificateur ne déplace jamais les `Pods` en cours d'exécution d'un nœud à un autre.

Nous avons maintenant un [cluster déséquilibré](https://itnext.io/keep-you-kubernetes-cluster-balanced-the-secret-to-high-availability-17edf60d9cb7?gi=4bc2e6ab10b7), où tous les `Pods` se trouvent sur le nœud 1 et aucun sur le nœud 2.



Mais cela empire. Supposons que vous déployiez une mise à jour progressive du service A (appelons la nouvelle version service A\*). Le planificateur doit démarrer deux nouvelles répliques pour le service A\*, attendre qu'elles soient prêtes, puis supprimer les anciennes. Où démarrera-t-il les nouvelles répliques ? Sur le nouveau nœud 2, car il est inactif, tandis que le nœud 1 exécute déjà quatre `Pods`. Deux nouvelles répliques du service A\* sont donc démarrées sur le nœud 2 et les anciennes sont supprimées du nœud 1.

Vous êtes maintenant dans une situation délicate, car les deux répliques du service B se trouvent sur le même nœud (nœud 1), tandis que les deux répliques du service A\* se trouvent également sur le même nœud (nœud 2). Bien que vous ayez deux nœuds, vous n'avez pas de haute disponibilité. La défaillance du nœud 1 ou du nœud 2 entraînera une interruption de service.

Le nœud du problème est que le planificateur ne déplace jamais les `Pods` d'un nœud à un autre, sauf s'ils sont redémarrés pour une raison quelconque. De plus, l'objectif du planificateur, qui est de répartir les charges de travail uniformément sur les nœuds, est parfois en conflit avec le maintien de la haute disponibilité pour les services individuels.

Une solution consiste à utiliser un outil appelé [Descheduler](https://github.com/kubernetes-sigs/descheduler). Vous pouvez exécuter cet outil régulièrement, en tant que `Job` Kubernetes, et il fera de son mieux pour rééquilibrer le cluster en trouvant les `Pods` à déplacer et en les supprimant.

`Descheduler` propose différentes stratégies et politiques que vous pouvez configurer. Par exemple, une politique recherche les nœuds sous-utilisés et supprime les `Pods` sur d'autres nœuds pour les forcer à être replanifiés sur les nœuds inactifs.

Une autre politique recherche les `Pods` dupliqués, c'est-à-dire lorsque deux répliques ou plus du même `Pod` s'exécutent sur le même nœud, et les expulse. Cela résout le problème rencontré dans notre exemple, où les charges de travail étaient nominalement équilibrées, mais en réalité, aucun des deux services n'était hautement disponible.

## Résumé

Kubernetes est très efficace pour exécuter des charges de travail de manière fiable et efficace, sans nécessiter d'intervention manuelle. Si vous fournissez au planificateur des estimations précises des besoins en ressources de vos conteneurs, vous pouvez généralement laisser Kubernetes gérer le reste.

Le temps que vous auriez passé à résoudre les problèmes opérationnels peut ainsi être consacré à des tâches plus utiles, comme le développement d'applications. Merci Kubernetes !

Comprendre comment Kubernetes gère les ressources est essentiel pour créer et exécuter correctement votre cluster. Les points les plus importants à retenir :

*   Kubernetes alloue des ressources CPU et mémoire aux conteneurs sur la base des *demandes* et des *limites*.
*   Les demandes d'un conteneur correspondent aux quantités minimales de ressources dont il a besoin pour s'exécuter. Ses limites spécifient la quantité maximale qu'il est autorisé à utiliser.
*   Les images de conteneur minimales sont plus rapides à créer, à transférer, à déployer et à démarrer. Plus le conteneur est petit, moins il présente de failles de sécurité potentielles.
*   Les sondes d'activité indiquent à Kubernetes si le conteneur fonctionne correctement. Si la sonde d'activité d'un conteneur échoue, celui-ci est arrêté et redémarré.
*   Les sondes de préparation indiquent à Kubernetes que le conteneur est prêt et capable de traiter les requêtes. Si la sonde de préparation d'un conteneur échoue, celui-ci est retiré de tous les `Services` qui y font référence, le déconnectant du trafic utilisateur.
*   Les sondes de démarrage sont similaires aux sondes d'activité, mais servent uniquement à déterminer si une application a fini de démarrer et est prête pour que la sonde d'activité prenne le relais pour la vérification de l'état.
*   Les `PodDisruptionBudgets` vous permettent de limiter le

*   Les `PodDisruptionBudgets` vous permettent de limiter le nombre de Pods qui peuvent être arrêtés en même temps pendant les évictions, préservant ainsi la haute disponibilité de votre application.
*   Les espaces de noms sont un moyen de partitionner logiquement votre cluster. Vous pouvez créer un espace de noms pour chaque application ou groupe d'applications connexes.
*   Pour faire référence à un service dans un autre espace de noms, vous pouvez utiliser une adresse DNS comme celle-ci : `SERVICE.NAMESPACE`.
*   `ResourceQuotas` vous permet de définir des limites de ressources globales pour un espace de noms donné.
*   `LimitRanges` spécifie les demandes et les limites de ressources par défaut pour les conteneurs d'un espace de noms.
*   Définissez des limites de ressources de manière à ce que vos applications les dépassent presque, mais pas tout à fait, dans le cadre d'une utilisation normale.
*   N'allouez pas plus de stockage dans le nuage que vous n'en avez besoin, et ne fournissez pas de stockage à large bande passante à moins que cela ne soit essentiel pour les performances de votre application.
*   Définissez des annotations de propriétaire sur toutes vos ressources et analysez régulièrement le cluster à la recherche de ressources dont vous n'êtes pas propriétaire.
*   Trouvez et nettoyez les ressources qui ne sont pas utilisées (mais vérifiez auprès de leurs propriétaires).
*   Les instances réservées peuvent vous faire économiser de l'argent si vous pouvez planifier votre utilisation à long terme.
*   Les instances préemptibles peuvent vous faire économiser de l'argent dans l'immédiat, mais soyez prêt à les voir disparaître à brève échéance. Utilisez les affinités entre nœuds pour éloigner les Pods sensibles aux pannes des nœuds préemptibles.