## LAB 5 - Managing Pods

> **Auteur** : Badr TAJINI - Cloud-native-DevOps-with-Kubernetes - ESIEE - 2024/2025

---


Dans le lab précédent, nous avons abordé les conteneurs en détail et expliqué comment, dans Kubernetes, les conteneurs sont assemblés pour former des `Pods`. Il y a quelques autres aspects intéressants des `Pods` que nous aborderons dans ce lab, notamment les étiquettes, le guidage de la planification des `Pods` à l'aide des affinités de nœuds, l'interdiction aux `Pods` de s'exécuter sur certains nœuds avec des *taints* et des *tolerations*, le maintien des `Pods` ensemble ou séparés à l'aide des affinités de `Pod`, et l'orchestration des applications à l'aide de contrôleurs de `Pod` tels que les `DaemonSets` et les `StatefulSets`. Nous aborderons également certaines fonctionnalités réseau avancées, notamment les contrôleurs `Ingress` et les outils de maillage de services (*service mesh*).

## Étiquettes (Labels)

Vous savez que des étiquettes peuvent être attachées aux `Pods` (et autres ressources Kubernetes) et qu'elles jouent un rôle important dans la connexion des ressources associées (par exemple, l'envoi de requêtes d'un `Service` aux backends appropriés). Examinons de plus près les étiquettes et les sélecteurs dans cette section.

## Que sont les étiquettes ?

> Les étiquettes sont des paires clé/valeur attachées à des objets, tels que les pods. Les étiquettes sont destinées à être utilisées pour spécifier des attributs d'identification des objets qui sont significatifs et pertinents pour les utilisateurs, mais n'impliquent pas directement de sémantique pour le système central.
>
> La documentation [Kubernetes](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/)

En d'autres termes, les étiquettes existent pour marquer les ressources avec des informations qui nous sont significatives, mais elles ne signifient rien pour Kubernetes. Par exemple, il est courant d'étiqueter les `Pods` avec l'application à laquelle ils appartiennent :

```yaml
apiVersion: v1
kind: Pod
metadata:
  labels:
    app: demo
```

Maintenant, en soi, cette étiquette n'a aucun effet. Elle est toujours utile comme documentation : quelqu'un peut regarder ce `Pod` et voir quelle application il exécute. Mais le véritable pouvoir d'une étiquette se manifeste lorsque nous l'utilisons avec un *sélecteur*.

## Sélecteurs (Selectors)

