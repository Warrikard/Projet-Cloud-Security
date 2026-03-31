# SafeBoard - Portail d'intégration RH sécurisé (AWS)

## Introduction
Ce projet consiste en la conception et le déploiement d'une plateforme de gestion de contenus sécurisée nommée **SafeBoard**[cite: 1]. Il s'agit d'un portail d'intégration (onboarding) destiné aux nouveaux employés d'une entreprise pour uploader des documents sensibles (RIB, pièces d'identité) et consulter des ressources de formation de manière confidentielle. 

L'architecture repose sur un modèle 3-tiers (Load Balancer, Serveur d'application, Base de données) hébergé sur AWS, intégrant des pratiques **DevSecOps** et une surveillance continue pour garantir la protection des données à caractère personnel (PII).

## Architecture Générale
```bash
SafeBoard-Project/
├── app.py                 # Application Flask (Backend & Logique AWS)
├── buildspec.yml          # Configuration AWS CodeBuild (Scan SAST Bandit)
├── templates/
│   └── index.html         # Interface Frontend (Tailwind CSS)
├── requirements.txt       # Dépendances (Flask, Boto3, PyMySQL)
└── safeboard-app.zip      # Archive pour le déploiement S3
```

L'infrastructure cloud est segmentée pour une sécurité maximale :
- **Stockage (S3)** : Buckets privés avec versioning, journalisation et chiffrement KMS.
- **Calcul (EC2)** : Instance isolée en sous-réseau privé, accessible uniquement via l'ALB.
- **Base de données (RDS)** : Instance MySQL chiffrée, accessible uniquement par le serveur applicatif.
- **Réseau (VPC)** : Ségrégation par sous-réseaux publics/privés, NACL et VPC Endpoints.

## Démarrage Rapide

1. **Prérequis** :
   - Un compte AWS avec les droits administrateur.
   - Python 3.x installé pour les tests locaux.
   - Les outils AWS CLI et session manager configurés.

2. **Configuration des Secrets** :
   - Créez un secret dans **AWS Secrets Manager** nommé `safeboard/db-creds` contenant les identifiants de la base RDS.

3. **Déploiement de l'Infrastructure** :
   - Déployez le VPC, les sous-réseaux et l'ALB via la console ou Terraform.
   - Configurez les **Security Groups** pour n'autoriser que les flux nécessaires (Port 80 vers EC2, Port 3306 vers RDS).

4. **Pipeline CI/CD (DevSecOps)** :
   - Uploadez `safeboard-app.zip` dans votre bucket source S3.
   - **AWS CodePipeline** déclenchera automatiquement **CodeBuild** pour analyser le code avec **Bandit**.
   - Si le scan réussit, l'application est prête pour le déploiement.

5. **Accès à l'Application** :
   - Utilisez l'URL DNS de l'**Application Load Balancer** pour accéder à l'interface SafeBoard.

## Phases du Projet
- **Phase 1 : Architecture et Stockage** : Conception Cloudcraft, estimation des coûts (32,77$/mois) et sécurisation des buckets S3 (Block Public Access, Inventaires).
- **Phase 2 : Sécurité Réseau** : Isolation VPC, routage via NAT Gateway et configuration des NACL stateless.
- **Phase 3 : Chiffrement et Secrets** : Utilisation de clés KMS pour S3/EBS/RDS et retrait des mots de passe du code via Secrets Manager.
- **Phase 4 : Surveillance et Conformité** : Audit CloudTrail, alertes CloudWatch SNS sur accès refusés et règles AWS Config.
- **Phase 5 : DevSecOps** : Automatisation des tests de sécurité statiques (SAST) dans le pipeline de déploiement.

## Recherche Théorique
Le projet inclut une analyse des **attaques adverses** ciblant les contenus numériques, telles que les *Malicious Uploads*, l'IDOR et le *Data Poisoning*, ainsi que les stratégies de défense associées (Lambda antivirus, WAF, URL présignées).
