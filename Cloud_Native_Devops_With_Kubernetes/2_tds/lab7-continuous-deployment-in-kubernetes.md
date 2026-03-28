## LAB 7 - Continuous Deployment in Kubernetes

> **Auteur** : Badr TAJINI - Cloud-native-DevOps-with-Kubernetes - ESIEE - 2024/2025

---

Dans ce lab, nous examinerons un principe clé du DevOps : l'*intégration continue* et le *déploiement continu* (CI/CD), et nous verrons comment y parvenir dans un environnement natif du cloud, basé sur Kubernetes. Nous présentons quelques options pour la mise en place de pipelines de déploiement continu fonctionnant avec Kubernetes, et nous vous montrons un exemple complet utilisant Cloud Build de Google. Nous aborderons également le concept de GitOps et la manière de déployer automatiquement sur Kubernetes à l'aide d'un outil GitOps appelé Flux.

## Qu'est-ce que le déploiement continu ? (What Is Continuous Deployment?)

Le *déploiement continu* (CD) est le déploiement automatique des builds réussies en production. Tout comme la suite de tests, le déploiement doit être géré de manière centralisée et automatisée. Les développeurs doivent pouvoir déployer de nouvelles versions en appuyant simplement sur un bouton, en fusionnant une demande de fusion ou en publiant une balise de version Git.

Le déploiement continu est souvent associé à l'*intégration continue* (CI) : l'intégration et le test automatiques des modifications apportées par les développeurs à la branche principale. L'idée est que si vous effectuez des modifications sur une branche qui entraîneraient une rupture du build lors de la fusion avec la branche principale, l'intégration continue vous le signalera immédiatement, plutôt que d'attendre la fin de votre branche et la fusion finale. L'association de l'intégration continue et du déploiement continu est souvent appelée *CI/CD*.

Le mécanisme du déploiement continu est souvent appelé un *pipeline* : une série d'actions automatisées qui acheminent le code du poste de travail du développeur vers la production, via une séquence d'étapes de test et d'acceptation.

Un pipeline typique pour les applications conteneurisées peut ressembler à ce qui suit :

1. Un développeur transfère ses modifications de code vers le référentiel.
2. Le système de build construit automatiquement la version actuelle du code et exécute les tests.
3. Si tous les tests réussissent, l'image du conteneur est publiée dans le registre de conteneurs central.
4. Le nouveau conteneur est automatiquement déployé dans un environnement de staging.
5. L'environnement de staging subit des tests d'acceptation automatisés et/ou manuels.
6. L'image du conteneur vérifiée est déployée en production.

Un point essentiel est que l'artefact testé et déployé dans vos différents environnements n'est pas le *code source*, mais le *conteneur*. De nombreuses erreurs peuvent se glisser entre le code source et un binaire en cours d'exécution, et le fait de tester le conteneur plutôt que le code permet d'en détecter un grand nombre.

Le principal avantage du déploiement continu est l'*absence de surprises en production* ; rien n'est déployé tant que l'image binaire exacte n'a pas été testée avec succès en staging.

Vous trouverez un exemple détaillé de pipeline CD comme celui-ci dans **[« Un pipeline CI/CD avec Cloud Build »](section ci-dessous)**.

## Quel outil de déploiement continu utiliser ? (Which CD Tool Should I Use?)

Comme d'habitude, le problème n'est pas le manque d'outils disponibles, mais l'abondance des choix. Il existe plusieurs nouveaux outils CI/CD conçus spécifiquement pour les applications natives du cloud, et les outils de build traditionnels établis de longue date, tels que Jenkins, disposent désormais de plugins leur permettant de fonctionner avec Kubernetes et les conteneurs.

Par conséquent, si vous utilisez déjà le CI/CD, vous n'avez probablement pas besoin de changer de système. Si vous migrez des applications existantes vers Kubernetes, vous pouvez probablement le faire en apportant quelques petites modifications à vos pipelines existants.

Dans la section suivante, nous aborderons brièvement certaines des options hébergées et auto-hébergées les plus populaires pour les outils CI/CD. Nous ne pourrons certainement pas toutes les aborder, mais voici une brève liste qui devrait vous aider à démarrer vos recherches.

## Outils CI/CD hébergés (Hosted CI/CD Tools)

Si vous recherchez une solution prête à l'emploi pour vos pipelines CI/CD, sans avoir à gérer l'infrastructure sous-jacente, vous devriez envisager une offre hébergée. Les principaux fournisseurs de cloud proposent tous des outils CI/CD qui s'intègrent parfaitement à leurs écosystèmes. Il est donc judicieux d'explorer d'abord les outils qui font déjà partie de votre compte cloud.

## Azure Pipelines