Un sélecteur est une expression qui correspond à une étiquette (ou un ensemble d'étiquettes). C'est un moyen de spécifier un groupe de ressources par leurs étiquettes. Par exemple, une ressource `Service` possède un sélecteur qui identifie les `Pods` auxquels elle enverra des requêtes. Vous vous souvenez de notre `Service` de démonstration de **[« Ressources de service »](Lab 2)** ?

```yaml
apiVersion: v1
kind: Service
...
spec:
  ...
  selector:
    app: demo
```

Il s'agit d'un sélecteur très simple qui correspond à toute ressource possédant l'étiquette `app` avec la valeur `demo`. Si une ressource ne possède pas du tout l'étiquette `app`, elle ne correspondra pas à ce sélecteur. Si elle possède l'étiquette `app`, mais que sa valeur n'est pas `demo`, elle ne correspondra pas non plus au sélecteur. Seules les ressources appropriées (dans ce cas, les `Pods`) avec l'étiquette `app: demo` correspondront, et toutes ces ressources seront sélectionnées par ce `Service`.

Les étiquettes ne sont pas seulement utilisées pour connecter les `Services` et les `Pods` ; vous pouvez les utiliser directement lors de l'interrogation du cluster avec `kubectl get`, en utilisant l'indicateur `--selector` :

```bash
kubectl get pods --all-namespaces --selector app=demo
NAMESPACE   NAME                    READY     STATUS    RESTARTS   AGE
demo        demo-5cb7d6bfdd-9dckm   1/1       Running   0          20s
```

Si vous souhaitez voir quelles étiquettes sont définies sur vos `Pods`, utilisez l'indicateur `--show-labels` pour `kubectl get` :

```bash
kubectl get pods --show-labels
NAME                    ... LABELS
demo-5cb7d6bfdd-9dckm   ... app=demo,environment=development
```

## Sélecteurs plus avancés

La plupart du temps, un sélecteur simple comme `app: demo` (appelé *sélecteur d'égalité*) suffira. Vous pouvez combiner différentes étiquettes pour créer des sélecteurs plus spécifiques :

```bash
kubectl get pods -l app=demo,environment=production
```

Cela ne renverra que les `Pods` qui ont à la fois les étiquettes `app: demo` et `environment: production`. L'équivalent YAML de ceci (dans un `Service`, par exemple) serait :

```yaml
selector:
  app: demo
  environment: production
```

Les sélecteurs d'égalité comme celui-ci sont les seuls disponibles avec un `Service`, mais pour les requêtes interactives avec `kubectl`, ou des ressources plus sophistiquées telles que les `Deployments`, il existe d'autres options.

L'une d'elles est la sélection pour l'*inégalité* des étiquettes :

```bash
kubectl get pods -l app!=demo
```

Cela renverra tous les `Pods` qui ont une étiquette `app` avec une valeur différente de `demo`, ou qui n'ont pas du tout d'étiquette `app`.

Vous pouvez également rechercher des valeurs d'étiquette qui se trouvent dans un *ensemble* :

```bash
kubectl get pods -l environment in (staging, production)
```

L'équivalent YAML serait :

```yaml
selector:
  matchExpressions:
  - {key: environment, operator: In, values: [staging, production]}
```

Vous pouvez également rechercher des valeurs d'étiquette qui ne se trouvent *pas* dans un ensemble donné :

```bash
kubectl get pods -l environment notin (production)
```

L'équivalent YAML de ceci serait :

```yaml
selector:
  matchExpressions:
  - {key: environment, operator: NotIn, values: [production]}
```

Vous pouvez voir un autre exemple d'utilisation de `matchExpressions` dans **[« Utilisation des affinités de nœuds pour contrôler la planification »](Lab 3)**.

## Autres utilisations des étiquettes

Nous avons vu comment lier les `Pods` aux `Services` à l'aide d'une étiquette `app` (en fait, vous pouvez utiliser n'importe quelle étiquette, mais `app` est courante). Mais quelles sont les autres utilisations des étiquettes ?

Dans notre chart Helm pour l'application de démonstration, nous définissons une étiquette `environment`, qui peut être, par exemple, `staging` ou `production`. Si vous exécutez des `Pods` de staging et de production dans le même cluster, vous pouvez utiliser une étiquette comme celle-ci pour distinguer les deux environnements. Par exemple, votre sélecteur de `Service` pour la production pourrait être :

```yaml
selector:
  app: demo
  environment: production
```

Sans le sélecteur `environment` supplémentaire, le `Service` correspondrait à tous les `Pods` avec `app: demo`, y compris ceux de staging, ce que vous ne voulez probablement pas.

En fonction de vos applications, vous pouvez utiliser des étiquettes pour découper vos ressources de différentes manières. Voici quelques exemples :

```yaml
metadata:
  labels:
    app: demo
    tier: frontend
    environment: production
    version: v1.12.0
    role: primary
```

Cela vous permet d'interroger le cluster selon ces différentes dimensions pour voir ce qui se passe.

Vous pouvez également utiliser des étiquettes pour effectuer des déploiements canary. Si vous souhaitez déployer une nouvelle version de l'application sur un petit pourcentage de `Pods` uniquement, vous pouvez utiliser des étiquettes comme `track: stable` et `track: canary` pour deux `Deployments` distincts.

Si le sélecteur de votre `Service` ne correspond qu'à l'étiquette `app`, il enverra du trafic à tous les `Pods` correspondant à ce sélecteur, y compris les `Pods` `stable` et `canary`. Vous pouvez modifier le nombre de répliques pour les deux `Deployments` afin d'augmenter progressivement la proportion de `Pods` `canary`. Une fois que tous les `Pods` en cours d'exécution sont sur la voie canary, vous pouvez les réétiqueter comme `stable` et recommencer le processus avec la version suivante.

## Étiquettes et annotations

Vous vous demandez peut-être quelle est la différence entre les étiquettes et les annotations. Ce sont toutes deux des paires clé/valeur qui fournissent des métadonnées sur les ressources.

La différence est que les *étiquettes identifient les ressources*. Elles sont utilisées pour sélectionner des groupes de ressources associées, comme dans le sélecteur d'un `Service`. Les annotations, en revanche, sont destinées aux informations *non identifiantes*, à utiliser par des outils ou des services extérieurs à Kubernetes. 

Comme les étiquettes sont souvent utilisées dans les requêtes internes critiques pour les performances de Kubernetes, il existe des restrictions assez strictes sur les étiquettes valides. Par exemple, les noms d'étiquettes sont limités à 63 caractères, bien qu'ils puissent avoir un préfixe facultatif de 253 caractères sous la forme d'un sous-domaine DNS, séparé de l'étiquette par une barre oblique. Les étiquettes ne peuvent commencer que par un caractère alphanumérique (une lettre ou un chiffre) et ne peuvent contenir que des caractères alphanumériques, des tirets, des traits de soulignement et des points. Les valeurs d'étiquette sont [soumises à des restrictions similaires](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/#syntax-and-character-set).

En pratique, il est peu probable que vous manquiez de caractères pour vos étiquettes, car la plupart des étiquettes couramment utilisées ne sont qu'un seul mot (par exemple, `app`).

## Affinités de nœuds (Node Affinities)

Nous avons brièvement mentionné les affinités de nœuds dans **[« Utilisation des affinités de nœuds pour contrôler la planification »](Lab 3)**, en relation avec les nœuds préemptifs. Dans cette section, vous avez appris à utiliser les affinités de nœuds pour planifier préférentiellement les `Pods` sur certains nœuds (ou non). Examinons maintenant plus en détail les affinités de nœuds.

Dans la plupart des cas, vous n'avez pas besoin d'affinités de nœuds. Kubernetes est assez intelligent pour planifier les `Pods` sur les nœuds appropriés. Si tous vos nœuds sont également adaptés pour exécuter un `Pod` donné, ne vous en souciez pas.

Il existe cependant des exceptions (comme les nœuds préemptifs dans l'exemple précédent). Si un `Pod` est coûteux à redémarrer, vous voulez probablement éviter de le planifier sur un nœud préemptif dans la mesure du possible ; les nœuds préemptifs peuvent disparaître du cluster sans avertissement. Vous pouvez exprimer ce type de préférence à l'aide des affinités de nœuds.

Il existe deux types d'affinité : dure et douce, et dans Kubernetes, elles sont appelées :

*   `requiredDuringSchedulingIgnoredDuringExecution` (dure)
*   `preferredDuringSchedulingIgnoredDuringExecution` (douce)

Il peut être utile de se rappeler que `required` signifie une affinité *dure* (la règle *doit* être satisfaite pour planifier ce `Pod`) et `preferred` signifie une affinité *douce* (il serait *bien* que la règle soit satisfaite, mais ce n'est pas critique).

**Astuce**

Les noms longs des types d'affinité dure et douce soulignent le fait que ces règles s'appliquent *pendant la planification*, mais pas *pendant l'exécution*. Autrement dit, une fois que le `Pod` a été planifié sur un nœud particulier satisfaisant l'affinité, il y restera. Si les choses changent pendant que le `Pod` est en cours d'exécution de sorte que la règle n'est plus satisfaite, Kubernetes ne déplacera pas le `Pod`.

## Affinités dures (Hard Affinities)

Une affinité est exprimée en décrivant le type de nœuds sur lesquels vous souhaitez que le `Pod` s'exécute. Il peut y avoir plusieurs règles sur la façon dont vous souhaitez que Kubernetes sélectionne les nœuds pour le `Pod`. Chacune est exprimée à l'aide du champ `nodeSelectorTerms`. Voici un exemple :

```yaml
apiVersion: v1
kind: Pod
...
spec:
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: "topology.kubernetes.io/zone"
            operator: In
            values: ["us-central1-a"]
```

Seuls les nœuds qui se trouvent dans la zone `us-central1-a` correspondront à cette règle. L'effet global est donc de garantir que ce `Pod` n'est planifié que dans cette zone.

## Affinités douces (Soft Affinities)

Les affinités douces sont exprimées de la même manière, sauf que chaque règle se voit attribuer un *poids* numérique de 1 à 100 qui détermine son effet sur le résultat. Voici un exemple :

```yaml
preferredDuringSchedulingIgnoredDuringExecution:
- weight: 10
  preference:
    matchExpressions:
    - key: "topology.kubernetes.io/zone"
      operator: In
      values: ["us-central1-a"]
- weight: 100
  preference:
    matchExpressions:
    - key: "topology.kubernetes.io/zone"
      operator: In
      values: ["us-central1-b"]
```

Comme il s'agit d'une règle `preferred...`, il s'agit d'une affinité douce : Kubernetes peut planifier le `Pod` sur n'importe quel nœud, mais il donnera la priorité aux nœuds qui correspondent à ces règles.

Vous pouvez voir que les deux règles ont des valeurs de `weight` différentes. La première règle a un poids de 10, mais la seconde a un poids de 100. S'il existe des nœuds qui correspondent aux deux règles, Kubernetes accordera 10 fois plus de priorité aux nœuds qui correspondent à la seconde règle (étant dans la zone de disponibilité `us-central1-b`).

Les poids sont un moyen utile d'exprimer l'importance relative de vos préférences.

## Affinités et anti-affinités de `Pod` (Pod Affinities and Anti-Affinities)

Nous avons vu comment utiliser les affinités de nœuds pour inciter le planificateur à exécuter (ou non) un `Pod` sur certains types de nœuds. Mais est-il possible d'influencer les décisions de planification en fonction des autres `Pods` déjà en cours d'exécution sur un nœud ?

Parfois, certaines paires de `Pods` fonctionnent mieux lorsqu'elles sont ensemble sur le même nœud ; par exemple, un serveur Web et un cache de contenu, tel que Redis. Il serait utile de pouvoir ajouter des informations à la spécification du `Pod` pour indiquer au planificateur qu'il est préférable de le colocaliser avec un `Pod` correspondant à un ensemble d'étiquettes particulier.

Inversement, il est parfois souhaitable que les `Pods` s'évitent. Dans **[« Maintenir l'équilibre de vos charges de travail »](Lab 3)**, nous avons vu le type de problèmes qui peuvent survenir si les répliques de `Pod` se retrouvent ensemble sur le même nœud, au lieu d'être réparties sur le cluster. Pouvez-vous dire au planificateur d'éviter de planifier un `Pod` lorsqu'une autre réplique de ce `Pod` est déjà en cours d'exécution ?

C'est exactement ce que vous pouvez faire avec les affinités de `Pod`. Comme les affinités de nœuds, les affinités de `Pod` sont exprimées sous forme d'un ensemble de règles : soit des exigences strictes, soit des préférences souples avec un ensemble de poids.

## Maintenir les `Pods` ensemble (Keeping Pods Together)

Prenons d'abord le premier cas : planifier les `Pods` ensemble. Supposons que vous ayez un `Pod` étiqueté `app: server`, qui est votre serveur Web, et un autre, étiqueté `app: cache`, qui est votre cache de contenu. Ils peuvent toujours fonctionner ensemble même s'ils sont sur des nœuds distincts, mais il est préférable qu'ils soient sur le même nœud car ils peuvent communiquer sans avoir à passer par le réseau. Comment demander au planificateur de les colocaliser ?

Voici un exemple d'affinité de `Pod` requise, exprimée dans le cadre de la spécification du `Pod` serveur. L'effet serait le même si vous l'ajoutiez à la spécification du cache, ou aux deux `Pods` :

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: server
  labels:
    app: server
...
spec:
  affinity:
    podAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        - labelSelector:
            matchExpressions:
            - key: app
              operator: In
              values: ["cache"]
          topologyKey: kubernetes.io/hostname
```

L'effet global de cette affinité est de garantir que le `Pod` serveur est planifié, si possible, sur un nœud qui exécute également un `Pod` étiqueté `cache`. S'il n'existe pas de tel nœud, ou s'il n'y a pas de nœud correspondant disposant de suffisamment de ressources libres pour exécuter le `Pod`, il ne pourra pas s'exécuter.

Ce n'est probablement pas le comportement souhaité dans une situation réelle. Si les deux `Pods` doivent absolument être colocalisés, placez leurs conteneurs dans le même `Pod`. S'il est simplement préférable qu'ils soient colocalisés, utilisez une affinité de `Pod` douce (`preferredDuringSchedulingIgnoredDuringExecution`).

## Maintenir les `Pods` séparés (Keeping Pods Apart)

Prenons maintenant le cas de l'anti-affinité : maintenir certains `Pods` séparés. Au lieu de `podAffinity`, nous utilisons `podAntiAffinity` :

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: server
  labels:
    app: server
...
spec:
  affinity:
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        - labelSelector:
            matchExpressions:
            - key: app
              operator: In
              values: ["server"]
          topologyKey: kubernetes.io/hostname
```

C'est très similaire à l'exemple précédent, sauf qu'il s'agit d'une `podAntiAffinity`, donc elle exprime le sens opposé, et l'expression de correspondance est différente. Cette fois, l'expression est : « L'étiquette `app` doit avoir la valeur `server`. »

L'effet de cette affinité est de garantir que le `Pod` ne sera *pas* planifié sur un nœud correspondant à cette règle. En d'autres termes, aucun `Pod` étiqueté `app: server` ne peut être planifié sur un nœud qui exécute déjà un `Pod` `app: server`. Cela garantira une répartition uniforme des `Pods` serveur sur le cluster, au détriment éventuel du nombre de répliques souhaité.

## Anti-affinités douces (Soft Anti-Affinities)

Cependant, nous nous soucions généralement davantage d'avoir suffisamment de répliques disponibles que de les répartir le plus équitablement possible. Une règle stricte n'est pas vraiment ce que nous voulons ici. Modifions-la légèrement pour en faire une anti-affinité douce :

```yaml
affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
    - weight: 1
      podAffinityTerm:
        labelSelector:
          matchExpressions:
          - key: app
            operator: In
            values: ["server"]
        topologyKey: kubernetes.io/hostname
```

Notez que la règle est maintenant `preferred...`, et non `required...`, ce qui en fait une anti-affinité douce. Si la règle peut être satisfaite, elle le sera, mais sinon, Kubernetes planifiera le `Pod` quand même.

Comme il s'agit d'une préférence, nous spécifions une valeur de `weight`, comme nous l'avons fait pour les affinités de nœuds douces. S'il y avait plusieurs règles d'affinité à prendre en compte, Kubernetes les hiérarchiserait en fonction du poids que vous attribuez à chaque règle.

## Quand utiliser les affinités de `Pod` (When to Use Pod Affinities)

Comme pour les affinités de nœuds, vous devez considérer les affinités de `Pod` comme une amélioration pour les cas particuliers. Le planificateur est déjà efficace pour placer les `Pods` afin d'obtenir les meilleures performances et la meilleure disponibilité du cluster. Les affinités de `Pod` restreignent la liberté du planificateur, échangeant une application contre une autre.

## Taints et Tolerations

Dans **[« Affinités de nœuds »](Lab 5)**, vous avez découvert une propriété des `Pods` qui peut les diriger vers (ou les éloigner de) un ensemble de nœuds. Inversement, les *taints* permettent à un nœud de repousser un ensemble de `Pods`, en fonction de certaines propriétés du nœud.

Par exemple, vous pouvez utiliser des taints pour réserver des nœuds particuliers : des nœuds réservés uniquement à des types spécifiques de `Pods`. Kubernetes crée également des taints pour vous si certains problèmes existent sur le nœud, tels qu'une mémoire insuffisante ou un manque de connectivité réseau.

Pour ajouter une taint à un nœud particulier, utilisez la commande `kubectl taint` :

```bash
kubectl taint nodes docker-for-desktop dedicated=true:NoSchedule
```

Cela ajoute une taint appelée `dedicated=true` au nœud `docker-for-desktop`, avec l'effet `NoSchedule` : aucun `Pod` ne peut désormais y être planifié à moins qu'il n'ait une *toleration* correspondante.

Pour voir les taints configurées sur un nœud particulier, utilisez `kubectl describe node...`.

Pour supprimer une taint d'un nœud, répétez la commande `kubectl taint` mais avec un signe moins final après le nom de la taint :

```bash
kubectl taint nodes docker-for-desktop dedicated:NoSchedule-
```

Les tolerations sont des propriétés des `Pods` qui décrivent les taints avec lesquelles ils sont compatibles. Par exemple, pour qu'un `Pod` tolère la taint `dedicated=true`, ajoutez ceci à la spécification du `Pod` :

```yaml
apiVersion: v1
kind: Pod
...
spec:
  tolerations:
  - key: "dedicated"
    operator: "Equal"
    value: "true"
    effect: "NoSchedule"
```

Cela revient à dire : « Ce `Pod` est autorisé à s'exécuter sur des nœuds qui ont la taint `dedicated=true` avec l'effet `NoSchedule`. » Parce que la toleration *correspond* à la taint, le `Pod` peut être planifié. Tout `Pod` sans cette toleration ne sera pas autorisé à s'exécuter sur le nœud tainted.

Lorsqu'un `Pod` ne peut pas du tout s'exécuter à cause de nœuds tainted, il restera dans l'état `Pending`, et vous verrez un message comme celui-ci dans la description du `Pod` :

```yaml
Warning  FailedScheduling  4s (x10 over 2m)  default-scheduler  0/1 nodes are available: 1 node(s) had taints that the pod didn't tolerate.
```

D'autres utilisations des taints et des tolerations incluent le marquage des nœuds avec du matériel spécialisé (tel que des GPU) et la possibilité pour certains `Pods` de tolérer certains types de problèmes de nœud.

Par exemple, si un nœud perd sa connexion réseau, Kubernetes ajoute automatiquement la taint `node.kubernetes.io/unreachable`. Normalement, cela entraînerait l'expulsion de tous les `Pods` du nœud par son kubelet. Cependant, vous souhaiterez peut-être que certains `Pods` continuent de fonctionner, dans l'espoir que le réseau reviendra dans un délai raisonnable. Pour ce faire, vous pouvez ajouter une toleration à ces `Pods` qui correspond à la taint `unreachable`.

Vous pouvez en savoir plus sur les taints et les tolerations dans la documentation [Kubernetes](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/).

## Contrôleurs de `Pod` (Pod Controllers)

Nous avons beaucoup parlé des `Pods` dans ce lab, et c'est logique : toutes les applications Kubernetes s'exécutent dans un `Pod`. Vous vous demandez peut-être, cependant, pourquoi nous avons besoin d'autres types d'objets. Ne suffit-il pas de créer un `Pod` pour une application et de l'exécuter ?

C'est effectivement ce que vous obtenez en exécutant un conteneur directement avec `docker container run`, comme nous l'avons fait dans **[« Exécution d'une image de conteneur »]](Lab 1)**. Cela fonctionne, mais c'est très limité :

*   Si le conteneur se termine pour une raison quelconque, vous devez le redémarrer manuellement.
*   Il n'y a qu'une seule réplique de votre conteneur et aucun moyen de répartir le trafic entre plusieurs répliques si vous les exécutez manuellement.
*   Si vous souhaitez des répliques hautement disponibles, vous devez décider sur quels nœuds les exécuter et veiller à maintenir l'équilibre du cluster.
*   Lorsque vous mettez à jour le conteneur, vous devez vous charger d'arrêter chaque image en cours d'exécution à tour de rôle, d'extraire la nouvelle image et de la redémarrer.

C'est le genre de travail que Kubernetes est conçu pour vous éviter grâce aux *contrôleurs*. Dans **[« ReplicaSets »]](Lab 2)**, nous avons présenté le contrôleur `ReplicaSet`, qui gère un groupe de répliques d'un `Pod` particulier. Il travaille en permanence pour s'assurer qu'il y a toujours le nombre spécifié de répliques, en démarrant de nouvelles si elles ne sont pas suffisantes et en supprimant des répliques s'il y en a trop.

Vous connaissez également maintenant les `Deployments`, qui, comme nous l'avons vu dans **[« Déploiements »](Lab 2)**, gèrent les `ReplicaSets` pour contrôler le déploiement des mises à jour des applications. Lorsque vous mettez à jour un `Deployment` (par exemple, avec une nouvelle spécification de conteneur), il crée un nouveau `ReplicaSet` pour démarrer les nouveaux `Pods` et finit par fermer le `ReplicaSet` qui gérait les anciens `Pods`.

Pour la plupart des applications simples, un `Deployment` est tout ce dont vous avez besoin. Mais il existe quelques autres types de contrôleurs de `Pod` utiles, et nous en examinerons brièvement quelques-uns dans cette section.

## `DaemonSets`

Supposons que vous souhaitiez envoyer les journaux de toutes vos applications à un serveur de journaux centralisé, comme une pile Elasticsearch-Logstash-Kibana (ELK), ou un produit de surveillance SaaS tel que Datadog. Il y a plusieurs façons de le faire.

Vous pouvez inclure dans chaque application du code pour se connecter au service de journalisation, s'authentifier, écrire des journaux, etc., mais cela entraîne beaucoup de code dupliqué, ce qui est inefficace.

Vous pouvez également exécuter un conteneur supplémentaire dans chaque `Pod` qui agit comme un agent de journalisation (c'est ce qu'on appelle un modèle *sidecar*). Cela signifie que l'application n'a pas besoin de connaître la façon de communiquer avec le service de journalisation, mais cela signifie également que vous pourriez potentiellement avoir plusieurs copies du même agent de journalisation en cours d'exécution sur un nœud.

Comme tout ce qu'il fait est de gérer une connexion au service de journalisation et de lui transmettre des messages de journal, vous n'avez réellement besoin que d'une seule copie de l'agent de journalisation sur chaque nœud. Il s'agit d'une exigence si courante que Kubernetes fournit un objet contrôleur spécial pour cela : le `DaemonSet`.

**Astuce**

Le terme *daemon* fait traditionnellement référence aux processus d'arrière-plan à exécution longue sur un serveur qui gèrent des choses comme la journalisation. Par analogie, les `DaemonSets` Kubernetes exécutent un conteneur *daemon* sur chaque nœud du cluster.

Le manifeste pour un `DaemonSet`, comme vous pouvez vous y attendre, ressemble beaucoup à celui d'un `Deployment` :

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluentd-elasticsearch
  ...
spec:
  ...
  template:
    ...
    spec:
      containers:
      - name: fluentd-elasticsearch
        ...
```

Utilisez un `DaemonSet` lorsque vous devez exécuter une copie d'un `Pod` sur chacun des nœuds de votre cluster. Si vous exécutez une application où le maintien d'un nombre donné de répliques est plus important que le nœud exact sur lequel les `Pods` s'exécutent, utilisez plutôt un `Deployment`.

## `StatefulSets`

Comme un `Deployment` ou un `DaemonSet`, un `StatefulSet` est un type de contrôleur de `Pod`. Ce qu'un `StatefulSet` ajoute est la possibilité de démarrer et d'arrêter les `Pods` dans une séquence spécifique.

Avec un `Deployment`, par exemple, tous vos `Pods` sont démarrés et arrêtés dans un ordre aléatoire. Cela convient aux services sans état, où chaque réplique est identique et effectue le même travail.

Parfois, cependant, vous devez démarrer les `Pods` dans une séquence numérotée spécifique et pouvoir les identifier par leur numéro. Par exemple, les applications distribuées telles que Redis, MongoDB ou Cassandra créent leurs propres clusters et doivent pouvoir identifier le leader du cluster par un nom prévisible.

Un `StatefulSet` est idéal pour cela. Par exemple, si vous créez un `StatefulSet` nommé `redis`, le premier `Pod` démarré sera nommé `redis-0`, et Kubernetes attendra que ce `Pod` soit prêt avant de démarrer le suivant, `redis-1`.

Selon l'application, vous pouvez utiliser cette propriété pour mettre en cluster les `Pods` de manière fiable. Par exemple, chaque `Pod` peut exécuter un script de démarrage qui vérifie s'il s'exécute sur `redis-0`. Si c'est le cas, il sera le leader du cluster redis. Sinon, il tentera de rejoindre le cluster en tant que réplique en contactant `redis-0`.

Chaque réplique d'un `StatefulSet` doit être en cours d'exécution et prête avant que Kubernetes ne démarre la suivante, et de même, lorsque le `StatefulSet` est terminé, les répliques seront arrêtées dans l'ordre inverse, en attendant que chaque `Pod` se termine avant de passer au suivant.

Outre ces propriétés spéciales, un `StatefulSet` ressemble beaucoup à un `Deployment` normal :

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
spec:
  selector:
    matchLabels:
      app: redis
  serviceName: "redis"
  replicas: 3
  template:
    ...
```

Pour pouvoir adresser chacun des `Pods` par un nom DNS prévisible, tel que `redis-1`, vous devez également créer un `Service` avec un `clusterIP` de type `None` (appelé *service headless*).

Avec un service non headless, vous obtenez une seule entrée DNS (telle que `redis`) qui équilibre la charge entre tous les `Pods` backend. Avec un service headless, vous obtenez toujours ce nom DNS de service unique, mais vous obtenez également des entrées DNS individuelles pour chaque `Pod` numéroté, comme `redis-0`, `redis-1`, `redis-2`, etc.

Les `Pods` qui doivent rejoindre le cluster Redis peuvent contacter `redis-0` spécifiquement, mais les applications qui ont simplement besoin d'un service Redis avec équilibrage de charge peuvent utiliser le nom DNS `redis` pour communiquer avec un `Pod` Redis sélectionné au hasard.

Les `StatefulSets` peuvent également gérer le stockage sur disque pour leurs `Pods`, en utilisant un objet `VolumeClaimTemplate` qui crée automatiquement un `PersistentVolumeClaim` (voir [« Volumes persistants »](Lab 4)**).

## Jobs

Un autre type de contrôleur de `Pod` utile dans Kubernetes est le `Job`. Alors qu'un `Deployment` exécute un nombre spécifié de `Pods` et les redémarre continuellement, un `Job` n'exécute un `Pod` qu'un nombre de fois spécifié. Après cela, il est considéré comme terminé.

Par exemple, une tâche de traitement par lots ou un `Pod` worker de file d'attente démarre généralement, effectue son travail, puis se termine. C'est un candidat idéal pour être géré par un `Job`.

Il y a deux champs qui contrôlent l'exécution du `Job` : `completions` et `parallelism`. Le premier, `completions`, détermine le nombre de fois que le `Pod` spécifié doit s'exécuter avec succès avant que le `Job` ne soit considéré comme terminé. La valeur par défaut est 1, ce qui signifie que le `Pod` s'exécutera une fois.

Le champ `parallelism` spécifie le nombre de `Pods` qui doivent s'exécuter simultanément. Encore une fois, la valeur par défaut est 1, ce qui signifie qu'un seul `Pod` s'exécutera à la fois.

Par exemple, supposons que vous souhaitiez exécuter un `Job` worker de file d'attente dont le but est de consommer des éléments de travail d'une file d'attente. Vous pouvez définir `parallelism` sur 10 et laisser `completions` non défini. Cela démarrera 10 `Pods`, chacun continuant à consommer du travail de la file d'attente jusqu'à ce qu'il n'y ait plus de travail à faire, puis se terminera, auquel cas le `Job` sera terminé :

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: queue-worker
spec:
  parallelism: 10
  completions: 10  # Spécifiez completions pour que le Job se termine après 10 exécutions réussies.
  template:
    metadata:
      name: queue-worker
    spec:
      containers:
        ...
```

**Important:** Dans l'exemple précédent, j'ai ajouté `completions: 10`. Si vous laissez `completions` non défini avec un `parallelism` > 1, le `Job` ne se terminera jamais car il continuera à créer des pods indéfiniment. Pour un `Job` qui doit se terminer, vous devez *toujours* définir `completions`.

Alternativement, si vous souhaitez exécuter une seule tâche ponctuelle, vous pouvez laisser `completions` et `parallelism` à 1. Cela démarrera une copie du `Pod` et attendra qu'elle se termine avec succès. S'il plante, échoue ou se termine de manière incorrecte, le `Job` le redémarrera, tout comme un `Deployment`. Seules les terminaisons réussies sont prises en compte dans le nombre requis de `completions`.

Comment démarrer un `Job` ? Vous pouvez le faire manuellement, en appliquant un manifeste de `Job` à l'aide de `kubectl` ou de Helm. Alternativement, un `Job` peut être déclenché par l'automatisation ; votre pipeline de déploiement continu, par exemple (voir **(Lab 7)**).

Lorsque votre `Job` est terminé, si vous souhaitez que Kubernetes nettoie automatiquement après lui-même, vous pouvez utiliser le paramètre `ttlSecondsAfterFinished`. Une fois le nombre de secondes spécifié écoulé après la fin du `Job`, il sera automatiquement supprimé. Vous pouvez également définir `ttlSecondsAfterFinished` sur `0`, ce qui signifie que votre `Job` sera supprimé dès qu'il sera terminé.

Lorsque vous devez exécuter un `Job` périodiquement, à une heure donnée de la journée ou à un intervalle donné, Kubernetes dispose également d'un objet `CronJob`.

## `CronJobs`

Dans les environnements Unix, les tâches planifiées sont exécutées par le démon `cron` (dont le nom vient du mot grec χρόνος, qui signifie « temps »). En conséquence, elles sont connues sous le nom de *CronJobs*, et l'objet `CronJob` de Kubernetes fait exactement la même chose.

Un `CronJob` ressemble à ceci :

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: demo-cron
spec:
  schedule: "*/1 * * * *"
  jobTemplate:
    spec:
      containers:
      ...
```

Les deux champs importants à examiner dans le manifeste `CronJob` sont `spec.schedule` et `spec.jobTemplate`. Le champ `schedule` spécifie quand la tâche sera exécutée, en utilisant le même [format](https://en.wikipedia.org/wiki/Cron) que l'utilitaire `cron` d'Unix. **Notez que l'API version est `batch/v1beta1` et qu'il y a un champ `template` imbriqué supplémentaire dans la `spec` pour les versions récentes de Kubernetes. Assurez-vous d'inclure `restartPolicy: OnFailure` dans le template du `Job` pour éviter les redémarrages infinis en cas d'échec.**

Le champ `jobTemplate` spécifie le modèle pour le `Job` qui doit être exécuté et est exactement le même qu'un manifeste de `Job` normal (voir **[« Jobs »](Lab 5)**.

## `Horizontal Pod Autoscalers` (HPA)

N'oubliez pas qu'un contrôleur `Deployment` maintient un nombre spécifié de répliques de `Pod`. Si une réplique échoue, une autre sera démarrée pour la remplacer afin d'atteindre le nombre cible de répliques.

Le nombre de répliques souhaité est défini dans le manifeste `Deployment`, et nous avons vu que vous pouvez l'ajuster pour augmenter le nombre de `Pods` en cas de trafic important, ou le réduire pour réduire l'échelle du `Deployment` s'il y a des `Pods` inactifs.

Mais que se passerait-il si Kubernetes pouvait ajuster automatiquement le nombre de répliques pour vous, en réponse à une demande accrue ? C'est exactement ce que fait le [Horizontal Pod Autoscaler](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/). (La mise à l'échelle *horizontale* fait référence à l'ajustement du nombre de répliques d'un service, contrairement à la mise à l'échelle *verticale*, qui augmente ou diminue la taille des répliques individuelles en termes de CPU ou de mémoire.)

Un Horizontal Pod Autoscaler (HPA) surveille un `Deployment` spécifié, en surveillant constamment une métrique donnée pour voir s'il doit augmenter ou réduire le nombre de répliques.

L'une des métriques de mise à l'échelle automatique les plus courantes est l'utilisation du CPU. Rappelez-vous de **[« Demandes de ressources »](Lab 3)** que les `Pods` peuvent demander une certaine quantité de ressources CPU ; par exemple, 500 millicpus. Au fur et à mesure que le `Pod` s'exécute, son utilisation du CPU fluctuera, ce qui signifie qu'à un moment donné, le `Pod` utilise en fait un certain pourcentage de sa demande de CPU initiale.

Vous pouvez mettre à l'échelle automatiquement le `Deployment` en fonction de cette valeur : par exemple, vous pouvez créer un HPA qui cible une utilisation du CPU de 80 % pour les `Pods`. Si l'utilisation moyenne du CPU sur tous les `Pods` du `Deployment` n'est que de 70 % de la quantité demandée, le HPA réduira l'échelle en diminuant le nombre cible de répliques. Si les `Pods` ne travaillent pas très dur, nous n'en avons pas besoin d'autant et le HPA peut les réduire.

D'un autre côté, si l'utilisation moyenne du CPU est de 90 %, cela dépasse la cible de 80 %, nous devons donc ajouter plus de répliques jusqu'à ce que l'utilisation moyenne du CPU diminue. Le HPA modifiera le `Deployment` pour augmenter le nombre cible de répliques.

Chaque fois que le HPA détermine qu'il doit effectuer une opération de mise à l'échelle, il ajuste les répliques d'une quantité différente, en fonction du rapport entre la valeur réelle de la métrique et la cible. Si le `Deployment` est très proche de l'utilisation cible du CPU, le HPA n'ajoutera ou ne supprimera qu'un petit nombre de répliques ; mais s'il est complètement hors d'échelle, le HPA l'ajustera d'un nombre plus important.

Le HPA utilise un autre projet Kubernetes populaire appelé Metrics Server pour obtenir les données dont il a besoin pour prendre des décisions de mise à l'échelle automatique. Vous pouvez l'installer en suivant les instructions du référentiel [metrics-server](https://github.com/kubernetes-sigs/metrics-server).

Voici un exemple de HPA basé sur l'utilisation du CPU :

```yaml
apiVersion: autoscaling/v2beta2
kind: HorizontalPodAutoscaler
metadata:
  name: demo-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: demo
  minReplicas: 1
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 80
```

Les champs intéressants ici sont :

*   `spec.scaleTargetRef` spécifie le `Deployment` à mettre à l'échelle
*   `spec.minReplicas` et `spec.maxReplicas` spécifient les limites de la mise à l'échelle
*   `spec.metrics` détermine les métriques qui seront utilisées pour la mise à l'échelle

Bien que l'utilisation du CPU soit la métrique de mise à l'échelle la plus courante, vous pouvez utiliser toutes les métriques disponibles pour Kubernetes, y compris les *métriques système* intégrées telles que l'utilisation du CPU et de la mémoire, ainsi que les *métriques de service* spécifiques à l'application, que vous définissez et exportez depuis votre application. Par exemple, vous pouvez mettre à l'échelle en fonction du taux d'erreur de l'application ou du nombre de requêtes entrantes par seconde.

Vous pouvez en savoir plus sur les autoscalers et les métriques personnalisées dans la documentation [Kubernetes](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/).

### Mise à l'échelle automatique selon un horaire connu (Autoscaling on a known schedule)

Le `HorizontalPodAutoscaler`, lorsqu'il est combiné avec un `CronJob`, peut être utile dans les cas où les modèles de trafic de votre application sont prévisibles en fonction de l'heure de la journée. Si vous savez, par exemple, que vous avez absolument besoin de 20 `Pods` opérationnels avant 8 heures du matin pour un afflux important de requêtes qui arrivent toujours au début de votre journée de travail, vous pouvez créer un `CronJob` qui exécute la commande `kubectl` avec un compte de service interne (voir **[« Comptes de service de Pod »](Lab 4)**) pour la mise à l'échelle juste avant cette heure :

```yaml
apiVersion: batch/v1
kind: CronJob
...
args:
  - "kubectl patch hpa service-hpa --patch '{\"spec\":{\"minReplicas\":20}}'"
...
```

**Note:** J'ai corrigé le format du patch JSON dans l'argument `kubectl` en utilisant des guillemets simples englobant le JSON avec des guillemets doubles à l'intérieur.

Vous pouvez ensuite créer un `CronJob` similaire à la fin de votre journée de travail pour réduire à nouveau le nombre minimal de répliques (`minReplicas`). Lorsqu'elle est combinée à la mise à l'échelle automatique du cluster, vous pouvez utiliser cette astuce pour économiser sur vos coûts de calcul totaux.

L'utilisation du HPA simple sans cron peut convenir à vos cas d'utilisation, mais n'oubliez pas que la mise à l'échelle de nouveaux nœuds et `Pods` ne se produit pas instantanément. Dans les cas où vous savez déjà que vous aurez besoin d'une certaine capacité pour gérer un pic de charge à venir, l'ajout d'un `CronJob` peut vous aider à garantir que tout est opérationnel au début du pic.

## Opérateurs et définitions de ressources personnalisées (CRD) (Operators and Custom Resource Definitions (CRDs))

Nous avons vu dans **[« StatefulSets »](Lab 5)** que, si les objets Kubernetes standard tels que `Deployment` et `Service` conviennent aux applications simples et sans état, ils ont leurs limites. Certaines applications nécessitent plusieurs `Pods` collaboratifs qui doivent être initialisés dans un ordre particulier (par exemple, des bases de données répliquées ou des services en cluster).

Pour les applications qui nécessitent une gestion plus complexe ou des types de ressources complexes, Kubernetes vous permet de créer vos propres nouveaux types d'objets. Ceux-ci sont appelés *Custom Resource Definitions* (CRD). Par exemple, l'outil de sauvegarde Velero crée et utilise de nouveaux objets Kubernetes personnalisés qu'il appelle `Configs` et `Backups` (voir **[« Velero »](Lab 6)**.

Kubernetes est conçu pour être extensible, et vous êtes libre de définir et de créer n'importe quel type d'objet que vous souhaitez, en utilisant le mécanisme CRD. Certains CRD existent juste pour stocker des données, comme l'objet Velero `BackupStorageLocation`. Mais vous pouvez aller plus loin et créer des objets qui agissent comme des contrôleurs de `Pod`, tout comme un `Deployment` ou un `StatefulSet`.

Par exemple, si vous vouliez créer un objet contrôleur qui configure des clusters de bases de données MySQL répliqués et hautement disponibles dans Kubernetes, comment procéderiez-vous ?

La première étape consisterait à créer un CRD pour votre objet contrôleur personnalisé. Afin de le faire fonctionner, vous devez ensuite écrire un programme qui communique avec l'API Kubernetes. Un tel programme est appelé un *Opérateur* (peut-être parce qu'il automatise les types d'actions qu'un opérateur humain pourrait effectuer).

Vous pouvez voir de nombreux exemples d'opérateurs créés et maintenus par la communauté sur le site [OperatorHub.io](https://operatorhub.io/). Il s'agit d'un référentiel de centaines d'opérateurs que vous pouvez installer sur vos clusters, ou simplement parcourir leur code pour obtenir des idées pour la création de vos propres opérateurs.

## `Ingress`

Alors que les `Services` (voir **[« Ressources de service »](Lab 2)** sont destinés au routage du trafic *interne* dans votre cluster (par exemple, d'un microservice à un autre), `Ingress` est utilisé pour router le trafic *externe* vers votre cluster et vers le microservice approprié. Vous pouvez considérer le concept d'`Ingress` comme un équilibreur de charge qui fonctionne en coordination avec un `Service` pour acheminer les requêtes des clients externes vers les `Pods` corrects en fonction de leurs sélecteurs d'étiquettes. Tout cela se produit à l'aide d'un contrôleur `Ingress`, que nous aborderons sous peu. Pour l'instant, voyons à quoi ressemble une ressource `Ingress` typique pour exposer vos applications en dehors du cluster.

Voici un manifeste pour une ressource `Ingress` générique :

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: demo-ingress
spec:
  rules:
  - http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: demo-service
            port:
              number: 8888
```

Cet `Ingress` dans cet exemple examine un `Service` nommé `demo-service`, et ce `Service` utilise ensuite les étiquettes de sélecteur et l'état de préparation (voir **[« Sondes de préparation »](Lab 3)** pour déterminer un `Pod` approprié pour recevoir la requête. Les `Pods` qui ne correspondent pas aux étiquettes de sélecteur définies dans le `demo-service`, et tous les `Pods` qui ont un état « Prêt » défaillant, ne recevront aucune requête. En plus de ce routage de base des requêtes, `Ingress` peut également gérer des tâches plus avancées, telles que la gestion des certificats SSL, la limitation du débit et d'autres fonctionnalités couramment associées aux équilibreurs de charge. Les spécificités de leur fonctionnement sont gérées par un contrôleur `Ingress`.

## Contrôleurs Ingress (Ingress Controllers)

Un contrôleur `Ingress` est responsable de la gestion des ressources `Ingress` dans un cluster. Le contrôleur que vous utilisez peut varier en fonction de l'endroit où vous exécutez vos clusters et des fonctionnalités dont vous avez besoin.

Habituellement, la sélection du contrôleur `Ingress` à utiliser et la configuration du comportement du contrôleur se font à l'aide d'annotations dans le manifeste `Ingress`. Par exemple, pour qu'un `Ingress` dans un cluster EKS utilise un équilibreur de charge d'application AWS orienté public, vous ajouteriez des annotations comme ceci :

```yaml
...
kind: Ingress
metadata:
  name: demo-aws-ingress
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
...
```

Chaque contrôleur `Ingress` aura ses propres ensembles d'annotations qui configurent les différentes fonctionnalités disponibles pour ce contrôleur.

Les clusters GKE hébergés dans GCP peuvent utiliser le [Google Cloud’s Load Balancer Controller (GLBC)](https://github.com/kubernetes/ingress-gce) pour les ressources `Ingress`. AWS a un produit similaire mentionné ci-dessus appelé [AWS Load Balancer Controller](https://github.com/kubernetes-sigs/aws-load-balancer-controller) et Azure a également son propre [Application Gateway Ingress Controller (AGIC)](https://github.com/Azure/application-gateway-kubernetes-ingress). Si vous utilisez l'un de ces principaux fournisseurs de cloud public et que vous avez des applications que vous devez exposer en dehors de vos clusters, nous vous recommandons d'explorer d'abord le contrôleur `Ingress` particulier géré par votre fournisseur de cloud.

Vous avez également la possibilité d'installer et d'utiliser un contrôleur `Ingress` différent dans vos clusters, ou même d'exécuter plusieurs contrôleurs si vous le souhaitez. Il existe [de nombreuses options de contrôleurs Ingress](https://kubernetes.io/docs/concepts/services-networking/ingress-controllers/), et certaines des plus populaires incluent :

*   [nginx-ingress](https://github.com/kubernetes/ingress-nginx) : NGINX est depuis longtemps un outil d'équilibrage de charge populaire, même avant l'arrivée de Kubernetes. Le projet `nginx-ingress` est maintenu par la communauté Kubernetes.
*   [NGINX Ingress Controller](https://github.com/nginxinc/kubernetes-ingress) : Ce contrôleur est soutenu par la société NGINX elle-même. Il existe quelques différences entre ce projet et celui de la communauté Kubernetes mentionné dans le paragraphe précédent.
*   [Contour](https://github.com/projectcontour/contour) : Contour utilise en fait un autre outil sous le capot appelé [Envoy](https://www.envoyproxy.io/) pour transmettre les requêtes entre les clients et les `Pods`.
*   [Traefik](https://doc.traefik.io/traefik/providers/kubernetes-ingress/) : Il s'agit d'un outil proxy léger qui peut également gérer automatiquement les certificats TLS pour votre `Ingress`.
*   [Kong](https://github.com/Kong/kubernetes-ingress-controller) : Kong héberge le [Kong Plugin Hub](https://docs.konghq.com/hub) avec des plugins qui s'intègrent à leur contrôleur `Ingress` pour configurer des éléments tels que l'authentification OAuth, les certificats LetsEncrypt, la restriction IP, les métriques et d'autres fonctionnalités utiles pour les équilibreurs de charge.
*   [HAProxy](https://haproxy-ingress.github.io/docs/) : HAProxy est un autre outil populaire pour les équilibreurs de charge depuis plusieurs années, et ils ont également leur propre contrôleur `Ingress` pour Kubernetes ainsi qu'un chart Helm pour l'installer dans vos clusters.

## Règles `Ingress` (Ingress Rules)

`Ingress` peut également être utilisé pour transférer le trafic vers différents services backend, en fonction de certaines règles que vous spécifiez. Une utilisation courante consiste à acheminer les requêtes vers différents endroits, en fonction de l'URL de la requête (appelé *fanout*) :

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: fanout-ingress
spec:
  rules:
  - http:
      paths:
      - path: /hello
        backend:
          serviceName: hello
          servicePort: 80
      - path: /goodbye
        backend:
          serviceName: goodbye
          servicePort: 80
```

## Terminaison TLS avec `Ingress` (Terminating TLS with Ingress)

La plupart des contrôleurs `Ingress` peuvent également gérer la sécurisation des connexions à l'aide de *Transport Layer Security* (TLS) (le protocole anciennement appelé *Secure Sockets Layer* [SSL]). Cela se fait généralement à l'aide d'un `Secret` Kubernetes contenant le contenu du certificat et de la clé, et la section `tls` du manifeste `Ingress` :

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: demo-ingress
spec:
  tls:
  - secretName: demo-tls-secret
  backend:
    serviceName: demo-service
    servicePort: 80
...
---
apiVersion: v1
kind: Secret
type: kubernetes.io/tls
metadata:
  name: demo-tls-secret
data:
  tls.crt: LS0tLS1CRUdJTiBDRV...LS0tCg==
  tls.key: LS0tLS1CRUdJTiBSU0...LS0tCg==
```

### Automatisation des certificats LetsEncrypt avec Cert-Manager (Automating LetsEncrypt certificates with Cert-Manager)

Si vous souhaitez demander et renouveler automatiquement des certificats TLS à l'aide de l'autorité populaire [LetsEncrypt](https://letsencrypt.org/) (ou d'un autre fournisseur de certificats ACME), vous pouvez utiliser [cert-manager](http://docs.cert-manager.io/en/latest).

Si vous exécutez `cert-manager` dans votre cluster, il détectera automatiquement les `Ingress` TLS qui n'ont pas de certificat et en demandera un au fournisseur spécifié. Il peut également gérer le renouvellement automatique de ces certificats lorsqu'ils sont sur le point d'expirer.

## Maillage de services (Service Mesh)

Les `Ingress` et les `Services` Kubernetes peuvent suffire pour router les requêtes des clients vers vos applications, selon la complexité de votre organisation. Mais il y a aussi un intérêt croissant pour un concept plus récent communément appelé *maillage de services* ou *service mesh*. Un maillage de services est chargé de gérer des opérations réseau plus complexes telles que la limitation du débit et le cryptage du trafic réseau entre les microservices. Les outils de maillage de services peuvent également ajouter des métriques et une journalisation pour les requêtes traversant le réseau, en suivant le temps que prennent les requêtes ou en traçant l'origine d'une requête et le chemin qu'elle a emprunté à travers les différents microservices en cours de route. Certains outils de maillage de services peuvent gérer les nouvelles tentatives automatiques de requêtes ayant échoué et ont la possibilité de refuser ou de bloquer les requêtes entrantes ou sortantes selon les besoins.

Il existe plusieurs options pour implémenter un maillage de services que nous allons lister ici. Nous prévoyons que le paysage des outils de maillage de services continuera d'évoluer rapidement dans les années à venir et deviendra un élément central de toute pile d'infrastructure native du cloud. Si vous débutez avec seulement quelques applications à déployer, vous pouvez probablement commencer par utiliser simplement les ressources `Service` et `Ingress` standard fournies par Kubernetes. Mais si vous avez besoin d'explorer ces capacités plus avancées d'un maillage de services, voici quelques bonnes options à explorer.

## Istio

Istio a été l'un des premiers outils associés à la fourniture d'un maillage de services. Il est disponible en tant que composant complémentaire facultatif pour de nombreux clusters Kubernetes hébergés, y compris [GKE](https://cloud.google.com/kubernetes-engine?hl=fr). Si vous souhaitez installer Istio vous-même, consultez la [documentation d'installation d'Istio](https://istio.io/latest/docs/setup/getting-started/) pour plus d'informations. 

## Linkerd

[Linkerd](https://linkerd.io/) offre de nombreuses fonctionnalités clés du maillage de services, mais avec une empreinte beaucoup plus légère et moins de complexité par rapport à Istio. Il peut être utilisé pour configurer le TLS mutuel entre les services, collecter des métriques sur les taux de requêtes et la latence, les déploiements bleu-vert et les nouvelles tentatives de requêtes.

## Consul Connect

Avant que Kubernetes ne soit largement connu et utilisé, HashiCorp proposait un outil populaire appelé Consul, axé sur la découverte de services. Il gérait les vérifications de l'état des applications et le routage automatique des requêtes au bon endroit dans un environnement informatique distribué. Cette fonctionnalité est désormais gérée nativement dans Kubernetes, mais Consul s'est maintenant étendu pour inclure un nouvel outil appelé [Consul Connect](https://developer.hashicorp.com/consul/docs/k8s/connect) avec des capacités de maillage de services. Si vous exécutez un environnement mixte avec des applications s'exécutant en dehors de Kubernetes, ou si vous êtes déjà familiarisé avec l'utilisation de Consul, alors Consul Connect peut valoir la peine d'être exploré pour votre maillage de services.

## NGINX Service Mesh

En plus des contrôleurs `Ingress`, NGINX propose également un produit complet de [Service Mesh](https://docs.nginx.com/nginx-service-mesh) pour Kubernetes. Il utilise également le modèle sidecar où un conteneur NGINX s'exécute aux côtés de vos applications et gère le routage du trafic réseau. Ce conteneur de maillage de services fournit un cryptage mTLS, des capacités de fractionnement du trafic et suit les métriques sur les performances du réseau pour l'observabilité.

## Résumé

En fin de compte, tout dans Kubernetes consiste à exécuter des `Pods`. Ces `Pods` peuvent être configurés et gérés à l'aide de contrôleurs et d'objets Kubernetes, que ce soit pour des processus à long terme ou des jobs et `CronJobs` de courte durée. Les configurations plus complexes peuvent utiliser des définitions de ressources personnalisées et des opérateurs. Le routage des requêtes réseau vers les `Pods` implique l'utilisation de `Services` et de contrôleurs `Ingress`.

Les idées de base à retenir :

*   Les étiquettes sont des paires clé/valeur qui identifient les ressources et peuvent être utilisées avec des sélecteurs pour correspondre à un groupe de ressources spécifié.
*   Les affinités de nœuds attirent ou repoussent les `Pods` vers ou depuis des nœuds avec des attributs spécifiés. Par exemple, vous pouvez spécifier qu'un `Pod` ne peut s'exécuter que sur un nœud dans une zone de disponibilité spécifiée.
*   Alors que les affinités de nœuds *dures* peuvent empêcher un `Pod` de s'exécuter, les affinités de nœuds *douces* ressemblent davantage à des suggestions pour le planificateur. Vous pouvez combiner plusieurs affinités douces avec différents poids.
*   Les affinités de `Pod` expriment une préférence pour que les `Pods` soient planifiés sur le même nœud que d'autres `Pods`. Par exemple, les `Pods` qui bénéficient de l'exécution sur le même nœud peuvent l'exprimer en utilisant une affinité de `Pod` les uns pour les autres.
*   Les anti-affinités de `Pod` repoussent les autres `Pods` au lieu de les attirer. Par exemple, une anti-affinité avec les répliques du même `Pod` peut aider à répartir vos répliques uniformément sur le cluster.
*   Les *taints* sont un moyen de marquer les nœuds avec des informations spécifiques, généralement sur les problèmes ou les pannes de nœud. Par défaut, les `Pods` ne seront pas planifiés sur les nœuds tainted.
*   Les *tolerations* permettent à un `Pod` d'être planifié sur des nœuds avec une taint spécifique. Vous pouvez utiliser ce mécanisme pour exécuter certains `Pods` uniquement sur des nœuds dédiés.
*   Les `DaemonSets` vous permettent de planifier une copie d'un `Pod` sur chaque nœud (par exemple, un agent de journalisation).
*   Les `StatefulSets` démarrent et arrêtent les répliques de `Pod` dans une séquence numérotée spécifique, vous permettant d'adresser chacune d'elles par un nom DNS prévisible. Ceci est idéal pour les applications en cluster, telles que les bases de données.
*   Les `Jobs` exécutent un `Pod` une fois (ou un nombre de fois spécifié) avant de se terminer. De même, les `CronJobs` exécutent un `Pod` périodiquement à des heures spécifiées.
*   Les *Horizontal Pod Autoscalers* (HPA) surveillent un ensemble de `Pods`, essayant d'optimiser une métrique donnée (telle que l'utilisation du CPU). Ils augmentent ou diminuent le nombre de répliques souhaité pour atteindre l'objectif spécifié.
*   Les *Custom Resource Definitions* (CRD) vous permettent de créer vos propres objets Kubernetes personnalisés, pour stocker toutes les données que vous souhaitez. Les opérateurs sont des programmes clients Kubernetes qui peuvent implémenter un comportement d'orchestration pour votre application spécifique. OperatorHub.io est une excellente ressource pour rechercher des opérateurs créés par la communauté.
*   Les ressources `Ingress` acheminent les requêtes vers différents services, en fonction d'un ensemble de règles, par exemple, en faisant correspondre des parties de l'URL de la requête. Ils peuvent également terminer les connexions TLS pour votre application.
*   Istio, Linkerd et Consul Connect sont des outils de maillage de services avancés qui fournissent des fonctionnalités réseau pour les environnements de microservices tels que le cryptage, la QoS, les métriques, la journalisation et des stratégies de routage plus complexes.

