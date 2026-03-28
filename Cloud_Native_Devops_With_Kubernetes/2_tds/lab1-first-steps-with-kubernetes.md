## LAB 1 - First steps with Kubernetes

> **Auteur** : Badr TAJINI - Cloud-native-DevOps-with-Kubernetes - ESIEE - 2024/2025

---


Commençons à travailler avec Kubernetes et les conteneurs. Dans ce lab, vous allez créer une application conteneurisée simple et la déployer sur un cluster Kubernetes local s'exécutant sur votre machine. Ce faisant, vous découvrirez des technologies et des concepts natifs du cloud très importants : Docker, Git, Go, les registres de conteneurs et l'outil `kubectl`.

**Astuce**

Ce lab est interactif ! Tout au long de ces labs, nous vous demanderons de suivre les exemples en installant des éléments sur votre propre ordinateur, en tapant des commandes et en exécutant des conteneurs. Nous pensons que c'est un moyen d'apprentissage beaucoup plus efficace que de simples explications verbales. Vous trouverez tous les exemples sur [GitHub](https://github.com/cloudnativedevops/demo).

## Exécution de votre premier conteneur (Running Your First Container)

Comme nous l'avons vu au **(Chapitre 1 dans le cours)**, le conteneur est l'un des concepts clés du développement natif du cloud. L'outil le plus populaire pour créer et exécuter des conteneurs est Docker. Il existe d'autres outils pour exécuter des conteneurs, mais nous les aborderons plus en détail ultérieurement.

Dans cette section, nous utiliserons Docker Desktop pour créer une application de démonstration simple, l'exécuter localement et transférer l'image vers un registre de conteneurs.

Si vous êtes déjà familiarisé avec les conteneurs, passez directement à **[« Bonjour Kubernetes »](section au-dessous)**, où les choses sérieuses commencent. Si vous souhaitez savoir ce que sont les conteneurs et comment ils fonctionnent (et acquérir une petite expérience pratique avant de commencer à apprendre Kubernetes), poursuivez votre lecture.

## Installation de Docker Desktop (Installing Docker Desktop)

> Guide pour une installation rapide : https://www.youtube.com/watch?v=vZuyr9bmcks&t=433s
> Extension Kubernetes dans VSCode : https://code.visualstudio.com/docs/azure/kubernetes 

Docker Desktop est un package gratuit pour Mac et Windows. Il est fourni avec un environnement de développement Kubernetes complet que vous pouvez utiliser pour tester vos applications sur votre ordinateur portable ou de bureau.

Installons maintenant Docker Desktop et utilisons-le pour exécuter une simple application conteneurisée. Si Docker est déjà installé, ignorez cette section et passez directement à **[« Exécution d'une image de conteneur »](section en dessous)**.

Téléchargez une version de [Docker Desktop Community Edition](https://hub.docker.com/search/?type=edition&offering=community) adaptée à votre ordinateur, puis suivez les instructions pour votre plateforme afin d'installer Docker et de le démarrer.

**Remarque**

Docker Desktop n'est actuellement pas disponible pour Linux. Les utilisateurs de Linux devront donc installer [Docker Engine](https://www.docker.com/) à la place, puis [Minikube](https://minikube.sigs.k8s.io/docs/start/?arch=%2Fwindows%2Fx86-64%2Fstable%2F.exe+download) **(voir [« Minikube »](section au dessous))**.

Une fois que vous avez terminé, vous devriez pouvoir ouvrir un terminal et exécuter la commande suivante :

```bash
docker version
 ...
 Version:           20.10.7
 ...
```

La sortie exacte sera différente selon votre plateforme, mais si Docker est correctement installé et fonctionne, vous verrez quelque chose de similaire à la sortie d'exemple affichée.

Sur les systèmes Linux, vous devrez peut-être exécuter `sudo docker version` à la place. Vous pouvez ajouter votre compte au groupe docker avec `sudo usermod -aG docker $USER && newgrp docker`. Vous n'aurez alors plus besoin d'utiliser `sudo` à chaque fois.

## Qu'est-ce que Docker ? (What Is Docker?)

[Docker](https://docs.docker.com/) recouvre en réalité plusieurs éléments distincts, mais liés : un format d'image de conteneur, une bibliothèque d'exécution de conteneur qui gère le cycle de vie des conteneurs, un outil en ligne de commande pour empaqueter et exécuter des conteneurs, et une API pour la gestion des conteneurs. Les détails ne nous importent pas ici, car Kubernetes prend en charge les conteneurs Docker comme l'un de ses nombreux composants, même s'il s'agit d'un composant important.

## Exécution d'une image de conteneur (Running a Container Image)

Qu'est-ce qu'une image de conteneur exactement ? Les détails techniques n'ont pas vraiment d'importance pour nos besoins, mais vous pouvez imaginer une image comme un fichier ZIP. Il s'agit d'un seul fichier binaire doté d'un identifiant unique et contenant tout ce qui est nécessaire à l'exécution du conteneur.

Que vous exécutiez le conteneur directement avec Docker ou sur un cluster Kubernetes, il vous suffit de spécifier un identifiant ou une URL d'image de conteneur, et le système se chargera de trouver, de télécharger, de décompresser et de démarrer le conteneur pour vous.

Nous avons codé une petite application de démonstration que nous utiliserons tout au long des labs pour illustrer nos propos. Vous pouvez télécharger et exécuter l'application à l'aide d'une image de conteneur que nous avons préparée précédemment. Exécutez la commande suivante pour l'essayer :

```bash
docker container run -p 9999:8888 --name hello cloudnatived/demo:hello
```

Laissez cette commande en cours d'exécution et pointez votre navigateur sur _http://localhost:9999/_.

Vous devriez voir un message d'accueil :

`Hello, 世界`

Chaque fois que vous effectuez une requête vers cette URL, notre application de démonstration sera prête à vous accueillir.

Une fois que vous vous êtes suffisamment amusé, arrêtez le conteneur en appuyant sur Ctrl+C dans votre terminal.

## L'application de démonstration (The Demo Application)

Alors, comment ça marche ? Téléchargeons le code source de l'application de démonstration qui s'exécute dans ce conteneur et examinons-le.

Vous aurez besoin de Git installé pour cette partie. Si vous n'êtes pas sûr de déjà disposer de Git, essayez la commande suivante :

```bash
git version
git version 2.32.0
```

Si vous n'avez pas encore Git, suivez les [instructions d'installation](https://git-scm.com/download) pour votre plateforme.

Une fois Git installé, exécutez cette commande :

```bash
git clone https://github.com/cloudnativedevops/demo.git
Cloning into demo...
...
```

## Examen du code source (Looking at the Source Code)

Ce référentiel Git contient l'application de démonstration que nous utiliserons tout au long de ces labs. Pour mieux comprendre ce qui se passe à chaque étape, le dépôt contient chaque version successive de l'application dans un sous-répertoire différent. La première est simplement nommée *hello*. Pour examiner le code source, exécutez cette commande :

```bash
cd demo/hello
ls
Dockerfile  README.md
go.mod      main.go
```

Ouvrez le fichier *main.go* dans votre éditeur préféré (nous recommandons [Visual Studio Code](https://code.visualstudio.com/), qui prend parfaitement en charge le développement en Go, Docker et Kubernetes). Vous verrez ce code source :

```go
package main

import (
        "fmt"
        "log"
        "net/http"
)

func handler(w http.ResponseWriter, r *http.Request) {
        fmt.Fprintln(w, "Hello, 世界")
}

func main() {
        http.HandleFunc("/", handler)
        fmt.Println("Running demo app. Press Ctrl+C to exit...")
        log.Fatal(http.ListenAndServe(":8888", nil))
}
```

## Présentation de Go (Introducing Go)

Notre application de démonstration est écrite en langage Go.

Go est un langage de programmation moderne (développé chez Google depuis 2009) qui privilégie la simplicité, la sécurité et la lisibilité. Il est conçu pour créer des applications simultanées à grande échelle, en particulier des services réseau. C'est aussi un langage très agréable à utiliser.

Kubernetes lui-même est écrit en Go, tout comme Docker, Terraform et de nombreux autres projets open source populaires. Cela fait de Go un bon choix pour le développement d'applications natives du cloud.

## Fonctionnement de l'application de démonstration (How the Demo App Works)

Comme vous pouvez le constater, l'application de démonstration est assez simple, même si elle implémente un serveur HTTP (Go est livré avec une bibliothèque standard puissante). Son cœur est la fonction appelée `handler` :

```go
func handler(w http.ResponseWriter, r *http.Request) {
        fmt.Fprintln(w, "Hello, 世界")
}
```

Comme son nom l'indique, elle gère les requêtes HTTP. La requête est transmise en argument à la fonction (bien que la fonction ne l'utilise pas encore).

Un serveur HTTP a également besoin d'un moyen de renvoyer quelque chose au client. L'objet `http.ResponseWriter` permet à notre fonction d'envoyer un message à l'utilisateur, qui sera affiché dans son navigateur. Dans ce cas, il s'agit simplement de la chaîne `Hello, 世界`.

Le premier programme d'exemple dans n'importe quel langage affiche traditionnellement `Hello, world`. Mais comme Go prend en charge nativement Unicode (la norme internationale pour la représentation du texte), les exemples de programmes Go affichent souvent `Hello, 世界` à la place, juste pour le plaisir. Si vous ne parlez pas chinois, ce n'est pas grave : Go, si !

Le reste du programme se charge d'enregistrer la fonction `handler` comme gestionnaire des requêtes HTTP, d'afficher un message indiquant que l'application démarre et de lancer le serveur HTTP pour écouter et répondre sur le port 8888.

Et voilà toute l'application ! Elle ne fait pas grand-chose pour l'instant, mais nous y ajouterons des fonctionnalités au fur et à mesure.

## Construction d'un conteneur (Building a Container)

Vous savez qu'une image de conteneur est un fichier unique contenant tout ce dont le conteneur a besoin pour s'exécuter, mais comment créer une image en premier lieu ? Pour ce faire, vous utilisez la commande `docker image build`, qui prend en entrée un fichier texte spécial appelé *Dockerfile*. Le Dockerfile spécifie exactement ce qui doit être inclus dans l'image du conteneur.

L'un des principaux avantages des conteneurs est la possibilité de s'appuyer sur des images existantes pour créer de nouvelles images. Par exemple, vous pouvez prendre une image de conteneur contenant le système d'exploitation Ubuntu complet, y ajouter un seul fichier, et le résultat sera une nouvelle image.

En général, un Dockerfile contient des instructions pour prendre une image de départ (appelée *image de base*), la transformer d'une manière ou d'une autre et enregistrer le résultat en tant que nouvelle image.

## Comprendre les Dockerfiles (Understanding Dockerfiles)

Voyons le Dockerfile de notre application de démonstration (il se trouve dans le sous-répertoire *hello* du dépôt de l'application) :

```dockerfile
FROM golang:1.17-alpine AS build

WORKDIR /src/
COPY main.go go.* /src/
RUN CGO_ENABLED=0 go build -o /bin/demo

FROM scratch
COPY --from=build /bin/demo /bin/demo
ENTRYPOINT ["/bin/demo"]
```

Les détails exacts de son fonctionnement n'ont pas d'importance pour l'instant, mais il utilise un processus de build assez standard pour les conteneurs Go appelé *builds en plusieurs étapes*. La première étape part d'une image de conteneur `golang` officielle, qui est simplement un système d'exploitation (dans ce cas, Alpine Linux) avec l'environnement linguistique Go installé. Elle exécute la commande `go build` pour compiler le fichier *main.go* que nous avons vu plus tôt.

Le résultat est un fichier binaire exécutable nommé *demo*. La deuxième étape prend une image de conteneur complètement vide (appelée image *scratch*, comme dans *à partir de zéro*) et y copie le binaire *demo*.

## Images de conteneur minimales (Minimal Container Images)

Pourquoi cette deuxième étape de build ? L'environnement linguistique Go et le reste d'Alpine Linux ne sont réellement nécessaires que pour *construire* le programme. Pour exécuter le programme, seul le binaire *demo* est nécessaire. Le Dockerfile crée donc un nouveau conteneur scratch pour le placer. L'image résultante est très petite (environ 6 Mio) - et c'est l'image qui peut être déployée en production.

Sans la deuxième étape, vous vous seriez retrouvé avec une image de conteneur d'environ 350 Mio, dont 98 % sont inutiles et ne seront jamais exécutés. Plus l'image du conteneur est petite, plus son téléchargement et son chargement sont rapides, et plus son démarrage est rapide.

Les conteneurs minimaux ont également une surface d'attaque réduite pour les problèmes de sécurité. Moins il y a de programmes dans votre conteneur, moins il y a de vulnérabilités potentielles.

Go étant un langage compilé qui peut produire des exécutables autonomes, il est idéal pour écrire des conteneurs minimaux. À titre de comparaison, l'image officielle du conteneur Ruby fait 850 Mo, soit environ 140 fois plus que notre image Alpine Go, et ce, avant même que vous n'ayez ajouté votre programme Ruby ! Les [images distroless](https://github.com/GoogleContainerTools/distroless) constituent une autre excellente ressource pour utiliser des conteneurs allégés, car elles ne contiennent que les dépendances d'exécution et maintiennent la taille de votre image de conteneur finale à un niveau réduit.

## Exécution du build d'image Docker (Running Docker Image Build)

Nous avons vu que le fichier Dockerfile contient des instructions pour l'outil `docker image build` afin de transformer notre code source Go en un conteneur exécutable. Essayons. Dans le répertoire *hello*, exécutez la commande suivante :

```bash
docker image build -t myhello .
Sending build context to Docker daemon  4.096kB
Step 1/7 : FROM golang:1.17-alpine AS build
...
Successfully built eeb7d1c2e2b7
Successfully tagged myhello:latest
```

Félicitations, vous venez de créer votre premier conteneur ! Vous pouvez voir dans la sortie que Docker exécute chacune des actions du Dockerfile en séquence sur le conteneur nouvellement formé, ce qui donne une image prête à l'emploi.

## Nommer vos images (Naming Your Images)

Lorsque vous créez une image, elle reçoit par défaut un identifiant hexadécimal, que vous pouvez utiliser pour vous y référer ultérieurement (par exemple, pour l'exécuter). Ces identifiants ne sont pas particulièrement mémorables ni faciles à taper. Docker vous permet donc de donner à l'image un nom lisible par l'homme, en utilisant l'option `-t` avec `docker image build`. Dans l'exemple précédent, vous avez nommé l'image `myhello`. Vous devriez donc pouvoir utiliser ce nom pour exécuter l'image maintenant.

Voyons si cela fonctionne :

```bash
docker container run -p 9999:8888 myhello
```

Vous exécutez maintenant votre propre copie de l'application de démonstration et vous pouvez la vérifier en accédant à la même URL que précédemment (_http://localhost:9999/_).

Vous devriez voir `Hello, 世界`. Lorsque vous avez terminé d'exécuter cette image, appuyez sur Ctrl+C pour arrêter la commande `docker container run`.

## Exercice (Exercise)

Si vous vous sentez l'âme d'un aventurier, modifiez le fichier *main.go* dans l'application de démonstration et modifiez le message d'accueil pour qu'il dise « Hello, world » dans votre langue préférée (ou modifiez-le pour qu'il dise ce que vous voulez). Reconstruisez le conteneur et exécutez-le pour vérifier qu'il fonctionne.

Félicitations, vous êtes maintenant un programmeur Go ! Mais ne vous arrêtez pas là : suivez le [Tour of Go](https://go.dev/tour/welcome/1) interactif pour en savoir plus.

## Redirection de port (Port Forwarding)

Les programmes qui s'exécutent dans un conteneur sont isolés des autres programmes qui s'exécutent sur la même machine, ce qui signifie qu'ils ne peuvent pas accéder directement à des ressources comme les ports réseau.

L'application de démonstration écoute les connexions sur le port 8888, mais il s'agit du port 8888 privé du *conteneur*, et non d'un port de votre ordinateur. Pour vous connecter au port 8888 du conteneur, vous devez *rediriger* un port de votre machine locale vers ce port sur le conteneur. Il peut s'agir de (presque) n'importe quel port, y compris 8888, mais nous utiliserons plutôt 9999, afin de bien distinguer votre port de celui du conteneur.

Pour indiquer à Docker de rediriger un port, vous pouvez utiliser l'option `-p`, comme vous l'avez fait précédemment dans **[« Exécution d'une image de conteneur »](section au-dessus)** :

```bash
docker container run -p HOST_PORT:CONTAINER_PORT ...
```

Une fois le conteneur en cours d'exécution, toutes les requêtes adressées à `PORT_HÔTE` sur l'ordinateur local seront automatiquement redirigées vers `PORT_CONTENEUR` sur le conteneur. C'est ainsi que vous pouvez vous connecter à l'application avec votre navigateur.

Nous avons dit précédemment que vous pouviez utiliser *presque* n'importe quel port, car tout numéro de port inférieur à `1024` est considéré comme un [port *privilégié*](https://www.w3.org/Daemon/User/Installation/PrivilegedPorts.html). Pour utiliser ces ports, votre processus doit s'exécuter en tant qu'utilisateur disposant d'autorisations spéciales, telles que `root`. Les utilisateurs normaux non administrateurs ne peuvent pas utiliser les ports inférieurs à 1024. Par conséquent, pour éviter les problèmes d'autorisation, nous nous en tiendrons à des numéros de port plus élevés dans notre exemple.

## Registres de conteneurs (Container Registries)

Dans **[« Exécution d'une image de conteneur »](section au-dessus)**, vous avez pu exécuter une image simplement en indiquant son nom, et Docker l'a téléchargée automatiquement pour vous.

Vous vous demandez peut-être d'où elle est téléchargée. Bien que vous puissiez parfaitement utiliser Docker en construisant et en exécutant simplement des images locales, il est beaucoup plus utile de transférer (push) et d'extraire (pull) des images depuis un *registre de conteneurs*. Le registre vous permet de stocker des images et de les récupérer à l'aide d'un nom unique (comme `cloudnatived/demo:hello`).

Le registre par défaut pour la commande `docker container run` est Docker Hub, mais vous pouvez en spécifier un autre ou configurer le vôtre.

Pour l'instant, restons-en à Docker Hub. Si vous pouvez télécharger et utiliser n'importe quelle image de conteneur publique de Docker Hub, pour transférer vos propres images, vous aurez besoin d'un compte (appelé *Docker ID*). Suivez les instructions sur [Docker Hub](https://hub.docker.com/) pour créer votre Docker ID.

## Authentification auprès du registre (Authenticating to the Registry)

Une fois que vous avez votre Docker ID, l'étape suivante consiste à connecter votre client Docker local à Docker Hub à l'aide de votre identifiant et de votre mot de passe :

```bash
docker login

Login with your Docker ID to push and pull images from Docker Hub. If you don't
have a Docker ID, head over to https://hub.docker.com to create one.
Username: YOUR_DOCKER_ID
Password: YOUR_DOCKER_PASSWORD
Login Succeeded
```

## Nommer et transférer votre image (Naming and Pushing Your Image)

Pour pouvoir transférer une image locale vers le registre, vous devez la nommer en utilisant ce format : `VOTRE_DOCKER_ID/myhello`.

Pour créer ce nom, vous n'avez pas besoin de reconstruire l'image ; exécutez plutôt cette commande :

```bash
docker image tag myhello YOUR_DOCKER_ID/myhello
```

Cela permet à Docker de savoir dans quel compte stocker l'image lorsque vous la transférez vers le registre.

Continuez et transférez l'image vers Docker Hub à l'aide de cette commande :

```bash
docker image push YOUR_DOCKER_ID/myhello

The push refers to repository [docker.io/YOUR_DOCKER_ID/myhello]
b2c591f16c33: Pushed
latest: digest:
sha256:7ac57776e2df70d62d7285124fbff039c9152d1bdfb36c75b5933057cefe4fc7
size: 528
```

## Exécution de votre image (Running Your Image)

Félicitations ! Votre image de conteneur est maintenant disponible pour être exécutée n'importe où (du moins, partout où vous avez accès à Internet) à l'aide de la commande :

```bash
docker container run -p 9999:8888 YOUR_DOCKER_ID/myhello
```

## Bonjour Kubernetes (Hello, Kubernetes)

Maintenant que vous avez créé et transféré votre première image de conteneur vers un registre, vous pouvez l'exécuter à l'aide de la commande `docker container run`, mais ce n'est pas très passionnant. Faisons quelque chose d'un peu plus aventureux et exécutons-la dans Kubernetes.

Il existe de nombreuses façons d'obtenir un cluster Kubernetes, et nous en explorerons certaines plus en détail dans les prochains labs. Si vous avez déjà accès à un cluster Kubernetes, c'est parfait, et si vous le souhaitez, vous pouvez l'utiliser pour le reste des exemples de ce lab.

Sinon, ne vous inquiétez pas. Docker Desktop prend en charge Kubernetes (pour les utilisateurs de Linux, reportez-vous à **[« Minikube »](section en dessous)**). Pour l'activer, ouvrez les Préférences de Docker Desktop, sélectionnez l'onglet Kubernetes et cochez la case *Activer*. Pour plus d'informations, consultez la [documentation Kubernetes de Docker Desktop](https://docs.docker.com/desktop/features/kubernetes/#enable-kubernetes).

L'installation et le démarrage de Kubernetes prendront quelques minutes. Une fois cela fait, vous êtes prêt à exécuter l'application de démonstration !

Les utilisateurs de Linux devront également installer l'outil `kubectl` en suivant les instructions du site de [documentation Kubernetes](https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/).

## Exécution de l'application de démonstration (Running the Demo App)

Commençons par exécuter l'image de démonstration que vous avez créée précédemment. Ouvrez un terminal et exécutez la commande `kubectl` avec les arguments suivants :

```bash
kubectl run demo --image=YOUR_DOCKER_ID/myhello --port=9999 --labels app=demo

pod/demo created
```

Pour l'instant, ne vous préoccupez pas des détails de cette commande : il s'agit essentiellement de l'équivalent Kubernetes de la commande `docker container run` que vous avez utilisée précédemment dans ce lab pour exécuter l'image de démonstration. Si vous n'avez pas encore créé votre propre image, vous pouvez utiliser la nôtre : `--image=cloudnatived/demo:hello`. **Notez que le port doit être 8888 (le port du conteneur), et non 9999 (le port de redirection).**

Rappelez-vous que vous deviez rediriger le port 9999 de votre machine locale vers le port 8888 du conteneur afin de vous y connecter avec votre navigateur Web. Vous devrez faire la même chose ici, en utilisant `kubectl port-forward` :

```bash
kubectl port-forward pod/demo 9999:8888

Forwarding from 127.0.0.1:9999 -> 8888
Forwarding from [::1]:9999 -> 8888
```

Laissez cette commande en cours d'exécution et ouvrez un nouveau terminal pour continuer.

Connectez-vous à _http://localhost:9999/_ avec votre navigateur pour voir le message `Hello, 世界`.

Le démarrage du conteneur et la disponibilité de l'application peuvent prendre quelques secondes. Si elle n'est pas prête après environ une demi-minute, essayez cette commande :

```bash
kubectl get pods --selector app=demo

NAME                    READY     STATUS    RESTARTS   AGE
demo                    1/1       Running   0          9m
```

Lorsque le conteneur est en cours d'exécution et que vous vous y connectez avec votre navigateur, le message suivant s'affiche dans le terminal :

```
Handling connection for 9999
```

## Si le conteneur ne démarre pas (If the Container Doesn’t Start)

Si l'état (`STATUS`) n'est pas `Running` (en cours d'exécution), il peut y avoir un problème. Par exemple, si l'état est `ErrImagePull` ou `ImagePullBackoff`, cela signifie que Kubernetes n'a pas pu trouver et télécharger l'image que vous avez spécifiée. Vous avez peut-être fait une faute de frappe dans le nom de l'image ; vérifiez votre commande `kubectl run`.

Si l'état est `ContainerCreating`, tout va bien ; Kubernetes est encore en train de télécharger et de démarrer l'image. Attendez quelques secondes et vérifiez à nouveau.

Une fois que vous avez terminé, vous pouvez supprimer votre conteneur de démonstration :

```bash
kubectl delete pod demo

pod "demo" deleted
```

Nous aborderons plus en détail la terminologie de Kubernetes dans les labs suivants, mais pour l'instant, vous pouvez considérer un *Pod* comme un conteneur s'exécutant dans Kubernetes, de la même manière que vous avez exécuté un conteneur Docker sur votre machine.

## Minikube

Si vous ne souhaitez pas ou ne pouvez pas utiliser la prise en charge de Kubernetes dans Docker Desktop, il existe une alternative : le très apprécié Minikube. Comme Docker Desktop, Minikube fournit un cluster Kubernetes à nœud unique qui s'exécute sur votre propre machine (en fait, dans une machine virtuelle, mais cela n'a pas d'importance).

Pour installer Minikube, suivez les instructions du [guide de démarrage officiel de Minikube](https://minikube.sigs.k8s.io/docs/start/?arch=%2Fwindows%2Fx86-64%2Fstable%2F.exe+download).

Vous souhaitez utiliser Minikube comme remplacement de Docker, alors je vous invite de visiter ce [lien](https://minikube.sigs.k8s.io/docs/tutorials/docker_desktop_replacement/).

## Résumé (Summary)

Si, comme nous, vous vous impatientez rapidement des longs discours sur les raisons pour lesquelles Kubernetes est si formidable, nous espérons que vous avez apprécié de vous familiariser avec certaines tâches pratiques dans ce lab. Si vous êtes déjà un utilisateur expérimenté de Docker ou de Kubernetes, vous nous pardonnerez peut-être ce cours de remise à niveau. Nous voulons nous assurer que tout le monde se sente à l'aise pour créer et exécuter des conteneurs de manière basique, et que vous disposiez d'un environnement Kubernetes avec lequel vous pouvez jouer et expérimenter, avant de passer à des choses plus avancées.

Voici ce que vous devriez retenir de ce lab :

*   Tous les exemples de code source (et bien d'autres) sont disponibles dans le [dépôt de démonstration](https://github.com/cloudnativedevops/demo) qui accompagne ces labs.
*   L'outil Docker vous permet de créer des conteneurs localement, de les transférer (push) ou de les extraire (pull) d'un registre de conteneurs tel que Docker Hub et d'exécuter des images de conteneur localement sur votre machine.
*   Une image de conteneur est entièrement spécifiée par un Dockerfile : un fichier texte contenant des instructions sur la construction du conteneur.
*   Docker Desktop vous permet d'exécuter un petit cluster Kubernetes (à nœud unique) sur votre machine Mac ou Windows. Minikube est une autre option et fonctionne sous Linux.
*   L'outil `kubectl` est le principal moyen d'interagir avec un cluster Kubernetes. Il peut être utilisé pour créer des ressources dans Kubernetes, afficher l'état du cluster et des Pods et appliquer la configuration Kubernetes sous forme de manifestes YAML.



