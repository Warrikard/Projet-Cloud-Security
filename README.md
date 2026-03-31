# Le Cloud Gourmand - Déploiement Kubernetes (K3s)

## Introduction
Ce projet démontre le déploiement d'une application cloud-native appelée **« Le Cloud Gourmand »**, un menu de restaurant interactif. L'architecture suit un modèle 3-tiers avec un frontend, un backend et une base de données, déployés sur un cluster Kubernetes local (K3s). Le projet intègre des pratiques avancées de gestion des ressources, monitoring et sécurité pour une application robuste et scalable.

## Architecture Générale
```bash
Projet-Cloud-Security/
├── .github/workflows/              
│   └── ci.yaml.yaml/               # Pipeline CI
├── Cloud_Native_Devops_With_Kubernetes/
│   ├── tds.py/                     # Labs
│   └── kubernetes_projet.py/       
│       ├── app.py/   
│       └── fichiers.py/            # Fichiers de cofiguration
│           ├── backend.yaml        
│           ├── backup.yaml         
│           ├── database.yaml       
│           ├── frontend.yaml       
│           ├── get_helm.sh         
│           ├── initdb.yaml         
│           ├── namespace.yaml      
│           ├── networkpolicy.yaml  
│           ├── rbac.yaml           
│           └── script              
└── README.md                       # Documentation
```

L'application est divisée en trois microservices principaux :
- **Frontend** : Interface utilisateur servie par Nginx, qui affiche le menu et agit comme reverse-proxy vers le backend.
- **Backend** : API développée en Node.js (Express) qui traite les requêtes du frontend et interagit avec la base de données.
- **Base de Données** : PostgreSQL pour stocker les données du menu (plats, prix, etc.).

Tous les composants sont conteneurisés avec Docker et orchestrés via Kubernetes, avec un namespace dédié (`cloud-native-project`) pour l'isolation.

## Comment Utiliser le Projet
Pour déployer et tester l'application localement :

1. **Prérequis** : Assurez-vous d'avoir Docker, Kubernetes (K3s) et kubectl installés. Clonez le dépôt :
   ```
   git clone <URL-du-repo>
   cd Projet-Cloud-Security/Cloud_Native_Devops_With_Kubernetes/kubernetes_projet
   ```

2. **Démarrer le Cluster K3s** :
   ```
   k3s server --write-kubeconfig-mode 644
   ```

3. **Appliquer les Configurations** :
   ```
   # Créer le namespace et les quotas : 
   kubectl apply -f fichiers/namespace.yaml
   
   # Déployer la base de données : 
   kubectl apply -f fichiers/initdb.yaml
   kubectl apply -f fichiers/database.yaml

   # Déployer le backend : 
   kubectl apply -f fichiers/backend.yaml
   
   # Déployer le frontend : 
   kubectl apply -f fichiers/frontend.yaml

   # Déployer le backup : 
   kubectl apply -f fichiers/backup.yaml

   # Appliquer la sécurité (RBAC, NetworkPolicy) : 
   kubectl apply -f fichiers/rbac.yaml
   kubectl apply -f fichiers/networkpolicy.yaml
   ```

4. **Vérifier le Déploiement** :
   ```
   kubectl get pods,svc -n cloud-native-project
   kubectl get configmaps,secrets -n cloud-native-project
   ```

5. **Accéder à l'Application** :
   - Port-forward le service frontend : `kubectl port-forward svc/frontend-service 8080:80 -n cloud-native-project`
   - Ouvrez un navigateur à `http://localhost:8080` pour voir le menu interactif.

6. **Monitoring (Optionnel)** :
   - (Si non fait) Déclarer le chemin de la configuration : `export KUBECONFIG=/etc/rancher/k3s/k3s.yaml`
   - Installez Prometheus/Grafana via Helm si configuré : `helm install monitoring prometheus-community/kube-prometheus-stack`
   - Port-forward le service Grafana : `kubectl port-forward svc/monitoring-grafana 3000:80 -n default`
   - Accédez aux dashboards pour surveiller CPU/RAM et requêtes.

7. **Sécurité et Sauvegardes** :
   - Scannez avec Trivy : `trivy k8s --include-namespaces cloud-native-project --report summary`
   - Vérifiez les backups : `kubectl get cronjobs -n cloud-native-project`

## Phases du Projet
- **Phase 1 : Architecture et Déploiement** : Conteneurisation, déploiement sur K3s, gestion des configs/secrets.
- **Phase 2 : Gestion des Ressources et Observabilité** : Quotas de ressources, monitoring avec Prometheus/Grafana (modèles USE et RED).
- **Phase 3 : Sécurité** : RBAC pour accès limité, NetworkPolicies pour isolation réseau, scans Trivy, backups automatiques.

## Conclusion
Ce projet illustre les principes du cloud-native sur Kubernetes, en mettant l'accent sur la sécurité, la scalabilité et l'observabilité. Il prépare à des déploiements plus avancés comme GitOps ou CI/CD automatisés.