### **Projet Final : Gestion des applications Cloud-Native avec Kubernetes**

> **Auteur** : Badr TAJINI - Cloud-native-DevOps-with-Kubernetes - ESIEE - 2024/2025

#### **Résumé du Projet**

Le projet final du cours **Cloud Native DevOps avec Kubernetes** consiste à développer une application distribuée et sécurisée, déployée dans un environnement Kubernetes. Vous aurez le choix de créer  :

> (Un bulletpoint à sélectionner **(obligatoire)** ou deux ou plus **(bonus 2 points dans la moyenne générale)**)

- **Une simple application conteneurisée** avec un backend, un frontend et une base de données en utilisant le langage de programmation de votre choix (par exemple : *Python, JavaScript, Go, Rust*, etc).
- **Conteneurs de monitoring** : Pour surveiller les performances et la santé de ton application, comme *Prometheus* ou *Grafana*.
- **Conteneurs de logging** : Pour collecter et gérer les logs, tels que *Fluentd* ou *Logstash*.
- **Conteneurs de sécurité** : Pour ajouter des couches de sécurité, comme des scanners de vulnérabilités (*Clair*, *Trivy*).
- **Conteneurs de cache** : Pour améliorer les performances avec des caches comme Redis ou Memcached.
- **Conteneurs de proxy** : Pour gérer le trafic réseau, comme Nginx ou Envoy.
- **Conteneurs de CI/CD** : Pour les pipelines d'intégration et de déploiement continu, comme Jenkins ou GitLab Runner.

Vous aurez la liberté de choisir votre domaine d'intérêt (par exemple, e-commerce, gestion de contenu, IoT, santé, droit, défense, énergie) et décider de l’implémentation technique (local ou/et cloud). Vous pourrez utiliser **Minikube**, **K3s** ou **K8s** en local, et pour les options Cloud, ils pourront exploiter des ressources gratuites comme **Azure Kubernetes Service (AKS) - [Link](https://learn.microsoft.com/en-us/azure/aks/free-standard-pricing-tiers)** via [Azure for Students](https://azure.microsoft.com/fr-fr/free/students/?msockid=31f65e221d9e633539a94ae21c2762c5).

L’objectif est de fournir une plateforme fonctionnelle, sécurisée et scalable, capable de supporter des applications modernes cloud-native. Ce projet intègre des pratiques avancées de DevOps, de gestion des ressources, et de sécurité tout en incluant un système de monitoring performant.

---

#### **Objectifs Pédagogiques**

