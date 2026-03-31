# SafeBoard - Portail d'intégration RH sécurisé (AWS)

## Introduction
[cite_start]Ce projet consiste en la conception et le déploiement d'une plateforme de gestion de contenus sécurisée nommée **SafeBoard**[cite: 1]. [cite_start]Il s'agit d'un portail d'intégration (onboarding) destiné aux nouveaux employés d'une entreprise pour uploader des documents sensibles (RIB, pièces d'identité) et consulter des ressources de formation de manière confidentielle[cite: 1, 13, 16, 17]. 

[cite_start]L'architecture repose sur un modèle 3-tiers (Load Balancer, Serveur d'application, Base de données) hébergé sur AWS, intégrant des pratiques **DevSecOps** et une surveillance continue pour garantir la protection des données à caractère personnel (PII)[cite: 1, 18, 121, 122].

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
- [cite_start]**Stockage (S3)** : Buckets privés avec versioning, journalisation et chiffrement KMS[cite: 1, 49, 52, 70, 72, 419].
- [cite_start]**Calcul (EC2)** : Instance isolée en sous-réseau privé, accessible uniquement via l'ALB[cite: 1, 121, 122].
- [cite_start]**Base de données (RDS)** : Instance MySQL chiffrée, accessible uniquement par le serveur applicatif[cite: 1, 345, 346, 423].
- [cite_start]**Réseau (VPC)** : Ségrégation par sous-réseaux publics/privés, NACL et VPC Endpoints[cite: 1, 226, 228, 271, 276].

## Démarrage Rapide

1. **Prérequis** :
   - Un compte AWS avec les droits administrateur.
   - Python 3.x installé pour les tests locaux.
   - Les outils AWS CLI et session manager configurés.

2. **Configuration des Secrets** :
   - [cite_start]Créez un secret dans **AWS Secrets Manager** nommé `safeboard/db-creds` contenant les identifiants de la base RDS[cite: 1, 561, 564].

3. **Déploiement de l'Infrastructure** :
   - [cite_start]Déployez le VPC, les sous-réseaux et l'ALB via la console ou Terraform[cite: 1, 225, 226].
   - [cite_start]Configurez les **Security Groups** pour n'autoriser que les flux nécessaires (Port 80 vers EC2, Port 3306 vers RDS)[cite: 1, 343, 346].

4. **Pipeline CI/CD (DevSecOps)** :
   - [cite_start]Uploadez `safeboard-app.zip` dans votre bucket source S3[cite: 1, 748, 764, 768].
   - [cite_start]**AWS CodePipeline** déclenchera automatiquement **CodeBuild** pour analyser le code avec **Bandit**[cite: 1, 746, 751, 752].
   - [cite_start]Si le scan réussit, l'application est prête pour le déploiement[cite: 1, 862].

5. **Accès à l'Application** :
   - [cite_start]Utilisez l'URL DNS de l'**Application Load Balancer** pour accéder à l'interface SafeBoard[cite: 1, 121].

## Phases du Projet
- [cite_start]**Phase 1 : Architecture et Stockage** : Conception Cloudcraft, estimation des coûts (32,77$/mois) et sécurisation des buckets S3 (Block Public Access, Inventaires)[cite: 1, 49, 100, 119, 125].
- [cite_start]**Phase 2 : Sécurité Réseau** : Isolation VPC, routage via NAT Gateway et configuration des NACL stateless[cite: 1, 226, 227, 273].
- [cite_start]**Phase 3 : Chiffrement et Secrets** : Utilisation de clés KMS pour S3/EBS/RDS et retrait des mots de passe du code via Secrets Manager[cite: 1, 416, 419, 559, 561].
- [cite_start]**Phase 4 : Surveillance et Conformité** : Audit CloudTrail, alertes CloudWatch SNS sur accès refusés et règles AWS Config[cite: 1, 598, 604, 605, 721, 725].
- [cite_start]**Phase 5 : DevSecOps** : Automatisation des tests de sécurité statiques (SAST) dans le pipeline de déploiement[cite: 1, 744, 746].

## Recherche Théorique
[cite_start]Le projet inclut une analyse des **attaques adverses** ciblant les contenus numériques, telles que les *Malicious Uploads*, l'IDOR et le *Data Poisoning*, ainsi que les stratégies de défense associées (Lambda antivirus, WAF, URL présignées)[cite: 1, 869, 875, 878, 882].
