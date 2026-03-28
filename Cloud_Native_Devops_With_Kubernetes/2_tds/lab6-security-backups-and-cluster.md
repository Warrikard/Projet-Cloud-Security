## LAB 6 - Security, Backups, and Cluster Health

> **Auteur** : Badr TAJINI - Cloud-native-DevOps-with-Kubernetes - ESIEE - 2024/2025

---

Dans ce lab, nous explorerons les mécanismes de sécurité et de contrôle d'accès dans Kubernetes, y compris le contrôle d'accès basé sur les rôles (RBAC), nous présenterons quelques outils et services d'analyse des vulnérabilités et nous expliquerons comment sauvegarder les données et l'état de votre Kubernetes (et plus important encore, comment les restaurer). Nous examinerons également quelques moyens utiles d'obtenir des informations sur ce qui se passe dans votre cluster.

## Contrôle d'accès et autorisations (Access Control and Permissions)

Les petites entreprises technologiques ont tendance à démarrer avec seulement quelques employés, et tout le monde a un accès administrateur sur chaque système.

Cependant, à mesure que l'organisation grandit, il devient évident qu'il n'est plus judicieux que tout le monde dispose de droits d'administrateur : il est trop facile pour quelqu'un de faire une erreur et de modifier quelque chose qu'il ne devrait pas. Il en va de même pour Kubernetes.

## Gestion des accès par cluster (Managing Access by Cluster)

L'une des choses les plus simples et les plus efficaces que vous puissiez faire pour sécuriser votre cluster Kubernetes est de limiter qui y a accès. Il existe généralement deux groupes de personnes qui doivent accéder aux clusters Kubernetes : les *opérateurs de cluster* et les *développeurs d'applications*, et ils ont souvent besoin d'autorisations et de privilèges différents dans le cadre de leur fonction.

De plus, vous pouvez avoir plusieurs environnements de déploiement, tels que la production et le staging. Ces environnements distincts nécessiteront des politiques différentes, selon votre organisation. La production peut être limitée à certaines personnes uniquement, tandis que le staging peut être ouvert à un groupe plus large d'ingénieurs.

Comme nous l'avons vu, il est souvent judicieux d'avoir des clusters distincts pour la production et le staging ou les tests. Si quelqu'un déploie accidentellement quelque chose en staging qui fait tomber les nœuds du cluster, cela n'aura pas d'impact sur la production.

Si une équipe ne doit pas avoir accès au logiciel et au processus de déploiement d'une autre équipe, chaque équipe peut avoir son propre cluster dédié et ne même pas avoir d'informations d'identification sur les clusters de l'autre équipe.

C'est certainement l'approche la plus sûre, mais les clusters supplémentaires présentent des inconvénients. Chacun doit être corrigé et surveillé, et de nombreux petits clusters ont tendance à être moins efficaces que les grands clusters.

## Introduction au contrôle d'accès basé sur les rôles (RBAC) (Introducing Role-Based Access Control (RBAC))

Une autre façon de gérer l'accès consiste à contrôler qui peut effectuer certaines opérations à l'intérieur du cluster, à l'aide du système de contrôle d'accès basé sur les rôles (RBAC) de Kubernetes.

