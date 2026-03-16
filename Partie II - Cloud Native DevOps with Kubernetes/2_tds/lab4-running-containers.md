## LAB 4 - Running Containers

> **Auteur** : Badr TAJINI - Cloud-native-DevOps-with-Kubernetes - ESIEE - 2024/2025

---

Dans les labs précédents, nous nous sommes principalement concentrés sur les aspects opérationnels de Kubernetes : où obtenir vos clusters, comment les maintenir et comment gérer les ressources de votre cluster. Passons maintenant à l'objet Kubernetes le plus fondamental : le conteneur. Nous examinerons le fonctionnement technique des conteneurs, leur relation avec les `Pods` et comment déployer des images de conteneur sur Kubernetes.

Dans ce lab, nous aborderons également le sujet important de la sécurité des conteneurs et l'utilisation des fonctionnalités de sécurité de Kubernetes pour déployer vos applications de manière sécurisée, conformément aux meilleures pratiques. Enfin, nous verrons comment monter des volumes de disque sur les `Pods`, permettant aux conteneurs de partager et de conserver des données.

## Conteneurs et `Pods`

Nous avons déjà présenté les `Pods` au **Lab 1** et expliqué comment les `Deployments` utilisent les `ReplicaSets` pour maintenir un ensemble de `Pods` répliqués, mais nous n'avons pas encore examiné les `Pods` eux-mêmes en détail. Les `Pods` sont l'unité de planification dans Kubernetes. Un objet `Pod` représente un conteneur ou un groupe de conteneurs, et tout ce qui s'exécute dans Kubernetes le fait au moyen d'un `Pod` :

> Un `Pod` représente un ensemble de conteneurs d'applications et de volumes s'exécutant dans le même environnement d'exécution. Les `Pods`, et non les conteneurs, sont le plus petit artefact déployable dans un cluster Kubernetes. Cela signifie que tous les conteneurs d'un `Pod` se retrouvent toujours sur la même machine.
>
> Kelsey Hightower et al., Kubernetes Up & Running

Jusqu'à présent dans ce livre, les termes `Pod` et conteneur ont été utilisés plus ou moins de manière interchangeable : le `Pod` de l'application de démonstration ne contient qu'un seul conteneur. Dans les applications plus complexes, cependant, il est fort probable qu'un `Pod` comprenne deux conteneurs ou plus. Voyons donc comment cela fonctionne et quand et pourquoi vous pourriez vouloir regrouper des conteneurs dans des `Pods`.

## Qu'est-ce qu'un conteneur ?

Avant de nous demander pourquoi vous pourriez vouloir plusieurs conteneurs dans un `Pod`, prenons un moment pour revoir ce qu'est réellement un conteneur.

Vous savez d'après **« L'avènement des conteneurs » (voir Chapitre 1 du cours)** qu'un conteneur est un package standardisé contenant un logiciel avec ses dépendances, sa configuration, ses données, etc. : tout ce dont il a besoin pour fonctionner. Mais comment cela fonctionne-t-il concrètement ?

Sous Linux et la plupart des autres systèmes d'exploitation, tout ce qui s'exécute sur une machine le fait au moyen d'un processus. Un processus représente le code binaire et l'état de la mémoire d'une application en cours d'exécution, telle que Chrome, top ou Visual Studio Code. Tous les processus existent dans le même espace de noms global : ils peuvent tous se voir et interagir les uns avec les autres, ils partagent tous le même pool de ressources, telles que le CPU, la mémoire et le système de fichiers. (Un espace de noms Linux ressemble un peu à un espace de noms Kubernetes, bien que ce ne soit pas la même chose techniquement.)

Du point de vue du système d'exploitation, un conteneur représente un processus isolé (ou un groupe de processus) qui existe dans son propre espace de noms. Les processus à l'intérieur du conteneur ne peuvent pas voir les processus à l'extérieur, et vice versa. Un conteneur ne peut pas accéder aux ressources appartenant à un autre conteneur ni aux processus extérieurs à un conteneur. La limite du conteneur est comme une clôture qui empêche les processus de se déchaîner et d'utiliser les ressources des uns et des autres.

En ce qui concerne le processus à l'intérieur du conteneur, il s'exécute sur sa propre machine, avec un accès complet à toutes ses ressources, et aucun autre processus n'est en cours d'exécution. Vous pouvez le constater en exécutant quelques commandes à l'intérieur d'un conteneur :

```bash
kubectl run busybox --image busybox:1.28 --rm -it --restart=Never /bin/sh
If you don't see a command prompt, try pressing enter.
/ # ps ax
PID   USER     TIME  COMMAND
    1 root      0:00 /bin/sh
    8 root      0:00 ps ax

/ # hostname
busybox
```

Normalement, la commande `ps ax` répertorie tous les processus en cours d'exécution sur la machine, et il y en a généralement beaucoup (quelques centaines sur un serveur Linux typique). Mais seuls deux processus sont affichés ici : `/bin/sh` et `ps ax`. Les seuls processus visibles à l'intérieur du conteneur sont donc ceux qui s'exécutent réellement dans le conteneur.

De même, la commande `hostname`, qui affiche normalement le nom de la machine hôte, renvoie `busybox` : en fait, il s'agit du nom du conteneur. Il semble donc au conteneur `busybox` qu'il s'exécute sur une machine appelée `busybox`, et qu'il dispose de toute la machine pour lui-même. Ceci est vrai pour chacun des conteneurs s'exécutant sur la même machine.

**Astuce**