1. **Développement et déploiement** : Créer une architecture Kubernetes pour déployer et gérer une application ou service distribuée.  
2. **Automatisation DevOps** : Implémenter des pipelines CI/CD ([Annexe 2](#annexe-2)) pour intégrer le déploiement continu.  
3. **Observabilité et monitoring** : Configurer des outils comme Prometheus et Grafana pour surveiller les performances.  
4. **Sécurité** : Mettre en œuvre des stratégies avancées de sécurité pour protéger le cluster et ses applications.  
5. **Analyse des métriques** : Utiliser des modèles RED et USE pour analyser les performances et anticiper les problèmes.

---

#### **Conditions du Projet**

1. **Choix du domaine** : Vous pouvez sélectionner un domaine d'activité qui les motive (ex. : e-santé, finance, éducation, médias).
2. **Choix de la plateforme** : Utilisation de Kubernetes avec :
   - **Implémentation locale** : Minikube, K3s, ou K8s.
   - **Implémentation cloud** : AKS (Azure Kubernetes Service).
3. **Travail collaboratif** : Travail en binôme pour favoriser l'échange de compétences et d’idées. (Travail en monôme accepté).
4. **Livrables** : Rendu incluant un rapport technique, une vidéo démonstrative, et les fichiers de configuration.

---

#### **Phases du Projet**

##### **Phase 1 : Initialisation et déploiement de l’application**

- **Objectif** : Configurer un cluster Kubernetes et déployer une application simple.  
- **Tâches** :  
  1. Installer et configurer Kubernetes avec Minikube, K3s, ou un cluster AKS.  
  2. Créer les objets Kubernetes de base : Pods, Services, ConfigMaps et Secrets.  
  3. Mettre en place un système d’authentification RBAC.  

##### **Phase 2 : Automatisation et déploiement continu**

- **Objectif** : Intégrer un pipeline CI/CD et automatiser le déploiement.  
- **Tâches** :  
  1. Configurer un pipeline CI/CD avec GitHub Actions ou Azure DevOps.  
  2. Utiliser GitOps avec Flux ou ArgoCD pour gérer les configurations.  
  3. Tester les déploiements continus avec des mises à jour incrémentales.

##### **Phase 3 : Gestion des ressources et optimisation**

- **Objectif** : Implémenter une gestion efficace des ressources et des métriques.  
- **Tâches** :  
  1. Configurer les quotas et les limites des ressources.  
  2. Analyser les métriques avec Prometheus (RED/USE Patterns).  
  3. Visualiser les performances via Grafana.

##### **Phase 4 : Renforcement de la sécurité**

- **Objectif** : Mettre en place des stratégies avancées de sécurité.  
- **Tâches** :  
  1. Configurer des secrets et des sauvegardes.  
  2. Implémenter des politiques RBAC granulaires.  
  3. Effectuer des tests de sécurité pour détecter les vulnérabilités.

##### **Phase 5 : Validation et présentation finale**

- **Objectif** : Présenter une solution fonctionnelle et documentée.  
- **Tâches** :  
  1. Tester l’application dans différents scénarios.  
  2. Réaliser une vidéo démonstrative.  
  3. Rédiger un rapport technique précis et clair.

---

#### **Critères d’Évaluation**

1. **Technique** :
   - Qualité de la configuration Kubernetes.
   - Automatisation des pipelines CI/CD.
   - Mise en place des stratégies de gestion des ressources.
2. **Sécurité** :
   - Robustesse des configurations RBAC et des secrets.
   - Détection et mitigation des vulnérabilités.
3. **Observabilité** :
   - Pertinence des métriques collectées et analysées.
   - Qualité des tableaux de bord Grafana.
4. **Présentation** :
   - Clarté et qualité du rapport technique.
   - Impact visuel et informatif de la vidéo finale.

---

# Annexe 1 :

#### **Livrables**

1. **Rapport technique** : Documentation des étapes, configurations et résultats sur Github en **privé**.
2. **Vidéo démonstrative** : Présentation de l’application fonctionnelle de votre plateforme en local ou/et en cloud sur Github en **privé**.
3. **Code source** : Références aux scripts et configurations Kubernetes sur Github en **privé**.
4. **Tableaux de bord** : Exemples de visualisations via Grafana sur Github en **privé**.

---

#### **Deadline**

- **Rendu final projet** : 31/01/2025 à 23h59 (heure de Paris).
- **Rendu final Labs** : 31/01/2025 à 23h59 (heure de Paris).

#### **Pondération de l'évaluation**

- **Projet** : 60%
- **Labs** : 40%
- **Participation** : 10%

#### **Pondération de l'évaluation**

P.S : Ne pas oubliez de mentionner : votre nom – votre filière - année universitaire – école (pour les crédits).

#### **Rendu (traçabilité)**

Je vous prie de bien vouloir enregister votre nom, prénom et celui de votre binôme via ce formulaire pour garder une traçabilité de vos travaux : [Link](https://docs.google.com/forms/d/e/1FAIpQLSdM6nUPxk1AlwH7SYvtMF-nrAYamM_Z7pJEPntGUTN4B9LKJg/viewform?usp=sf_link).

# Annexe 2 :

### Outils CI/CD en local

1. **Jenkins** : Un des outils CI/CD les plus populaires, open-source et très extensible grâce à ses nombreux plugins.
2. **GitLab CI** : Intégré à GitLab, il offre des fonctionnalités CI/CD robustes et est facile à configurer.
3. **Travis CI** : Utilisé pour les projets open-source, il peut également être configuré pour des environnements locaux.
4. **CircleCI** : Offre une version locale pour tester les pipelines CI/CD avant de les déployer en production.
5. **TeamCity** : Un outil de CI/CD de JetBrains, connu pour sa flexibilité et ses intégrations avec divers outils de développement.

### Outils CI/CD sur Azure

1. **Azure Pipelines** : Partie d'Azure DevOps, il permet de créer des pipelines CI/CD pour tout type de projet, avec une intégration facile aux autres services Azure[1](https://learn.microsoft.com/en-us/azure/devops/pipelines/architectures/devops-pipelines-baseline-architecture?view=azure-devops).
2. **GitHub Actions** : Disponible sur GitHub, il s'intègre parfaitement avec Azure pour déployer des applications et des services.
3. **Azure DevTest Labs** : Permet de créer des environnements de test et de développement automatisés, intégrés aux pipelines CI/CD[2](https://learn.microsoft.com/en-us/azure/devops/pipelines/apps/cd/azure/cicd-data-overview?view=azure-devops).
4. **Azure Deployment Environments** : Utilisé pour déployer des environnements dans des pipelines CI/CD, simplifiant le processus de développement[3](https://learn.microsoft.com/en-us/azure/deployment-environments/tutorial-deploy-environments-in-cicd-azure-devops).