Le service Azure DevOps de Microsoft (anciennement appelé Visual Studio Team Services) comprend une fonctionnalité de pipeline de livraison continue appelée [Azure Pipelines](https://azure.microsoft.com/fr-fr/products/devops/pipelines/), similaire à Google Cloud Build.

## Google Cloud Build

Si vous exécutez votre infrastructure sur Google Cloud Platform, vous devriez vous intéresser à [Cloud Build](https://cloud.google.com/build). Il exécute des conteneurs comme différentes étapes de build, et le fichier YAML de configuration du pipeline se trouve dans votre dépôt de code.

Vous pouvez configurer Cloud Build pour surveiller votre dépôt Git. Lorsqu'une condition prédéfinie est déclenchée, comme un push vers une branche ou une balise spécifique, Cloud Build exécute le pipeline que vous avez spécifié, comme la construction d'une nouvelle image de conteneur, l'exécution de votre suite de tests, la publication de l'image et éventuellement le déploiement de la nouvelle version sur Kubernetes.

Pour un exemple complet de pipeline CD fonctionnel dans Cloud Build, voir **[« Un pipeline CI/CD avec Cloud Build »](section ci-dessous)**.

## Codefresh

[Codefresh](https://codefresh.io/) est un service géré de test et de déploiement d'applications sur Kubernetes. L'une de ses fonctionnalités intéressantes est la possibilité de déployer des environnements de staging temporaires pour chaque branche de fonctionnalité.

À l'aide de conteneurs, Codefresh peut créer, tester et déployer des environnements à la demande. Vous pouvez ensuite configurer la manière dont vous souhaitez déployer vos conteneurs dans différents environnements de vos clusters.

## GitHub Actions

[GitHub Actions](https://github.com/features/actions) est intégré à la plateforme d'hébergement de référentiels Git populaire. Les actions sont partagées à l'aide de référentiels GitHub, ce qui facilite grandement le mélange, la correspondance et le partage d'outils de build entre différentes applications. Azure a publié une [GitHub Action populaire](https://github.com/marketplace/actions/deploy-to-kubernetes-cluster) pour le déploiement sur des clusters Kubernetes.

GitHub offre également la possibilité d'exécuter des exécuteurs GitHub Actions localement sur vos propres serveurs afin de conserver vos builds au sein de votre réseau.

## GitLab CI

GitLab est une alternative populaire à GitHub pour l'hébergement de référentiels Git. Vous pouvez utiliser leur offre hébergée ou exécuter GitLab vous-même sur votre propre infrastructure. Il est livré avec un puissant outil CI/CD intégré, [GitLab CI](https://about.gitlab.com/solutions/continuous-integration/), qui peut être utilisé pour tester et déployer votre code. Si vous utilisez déjà GitLab, il est logique d'envisager GitLab CI pour la mise en œuvre de votre pipeline de déploiement continu.

## Outils CI/CD auto-hébergés (Self-Hosted CI/CD Tools)

Si vous préférez gérer une plus grande partie de l'infrastructure sous-jacente de votre pipeline, il existe également plusieurs bonnes options pour les outils CI/CD que vous pouvez exécuter où bon vous semble. Certains de ces outils existent depuis bien avant Kubernetes, tandis que d'autres ont été développés spécifiquement pour les pipelines CI/CD basés sur Kubernetes.

## Jenkins

[Jenkins](https://jenkins.io/) est un outil CI/CD très largement adopté et qui existe depuis des années. Il dispose de plugins pour pratiquement tout ce que vous pourriez vouloir utiliser dans un workflow, y compris Docker, `kubectl` et Helm. Il existe également un projet plus récent dédié à l'exécution de Jenkins dans Kubernetes, appelé [JenkinsX](https://jenkins-x.io/).

## Drone

[Drone](https://github.com/harness/harness) est un outil conçu avec et pour les conteneurs. Il est simple et léger, le pipeline étant défini par un seul fichier YAML. Comme chaque étape de build consiste à exécuter un conteneur, cela signifie que tout ce que vous pouvez exécuter dans un conteneur peut être exécuté sur Drone.

## Tekton

[Tekton](https://tekton.dev/) introduit un concept intéressant où les composants CI/CD sont en fait des CRD Kubernetes. Vous pouvez donc construire vos étapes de build, de test et de déploiement à l'aide de ressources Kubernetes natives et gérer le pipeline de la même manière que vous gérez tout le reste dans vos clusters Kubernetes.

## Concourse

[Concourse](https://concourse-ci.org/) est un outil CD open source écrit en Go. Il adopte également l'approche déclarative pour les pipelines, un peu comme Drone et Cloud Build, en utilisant un fichier YAML pour définir et exécuter les étapes de build. Concourse fournit un [chart Helm officiel](https://github.com/concourse/concourse-chart) pour le déployer sur Kubernetes, ce qui facilite la mise en service rapide d'un pipeline conteneurisé.

## Spinnaker

[Spinnaker](https://spinnaker.io/) est très puissant et flexible, mais peut être un peu intimidant à première vue. Développé à l'origine par Netflix, il excelle dans les déploiements à grande échelle et complexes, tels que les déploiements bleu/vert. Un ebook gratuit sur Spinnaker, intitulé [*Continuous Delivery with Spinnaker*](https://spinnaker.io/docs/concepts/ebook/) (O'Reilly), devrait vous donner une idée de si Spinnaker répond à vos besoins.

## Argo

[Argo CD](https://argo-cd.readthedocs.io/en/stable/) est un outil GitOps similaire à Flux (voir [« GitOps »](section ci-dessous)), qui automatise les déploiements en synchronisant ce qui est en cours d'exécution dans Kubernetes avec les manifestes stockés dans un référentiel Git central. Au lieu de « pousser » les modifications via `kubectl` ou `helm`, Argo « tire » continuellement les modifications du dépôt Git et les applique depuis l'intérieur du cluster. Argo propose également un [outil de pipeline](https://argoproj.github.io/) populaire pour exécuter tout type de workflow de pipeline, pas nécessairement uniquement pour le CI/CD.

## Keel

[Keel](https://keel.sh/) n'est pas un outil CI/CD complet de bout en bout, mais se concentre uniquement sur le déploiement de nouvelles images de conteneur lorsqu'elles sont publiées dans un registre de conteneurs. Il peut être configuré pour répondre aux webhooks, envoyer et recevoir des messages Slack et attendre les approbations avant de déployer vers un nouvel environnement. Si vous avez déjà un processus d'IC qui fonctionne bien pour vous, mais que vous avez juste besoin d'un moyen d'automatiser la partie CD, alors Keel peut valoir la peine d'être évalué.

## Un pipeline CI/CD avec Cloud Build (A CI/CD Pipeline with Cloud Build)

Maintenant que vous connaissez les principes généraux de la CI/CD et que vous avez découvert certaines des options d'outils, examinons un exemple complet de pipeline de démonstration de bout en bout.

L'objectif n'est pas nécessairement d'utiliser exactement les mêmes outils et la même configuration que ceux présentés ici. Nous espérons plutôt vous donner une idée de la façon dont tout s'articule et vous permettre d'adapter certaines parties de cet exemple à votre propre environnement.

Dans cet exemple, nous utiliserons GitHub, les clusters Google Kubernetes Engine (GKE) et Google Cloud Build, mais nous ne nous appuyons sur aucune fonctionnalité spécifique de ces produits. Vous pouvez reproduire ce type de pipeline avec les outils de votre choix.

Si vous souhaitez suivre cet exemple à l'aide de votre propre compte GCP, n'oubliez pas qu'il utilise des ressources facturables. Vous devrez supprimer et nettoyer toutes les ressources cloud de test par la suite pour éviter des frais inattendus.

Si vous préférez tester un exemple de CI/CD localement sans utiliser de ressources Google Cloud, passez directement à la section [« GitOps »](section ci-dessous).

## Configuration de Google Cloud et de GKE (Setting Up Google Cloud and GKE)

Si vous vous inscrivez à un nouveau compte Google Cloud pour la première fois, vous pouvez bénéficier de crédits gratuits, ce qui devrait vous permettre d'exécuter un cluster Kubernetes et d'autres ressources cloud sans être facturé pendant quelques mois. Cependant, vous devez absolument surveiller votre utilisation lorsque vous essayez un service cloud pour vous assurer que vous n'accumulez pas de frais inattendus. Vous trouverez plus d'informations sur l'offre gratuite et la création d'un compte sur le site [Google Cloud Platform](https://cloud.google.com/free?hl=fr).

Une fois inscrit et connecté à votre projet Google Cloud, créez un cluster GKE en suivant [ces instructions](https://cloud.google.com/kubernetes-engine/docs/how-to/creating-a-zonal-cluster?hl=fr). Un cluster Autopilot conviendra parfaitement à cet exemple. Choisissez une région proche de votre emplacement. Vous devrez également activer les API [Cloud Build](https://cloud.google.com/artifact-registry/docs/enable-service?hl=fr) et [Artifact Registry](https://cloud.google.com/artifact-registry/docs/enable-service?hl=fr) dans votre nouveau projet, car nous utiliserons ces services avec GKE.

Voici les étapes à suivre pour préparer la création du pipeline :

1. Forkez le référentiel de démonstration dans votre propre compte GitHub personnel.
2. Créez un référentiel de conteneurs dans Artifact Registry.
3. Authentifiez Cloud Build pour utiliser Artifact Registry et GKE.
4. Créez un déclencheur Cloud Build pour créer et tester lors d'un push vers n'importe quelle branche Git.
5. Créez un déclencheur pour déployer sur GKE en fonction des tags Git.

## Forker le référentiel de démonstration (Forking the Demo Repository)

À l'aide de votre compte GitHub, utilisez l'interface GitHub pour forker le [référentiel de démonstration](https://github.com/cloudnativedevops/demo). Si vous n'êtes pas familier avec le fork d'un référentiel, vous pouvez en apprendre davantage à ce sujet dans la [documentation GitHub](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/fork-a-repo).

## Créer un référentiel de conteneurs Artifact Registry (Create Artifact Registry Container Repository)

GCP propose un outil de référentiel d'artefacts privé appelé Artifact Registry, qui peut stocker des conteneurs Docker, des paquets Python, des paquets npm et d'autres types d'artefacts. Nous allons l'utiliser pour héberger l'image du conteneur de démonstration que nous allons construire.

Accédez à la page Artifact Registry dans la [console Web de Google Cloud](https://console.cloud.google.com/artifacts) et créez un nouveau référentiel Docker appelé `demo` en suivant [ces instructions](https://cloud.google.com/artifact-registry/docs/repositories/create-repos?hl=fr#overview). Créez-le dans la même région Google Cloud que celle où vous avez créé votre cluster GKE.

Vous devez également autoriser le compte de service Cloud Build à modifier votre cluster Kubernetes Engine. Sous la section IAM dans GCP, accordez au compte de service de Cloud Build – *Kubernetes Engine Developer* et *Artifact Registry Repository Administrator* – les rôles IAM dans votre projet en suivant [les instructions de la documentation GCP](https://cloud.google.com/build/docs/securing-builds/configure-access-for-cloud-build-service-account?hl=fr).

## Configuration de Cloud Build (Configuring Cloud Build)

Examinons maintenant les étapes de notre pipeline de build. Dans de nombreuses plateformes CI/CD modernes, chaque étape d'un pipeline consiste à exécuter un conteneur. Les étapes de build sont définies à l'aide d'un fichier YAML qui se trouve dans votre dépôt Git. L'utilisation de conteneurs pour chaque étape signifie que vous pouvez facilement empaqueter, versionner et partager des outils et des scripts communs entre différents pipelines.

Dans le référentiel de démonstration, il existe un répertoire appelé *hello-cloudbuild-v2*. À l'intérieur de ce répertoire, vous trouverez le fichier *cloudbuild.yaml* qui définit notre pipeline Cloud Build.

## Construction du conteneur de test (Building the Test Container)

Voici la première étape :

```yaml
- id: build-test-image
  dir: hello-cloudbuild-v2
  name: gcr.io/cloud-builders/docker
  entrypoint: bash
  args:
    - -c
    - |
      docker image build --target build --tag demo:test .
```

Comme toutes les étapes de Cloud Build, celle-ci se compose d'un ensemble de paires clé-valeur YAML :

*   `id` : Donne une étiquette conviviale à l'étape de build.
*   `dir` : Spécifie le sous-répertoire du dépôt Git dans lequel travailler.
*   `name` : Identifie le conteneur à exécuter pour cette étape.
*   `entrypoint` : Spécifie la commande à exécuter dans le conteneur, si ce n'est pas la valeur par défaut.
*   `args` : Fournit les arguments nécessaires à la commande `entrypoint`. (Nous utilisons ici une petite astuce avec `bash -c |` pour conserver nos `args` sur une seule ligne, afin de faciliter la lecture.)

L'objectif de cette première étape est de construire un conteneur que nous pourrons utiliser pour exécuter les tests de notre application. Puisque nous utilisons un build en plusieurs étapes (voir **[« Comprendre les Dockerfiles »](Lab 1)**), nous ne voulons construire que la première étape pour le moment. Nous utilisons donc l'argument `--target build`, qui demande à Docker de ne construire que la partie du Dockerfile située sous `FROM golang:1.17-alpine AS build` et de s'arrêter avant de passer à l'étape suivante.

Cela signifie que le conteneur résultant aura toujours Go d'installé, ainsi que tous les paquets ou fichiers utilisés dans l'étape étiquetée `...AS build`, ce qui signifie que nous pouvons utiliser cette image pour exécuter la suite de tests. Il arrive souvent que vous ayez besoin de paquets dans votre conteneur pour exécuter des tests que vous ne souhaitez pas voir dans vos images de production finales. Nous construisons ici essentiellement un conteneur jetable qui n'est utilisé que pour exécuter la suite de tests et qui est ensuite supprimé.

## Exécution des tests (Running the Tests)

Voici l'étape suivante de notre fichier `cloudbuild.yaml` :

```yaml
- id: run-tests
  dir: hello-cloudbuild-v2
  name: gcr.io/cloud-builders/docker
  entrypoint: bash
  args:
    - -c
    - |
      docker container run demo:test go test
```

Comme nous avons étiqueté notre conteneur temporaire avec `demo:test`, cette image temporaire restera disponible pour le reste du build dans Cloud Build. Cette étape exécutera la commande `go test` sur ce conteneur. Si un test échoue, cette étape échouera et le build s'arrêtera. Sinon, il passera à l'étape suivante.

## Construire le conteneur de l'application (Building the Application Container)

Nous exécutons à nouveau `docker build`, mais sans l'indicateur `--target` pour exécuter l'intégralité du build en plusieurs étapes, ce qui nous donne le conteneur final de l'application :

```yaml
- id: build-app
  dir: hello-cloudbuild-v2
  name: gcr.io/cloud-builders/docker
  args:
    - docker
    - build
    - --tag
    - ${_REGION}-docker.pkg.dev/$PROJECT_ID/demo/demo:$COMMIT_SHA
    - .
```

## Variables de substitution (Substitution Variables)

Afin de rendre les fichiers de pipeline Cloud Build réutilisables et flexibles, nous utilisons des variables, ou ce que Cloud Build appelle des *substitutions*. Tout ce qui commence par un `$` sera substitué lors de l'exécution du pipeline. Par exemple, `$PROJECT_ID` sera interpolé comme le projet Google Cloud où un build particulier est exécuté, et `$COMMIT_SHA` correspond au SHA du commit Git spécifique qui a déclenché ce build. Les substitutions définies par l'utilisateur dans Cloud Build doivent commencer par un trait de soulignement (`_`) et utiliser uniquement des lettres majuscules et des chiffres. Nous utiliserons la variable de substitution `${_REGION}` ci-dessous lors de la création du déclencheur de build.

## Balises Git SHA (Git SHA Tags)

Vous vous demandez peut-être pourquoi nous utilisons `$COMMIT_SHA` pour notre balise d'image de conteneur. Dans Git, chaque commit possède un identifiant unique, appelé SHA (d'après l'algorithme Secure Hash Algorithm qui le génère). Un SHA est une longue chaîne de chiffres hexadécimaux, comme `5ba6bfd64a31eb4013ccaba27d95cddd15d50ba3`.

Si vous utilisez ce SHA pour baliser votre image, il fournit un lien vers le commit Git exact qui l'a générée, qui est également un instantané complet du code contenu dans le conteneur. L'avantage d'étiqueter les artefacts de build avec le SHA Git d'origine est que vous pouvez construire et tester de nombreuses branches de fonctionnalités simultanément, sans aucun conflit.

## Validation des manifestes Kubernetes (Validating the Kubernetes Manifests)

À ce stade du pipeline, nous avons construit un nouveau conteneur qui a réussi les tests et est prêt à être déployé. Mais avant cela, nous aimerions également effectuer une vérification rapide pour nous assurer que nos manifestes Kubernetes sont valides. Dans cette dernière étape du build, nous exécuterons `helm template` pour générer la version rendue de notre chart Helm, puis la transmettrons à l'outil `kubeval` pour vérifier s'il y a des problèmes :

```yaml
- id: kubeval
  dir: hello-cloudbuild-v2
  name: cloudnatived/helm-cloudbuilder
  entrypoint: bash
  args:
    - -c
    - |
      helm template ./k8s/demo/ | kubeval
```

**Remarque**

Notez que nous utilisons ici notre propre image de conteneur Helm (`cloudnatived/helm-cloudbuilder`), qui contient `helm` et `kubeval`, mais vous pouvez également créer et utiliser vos propres « images de constructeur » contenant tous les outils de construction ou de test supplémentaires que vous utilisez. N'oubliez pas qu'il est important que vos images de constructeur restent petites et légères (voir **[« Images de conteneurs minimales »](Lab 1)**). Lorsque vous exécutez des dizaines ou des centaines de builds par jour, le temps d'extraction accru des grands conteneurs peut vraiment s'accumuler.

## Publication de l'image (Publishing the Image)

En supposant que chaque étape du pipeline se termine avec succès, Cloud Build peut ensuite publier l'image du conteneur résultante dans le référentiel Artifact Registry que vous avez créé précédemment. Pour spécifier les images de la construction que vous souhaitez publier, dressez-en la liste sous `images` dans le fichier Cloud Build :

```yaml
images:
  - ${_REGION}-docker.pkg.dev/$PROJECT_ID/demo/demo:$COMMIT_SHA
```

## Création du premier déclencheur de build (Creating the First Build Trigger)

Maintenant que vous avez vu comment fonctionne le pipeline, créons les déclencheurs de build dans Google Cloud qui exécuteront réellement le pipeline, en fonction des conditions que nous avons spécifiées. Un déclencheur Cloud Build spécifie un dépôt Git à surveiller, une condition d'activation (telle que le push vers une branche ou une balise particulière) et un fichier de pipeline à exécuter.

Allez-y et créez maintenant un nouveau déclencheur Cloud Build. Connectez-vous à votre projet Google Cloud et accédez à la page [Déclencheurs Cloud Build](https://console.cloud.google.com/cloud-build/triggers).

Cliquez sur le bouton *Ajouter un déclencheur* pour créer un nouveau déclencheur de build et sélectionnez GitHub comme référentiel source. Il vous sera demandé d'autoriser Google Cloud à accéder à votre dépôt GitHub. Sélectionnez `VOTRE_NOM_D_UTILISATEUR_GITHUB/demo` et Google Cloud établira un lien vers votre copie forkée du référentiel de démonstration. Vous pouvez donner au déclencheur le nom de votre choix.

Dans la section *Branche*, sélectionnez `.*` pour qu'il corresponde à n'importe quelle branche.

Dans la section *Configuration*, choisissez le fichier de configuration Cloud Build et définissez l'emplacement sur *hello-cloudbuild-v2/cloudbuild.yaml*, où se trouve le fichier dans le dépôt de démonstration.

Enfin, nous devons créer des variables de substitution afin de pouvoir réutiliser ce même fichier *cloudbuild.yaml* pour différentes constructions.

Pour cet exemple, vous devez ajouter la variable de substitution suivante à votre déclencheur :

*   `_REGION` doit correspondre à la région GCP où vous avez déployé votre Artifact Registry et votre cluster GKE, par exemple `us-central1` ou `southamerica-east1`.

Cliquez sur le bouton *Créer un déclencheur* lorsque vous avez terminé. Vous êtes maintenant prêt à tester le déclencheur et à voir ce qui se passe !

## Test du déclencheur (Testing the Trigger)

Allez-y, modifiez votre copie forkée du référentiel de démonstration. Modifiez à la fois *main.go* et *main_test.go*, en remplaçant `Hello` par `Hola` ou par ce que vous voulez, et enregistrez les deux fichiers (nous utiliserons `sed` dans l'exemple ci-dessous). Vous pouvez également exécuter les tests localement, si Golang est installé, pour vous assurer que la suite de tests réussit toujours. Lorsque vous êtes prêt, validez et transférez les modifications vers votre copie forkée du dépôt Git :

```bash
cd hello-cloudbuild-v2
sed -i s/Hello/Hola/g main.go
sed -i s/Hello/Hola/g main_test.go
go test
git commit -am "Update greeting"
git push
```

Si vous consultez l'[interface utilisateur Web de Cloud Build](https://console.cloud.google.com/marketplace/product/google/cloudbuild.googleapis.com?returnUrl=%2Fcloud-build%2Fbuilds%3Fproject%3Dfleet-breaker-437715-a9%26folder%3D%26organizationId%3D&project=fleet-breaker-437715-a9), vous verrez la liste des builds récents de votre projet. Vous devriez en voir un en haut de la liste pour la modification actuelle que vous venez de transférer. Il est possible qu'il soit encore en cours d'exécution ou qu'il soit déjà terminé.

Espérons que vous verrez une coche verte indiquant que toutes les étapes ont réussi. Sinon, vérifiez la sortie du journal dans le build et voyez ce qui a échoué.

En supposant qu'il ait réussi, un conteneur devrait avoir été publié dans votre Google Artifact Registry privé, étiqueté avec le SHA du commit Git de votre modification.

## Déploiement à partir d'un pipeline CI/CD (Deploying from a CI/CD Pipeline)

Maintenant que vous pouvez déclencher un build avec un push Git, exécuter des tests et publier le conteneur final dans le registre, vous êtes prêt à déployer ce conteneur sur Kubernetes.

Pour cet exemple, nous allons imaginer qu'il existe deux environnements, un pour la `production` et un pour le `staging`, et nous allons les déployer dans des espaces de noms distincts : `staging-demo` et `production-demo`. Les deux s'exécuteront dans le même cluster GKE (bien que vous souhaitiez probablement utiliser des clusters distincts pour vos applications réelles).

Pour simplifier les choses, nous allons utiliser les balises Git `production` et `staging` pour déclencher les déploiements dans chaque environnement. Vous pouvez avoir votre propre processus de gestion des versions, comme l'utilisation de la version sémantique ([SemVer](https://semver.org/)), des balises de version ou le déploiement automatique vers un environnement de staging chaque fois que la branche principale ou trunk est mise à jour. N'hésitez pas à adapter ces exemples à votre propre situation.

Nous allons configurer Cloud Build pour qu'il déploie vers le staging lorsque la balise Git `staging` est envoyée vers le dépôt, et vers la production lorsque la balise `production` est envoyée. Cela nécessite un nouveau pipeline qui utilise un fichier YAML Cloud Build différent, *cloudbuild-deploy.yaml*. Examinons les étapes de notre pipeline de déploiement :

### Obtention des informations d'identification pour le cluster Kubernetes (Getting credentials for the Kubernetes cluster)

Pour déployer sur Kubernetes avec Cloud Build, le build aura besoin d'un `KUBECONFIG` fonctionnel, que nous pouvons obtenir avec `kubectl` :

```yaml
- id: get-kube-config
  dir: hello-cloudbuild-v2
  name: gcr.io/cloud-builders/kubectl
  env:
  - CLOUDSDK_CORE_PROJECT=$PROJECT_ID
  - CLOUDSDK_COMPUTE_REGION=${_REGION}
  - CLOUDSDK_CONTAINER_CLUSTER=${_CLOUDSDK_CONTAINER_CLUSTER}
  - KUBECONFIG=/workspace/.kube/config
  args:
    - cluster-info
```

### Déploiement sur le cluster (Deploying to the cluster)

Une fois le build authentifié, il peut exécuter Helm pour effectivement mettre à niveau (ou installer) l'application dans le cluster :

```yaml
- id: deploy
  dir: hello-cloudbuild-v2
  name: cloudnatived/helm-cloudbuilder
  env:
    - KUBECONFIG=/workspace/.kube/config
  args:
    - helm
    - upgrade
    - --create-namespace
    - --install
    - ${TAG_NAME}-demo
    - --namespace=${TAG_NAME}-demo
    - --values
    - k8s/demo/${TAG_NAME}-values.yaml
    - --set
    - image=${_REGION}-docker.pkg.dev/$PROJECT_ID/demo/demo:$COMMIT_SHA #Utilisez image au lieu de container.image et incluez $COMMIT_SHA ici.
    - ./k8s/demo
```

**Correction:** J'ai corrigé la ligne `--set` pour l'image du conteneur. Au lieu de `container.image` et `container.tag` séparément, il est plus courant et plus simple d'utiliser `image` et d'inclure la balise directement : `image=nom-image:balise`. J'ai également inclus `${_REGION}` pour que le nom de l'image soit complet.

Nous passons quelques indicateurs supplémentaires à la commande `helm upgrade` :

*   `namespace` : l'espace de noms où l'application doit être déployée.
*   `values` : le fichier de valeurs Helm à utiliser pour cet environnement.
*   `set image` : définit le nom et le tag du conteneur à déployer.

## Création d'un déclencheur de déploiement (Creating a Deploy Trigger)

Créons maintenant un nouveau déclencheur Cloud Build pour le déploiement dans notre environnement de *staging* imaginaire.

Créez un nouveau déclencheur dans l'interface utilisateur Web de Cloud Build comme vous l'avez fait dans **[« Création du premier déclencheur de build »](section ci-dessous)**. Le référentiel sera le même, mais cette fois, configurez-le pour qu'il se déclenche lorsqu'une *balise* est envoyée au lieu d'une branche, et définissez le nom de la balise sur *staging*.

De plus, au lieu d'utiliser le fichier _cloudbuild.yaml_, pour ce build, nous utiliserons `*hello-cloudbuild-v2/cloudbuild-deploy.yaml*`.

Dans la section *Variables de substitution*, nous allons définir des valeurs spécifiques aux builds de déploiement :

*   `_REGION` : sera le même que celui que vous avez utilisé dans le premier déclencheur. Il doit correspondre à la région de disponibilité GCP où vous avez créé votre cluster GKE et votre référentiel Artifact Registry.
*   `_CLOUDSDK_CONTAINER_CLUSTER` : est le nom de votre cluster GKE.

L'utilisation de ces variables ici permet d'utiliser le même fichier YAML pour déployer à la fois le staging et la production, même si ces environnements se trouvent dans des clusters distincts ou dans des projets GCP distincts.

Une fois que vous avez créé le déclencheur pour la balise `staging`, essayez-le en envoyant une balise `staging` au référentiel :

```bash
git tag -f staging
git push -f origin refs/tags/staging
```

Comme précédemment, vous pouvez suivre la [progression du build](https://console.cloud.google.com/) dans l'interface utilisateur de Cloud Build. Si tout se passe comme prévu, Cloud Build devrait s'authentifier correctement auprès de votre cluster GKE et déployer la version de staging de votre application dans l'espace de noms `staging-demo`. Vous pouvez le vérifier en consultant le [tableau de bord GKE](https://console.cloud.google.com/kubernetes/workload) (ou en utilisant `helm status`).

Enfin, suivez les mêmes étapes pour créer un déclencheur Cloud Build distinct qui se déploie en production lors d'un envoi vers la balise `production`. Si tout se passe bien, vous aurez une autre copie de l'application en cours d'exécution dans un nouvel espace de noms `production-demo`. Encore une fois, dans cet exemple, nous avons déployé les deux environnements sur le même cluster GKE, mais pour les applications réelles, vous voudrez probablement les séparer.

## Adaptation de l'exemple de pipeline (Adapting the Example Pipeline)

Lorsque vous avez terminé de tester le pipeline de démonstration, vous souhaiterez supprimer toutes les ressources GCP que vous avez créées pour les tests, y compris le cluster GKE, le référentiel Artifact Registry `demo` et vos déclencheurs Cloud Build.

Nous espérons que cet exemple a illustré les concepts clés d'un pipeline CI/CD. Si vous utilisez Cloud Build, vous pouvez utiliser ces exemples comme point de départ pour configurer vos propres pipelines. Si vous utilisez d'autres outils, nous espérons que vous pourrez facilement adapter les modèles que nous avons présentés ici pour qu'ils fonctionnent dans votre propre environnement. L'automatisation des étapes de build, de test et de déploiement de vos applications améliorera considérablement l'expérience de création et de déploiement de logiciels pour toutes les personnes impliquées.

## GitOps

Comme nous l'avons mentionné dans **[« Infrastructure en tant que code »](Chapitre 1 dans le cours)**, un élément essentiel de la transition du secteur vers le DevOps était la nécessité de gérer l'infrastructure au moyen de code et de contrôle de code source. « GitOps » est un terme plus récent qui semble avoir une signification légèrement différente selon la personne à qui vous le demandez. Mais, à un niveau élevé, GitOps implique l'utilisation du contrôle de code source (Git étant l'un des outils de contrôle de code source les plus populaires) pour suivre et gérer l'infrastructure de manière automatisée. Imaginez la boucle de réconciliation de Kubernetes, mais appliquée dans un sens plus large, où toute infrastructure est configurée et déployée uniquement en poussant les modifications vers un dépôt Git. Un certain nombre d'outils CI/CD existants se sont rebaptisés outils « GitOps » et nous nous attendons à ce que ce concept se développe et évolue rapidement dans l'industrie du logiciel au cours des prochaines années.

Dans cette section, nous utiliserons un outil appelé Flux pour déployer automatiquement l'application de démonstration sur un cluster Kubernetes local en poussant les modifications vers un référentiel GitHub.

## Flux

Weaveworks (les créateurs d'[`eksctl`](https://eksctl.io/)) ont peut-être été les premiers à inventer le [terme GitOps](https://www.weave.works/technologies/gitops). Ils ont également créé l'un des outils GitOps les plus populaires, appelé [Flux](https://github.com/fluxcd/flux). Il peut être utilisé pour déployer automatiquement des modifications sur un cluster Kubernetes en interrogeant un dépôt Git, en surveillant les modifications et en appliquant automatiquement les modifications à partir des pods Flux s'exécutant à l'intérieur du cluster. Essayons un exemple pour voir comment cela fonctionne.

### Configuration de Flux (Set Up Flux)

`flux` est l'outil CLI utilisé pour interagir avec Flux et peut également être utilisé pour installer les composants Flux dans Kubernetes. Suivez les [instructions d'installation](https://fluxcd.io/flux/installation/) pour votre système d'exploitation et pointez votre `kubectl` vers votre cluster Kubernetes de test.

Vous devrez créer un jeton d'accès personnel GitHub pour que Flux puisse communiquer de manière sécurisée avec GitHub. Vous pouvez en générer un sur la page Paramètres de votre profil GitHub, dans la section Paramètres du développeur. Il aura besoin de l'autorisation `repo` et vous devez décider si vous souhaitez qu'il expire automatiquement à une date planifiée ou qu'il ne soit jamais expiré. Pour cet exemple, les deux options conviennent, mais dans un système de production réel, vous devez toujours avoir un processus pour renouveler régulièrement les informations d'identification.

Suivez les [instructions de GitHub](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens) pour générer un jeton d'accès personnel, exportez-le dans votre environnement avec votre nom d'utilisateur et vérifiez si Flux est prêt à être installé à l'aide de la commande `flux check` :

```bash
export GITHUB_TOKEN=VOTRE_JETON_D_ACCÈS_PERSONNEL
export GITHUB_USER=VOTRE_NOM_D_UTILISATEUR_GITHUB
flux check --pre
```

### Installation de Flux (Install Flux)

En supposant que la vérification réussisse, vous êtes prêt à installer Flux ! Dans le cadre du processus, il utilisera votre jeton d'accès personnel pour créer automatiquement un nouveau dépôt GitHub dans votre compte, puis utilisera ce dépôt pour gérer votre cluster à l'avenir :

```bash
flux bootstrap github \
  --owner=$GITHUB_USER \
  --repository=flux-demo \
  --branch=main \
  --path=./clusters/demo-cluster \
  --personal
```

Entre autres, vous devriez voir que Flux s'est correctement connecté à votre dépôt. Vous pouvez naviguer vers votre nouveau dépôt et voir qu'à l'intérieur de celui-ci, Flux a créé un répertoire nommé _clusters/demo-cluster/flux-system_ contenant tous les manifestes Kubernetes de Flux qui s'exécutent maintenant dans votre cluster, dans le nouvel espace de noms `flux-system`.

### Créer un nouveau déploiement à l'aide de Flux (Create a New Deployment Using Flux)

Utilisons maintenant Flux pour déployer automatiquement un nouvel espace de noms et un nouveau déploiement sur votre cluster. Dans le respect de la philosophie GitOps, nous ne ferons cela qu'en poussant les modifications vers le dépôt Git. Vous devrez cloner le nouveau dépôt créé par Flux, ce qui signifie que vous devrez configurer vos informations d'identification avec GitHub afin de pouvoir pousser de nouveaux commits. Si vous ne l'avez pas encore fait, vous pouvez suivre [ces instructions de GitHub](https://docs.github.com/en/authentication/connecting-to-github-with-ssh). Une fois votre référentiel cloné, créez un nouveau répertoire à côté de `flux-system` pour notre nouveau déploiement `flux-demo` :

```bash
git clone git@github.com:$GITHUB_USER/flux-demo.git
cd flux-demo
mkdir -p clusters/demo-cluster/flux-demo #  L'option -p crée les répertoires parents si nécessaire.
cd clusters/demo-cluster/flux-demo
```

Nous allons maintenant générer le YAML nécessaire pour un nouvel espace de noms et un nouveau déploiement appelé `flux-demo` à l'aide de `kubectl` et de l'indicateur `--dry-run=client`. Après avoir enregistré ces manifestes dans de nouveaux fichiers, nous les validerons et les enverrons au référentiel :

```bash
kubectl create namespace flux-demo -o yaml --dry-run=client > namespace.yaml
kubectl create deployment flux-demo --image=cloudnatived/demo:hello \
  --namespace=flux-demo -o yaml --dry-run=client > deployment.yaml
git add namespace.yaml deployment.yaml
git commit -m "Création du déploiement flux-demo"
git push
```

Puisque Flux interroge régulièrement le dépôt Git et surveille les modifications, il créera et déploiera automatiquement vos nouveaux manifestes `flux-demo` lorsqu'il détectera les nouveaux fichiers :

```bash
kubectl get pods -n flux-demo
```

En plus des manifestes Kubernetes classiques, Flux peut gérer les versions Helm et les manifestes utilisant kustomize. Vous pouvez également configurer Flux pour interroger votre registre de conteneurs et déployer automatiquement les nouvelles images. Il effectuera ensuite un nouveau commit Git dans le référentiel, en suivant la version de l'image déployée, en maintenant votre dépôt Git synchronisé avec ce qui s'exécute réellement dans le cluster.

De plus, tout comme la boucle de réconciliation de Kubernetes, Flux surveille en permanence les modifications manuelles apportées aux ressources qu'il gère. Il tentera de maintenir le cluster synchronisé avec le contenu du référentiel Git. Ainsi, toute modification manuelle apportée à un élément géré avec Flux sera automatiquement annulée, ce qui vous permettra de faire davantage confiance à votre dépôt Git en tant que source ultime, ou vérité, pour ce qui doit s'exécuter dans votre cluster.

C'est l'un des principaux objectifs de GitOps : vous permettre de gérer Kubernetes automatiquement à l'aide de code suivi dans Git. Pousser les modifications vers ce dépôt est la seule façon d'apporter des modifications à vos clusters lorsque vous utilisez Flux. L'utilisation de Git pour gérer votre infrastructure signifie que vous conserverez un enregistrement de toutes les modifications dans votre historique de commits, et que toutes les modifications peuvent être examinées par des pairs dans le cadre du processus de demande de fusion de votre équipe.

## Résumé (Summary)

La configuration d'un pipeline de déploiement continu pour vos applications vous permet de déployer des logiciels de manière cohérente, fiable et rapide. Idéalement, les développeurs devraient être en mesure de transférer le code vers le référentiel de contrôle de code source et toutes les phases de construction, de test et de déploiement devraient se dérouler automatiquement dans un pipeline centralisé.

Comme il existe de nombreuses options de logiciels et de techniques CI/CD, nous ne pouvons pas vous donner une recette unique qui conviendra à tout le monde. Nous avons plutôt cherché à vous montrer comment et pourquoi le déploiement continu est avantageux, et à vous donner quelques points importants à prendre en compte lorsque vous le mettrez en œuvre dans votre propre organisation :

*   Décider quels outils CI/CD utiliser est un processus important lors de la construction d'un nouveau pipeline. Tous les outils mentionnés dans ce lab pourraient probablement être intégrés à presque tous les environnements existants.
*   Jenkins, GitHub Actions, GitLab, Drone, Cloud Build et Spinnaker ne sont que quelques-uns des outils CI/CD populaires qui fonctionnent bien avec Kubernetes.
*   Définir les étapes du pipeline de build avec du code vous permet de suivre et de modifier ces étapes en même temps que le code de l'application.
*   Les conteneurs permettent aux développeurs de promouvoir les artefacts de build dans différents environnements, tels que les tests, le staging et enfin la production, idéalement sans avoir à reconstruire un nouveau conteneur.
*   Notre exemple de pipeline utilisant Cloud Build devrait être facilement adaptable à d'autres outils et types d'applications. Les étapes générales de build, de test et de déploiement sont en grande partie les mêmes dans tout pipeline CI/CD, quels que soient les outils utilisés ou le type de logiciel.
*   GitOps est un terme plus récent utilisé pour parler des pipelines CI/CD. L'idée principale est que les déploiements et les modifications d'infrastructure doivent être gérés à l'aide de code suivi dans un système de contrôle de code source (Git).
*   Flux et Argo disposent d'outils GitOps populaires qui peuvent appliquer automatiquement les modifications à vos clusters chaque fois que vous transférez des modifications de code vers un dépôt Git.