C'est un exercice amusant de créer un conteneur vous-même, sans l'aide d'un runtime de conteneur comme Docker. L'excellente présentation de Liz Rice sur [« Qu'est-ce qu'un conteneur, vraiment ? »](https://www.youtube.com/watch?v=Utf-A4rODH8) montre comment faire cela à partir de zéro dans un programme Go.

## Runtimes de conteneurs dans Kubernetes

Comme nous l'avons mentionné précédemment, Docker n'est pas le seul moyen d'exécuter des conteneurs. En fait, en décembre 2020, les responsables ont annoncé que le runtime Docker dans Kubernetes serait déprécié et remplacé par des alternatives utilisant la [Container Runtime Interface (CRI)](https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/container-runtime/). Cela ne signifie pas que les conteneurs Docker ne fonctionneront plus dans Kubernetes à l'avenir, ni que Docker cessera d'être un outil utile pour interagir avec les conteneurs en dehors du contexte de Kubernetes. Tant qu'un conteneur est conforme aux normes définies par l'[Open Container Initiative (OCI)](https://opencontainers.org/), il devrait fonctionner dans Kubernetes, et les conteneurs créés avec Docker respectent ces normes. Vous pouvez en savoir plus sur ce changement et son impact dans la [FAQ sur la suppression de Dockershim](https://kubernetes.io/blog/2020/12/02/dockershim-faq/) sur le blog Kubernetes.

## Que doit contenir un conteneur ?

Il n'y a aucune raison technique pour laquelle vous ne pouvez pas exécuter autant de processus que vous le souhaitez à l'intérieur d'un conteneur : vous pouvez exécuter une distribution Linux complète, avec plusieurs applications en cours d'exécution, des services réseau, etc., le tout dans le même conteneur. C'est pourquoi vous entendez parfois parler de conteneurs comme de machines virtuelles légères. Mais ce n'est pas la meilleure façon d'utiliser les conteneurs, car vous ne bénéficiez pas des avantages de l'isolation des ressources.

Si les processus n'ont pas besoin de se connaître, ils n'ont pas besoin de s'exécuter dans le même conteneur. Une bonne règle de base avec un conteneur est qu'il doit faire une seule chose. Par exemple, notre conteneur d'application de démonstration écoute sur un port réseau et envoie la chaîne « Hello, 世界 » à toute personne qui s'y connecte. C'est un service simple et autonome : il ne dépend d'aucun autre programme ou service, et à son tour, rien ne dépend de lui. C'est un candidat parfait pour avoir son propre conteneur.

Un conteneur a également un point d'entrée : une commande qui est exécutée au démarrage du conteneur. Cela se traduit généralement par la création d'un seul processus pour exécuter la commande, bien que certaines applications lancent souvent quelques sous-processus pour agir comme assistants ou travailleurs. Pour démarrer plusieurs processus distincts dans un conteneur, vous devez écrire un script wrapper pour agir comme point d'entrée, qui à son tour démarrera les processus que vous souhaitez.

**Astuce**

Chaque conteneur ne doit exécuter qu'un seul processus principal. Si vous exécutez un grand groupe de processus non liés dans un conteneur, vous ne profitez pas pleinement de la puissance des conteneurs et vous devriez envisager de diviser votre application en plusieurs conteneurs communicants.

## Que doit contenir un `Pod` ?

Maintenant que vous savez ce qu'est un conteneur, vous pouvez comprendre pourquoi il est utile de les regrouper dans des `Pods`. Un `Pod` représente un groupe de conteneurs qui doivent communiquer et partager des données entre eux ; ils doivent être planifiés ensemble, démarrés et arrêtés ensemble, et s'exécuter sur la même machine physique.

Un bon exemple de ceci est une application qui stocke des données dans un cache local, tel que Memcached. Vous devrez exécuter deux processus : votre application et le processus serveur `memcached` - [lien](https://memcached.org/about) qui gère le stockage et la récupération des données. Bien que vous puissiez exécuter les deux processus dans un seul conteneur, ce n'est pas nécessaire - ils n'ont besoin de communiquer que via un socket réseau. Il est préférable de les diviser en deux conteneurs distincts, chacun ne devant se soucier que de la construction et de l'exécution de son propre processus.

Vous pouvez utiliser une image de conteneur [Memcached](https://hub.docker.com/_/memcached) publique, disponible sur Docker Hub, qui est déjà configurée pour fonctionner dans le cadre d'un `Pod` avec un autre conteneur.

Vous créez donc un `Pod` avec deux conteneurs : Memcached et votre application. L'application peut communiquer avec Memcached en établissant une connexion réseau, et comme les deux conteneurs sont dans le même `Pod`, cette connexion sera toujours locale : les deux conteneurs s'exécuteront toujours sur le même nœud.

De même, imaginez une application Web, qui se compose d'un conteneur de serveur Web, tel que NGINX, et d'une application de blog qui génère des pages Web HTML, des fichiers, des images, etc. Le conteneur de blog écrit des données sur le disque, et comme les conteneurs d'un `Pod` peuvent partager un volume de disque, les données peuvent également être disponibles pour le conteneur NGINX à servir via HTTP. Vous pouvez trouver un tel exemple sur le site de documentation de [Kubernetes](https://kubernetes.io/docs/tasks/access-application-cluster/communicate-containers-same-pod-shared-volume/).

> En général, la bonne question à se poser lors de la conception des `Pods` est : « Ces conteneurs fonctionneront-ils correctement s'ils se retrouvent sur différentes machines ? » Si la réponse est « non », un `Pod` est le bon regroupement pour les conteneurs. Si la réponse est « oui », plusieurs `Pods` sont probablement la bonne solution.
>
> Kelsey Hightower et al., Kubernetes Up & Running

Les conteneurs d'un `Pod` doivent tous travailler ensemble pour effectuer une tâche. Si vous n'avez besoin que d'un seul conteneur pour effectuer cette tâche, très bien : utilisez un seul conteneur. Si vous en avez besoin de deux ou trois, c'est acceptable. Si vous en avez plus, vous voudrez peut-être vous demander si les conteneurs pourraient être divisés en `Pods` distincts.

## Manifestes de conteneurs

Nous avons décrit ce que sont les conteneurs, ce qu'ils doivent contenir et quand ils doivent être regroupés dans des `Pods`. Alors, comment exécuter un conteneur dans Kubernetes ?

Lorsque vous avez créé votre premier `Deployment` dans **[« Manifestes de déploiement »](Lab 2)**, il contenait une section `template.spec` spécifiant le conteneur à exécuter (un seul conteneur, dans cet exemple) :

```yaml
spec:
  containers:
  - name: demo
    image: cloudnatived/demo:hello
    ports:
    - containerPort: 8888
```

Voici un exemple de ce à quoi ressemblerait la section `template.spec` pour un `Deployment` avec deux conteneurs :

```yaml
spec:
  containers:
  - name: container1
    image: example/container1
  - name: container2
    image: example/container2
```

Les seuls champs obligatoires dans la spécification de chaque conteneur sont le `name` et l'`image` : un conteneur doit avoir un nom, afin que d'autres ressources puissent y faire référence, et vous devez indiquer à Kubernetes quelle image exécuter dans le conteneur.

## Identifiants d'image

Vous avez déjà utilisé différents identifiants d'image de conteneur jusqu'à présent dans ce livre ; par exemple, `cloudnatived/demo:hello`, `alpine` et `busybox:1.28`.

Un identifiant d'image comporte en fait quatre parties : le nom d'hôte du registre, l'espace de noms du référentiel, le référentiel d'images et la balise (tag). Tous sauf le nom de l'image sont facultatifs. Un identifiant d'image utilisant toutes ces parties ressemble à ceci :

`docker.io/cloudnatived/demo:hello`

Le nom d'hôte du registre dans cet exemple est `docker.io` ; en fait, c'est la valeur par défaut pour les images Docker, nous n'avons donc pas besoin de le spécifier. Cependant, si votre image est stockée dans un autre registre, vous devrez indiquer son nom d'hôte. Par exemple, les images Google Container Registry sont préfixées par `gcr.io`.

L'espace de noms du référentiel est `cloudnatived` : c'est nous (bonjour !). Si vous ne spécifiez pas l'espace de noms du référentiel, l'espace de noms par défaut (appelé `library`) est utilisé. Il s'agit d'un ensemble d'images officielles [lien](https://docs.docker.com/trusted-content/official-images/), approuvées et maintenues par Docker, Inc. Les images officielles populaires incluent les images de base du système d'exploitation (`alpine`, `ubuntu`, `debian`, `centos`), les environnements linguistiques (`golang`, `python`, `ruby`, `php`, `java`) et les logiciels largement utilisés (`mongo`, `mysql`, `nginx`, `redis`).

Le référentiel d'images est `demo`, qui identifie une image de conteneur particulière dans le registre et l'espace de noms. (Voir aussi **« Digests de conteneurs » (section en dessous)**.)

La balise est `hello`. Les balises identifient différentes versions de la même image.

C'est à vous de décider quelles balises apposer sur un conteneur : voici quelques choix courants :

*   Une balise de version sémantique, comme `v1.3.0`. Elle fait généralement référence à la version de l'application.
*   Une balise Git SHA, comme `5ba6bfd...`. Elle identifie le commit spécifique dans le référentiel source qui a été utilisé pour créer le conteneur (voir **« Balises Git SHA »(Lab 7)**).
*   L'environnement qu'elle représente, tel que `staging` ou `production`.

Vous pouvez ajouter autant de balises que vous le souhaitez à une image donnée.

## La balise `latest`

Si vous ne spécifiez pas de balise lors de l'extraction d'une image, la balise par défaut pour les images Docker est `latest`. Par exemple, lorsque vous exécutez une image `alpine` sans balise spécifiée, vous obtenez `alpine:latest`.

La balise `latest` est une balise par défaut qui est ajoutée à une image lorsque vous la créez ou la transférez sans spécifier de balise. Elle n'identifie pas nécessairement l'image la plus récente, mais simplement l'image la plus récente qui n'a pas été explicitement balisée. Cela rend [`latest`](https://vsupalov.com/docker-latest-tag/) peu utile comme identifiant.

C'est pourquoi il est important de toujours utiliser une balise spécifique lors du déploiement de conteneurs de production sur Kubernetes. Lorsque vous exécutez simplement un conteneur ponctuel pour le dépannage ou l'expérimentation, comme le conteneur `alpine`, vous pouvez omettre la balise et obtenir la dernière image. Pour les applications réelles, cependant, vous voulez vous assurer que si vous déployez le `Pod` demain, vous obtiendrez exactement la même image de conteneur que lorsque vous l'avez déployée aujourd'hui :

> Vous devez éviter d'utiliser la balise `latest` lors du déploiement de conteneurs en production, car il est plus difficile de suivre la version de l'image en cours d'exécution et plus difficile d'effectuer une restauration correcte.
>
> La documentation Kubernetes

## Digests de conteneurs

Comme nous l'avons vu, la balise `latest` ne signifie pas toujours ce que vous pensez, et même une version sémantique ou une balise Git SHA n'identifie pas de manière unique et permanente une image de conteneur particulière. Si le responsable décide de transférer une image différente avec la même balise, la prochaine fois que vous déployez, vous obtiendrez cette image mise à jour. En termes techniques, une balise est non déterministe.

Il est parfois souhaitable d'avoir des déploiements déterministes : en d'autres termes, garantir qu'un déploiement fera toujours référence à l'image de conteneur exacte que vous avez spécifiée. Vous pouvez le faire en utilisant le *digest* du conteneur : un hachage cryptographique du contenu de l'image qui identifie immuablement cette image.

Les images peuvent avoir plusieurs balises, mais un seul digest. Cela signifie que si votre manifeste de conteneur spécifie le digest de l'image, vous pouvez garantir des déploiements déterministes. Un identifiant d'image avec un digest ressemble à ceci :

`cloudnatived/demo@sha256:aeae1e551a6cbd60bcfd56c3b4ffec732c45b8012b7cb758c6c4a34...`

## Balises d'image de base

Lorsque vous référencez une image de base dans un Dockerfile, si vous ne spécifiez pas de balise, vous obtiendrez `latest`, tout comme lorsque vous exécutez un conteneur. Cela peut être source de confusion si un jour vos builds cessent de fonctionner et que vous découvrez que la dernière image que vous utilisiez pointe désormais vers une version différente de l'image qui introduit un changement cassant dans votre application.

Pour cette raison, vous pouvez utiliser une balise plus spécifique pour les images de base sur vos lignes `FROM` dans votre Dockerfile. Mais quelle balise utiliser ? Ou devriez-vous utiliser un digest exact ? Cela dépend en grande partie de votre situation de développement et de vos préférences.

Utilisons l'image [Python](https://hub.docker.com/_/python) officielle sur Docker Hub comme exemple. Vous avez la possibilité d'utiliser `python:3`, `python:3.9`, `python:3.9.7` ou de nombreuses autres variantes de balises de version, ainsi que différents systèmes d'exploitation de base comme Windows, Alpine et Debian.

L'avantage d'utiliser une balise moins spécifique, telle que `python:3`, est que vous intégrerez automatiquement toutes les mises à jour et correctifs de sécurité, ainsi que la dernière version mineure de Python 3 chaque fois que vous créez une nouvelle image. L'inconvénient est que parfois ces mises à jour peuvent causer des problèmes si un package système est renommé ou supprimé. Votre application peut fonctionner parfaitement sous Python 3.9, mais commencer à échouer à cause des modifications introduites dans une nouvelle version 3.10 si vous créez une nouvelle image et que vous ne réalisez pas que votre image de base `python:3` est passée de 3.9 à 3.10.

Si vous utilisez une balise plus spécifique, telle que `python:3.9.7`, votre image de base est moins susceptible de changer de manière inattendue. Cependant, vous devrez faire attention et mettre à jour manuellement votre Dockerfile lorsqu'une nouvelle version est disponible afin de pouvoir intégrer ces importants correctifs de sécurité et de bogues. Vous préférerez peut-être ce style de développement où vous avez un meilleur contrôle sur vos builds, mais il est important de vérifier régulièrement les mises à jour de vos images de base afin qu'elles ne prennent pas de retard, car elles manqueront les correctifs de sécurité qui ont été poussés par les mainteneurs.

La balise d'image que vous utilisez dépendra en grande partie des préférences de votre équipe, de la cadence de publication et du style de développement. Vous devez peser le pour et le contre du système de balises que vous choisissez et vérifier régulièrement que vous disposez d'un processus qui fournit des builds raisonnablement fiables avec des mises à jour régulières à un rythme soutenable.

## Ports

Vous avez déjà vu le champ `ports` utilisé avec notre application de démonstration dans **[« Ressources de service »](Lab 2)**. Il spécifie les numéros de port réseau sur lesquels l'application écoutera et peut être associé à un [`Service`](https://kubernetes.io/docs/concepts/services-networking/service/) pour acheminer les requêtes vers le conteneur.

## Demandes et limites de ressources

Nous avons déjà couvert en détail les demandes et les limites de ressources pour les conteneurs au **Lab 3**, donc un bref récapitulatif ici suffira.

Chaque conteneur peut fournir un ou plusieurs des éléments suivants dans le cadre de sa spécification :

*   `resources.requests.cpu`
*   `resources.requests.memory`
*   `resources.limits.cpu`
*   `resources.limits.memory`

Bien que les demandes et les limites soient spécifiées sur des conteneurs individuels, nous parlons généralement en termes de demandes et de limites de ressources *totales* du `Pod`. La demande de ressources d'un `Pod` est la somme des demandes de ressources pour tous les conteneurs de ce `Pod`, et ainsi de suite.

## Politique d'extraction d'image (`imagePullPolicy`)

Avant qu'un conteneur puisse être exécuté sur un nœud, l'image doit être extraite, ou téléchargée, du registre de conteneurs approprié. Le champ `imagePullPolicy` sur un conteneur régit la fréquence à laquelle Kubernetes le fera. Il peut prendre l'une des trois valeurs suivantes : `Always`, `IfNotPresent` ou `Never` :

*   `Always` extraira l'image à chaque démarrage du conteneur. En supposant que vous spécifiez une balise (ce que vous devriez faire ; voir **[« La balise latest »](Lab 4)**), cela est probablement inutile et pourrait gaspiller du temps et de la bande passante.
*   `IfNotPresent`, la valeur par défaut, convient à la plupart des situations. Si l'image n'est pas déjà présente sur le nœud, elle sera téléchargée. Après cela, à moins que vous ne modifiez la spécification de l'image, l'image enregistrée sera utilisée à chaque démarrage du conteneur et Kubernetes ne tentera pas de la retélécharger.
*   `Never` ne mettra jamais à jour l'image. Avec cette politique, Kubernetes ne récupérera jamais l'image d'un registre : si elle est déjà présente sur le nœud, elle sera utilisée, mais si ce n'est pas le cas, le conteneur ne démarrera pas. Il est peu probable que vous souhaitiez cela.

Si vous rencontrez des problèmes étranges (par exemple, un `Pod` qui ne se met pas à jour lorsque vous avez transféré une nouvelle image de conteneur), vérifiez votre politique d'extraction d'image.

## Variables d'environnement

Les variables d'environnement sont un moyen courant, quoique limité, de transmettre des informations aux conteneurs lors de l'exécution. Courant, car tous les exécutables Linux ont accès aux variables d'environnement, et même les programmes écrits bien avant l'existence des conteneurs peuvent utiliser leur environnement pour la configuration. Limité, car les variables d'environnement ne peuvent être que des valeurs de chaîne : pas de tableaux, pas de clés et de valeurs, pas de données structurées en général. La taille totale de l'environnement d'un processus est également limitée à 32 Kio, vous ne pouvez donc pas transmettre de gros fichiers de données dans l'environnement.

Pour définir une variable d'environnement, ajoutez-la dans le champ `env` du conteneur :

```yaml
containers:
- name: demo
  image: cloudnatived/demo:hello
  env:
  - name: GREETING
    value: "Hello from the environment"
```

Si l'image du conteneur spécifie elle-même des variables d'environnement (définies dans le Dockerfile, par exemple), les paramètres `env` de Kubernetes les remplaceront. Cela peut être utile pour modifier la configuration par défaut d'un conteneur.

**Astuce**

Un moyen plus flexible de transmettre des données de configuration aux conteneurs consiste à utiliser un objet `ConfigMap` ou `Secret` de Kubernetes.

## Sécurité des conteneurs

Vous avez peut-être remarqué dans **[« Qu'est-ce qu'un conteneur ? »](Lab 4)** que lorsque nous avons examiné la liste des processus dans le conteneur avec la commande `ps ax`, les processus s'exécutaient tous en tant qu'utilisateur root. Sous Linux et autres systèmes d'exploitation dérivés d'Unix, root est le superutilisateur, qui a le privilège de lire toutes les données, de modifier tous les fichiers et d'effectuer toutes les opérations sur le système.

Alors que sur un système Linux complet, certains processus doivent s'exécuter en tant que root (par exemple `init`, qui gère tous les autres processus), ce n'est généralement pas le cas avec un conteneur.

En effet, exécuter des processus en tant qu'utilisateur root alors que ce n'est pas nécessaire est une mauvaise idée. Cela contrevient au [principe du moindre privilège](https://en.wikipedia.org/wiki/Principle_of_least_privilege). Ce principe stipule qu'un programme ne doit pouvoir accéder qu'aux informations et aux ressources dont il a réellement besoin pour faire son travail.

Les programmes ont des bogues - c'est un fait de la vie évident pour quiconque en a écrit un. Certains bogues permettent aux utilisateurs malveillants de détourner le programme pour faire des choses qu'il n'est pas censé faire, comme lire des données secrètes ou exécuter du code arbitraire. Pour atténuer cela, il est important d'exécuter les conteneurs avec le minimum de privilèges possible.

Cela commence par ne pas les autoriser à s'exécuter en tant que root, mais plutôt en leur attribuant un utilisateur ordinaire : un utilisateur qui n'a aucun privilège spécial, comme la lecture des fichiers d'autres utilisateurs :

> Tout comme vous ne devriez pas (ou ne devriez pas) exécuter quoi que ce soit en tant que root sur votre serveur, vous ne devriez pas exécuter quoi que ce soit en tant que root dans un conteneur sur votre serveur. L'exécution de binaires créés ailleurs nécessite une quantité importante de confiance, et il en va de même pour les binaires dans les conteneurs.
>
> Marc Campbell

Il est également possible pour les attaquants d'exploiter des bogues dans le runtime du conteneur pour « s'échapper » du conteneur et obtenir les mêmes pouvoirs et privilèges sur la machine hôte que dans le conteneur.

## Exécution de conteneurs en tant qu'utilisateur non root

Voici un exemple de spécification de conteneur qui indique à Kubernetes d'exécuter le conteneur en tant qu'utilisateur spécifique :

```yaml
containers:
- name: demo
  image: cloudnatived/demo:hello
  securityContext:
    runAsUser: 1000
```

La valeur de `runAsUser` est un UID (un identifiant d'utilisateur numérique). Sur de nombreux systèmes Linux, l'UID 1000 est attribué au premier utilisateur non root créé sur le système. Il est donc généralement sûr de choisir des valeurs de 1000 ou plus pour les UID de conteneur. Peu importe qu'un utilisateur Unix avec cet UID existe ou non dans le conteneur, ou même s'il existe un système d'exploitation dans le conteneur ; cela fonctionne aussi bien avec les conteneurs `scratch`.

Si un UID `runAsUser` est spécifié, il remplacera tout utilisateur configuré dans l'image du conteneur. S'il n'y a pas de `runAsUser`, mais que le conteneur spécifie un utilisateur, Kubernetes l'exécutera en tant que cet utilisateur. Si aucun utilisateur n'est spécifié ni dans le manifeste ni dans l'image, le conteneur s'exécutera en tant que root (ce qui, comme nous l'avons vu, est une mauvaise idée).

Pour une sécurité maximale, vous devez choisir un UID différent pour chaque conteneur. De cette façon, si un conteneur est compromis d'une manière ou d'une autre, ou écrase accidentellement des données, il n'a la permission d'accéder qu'à ses propres données, et non à celles des autres conteneurs.

D'un autre côté, si vous souhaitez que deux conteneurs ou plus puissent accéder aux mêmes données (via un volume monté, par exemple), vous devez leur attribuer le même UID.

## Blocage des conteneurs root

Pour éviter cette situation, Kubernetes vous permet d'empêcher l'exécution des conteneurs s'ils doivent s'exécuter en tant qu'utilisateur root.

Le paramètre `runAsNonRoot: true` fera cela :

```yaml
containers:
- name: demo
  image: cloudnatived/demo:hello
  securityContext:
    runAsNonRoot: true
```

Lorsque Kubernetes exécute ce conteneur, il vérifie si le conteneur souhaite s'exécuter en tant que root. Si c'est le cas, il refusera de le démarrer. Cela vous protégera contre l'oubli de définir un utilisateur non root dans vos conteneurs ou contre l'exécution de conteneurs tiers configurés pour s'exécuter en tant que root.

Si cela se produit, le statut du `Pod` sera affiché comme `CreateContainerConfigError`, et lorsque vous exécuterez `kubectl describe` sur le `Pod`, vous verrez cette erreur :

```yaml
Error: container has runAsNonRoot and image will run as root
```

## Meilleure pratique

**Exécutez les conteneurs en tant qu'utilisateurs non root et empêchez les conteneurs root de s'exécuter à l'aide du paramètre `runAsNonRoot: true`.**

## Définition d'un système de fichiers en lecture seule

Un autre paramètre de contexte de sécurité utile est `readOnlyRootFilesystem`, qui empêchera le conteneur d'écrire sur son propre système de fichiers. Il est possible d'imaginer un conteneur profitant d'un bogue dans Docker ou Kubernetes, par exemple, où l'écriture sur son système de fichiers pourrait affecter les fichiers sur le nœud hôte. Si son système de fichiers est en lecture seule, cela ne peut pas se produire ; le conteneur obtiendra une erreur d'E/S :

```yaml
containers:
- name: demo
  image: cloudnatived/demo:hello
  securityContext:
    readOnlyRootFilesystem: true
```

De nombreux conteneurs n'ont pas besoin d'écrire quoi que ce soit sur leur propre système de fichiers, donc ce paramètre n'interférera pas avec eux. Il est [recommandé](https://kubernetes.io/blog/2016/08/security-best-practices-kubernetes-deployment/) de toujours définir `readOnlyRootFilesystem` à moins que le conteneur n'ait réellement besoin d'écrire dans des fichiers.

## Désactivation de l'escalade des privilèges

Normalement, les binaires Linux s'exécutent avec les mêmes privilèges que l'utilisateur qui les exécute. Il existe cependant une exception : les binaires qui utilisent le mécanisme `setuid` peuvent temporairement obtenir les privilèges de l'utilisateur propriétaire du binaire (généralement root).

Ceci est un problème potentiel dans les conteneurs, car même si le conteneur s'exécute en tant qu'utilisateur régulier (UID 1000, par exemple), s'il contient un binaire `setuid`, ce binaire peut obtenir les privilèges root par défaut.

Pour éviter cela, définissez le champ `allowPrivilegeEscalation` de la politique de sécurité du conteneur sur `false` :

```yaml
containers:
- name: demo
  image: cloudnatived/demo:hello
  securityContext:
    allowPrivilegeEscalation: false
```

Les programmes Linux modernes n'ont pas besoin de `setuid` ; ils peuvent utiliser un mécanisme de privilèges plus flexible et plus précis appelé *capabilities* pour obtenir le même résultat.

## Capabilities

Traditionnellement, les programmes Unix avaient deux niveaux de privilèges : normal et superutilisateur. Les programmes normaux n'ont pas plus de privilèges que l'utilisateur qui les exécute, tandis que les programmes superutilisateur peuvent tout faire, en contournant tous les contrôles de sécurité du noyau.

Le mécanisme de *capabilities* de Linux améliore cela en définissant diverses actions spécifiques qu'un programme peut effectuer : charger des modules du noyau, effectuer des opérations d'E/S réseau directes, accéder aux périphériques système, etc. Tout programme qui a besoin d'un privilège spécifique peut se le voir accorder, mais aucun autre.

Par exemple, un serveur Web qui écoute sur le port 80 devrait normalement s'exécuter en tant que root pour ce faire ; les numéros de port inférieurs à 1024 sont considérés comme des ports système privilégiés. Au lieu de cela, le programme peut se voir accorder la *capability* `NET_BIND_SERVICE`, qui lui permet de se lier à n'importe quel port, mais ne lui confère aucun autre privilège spécial.

L'ensemble de *capabilities* par défaut pour les conteneurs Docker est assez généreux. Il s'agit d'une décision pragmatique basée sur un compromis entre sécurité et convivialité : ne donner aucune *capability* aux conteneurs par défaut obligerait les opérateurs à définir des *capabilities* sur de nombreux conteneurs pour qu'ils puissent s'exécuter.

D'un autre côté, le principe du moindre privilège stipule qu'un conteneur ne doit avoir aucune *capability* dont il n'a pas besoin. Les contextes de sécurité Kubernetes vous permettent de supprimer toutes les *capabilities* de l'ensemble par défaut et d'en ajouter au besoin, comme le montre cet exemple :

```yaml
containers:
- name: demo
  image: cloudnatived/demo:hello
  securityContext:
    capabilities:
      drop: ["CHOWN", "NET_RAW", "SETPCAP"]
      add: ["NET_ADMIN"]
```

Le conteneur se verra retirer les *capabilities* `CHOWN`, `NET_RAW` et `SETPCAP`, et la *capability* `NET_ADMIN` sera ajoutée.

La [documentation Docker](https://docs.docker.com/engine/containers/run/#runtime-privilege-and-linux-capabilities) répertorie toutes les *capabilities* définies par défaut sur les conteneurs et celles qui peuvent être ajoutées si nécessaire.

Pour une sécurité maximale, vous devez supprimer toutes les *capabilities* pour chaque conteneur et n'ajouter des *capabilities* spécifiques que si elles sont nécessaires :

```yaml
containers:
- name: demo
  image: cloudnatived/demo:hello
  securityContext:
    capabilities:
      drop: ["all"]
      add: ["NET_BIND_SERVICE"]
```

Le mécanisme de *capabilities* impose une limite stricte à ce que les processus à l'intérieur du conteneur peuvent faire, même s'ils s'exécutent en tant que root. Une fois qu'une *capability* a été supprimée au niveau du conteneur, elle ne peut pas être récupérée, même par un processus malveillant avec des privilèges maximaux.

## Contextes de sécurité des `Pods`

Nous avons couvert les paramètres du contexte de sécurité au niveau des conteneurs individuels, mais vous pouvez également en définir certains au niveau du `Pod` :

```yaml
apiVersion: v1
kind: Pod
...
spec:
  securityContext:
    runAsUser: 1000
    runAsNonRoot: false
    allowPrivilegeEscalation: false
```

Ces paramètres s'appliqueront à tous les conteneurs du `Pod`, sauf si le conteneur remplace un paramètre donné dans son propre contexte de sécurité.

## Comptes de service de `Pod`

Les `Pods` s'exécutent avec les autorisations du compte de service par défaut pour l'espace de noms, sauf indication contraire (voir **[« Applications et déploiement »(voir Lab 6)]**). Si vous devez accorder des autorisations supplémentaires pour une raison quelconque (comme l'affichage des `Pods` dans d'autres espaces de noms), créez un compte de service dédié pour l'application, liez-le aux rôles requis et configurez le `Pod` pour qu'il utilise le nouveau compte de service.

Pour ce faire, définissez le champ `serviceAccountName` dans la spécification du `Pod` sur le nom du compte de service :

```yaml
apiVersion: v1
kind: Pod
...
spec:
  serviceAccountName: deploy-tool
```

## Volumes

Comme vous vous en souvenez peut-être, chaque conteneur possède son propre système de fichiers, accessible uniquement à ce conteneur, et éphémère : toutes les données qui ne font pas partie de l'image du conteneur seront perdues lorsque le conteneur redémarrera.

Souvent, cela convient ; l'application de démonstration, par exemple, est un serveur sans état qui ne nécessite donc pas de stockage persistant. Elle n'a pas non plus besoin de partager des fichiers avec d'autres conteneurs.

Cependant, des applications plus complexes peuvent nécessiter à la fois la possibilité de partager des données avec d'autres conteneurs du même `Pod` et de les conserver lors des redémarrages. Un objet `Volume` Kubernetes peut fournir ces deux fonctionnalités.

Il existe de nombreux types de `Volume` que vous pouvez attacher à un `Pod`. Quel que soit le support de stockage sous-jacent, un `Volume` monté sur un `Pod` est accessible à tous les conteneurs du `Pod`. Les conteneurs qui doivent communiquer en partageant des fichiers peuvent le faire en utilisant un `Volume` d'un type ou d'un autre. Nous examinerons certains des types les plus importants dans les sections suivantes.

## Volumes `emptyDir`

Le type de `Volume` le plus simple est `emptyDir`. Il s'agit d'un espace de stockage éphémère qui commence vide (d'où son nom) et stocke ses données sur le nœud (soit en mémoire, soit sur le disque du nœud). Il ne persiste que tant que le `Pod` s'exécute sur ce nœud.

Un `emptyDir` est utile lorsque vous souhaitez fournir un stockage supplémentaire à un conteneur, mais qu'il n'est pas essentiel que les données persistent indéfiniment ou se déplacent avec le conteneur s'il doit être planifié sur un autre nœud. Voici quelques exemples : la mise en cache de fichiers téléchargés ou de contenu généré, ou l'utilisation d'un espace de travail temporaire pour les tâches de traitement de données.

De même, si vous souhaitez simplement partager des fichiers entre des conteneurs d'un même `Pod`, mais que vous n'avez pas besoin de conserver les données pendant une longue période, un `Volume` `emptyDir` est idéal.

Voici un exemple de `Pod` qui crée un `Volume` `emptyDir` et le monte sur un conteneur :

```yaml
apiVersion: v1
kind: Pod
...
spec:
  volumes:
  - name: cache-volume
    emptyDir: {}
  containers:
  - name: demo
    image: cloudnatived/demo:hello
    volumeMounts:
    - mountPath: /cache
      name: cache-volume
```

Tout d'abord, dans la section `volumes` de la spécification du `Pod`, nous créons un `Volume` `emptyDir` nommé `cache-volume` :

```yaml
volumes:
- name: cache-volume
  emptyDir: {}
```

Maintenant, le `Volume` `cache-volume` est disponible pour que tout conteneur du `Pod` puisse le monter et l'utiliser. Pour ce faire, nous le listons dans la section `volumeMounts` du conteneur `demo` :

```yaml
name: demo
image: cloudnatived/demo:hello
volumeMounts:
- mountPath: /cache
  name: cache-volume
```

Le conteneur n'a rien de spécial à faire pour utiliser le nouveau stockage : tout ce qu'il écrit dans le chemin `/cache` sera écrit dans le `Volume` et sera visible par les autres conteneurs qui montent le même `Volume`. Tous les conteneurs montant le `Volume` peuvent y lire et y écrire.

**Astuce**

Soyez prudent lorsque vous écrivez dans des `Volumes` partagés. Kubernetes n'applique aucun verrouillage sur les écritures sur disque. Si deux conteneurs essaient d'écrire dans le même fichier simultanément, les données peuvent être corrompues. Pour éviter cela, implémentez votre propre mécanisme de verrouillage d'écriture ou utilisez un type de `Volume` qui prend en charge le verrouillage, tel que `nfs` ou `glusterfs`.

## Volumes persistants

Alors qu'un `Volume` `emptyDir` éphémère est idéal pour le cache et le partage de fichiers temporaires, certaines applications doivent stocker des données persistantes ; par exemple, tout type de base de données. En général, nous vous déconseillons de commencer par essayer d'exécuter des bases de données dans Kubernetes. Vous êtes presque toujours mieux servi en utilisant un service cloud à la place : par exemple, la plupart des fournisseurs de cloud proposent des solutions gérées pour les bases de données relationnelles telles que MySQL et PostgreSQL, ainsi que pour les magasins clé-valeur (NoSQL).

Comme nous l'avons vu dans **[« Kubernetes n'est pas une panacée »](Chapitre 1 du cours)**, Kubernetes est plus performant pour gérer les applications sans état, c'est-à-dire sans données persistantes. Le stockage de données persistantes complique considérablement la configuration Kubernetes de votre application. Vous devrez vous assurer que votre stockage persistant est fiable, performant, sécurisé et sauvegardé.

Si vous devez utiliser des volumes persistants avec Kubernetes, la ressource `PersistentVolume` est ce que vous recherchez. Nous n'entrerons pas dans les détails ici, car les détails ont tendance à être spécifiques à votre fournisseur de cloud ; vous pouvez en savoir plus sur les `PersistentVolumes` dans la [documentation Kubernetes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/).

Le moyen le plus flexible d'utiliser les `PersistentVolumes` dans Kubernetes est de créer un objet `PersistentVolumeClaim`. Cela représente une demande pour un type et une taille particuliers de `PersistentVolume` ; par exemple, un volume de 10 Gio de stockage haute vitesse en lecture-écriture.

Le `Pod` peut ensuite ajouter ce `PersistentVolumeClaim` comme un `Volume`, où il sera disponible pour que les conteneurs puissent le monter et l'utiliser :

```yaml
volumes:
- name: data-volume
  persistentVolumeClaim:
    claimName: data-pvc
```

Vous pouvez créer un pool de `PersistentVolumes` dans votre cluster pour qu'ils soient réclamés par les `Pods` de cette manière. Alternativement, vous pouvez configurer le [provisionnement dynamique](https://kubernetes.io/docs/concepts/storage/dynamic-provisioning/) : lorsqu'un `PersistentVolumeClaim` comme celui-ci est monté, un bloc de stockage approprié sera automatiquement provisionné et connecté au `Pod`.

Nous aborderons ce sujet plus en détail dans **[« StatefulSets »](Lab 5)**.

## Politiques de redémarrage

Nous avons vu dans que Kubernetes redémarre toujours un `Pod` lorsqu'il se termine, sauf indication contraire de votre part. La politique de redémarrage par défaut est donc `Always`, mais vous pouvez la modifier en `OnFailure` (redémarrer uniquement si le conteneur s'est terminé avec un statut différent de zéro) ou `Never` :

```yaml
apiVersion: v1
kind: Pod
...
spec:
  restartPolicy: OnFailure
```

Si vous souhaitez exécuter un `Pod` jusqu'à la fin, puis le faire se terminer, plutôt que de le redémarrer, vous pouvez utiliser une ressource `Job` pour ce faire **[(voir « Jobs »](Lab 5)**).

## Secrets d'extraction d'image (`imagePullSecrets`)

Kubernetes téléchargera votre image spécifiée à partir du registre de conteneurs si elle n'est pas déjà présente sur le nœud. Cependant, que se passe-t-il si vous utilisez un registre privé ? Comment donner à Kubernetes les informations d'identification pour s'authentifier auprès du registre ?

Le champ `imagePullSecrets` sur un `Pod` vous permet de configurer cela. Tout d'abord, vous devez stocker les informations d'identification du registre dans un objet `Secret` (voir [« Secrets Kubernetes »](https://kubernetes.io/docs/concepts/configuration/secret/) pour en savoir plus). Vous pouvez maintenant indiquer à Kubernetes d'utiliser ce `Secret` lors de l'extraction de tous les conteneurs du `Pod`. Par exemple, si votre `Secret` est nommé `registry-creds` :

```yaml
apiVersion: v1
kind: Pod
...
spec:
  imagePullSecrets:
  - name: registry-creds
```

Le format exact des données d'identification du registre est décrit dans la [documentation Kubernetes](https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/).

Vous pouvez également attacher des `imagePullSecrets` à un compte de service (voir **« Comptes de service de Pod »(Voir section au-dessus)**). Tous les `Pods` créés à l'aide de ce compte de service auront automatiquement accès aux informations d'identification du registre attachées.

## Conteneurs d'initialisation (`Init Containers`)

Si vous vous trouvez dans une situation où vous devez exécuter un conteneur *avant* d'exécuter vos applications principales, vous pouvez utiliser un [conteneur d'initialisation](https://kubernetes.io/docs/concepts/workloads/pods/init-containers/).

Les conteneurs d'initialisation sont définis dans la spécification du `Pod` et fonctionnent pour la plupart de la même manière que les conteneurs normaux, mais ils n'utilisent pas de sondes d'activité ni de préparation. Au lieu de cela, les conteneurs d'initialisation doivent s'exécuter et se terminer avec succès *avant* que les autres conteneurs du `Pod` ne soient démarrés :

```yaml
apiVersion: v1
kind: Pod
...
spec:
  containers:
  - name: demo
    image: cloudnatived/demo:hello
  initContainers:
  - name: init-demo
    image: busybox
    command: [sh, -c, echo Hello from initContainer]
```

Ceux-ci peuvent être utiles pour effectuer des vérifications préalables avant de démarrer votre application, ou pour exécuter tout type de script d'amorçage nécessaire pour préparer les choses pour votre application. Un cas d'utilisation courant pour un conteneur d'initialisation est de récupérer des `Secrets` d'un magasin de `Secrets` externe et de les monter dans votre application avec un `Volume` avant le démarrage. Assurez-vous simplement que vos conteneurs d'initialisation sont idempotents et peuvent être réessayés en toute sécurité si vous décidez de les utiliser.

## Résumé

Pour comprendre Kubernetes, vous devez d'abord comprendre les conteneurs. Dans ce lab, nous avons décrit l'idée de base de ce qu'est un conteneur, comment ils fonctionnent ensemble dans les `Pods` et les options disponibles pour contrôler l'exécution des conteneurs dans Kubernetes.

L'essentiel :

*   Au niveau du noyau, un conteneur Linux est un ensemble isolé de processus, avec des ressources cloisonnées. De l'intérieur d'un conteneur, on dirait que le conteneur dispose d'une machine Linux pour lui-même.
*   Les conteneurs ne sont pas des machines virtuelles. Chaque conteneur doit exécuter un processus principal.
*   Un `Pod` contient généralement un conteneur qui exécute une application principale, ainsi que des conteneurs auxiliaires facultatifs qui la prennent en charge.
*   Les spécifications d'image de conteneur peuvent inclure un nom d'hôte de registre, un espace de noms de référentiel, un référentiel d'images et une balise ; par exemple, `docker.io/cloudnatived/demo:hello`. Seul le nom de l'image est obligatoire.
*   Pour des déploiements reproductibles, spécifiez toujours une balise pour l'image du conteneur. Sinon, vous obtiendrez ce qui se trouve être la dernière version (`latest`).
*   Les programmes dans les conteneurs ne doivent pas s'exécuter en tant qu'utilisateur root. Attribuez-leur plutôt un utilisateur ordinaire.
*   Vous pouvez définir le champ `runAsNonRoot: true` sur un conteneur pour bloquer tout conteneur qui souhaite s'exécuter en tant que root.
*   D'autres paramètres de sécurité utiles sur les conteneurs incluent `readOnlyRootFilesystem: true` et `allowPrivilegeEscalation: false`.
*   Les *capabilities* Linux fournissent un mécanisme de contrôle des privilèges précis, mais les *capabilities* par défaut pour les conteneurs peuvent être trop généreuses. Vous pouvez verrouiller vos `Pods` en supprimant toutes les *capabilities* pour les conteneurs, puis en accordant des *capabilities* spécifiques si un conteneur en a besoin.
*   Les conteneurs d'un même `Pod` peuvent partager des données en lisant et en écrivant dans un `Volume` monté. Le `Volume` le plus simple est de type `emptyDir`, qui commence vide et conserve son contenu uniquement tant que le `Pod` est en cours d'exécution.
*   Un `PersistentVolume`, en revanche, conserve son contenu aussi longtemps que nécessaire. Les `Pods` peuvent provisionner dynamiquement de nouveaux `PersistentVolumes` à l'aide de `PersistentVolumeClaims`.
*   Les conteneurs d'initialisation peuvent être utiles pour effectuer une configuration initiale avant le démarrage de votre application dans un `Pod`.

