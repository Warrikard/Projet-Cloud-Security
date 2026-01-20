# 🛡️ GameVault - Secure Asset Pipeline

> **Projet Final - Sécurité Cloud & DevSecOps**
> **ESIEE Paris - Année 2025/2026**

![AWS Badge](https://img.shields.io/badge/AWS-Level%201-orange?style=flat&logo=amazon-aws)
![Security Badge](https://img.shields.io/badge/Security-KMS%20%26%20VPC-red?style=flat&logo=lock)
![DevSecOps Badge](https://img.shields.io/badge/DevSecOps-CodePipeline-blue?style=flat)

## Description du Projet

**GameVault** est une plateforme de gestion de contenus numériques (DAM) ultra-sécurisée, conçue pour les studios de jeux vidéo. Elle permet aux développeurs et artistes de stocker, versionner et partager des actifs sensibles (code source, textures HD, builds exécutables) tout en garantissant une confidentialité totale et une protection contre les fuites de données (leaks).

Ce projet a été réalisé dans le cadre du cours de **Sécurité Cloud** dirigé par M. Badr TAJINI. Il met en œuvre une architecture **100% AWS** intégrant les pratiques **DevSecOps** et une recherche sur les attaques adverses.

---

## Auteurs

* **Mike CUNHA** - E5FR - mike.cunha@edu.esiee.fr
* **Yasin GUNDOGDU** - E5FR - yasin.gundogdu@edu.esiee.fr

---

## Architecture Cloud (AWS)

L'infrastructure a été conçue pour répondre aux 5 phases du projet:

### 1. Stockage & Coûts (S3)
* **Buckets Ségrégés :** Séparation des environnements (Source, Prod, Logs).
* **Versioning :** Activé pour garantir l'intégrité des assets de jeu.
* **Lifecycle Policies :** Migration automatique des vieux builds vers **S3 Glacier** pour l'optimisation des coûts.

### 2. Réseau & Isolation (VPC)
* **VPC Custom :** Déploiement dans un Virtual Private Cloud isolé.
* **Subnetting :** Architecture à deux niveaux (Public pour le Bastion/LB, Privé pour l'Application).
* **Pare-feu :** Configuration stricte des Security Groups et NACLs.

### 3. Cryptographie (KMS & Secrets)
* **Chiffrement au repos :** Utilisation de clés **AWS KMS (CMK)** gérées par le client pour chiffrer les S3 et les volumes EBS.
* **Gestion des Secrets :** Utilisation de **AWS Secrets Manager** pour sécuriser les identifiants de base de données.

### 4. Surveillance & Conformité
* **Audit :** Traçabilité complète des actions via **AWS CloudTrail**.
* **Alerting :** Alarmes **CloudWatch** configurées pour détecter les tentatives d'accès non autorisées.
* **Conformité :** Règles **AWS Config** pour vérifier le chiffrement des ressources.

---

## Pipeline DevSecOps

L'automatisation du déploiement intègre la sécurité "by design":

1.  **Source :** GitHub (Trigger au push).
2.  **Build & Test (AWS CodeBuild) :**
    * Installation des dépendances.
    * **Security Scan :** Analyse statique du code (SAST) et scan de vulnérabilités (ex: Trivy/OWASP).
3.  **Deploy (AWS CodeDeploy) :** Mise à jour automatique des instances EC2 dans le sous-réseau privé.

---

## Recherche : Attaques Adverses

Une partie du projet est dédiée à l'étude des menaces spécifiques aux contenus numériques.

* **Sujet :** La Stéganographie et les attaques via métadonnées dans les fichiers multimédias.
* **Contexte :** Comment des acteurs malveillants peuvent dissimuler du code dans des textures de jeu vidéo.
* **Défense :** Analyse des stratégies de mitigation mises en place sur la plateforme GameVault.