RBAC est conçu pour accorder des autorisations spécifiques à des utilisateurs spécifiques (ou à des comptes de service, qui sont des comptes d'utilisateur associés à des systèmes automatisés). Par exemple, vous pouvez accorder la possibilité de lister tous les `Pods` du cluster à un utilisateur particulier s'il en a besoin.

La première chose et la plus importante à savoir sur RBAC est qu'il doit être activé. RBAC a été introduit dans Kubernetes 1.6 en tant qu'option lors de la configuration des clusters. Cependant, l'activation de cette option dans votre cluster dépend de votre fournisseur de cloud ou de votre programme d'installation Kubernetes.

Si vous utilisez un cluster auto-hébergé, essayez cette commande pour voir si RBAC est activé ou non sur votre cluster :

```bash
kubectl describe pod -n kube-system -l component=kube-apiserver
```

Si `--authorization-mode` ne contient pas `RBAC`, alors RBAC n'est pas activé pour votre cluster. Consultez la documentation du programme d'installation pour savoir comment reconstruire le cluster avec RBAC activé.

Sans RBAC, toute personne ayant accès au cluster a le pouvoir de tout faire, y compris exécuter du code arbitraire ou supprimer des charges de travail. Ce n'est probablement pas ce que vous voulez.

## Comprendre les rôles (Understanding Roles)

Donc, en supposant que vous ayez activé RBAC, comment cela fonctionne-t-il ? Les concepts les plus importants à comprendre sont les *utilisateurs*, les *rôles* et les *liaisons de rôles*.

Chaque fois que vous vous connectez à un cluster Kubernetes, vous le faites en tant qu'utilisateur spécifique. La façon exacte dont vous vous authentifiez auprès du cluster dépend de votre fournisseur ; par exemple, dans GKE, vous utilisez l'outil `gcloud` pour obtenir un jeton d'accès à un cluster particulier. Sur EKS, vous utilisez vos informations d'identification AWS IAM. Il existe également des comptes de service dans le cluster ; par exemple, il existe un compte de service par défaut pour chaque espace de noms. Les utilisateurs et les comptes de service peuvent tous avoir des ensembles d'autorisations différents.

Ceux-ci sont régis par les *rôles* Kubernetes. Un rôle décrit un ensemble spécifique d'autorisations. Kubernetes inclut des rôles prédéfinis pour vous aider à démarrer. Par exemple, le rôle `cluster-admin`, destiné aux superutilisateurs, est autorisé à lire et à modifier n'importe quelle ressource du cluster. En revanche, le rôle `view` peut lister et examiner la plupart des objets d'un espace de noms donné, mais pas les modifier.

Vous pouvez définir des rôles au niveau de l'espace de noms (à l'aide de l'objet `Role`) ou sur l'ensemble du cluster (à l'aide de l'objet `ClusterRole`). Voici un exemple de manifeste `ClusterRole` qui accorde un accès en lecture aux `Secrets` dans n'importe quel espace de noms :

```yaml
kind: ClusterRole
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: secret-reader
rules:
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get", "watch", "list"]
```

## Lier des rôles aux utilisateurs (Binding Roles to Users)

Comment associer un utilisateur à un rôle ? Vous pouvez le faire à l'aide d'une liaison de rôles. Tout comme pour les rôles, vous pouvez créer un objet `RoleBinding` qui s'applique à un espace de noms spécifique ou un `ClusterRoleBinding` qui s'applique au niveau du cluster.

Voici le manifeste `RoleBinding` qui attribue à l'utilisateur `daisy` le rôle `edit` dans l'espace de noms `demo` uniquement :

```yaml
kind: RoleBinding
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: daisy-edit
  namespace: demo
subjects:
- kind: User
  name: daisy
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole  # Référence à un ClusterRole, pas un Role
  name: edit
  apiGroup: rbac.authorization.k8s.io
```

Dans Kubernetes, les autorisations sont *additives* ; les utilisateurs commencent sans aucune autorisation et vous pouvez les ajouter à l'aide de `Roles` et de `RoleBindings`. Vous ne pouvez pas supprimer des autorisations à quelqu'un qui les possède déjà.

**Astuce**

Vous pouvez en savoir plus sur les détails de RBAC et sur les rôles et autorisations disponibles dans la [documentation Kubernetes](https://kubernetes.io/docs/reference/access-authn-authz/rbac/).

## De quels rôles ai-je besoin ? (What Roles Do I Need?)

Alors, quels rôles et liaisons devez-vous configurer dans votre cluster ? Les rôles prédéfinis `cluster-admin`, `edit` et `view` couvriront probablement la plupart des besoins. Pour voir les autorisations d'un rôle donné, utilisez la commande `kubectl describe` :

```bash
kubectl describe clusterrole/edit
```

Vous pouvez créer des rôles pour des personnes ou des tâches spécifiques au sein de votre organisation (par exemple, un rôle de développeur) ou pour des équipes individuelles (par exemple, QA ou sécurité).

## Protéger l'accès à `cluster-admin` (Guard Access to cluster-admin)

Soyez très prudent quant aux personnes ayant accès au rôle `cluster-admin`. Il s'agit du superutilisateur du cluster, équivalent à l'utilisateur root sur les systèmes Unix. Ils peuvent tout faire à tout. Ne donnez jamais ce rôle à des utilisateurs qui ne sont pas des opérateurs de cluster, et surtout pas aux comptes de service d'applications qui pourraient être exposées à Internet, comme le tableau de bord Kubernetes (voir **[« Tableau de bord Kubernetes »](Lab 6)**).

**Avertissement**

Ne résolvez pas les problèmes en accordant *cluster-admin* inutilement. Vous trouverez de mauvais conseils à ce sujet sur des sites comme Stack Overflow. Face à une erreur d'autorisation Kubernetes, une réponse courante consiste à accorder le rôle `cluster-admin` à l'application. *Ne faites pas ça*. Oui, cela fait disparaître les erreurs, mais au prix du contournement de tous les contrôles de sécurité et de l'ouverture potentielle de votre cluster à un attaquant. Accordez plutôt à l'application un rôle avec le moins de privilèges dont elle a besoin pour faire son travail.

## Applications et déploiement (Applications and Deployment)

Les applications s'exécutant dans Kubernetes n'ont généralement pas besoin d'autorisations RBAC spéciales. Sauf indication contraire de votre part, tous les `Pods` s'exécuteront en tant que compte de service `default` dans leur espace de noms, qui n'a aucun rôle associé.

Si votre application a besoin d'accéder à l'API Kubernetes pour une raison quelconque (par exemple, un outil de surveillance qui doit lister les `Pods`), créez un compte de service dédié pour l'application, utilisez un `RoleBinding` pour l'associer au rôle nécessaire (par exemple, `view`) et limitez-le à des espaces de noms spécifiques.

Qu'en est-il des autorisations requises pour déployer des applications sur le cluster ? La façon la plus sûre est de n'autoriser qu'un outil de déploiement continu à déployer des applications (voir **(Lab 4)**). Il peut utiliser un compte de service dédié, avec l'autorisation de créer et de supprimer des `Pods` dans un espace de noms particulier.

Le rôle `edit` est idéal pour cela. Les utilisateurs disposant du rôle `edit` peuvent créer et détruire des ressources dans l'espace de noms, mais ne peuvent pas créer de nouveaux rôles ni accorder des autorisations à d'autres utilisateurs.

Si vous ne disposez pas d'un outil de déploiement automatisé et que les développeurs doivent déployer directement sur le cluster, ils auront également besoin de droits d'édition sur les espaces de noms appropriés. Accordez-les application par application ; ne donnez à personne les droits d'édition sur l'ensemble du cluster. Les personnes qui n'ont pas besoin de déployer des applications ne doivent avoir que le rôle `view` par défaut.

Idéalement, vous devez configurer un processus de déploiement CI/CD centralisé afin que les développeurs n'aient pas besoin de déployer directement sur Kubernetes. Nous aborderons ce sujet plus en détail dans le **(Lab 7)** et dans **[« GitOps »](Lab 7)**.

## Meilleure pratique (Best Practice)

**Assurez-vous que RBAC est activé dans tous vos clusters. Accordez les droits `cluster-admin` uniquement aux utilisateurs qui ont réellement besoin du pouvoir de tout détruire dans le cluster. Si votre application a besoin d'accéder aux ressources du cluster, créez un compte de service pour celle-ci et liez-le à un rôle avec uniquement les autorisations dont elle a besoin, uniquement dans les espaces de noms où elle en a besoin.**

## Dépannage RBAC (RBAC Troubleshooting)

Si vous utilisez une ancienne application tierce qui ne prend pas en charge RBAC, ou si vous êtes encore en train de déterminer les autorisations requises pour votre propre application, vous pouvez rencontrer des erreurs d'autorisation RBAC. À quoi ressemblent-elles ?

Si une application effectue une requête d'API pour quelque chose qu'elle n'est pas autorisée à faire (par exemple, lister les nœuds), elle recevra une réponse d'erreur *Forbidden* (code d'état HTTP 403) du serveur d'API :

```
Error from server (Forbidden): nodes.metrics.k8s.io is forbidden: User
"demo" cannot list nodes.metrics.k8s.io at the cluster scope.
```

Si l'application ne consigne pas ces informations ou si vous n'êtes pas sûr de l'application qui échoue, vous pouvez consulter le journal du serveur d'API pour en savoir plus). Il enregistrera des messages comme celui-ci, contenant la chaîne `RBAC DENY` avec une description de l'erreur :

```bash
kubectl logs -n kube-system -l component=kube-apiserver | grep "RBAC DENY"
RBAC DENY: user "demo" cannot "list" resource "nodes" cluster-wide
```

(Vous ne pourrez pas faire cela sur un cluster GKE ou tout autre service Kubernetes géré qui ne vous donne pas accès au plan de contrôle : consultez la documentation de votre fournisseur Kubernetes pour savoir comment accéder aux journaux du serveur d'API.)

`kubectl` inclut également une commande utile pour tester les autorisations appelée `auth can-i`. Cela vous permet d'essayer une opération Kubernetes en utilisant votre rôle actuel, ou vous pouvez tester les autorisations de quelqu'un d'autre pour voir si son rôle autorise une commande particulière ou non :

```bash
[source, console, subs="quotes"]
*kubectl auth can-i list secrets*
yes
*kubectl auth can-i create deployments --as test-user*
no
```

RBAC a la réputation d'être compliqué, mais ce n'est vraiment pas le cas. Il suffit d'accorder aux utilisateurs les privilèges minimum dont ils ont besoin, de protéger `cluster-admin` et tout ira bien.

##  Analyse de sécurité du cluster (Cluster Security Scanning)

Afin de vérifier les problèmes de sécurité potentiels connus, il existe des outils pour analyser vos clusters qui vous informeront de tout problème détecté.

## Gatekeeper/OPA

En février 2021, la CNCF a fait passer le projet [Open Policy Agent (OPA)](https://www.openpolicyagent.org/) au stade « graduated », ce qui signifie qu'il répond aux normes et à la maturité requises pour être inclus aux côtés des autres projets CNCF officiellement adoptés. OPA est un outil de *moteur de politique* qui vous permet de définir des politiques de sécurité pour tous vos outils natifs du cloud, y compris Kubernetes.

[Gatekeeper](https://github.com/open-policy-agent/gatekeeper) est un projet associé qui prend le moteur OPA et le fait fonctionner à l'intérieur de Kubernetes en tant que ressources natives.

Par exemple, à l'aide de Gatekeeper, vous pouvez ajouter la contrainte suivante pour empêcher les conteneurs d'un espace de noms donné de s'exécuter s'ils utilisent la balise `latest` (voir **[« La balise latest »](Lab 4)** pour plus d'informations) :

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sDisallowedTags
metadata:
  name: container-image-must-not-have-latest-tag
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    namespaces:
      - "my-namespace"
  parameters:
    tags: ["latest"]
```

Il existe de nombreuses autres politiques spécifiques à Kubernetes maintenues dans le dépôt [gatekeeper-library](https://github.com/open-policy-agent/gatekeeper-library). D'autres exemples incluent de s'assurer que tous les `Pods` ont un ensemble connu d'étiquettes ou de forcer les conteneurs à provenir d'une liste de sources de registre de confiance. Vous pouvez également envisager d'utiliser OPA pour auditer et sécuriser vos ressources cloud non Kubernetes.

## kube-bench

[kube-bench](https://github.com/aquasecurity/kube-bench) est un outil permettant d'auditer votre cluster Kubernetes par rapport à un ensemble de benchmarks produits par le Center for Internet Security (CIS). En effet, il vérifie que votre cluster est configuré conformément aux meilleures pratiques de sécurité. Bien que vous n'en ayez probablement pas besoin, vous pouvez configurer les tests exécutés par kube-bench et même ajouter les vôtres, spécifiés sous forme de documents YAML.

`kube-bench` s'exécute lorsque vous déployez un `Job` sur Kubernetes et inspectez les résultats. Téléchargez le fichier YAML du `Job` approprié pour votre cluster, en fonction de la documentation du [référentiel](https://github.com/aquasecurity/kube-bench/blob/main/docs/running.md), et installez-le sur votre cluster :

```bash
kubectl apply -f job.yaml
job.batch/kube-bench created

kubectl logs job/kube-bench
...
== Summary total ==
63 checks PASS
13 checks FAIL
46 checks WARN
0 checks INFO
...
```

Vous pouvez ensuite parcourir les journaux pour obtenir les détails sur les avertissements ou les échecs trouvés par kube-bench.

## Kubescape

Un autre outil dans cet espace s'appelle [Kubescape](https://github.com/kubescape/kubescape), et il vérifie si vos clusters sont sécurisés conformément aux normes récentes définies dans le [CIS Benchmark](https://www.cisecurity.org/benchmark/kubernetes). Il vous informera des conteneurs qui s'exécutent en tant que root, des ports exposés potentiellement non sécurisés, vérifiera que vos paramètres d'authentification et de journal d'audit sont configurés de manière sécurisée, ainsi que d'autres éléments similaires définis dans la liste de contrôle CIS.

## Analyse de sécurité des conteneurs (Container Security Scanning)

Si vous exécutez des logiciels tiers dans votre cluster, il est judicieux de vérifier s'ils présentent des problèmes de sécurité et des logiciels malveillants. Mais même vos propres conteneurs peuvent contenir des logiciels dont vous n'êtes pas au courant, et qui doivent également être vérifiés.

## Clair

[Clair](https://github.com/quay/clair) est un scanner de conteneurs open source produit par le projet CoreOS. Il analyse statiquement les images de conteneurs, avant leur exécution effective, pour détecter si elles contiennent des logiciels ou des versions connus pour être non sécurisés.

Vous pouvez exécuter Clair manuellement pour vérifier si des images spécifiques présentent des problèmes ou l'intégrer à votre pipeline CD pour tester toutes les images avant leur déploiement (voir **(Lab 7)**).

Alternativement, Clair peut se connecter à votre registre de conteneurs pour analyser toutes les images qui y sont envoyées et signaler les problèmes.

Il convient de mentionner que vous ne devez pas faire automatiquement confiance aux images de base, telles que `alpine`. Clair est préchargé avec des contrôles de sécurité pour de nombreuses images de base populaires et vous indiquera immédiatement si vous utilisez une image présentant une vulnérabilité connue.

## Aqua

[Aqua Container Security Platform](https://www.aquasec.com/aqua-cloud-native-security-platform/) est une offre commerciale complète de sécurité des conteneurs permettant aux organisations d'analyser les conteneurs à la recherche de vulnérabilités, de logiciels malveillants et d'activités suspectes, tout en assurant l'application des politiques et la conformité réglementaire.

Comme prévu, la plateforme Aqua s'intègre à votre registre de conteneurs, à votre pipeline CI/CD et à plusieurs systèmes d'orchestration, dont Kubernetes.

Aqua propose également [Trivy](https://github.com/aquasecurity/trivy), un outil gratuit que vous pouvez ajouter à vos images de conteneurs pour analyser les paquets installés à la recherche de vulnérabilités connues à partir de la même base de données que celle utilisée par Aqua Security Platform.

Si vous souhaitez que Trivy analyse une image Docker particulière, installez l'outil CLI et exécutez :

```bash
trivy image [YOUR_CONTAINER_IMAGE_NAME]
```

Vous pouvez également l'utiliser pour rechercher des problèmes de sécurité et des erreurs de configuration dans vos Dockerfiles, vos fichiers Terraform et même vos manifestes Kubernetes :

```bash
trivy config [YOUR_CODE_DIR]
```

Un autre outil open source pratique d'Aqua est [kube-hunter](https://kube-hunter.aquasec.com/), conçu pour trouver des problèmes de sécurité dans votre cluster Kubernetes lui-même. Si vous l'exécutez comme un conteneur sur une machine en dehors de votre cluster, comme pourrait le faire un attaquant, il vérifiera divers types de problèmes : adresses e-mail exposées dans les certificats, tableaux de bord non sécurisés, ports et points de terminaison ouverts, etc.

## Anchore Engine

[Anchore Engine](https://github.com/anchore/anchore-engine) est un outil open source permettant d'analyser les images de conteneurs, non seulement pour les vulnérabilités connues, mais aussi pour identifier la *nomenclature* de tout ce qui est présent dans le conteneur, y compris les bibliothèques, les fichiers de configuration et les autorisations de fichiers. Vous pouvez l'utiliser pour vérifier les conteneurs par rapport aux politiques définies par l'utilisateur : par exemple, vous pouvez bloquer toutes les images contenant des informations d'identification de sécurité ou le code source de l'application.

## Snyk

Docker s'est associé à [Snyk](https://snyk.io/) pour ajouter l'analyse des vulnérabilités directement dans l'outil CLI `docker`. Vous pouvez analyser n'importe quelle image à l'aide de la commande `docker scan` :

```bash
docker scan golang:1.17-alpine
```

Snyk vous informera des problèmes de sécurité connus et des dépréciations trouvés dans l'image :

```bash
docker scan golang:1.14-alpine
# ... 
```

Ceci peut être un moyen rapide et facile d'ajouter une analyse de sécurité de base à votre flux de travail Docker ainsi qu'à vos pipelines CI/CD.

## Meilleure pratique (Best Practice)

**N'exécutez pas de conteneurs provenant de sources non fiables ou lorsque vous n'êtes pas sûr de leur contenu. Exécutez un outil d'analyse tel que Clair, Trivy ou Snyk sur tous les conteneurs, en particulier ceux que vous créez vous-même, afin de vous assurer qu'il n'existe aucune vulnérabilité connue dans les images de base ou les dépendances.**

## Sauvegardes (Backups)

Vous vous demandez peut-être si vous avez encore besoin de sauvegardes dans les architectures natives du cloud. Après tout, Kubernetes est intrinsèquement fiable et peut gérer la perte de plusieurs nœuds à la fois, sans perdre d'état ni même trop dégrader les performances des applications.

De plus, Kubernetes est un système IaC déclaratif. Toutes les ressources Kubernetes sont décrites par des données stockées dans une base de données fiable (`etcd`). En cas de suppression accidentelle de certains pods, leur déploiement superviseur les recréera à partir de la spécification conservée dans la base de données.

## Dois-je sauvegarder Kubernetes ? (Do I Need to Back Up Kubernetes?)

Alors, avez-vous encore besoin de sauvegardes ? Eh bien, oui. Les données stockées sur des volumes persistants, par exemple, sont vulnérables aux pannes (voir **[« Volumes persistants »](Lab 4))**. Bien que votre fournisseur de cloud puisse fournir des volumes théoriquement hautement disponibles (en répliquant les données sur deux zones de disponibilité différentes, par exemple), ce n'est pas la même chose qu'une sauvegarde.

Répétons ce point, car il n'est pas évident :

**Avertissement**

*La réplication n'est pas une sauvegarde*. Bien que la réplication puisse vous protéger contre la panne du volume de stockage sous-jacent, elle ne vous protégera pas contre la suppression accidentelle du volume, par exemple en cliquant par erreur dans une console Web.

La réplication n'empêchera pas non plus une application mal configurée d'écraser ses données, ni un opérateur d'exécuter une commande avec les mauvaises variables d'environnement et de supprimer accidentellement la base de données de production au lieu de celle de développement. ([Cela s'est produit](https://thenewstack.io/junior-dev-deleted-production-database/), probablement plus souvent que quiconque ne veut l'admettre.

## Sauvegarde d'etcd (Backing Up etcd)

Comme nous l'avons vu, Kubernetes stocke tout son état dans la base de données `etcd`. Toute panne ou perte de données ici pourrait donc être catastrophique. C'est une très bonne raison pour laquelle nous recommandons d'utiliser des services gérés qui garantissent la disponibilité d'etcd et du plan de contrôle en général.

Si vous exécutez vos propres nœuds de plan de contrôle, vous êtes responsable de la gestion du clustering et de la réplication `etcd`. Même avec des instantanés de données réguliers, un certain temps est nécessaire pour récupérer et vérifier l'instantané, reconstruire le cluster et restaurer les données. Pendant ce temps, votre cluster sera probablement indisponible ou sérieusement dégradé.

C'est pourquoi il est essentiel de conserver vos manifestes Kubernetes et vos graphiques Helm dans un système de contrôle de code source et de mettre en œuvre des processus de déploiement efficaces afin de pouvoir remettre rapidement vos clusters en service si vous rencontrez un problème avec `etcd`. Nous aborderons ce point plus en détail dans le **(Lab 7)**.

## Meilleure pratique (Best Practice)

**Utilisez un fournisseur de services gérés ou clés en main pour exécuter vos nœuds de plan de contrôle avec le clustering et les sauvegardes `etcd`. Si vous les exécutez vous-même, assurez-vous de bien savoir ce que vous faites. La gestion résiliente d' `etcd` est un travail de spécialiste, et les conséquences d'une mauvaise exécution peuvent être graves.**

## Sauvegarde de l'état des ressources (Backing Up Resource State)

Outre les pannes d'`etcd`, il est également question de sauvegarder l'état de vos ressources individuelles. Si vous supprimez le mauvais déploiement, par exemple, comment le re-créeriez-vous ?

Dans ce cours, nous insistons sur la valeur du paradigme de l'*infrastructure en tant que code* et recommandons de toujours gérer vos ressources Kubernetes de manière déclarative, en appliquant des manifestes YAML ou des graphiques Helm stockés dans un système de contrôle de version.

En théorie, pour recréer l'état complet des charges de travail de votre cluster, vous devriez pouvoir extraire les référentiels de contrôle de version pertinents et y appliquer toutes les ressources. *En théorie*.

## Sauvegarde de l'état du cluster (Backing Up Cluster State)

En pratique, tout ce que vous avez dans le contrôle de version ne s'exécute pas actuellement dans votre cluster. Certaines applications peuvent avoir été mises hors service ou remplacées par des versions plus récentes. Certaines peuvent ne pas être prêtes à être déployées.

Nous avons recommandé tout au long de ces labs d'éviter d'apporter des modifications directes aux ressources, mais d'appliquer plutôt les modifications à partir des fichiers manifeste mis à jour. Cependant, il arrive que les gens ne suivent pas les bons conseils.

Dans tous les cas, il est probable que lors du déploiement initial et des tests d'applications, les ingénieurs ajustent à la volée des paramètres tels que le nombre de répliques et les affinités de nœuds, et ne les stockent dans le contrôle de version qu'une fois qu'ils ont trouvé les valeurs appropriées.

À supposer que votre cluster soit complètement arrêté ou que toutes ses ressources soient supprimées (un scénario improbable, espérons-le, mais une expérience de pensée utile). En combien de temps pourriez-vous le recréer ?

Même si vous disposez d'un système d'automatisation des clusters admirablement bien conçu et à jour, capable de tout redéployer sur un nouveau cluster, comment *savez-vous* que l'état de ce cluster correspond à celui qui a été perdu ?

Un moyen de s'en assurer est de créer un instantané du cluster en cours d'exécution, auquel vous pourrez vous référer ultérieurement en cas de problème.

## Catastrophes grandes et petites (Large and Small Disasters)

Il est peu probable que vous perdiez l'ensemble du cluster : des milliers de contributeurs à Kubernetes ont travaillé dur pour s'assurer que cela ne se produise pas.

Ce qui est plus probable, c'est que vous (ou le plus récent membre de votre équipe) supprimiez accidentellement un espace de noms, arrêtiez un déploiement sans le vouloir ou spécifiiez un mauvais ensemble d'étiquettes à une commande `kubectl delete`, supprimant ainsi plus que ce que vous aviez prévu.

Quelle qu'en soit la cause, les catastrophes se produisent. Examinons donc un outil de sauvegarde qui peut vous aider à les éviter.

## Velero

[Velero](https://velero.io/) (anciennement appelé Ark) est un outil gratuit et open source qui permet de sauvegarder et de restaurer l'état de votre cluster et vos données persistantes.

Velero s'exécute dans votre cluster et se connecte à un service de stockage dans le cloud de votre choix (par exemple, Amazon S3 ou Azure Storage).

Allez sur le site Web de [velero.io](https://velero.io/docs/main) pour obtenir les instructions de configuration de Velero sur votre plate-forme.

### Configuration de Velero (Configuring Velero)

Avant d'utiliser Velero, vous devez créer un objet `BackupStorageLocation` dans votre cluster Kubernetes, en lui indiquant où stocker les sauvegardes (par exemple, un compartiment de stockage dans le cloud AWS S3). Voici un exemple qui configure Velero pour sauvegarder dans le compartiment `demo-backup` :

```yaml
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: default
  namespace: velero
spec:
  provider: aws
  objectStorage:
    bucket: demo-backup
  config:
    region: us-east-1
```

Vous devez disposer d'au moins un emplacement de stockage appelé `default`, mais vous pouvez en ajouter d'autres avec les noms de votre choix.

Velero peut également sauvegarder le contenu de vos volumes persistants. Pour lui indiquer où les stocker, vous devez créer un objet `VolumeSnapshotLocation` :

```yaml
apiVersion: velero.io/v1
kind: VolumeSnapshotLocation
metadata:
  name: aws-default
  namespace: velero
spec:
  provider: aws
  config:
    region: us-east-1
```

### Création d'une sauvegarde Velero (Creating a Velero backup)

Lorsque vous créez une sauvegarde à l'aide de la commande `velero backup create`, le serveur Velero interroge l'API Kubernetes pour récupérer les ressources correspondant au sélecteur que vous avez fourni (par défaut, toutes les ressources sont sauvegardées). Vous pouvez sauvegarder un ensemble d'espaces de noms ou l'ensemble du cluster :

```bash
velero backup create demo-backup --include-namespaces demo
```

Ensuite, il exportera toutes ces ressources vers un fichier nommé dans votre compartiment de stockage dans le cloud, conformément à votre `BackupStorageLocation` configuré. Les métadonnées et le contenu de vos volumes persistants seront également sauvegardés dans votre `VolumeSnapshotLocation` configuré.

Vous pouvez également tout sauvegarder dans votre cluster, *sauf* les espaces de noms spécifiés (par exemple, `kube-system`). Vous pouvez également planifier des sauvegardes automatiques : par exemple, vous pouvez demander à Velero de sauvegarder votre cluster toutes les nuits, voire toutes les heures.

Chaque sauvegarde Velero est complète en soi, et non incrémentielle. Ainsi, pour restaurer une sauvegarde, vous n'avez besoin que du fichier de sauvegarde le plus récent.

### Restauration des données (Restoring data)

Vous pouvez lister les sauvegardes disponibles à l'aide de la commande `velero backup get`. Pour voir le contenu d'une sauvegarde particulière, utilisez `velero backup download` :

```bash
velero backup download demo-backup
```

Le fichier téléchargé est une archive *tar.gz* que vous pouvez décompresser et inspecter à l'aide d'outils standard. Par exemple, si vous souhaitez uniquement le manifeste d'une ressource spécifique, vous pouvez l'extraire du fichier de sauvegarde et le restaurer individuellement avec `kubectl apply -f`.

Pour restaurer l'intégralité de la sauvegarde, la commande `velero restore` lancera le processus et Velero re-créera toutes les ressources et tous les volumes décrits dans l'instantané spécifié, en ignorant tout ce qui existe déjà.

Si la ressource *existe*, mais est différente de celle de la sauvegarde, Velero vous avertira, mais n'écrasera pas la ressource existante. Ainsi, par exemple, si vous souhaitez réinitialiser l'état d'un `Deployment` en cours d'exécution à l'état dans lequel il se trouvait dans l'instantané le plus récent, supprimez d'abord le `Deployment` en cours d'exécution, puis restaurez-le avec Velero. (((())))

Vous pouvez également, si vous restaurez une sauvegarde d'un espace de noms, supprimer d'abord l'espace de noms, puis restaurer la sauvegarde.

### Procédures et tests de restauration (Restore procedures and tests)

Vous devez rédiger une procédure détaillée, étape par étape, décrivant comment restaurer les données à partir de sauvegardes, et vous assurer que tout le personnel sait où trouver ce document. Lorsqu'une catastrophe se produit, c'est généralement à un moment inopportun, les personnes clés ne sont pas disponibles, tout le monde panique, et votre procédure doit être si claire et précise qu'elle peut être exécutée par une personne qui ne connaît pas Velero ou même Kubernetes.

Chaque mois, effectuez un test de restauration en demandant à un membre différent de l'équipe d'exécuter la procédure de restauration sur un cluster temporaire. Cela permet de vérifier que vos sauvegardes sont valides et que la procédure de restauration est correcte, et de s'assurer que tout le monde sait comment procéder.

### Planification des sauvegardes Velero (Scheduling Velero backups)

Toutes les sauvegardes doivent être automatisées, et Velero ne fait pas exception. Vous pouvez planifier une sauvegarde régulière à l'aide de la commande `velero schedule create` :

```bash
velero schedule create demo-schedule --schedule="0 1 * * *" --include-namespaces demo
```

L'argument `schedule` spécifie quand exécuter la sauvegarde, au format cron Unix (voir **[« CronJobs »](Lab 5)**). Dans l'exemple, `0 1 * * *` exécute la sauvegarde à 1h00 tous les jours.

Pour voir les sauvegardes que vous avez planifiées, utilisez `velero schedule get`.

### Autres utilisations de Velero (Other uses for Velero)

Bien que Velero soit extrêmement utile pour la reprise après sinistre, vous pouvez également l'utiliser pour migrer des ressources et des données d'un cluster à un autre.

La création régulière de sauvegardes Velero peut également vous aider à comprendre comment votre utilisation de Kubernetes évolue au fil du temps, en comparant l'état actuel à l'état d'il y a un mois, six mois et un an, par exemple.

Les instantanés peuvent également être une source utile d'informations d'audit : par exemple, pour savoir ce qui était en cours d'exécution dans votre cluster à une date ou une heure donnée, et comment et quand l'état du cluster a changé.

## Meilleure pratique (Best Practice)

**Utilisez Velero pour sauvegarder régulièrement l'état de votre cluster et les données persistantes : au moins une fois par nuit. Effectuez un test de restauration au moins une fois par mois.**

## Surveillance de l'état du cluster (Monitoring Cluster Status)

La surveillance des applications natives du cloud est un vaste sujet qui comprend des éléments tels que l'observabilité, les métriques, la journalisation, le traçage et la surveillance traditionnelle en boîte fermée.

Cependant, dans ce lab, nous nous intéresserons uniquement à la surveillance du cluster Kubernetes lui-même : l'état du cluster, l'état des nœuds individuels, l'utilisation du cluster et la progression de ses charges de travail.

## kubectl

Nous avons présenté la précieuse commande `kubectl` au **(Lab 1)**, mais nous n'avons pas encore épuisé ses possibilités. En plus d'être un outil d'administration général pour les ressources Kubernetes, `kubectl` peut également fournir des informations utiles sur l'état des composants du cluster.

### État du plan de contrôle (Control plane status)

La commande `kubectl get componentstatuses` (ou `kubectl get cs` en abrégé) fournit des informations sur l'état des composants du plan de contrôle : le planificateur, le gestionnaire de contrôleur et `etcd` :

```bash
kubectl get componentstatuses
```

S'il y avait un problème sérieux avec l'un des composants du plan de contrôle, cela deviendrait de toute façon rapidement apparent, mais il est toujours utile de pouvoir les vérifier et les signaler, comme une sorte d'indicateur d'état de haut niveau pour le cluster.

Si l'un de vos composants du plan de contrôle n'est pas dans un état `Healthy` (sain), il devra être réparé. Cela ne devrait jamais être le cas avec un service Kubernetes géré, mais pour les clusters auto-hébergés, vous devrez vous en occuper vous-même.

### État des nœuds (Node status)

Une autre commande utile est `kubectl get nodes`, qui listera tous les nœuds de votre cluster et indiquera leur état et leur version de Kubernetes :

```bash
kubectl get nodes
```

Étant donné que les clusters Docker Desktop n'ont qu'un seul nœud, cette sortie n'est pas particulièrement informative ; regardons la sortie d'un petit cluster GKE pour quelque chose de plus réaliste :

```bash
kubectl get nodes
```

Notez que dans la sortie `get nodes` de Docker Desktop, le *rôle* du nœud était affiché comme `control-plane`. Naturellement, puisqu'il n'y a qu'un seul nœud, celui-ci doit être à la fois le plan de contrôle et le seul nœud worker.

Dans les services Kubernetes gérés, vous n'avez généralement pas d'accès direct aux nœuds du plan de contrôle. En conséquence, `kubectl get nodes` ne liste que les nœuds worker.

Si l'un des nœuds affiche l'état `NotReady`, il y a un problème. Un redémarrage du nœud peut le résoudre, mais sinon, un débogage supplémentaire peut être nécessaire ; ou vous pouvez simplement le supprimer et créer un nouveau nœud à la place.

Pour un dépannage détaillé des nœuds défectueux, vous pouvez utiliser la commande `kubectl describe node` pour obtenir plus d'informations :

```bash
kubectl describe nodes/gke-k8s-cluster-1-n1-standard-2-pool--8l6n
```

Cela vous montrera, par exemple, la capacité de mémoire et de CPU du nœud, ainsi que les ressources actuellement utilisées par les `Pods`.

### Charges de travail (Workloads)

Vous vous souvenez peut-être de **[« Interrogation du cluster avec kubectl »](Lab 2)** : vous pouvez utiliser `kubectl` pour lister tous les `Pods` (ou toutes les ressources) de votre cluster. Dans cet exemple, vous n'avez listé que les `Pods` dans l'espace de noms par défaut, mais l'indicateur `--all-namespaces` (ou simplement `-A` en abrégé) vous permettra de voir tous les `Pods` dans l'ensemble du cluster :

```bash
kubectl get pods --all-namespaces
```

Ceci peut vous donner un aperçu utile de ce qui s'exécute dans votre cluster et des éventuels problèmes au niveau des `Pods`. Si des `Pods` ne sont pas à l'état `Running` (en cours d'exécution), comme le `Pod` `permissions-auditor` dans l'exemple, une enquête plus approfondie peut être nécessaire.

La colonne `READY` indique le nombre de conteneurs du `Pod` qui sont réellement en cours d'exécution, par rapport au nombre configuré. Par exemple, le `Pod` `metrics-api` affiche `3/3` : 3 conteneurs sur 3 sont en cours d'exécution, donc tout va bien.

En revanche, `permissions-auditor` affiche `0/1` conteneurs prêts : 0 conteneur en cours d'exécution, mais 1 requis. La raison est indiquée dans la colonne `STATUS` : `CrashLoopBackOff`. Le conteneur ne parvient pas à démarrer correctement.

Lorsqu'un conteneur plante, Kubernetes continue d'essayer de le redémarrer à des intervalles croissants, en commençant à 10 secondes et en doublant à chaque fois, jusqu'à 5 minutes. Cette stratégie est appelée *backoff exponentiel*, d'où le message d'état `CrashLoopBackOff`.

### Utilisation du CPU et de la mémoire (CPU and Memory Utilization)

La commande `kubectl top` offre une autre vue utile sur votre cluster. Pour les nœuds, elle vous indique la capacité de CPU et de mémoire de chaque nœud, ainsi que la quantité de chacun actuellement utilisée :

```bash
kubectl top nodes
```

Pour les `Pods`, elle indique la quantité de CPU et de mémoire utilisée par chaque `Pod` spécifié :

```bash
kubectl top pods -n kube-system
```

Un autre outil utile pour avoir une vue d'ensemble de l'état du cluster et des `Pods` est **[Lens]**.

## Console du fournisseur de cloud (Cloud Provider Console)

Si vous utilisez un service Kubernetes géré offert par votre fournisseur de cloud, vous avez accès à une console Web qui peut vous montrer des informations utiles sur votre cluster, ses nœuds et ses charges de travail.

Vous pouvez également lister les nœuds, les services et les détails de configuration du cluster. Ce sont à peu près les mêmes informations que celles que vous pouvez obtenir en utilisant l'outil `kubectl`, mais les consoles cloud vous permettent également d'effectuer des tâches d'administration : créer des clusters, mettre à niveau des nœuds et tout ce dont vous avez besoin pour gérer votre cluster au quotidien.

## Tableau de bord Kubernetes (Kubernetes Dashboard)

Le [tableau de bord Kubernetes](https://kubernetes.io/docs/tasks/access-application-cluster/web-ui-dashboard/) est une interface utilisateur Web pour les clusters Kubernetes **(Lab 6)**. Si vous utilisez votre propre cluster Kubernetes plutôt qu'un service géré, vous pouvez exécuter le tableau de bord Kubernetes pour obtenir plus ou moins les mêmes informations qu'une console de service géré.

Comme on peut s'y attendre, le tableau de bord vous permet de voir l'état de vos clusters, nœuds et charges de travail, de la même manière que l'outil `kubectl`, mais avec une interface graphique. Vous pouvez également créer et supprimer des ressources à l'aide du tableau de bord.

Étant donné que le tableau de bord expose de nombreuses informations sur votre cluster et vos charges de travail, il est très important de le sécuriser correctement et de ne jamais l'exposer à l'internet public. Le tableau de bord vous permet de visualiser le contenu des `ConfigMaps` et des `Secrets`, qui peuvent contenir des informations d'identification et des clés de chiffrement. Vous devez donc contrôler l'accès au tableau de bord aussi étroitement que vous le feriez pour ces secrets eux-mêmes.

En 2018, la société de sécurité RedLock a trouvé [des centaines de consoles de tableau de bord Kubernetes](https://www.paloaltonetworks.com/blog/prisma-cloud/) accessibles sur Internet sans aucune protection par mot de passe, dont une appartenant à Tesla, Inc. À partir de celles-ci, ils ont pu extraire des informations d'identification de sécurité cloud et les utiliser pour accéder à d'autres informations sensibles.

## Meilleure pratique (Best Practice)

**Si vous n'avez pas à exécuter le tableau de bord Kubernetes (par exemple, si vous avez déjà une console Kubernetes fournie par un service géré tel que GKE), ne l'exécutez pas. Si vous l'exécutez, assurez-vous qu'il dispose de [privilèges minimum](https://blog.heptio.com/on-securing-the-kubernetes-dashboard-16b09b1b7aca?gi=9feddcb231b7) et ne l'exposez jamais à Internet. Accédez-y plutôt via `kubectl proxy`.**

## Weave Scope

[Weave Scope](https://github.com/weaveworks/scope) est un excellent outil de visualisation et de surveillance pour votre cluster, vous montrant une carte en temps réel de vos nœuds, conteneurs et processus. Vous pouvez également voir les métriques et les métadonnées, et même démarrer ou arrêter des conteneurs à l'aide de Scope.

## kube-ops-view

[kube-ops-view](https://codeberg.org/hjacobs/kube-ops-view) vous donne une visualisation de ce qui se passe dans votre cluster : quels sont les nœuds, l'utilisation du CPU et de la mémoire sur chacun d'eux, le nombre de pods que chacun exécute et l'état de ces pods. C'est un excellent moyen d'obtenir une vue d'ensemble de votre cluster et de ce qu'il fait.

## node-problem-detector
[node-problem-detector](https://github.com/kubernetes/node-problem-detector) est un module complémentaire Kubernetes qui peut détecter et signaler plusieurs types de problèmes au niveau des nœuds : problèmes matériels, tels que des erreurs de CPU ou de mémoire, corruption du système de fichiers et blocage des runtimes de conteneurs.

Actuellement, node-problem-detector signale les problèmes en envoyant des événements à l'API Kubernetes et est fourni avec une bibliothèque cliente Go que vous pouvez utiliser pour l'intégrer à vos propres outils.

Bien que Kubernetes ne prenne actuellement aucune mesure en réponse aux événements de node-problem-detector, une intégration plus poussée est envisageable à l'avenir, ce qui permettra au planificateur d'éviter d'exécuter des pods sur des nœuds problématiques, par exemple.

## Résumé (Summary)

La sécurité n'est pas un produit ou un objectif final, mais un processus continu qui exige des connaissances, de la réflexion et de l'attention. La sécurité des conteneurs n'est pas différente, et les mécanismes pour la garantir sont là pour que vous les utilisiez. Si vous avez lu et compris les informations contenues dans ce lab, vous savez tout ce qu'il faut savoir pour configurer vos conteneurs de manière sécurisée dans Kubernetes - mais nous sommes sûrs que vous comprenez que cela devrait être le début, et non la fin, de votre processus de sécurité.

Les principaux points à retenir :

*   RBAC permet une gestion fine des autorisations dans Kubernetes. Assurez-vous qu'il est activé et utilisez les rôles RBAC pour accorder aux utilisateurs et aux applications spécifiques uniquement les privilèges minimum dont ils ont besoin pour effectuer leur travail.
*   Les conteneurs ne sont pas magiquement exempts de problèmes de sécurité et de logiciels malveillants. Utilisez un outil d'analyse pour vérifier tous les conteneurs que vous exécutez en production.
*   L'utilisation de Kubernetes ne signifie pas que vous n'avez pas besoin de sauvegardes. Utilisez Velero pour sauvegarder vos données et l'état du cluster. C'est également pratique pour déplacer des éléments entre les clusters.
*   `kubectl` est un outil puissant pour inspecter et générer des rapports sur tous les aspects de votre cluster et de ses charges de travail. Familiarisez-vous avec `kubectl`. Vous passerez beaucoup de temps ensemble.
*   Utilisez la console Web de votre fournisseur Kubernetes et `kube-ops-view` pour une vue d'ensemble graphique de ce qui se passe. Si vous utilisez le tableau de bord Kubernetes, sécurisez-le aussi étroitement que vous le feriez pour vos informations d'identification cloud et vos clés de chiffrement.

