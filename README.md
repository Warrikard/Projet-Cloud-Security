# 🛡️ GameVault - Secure Asset Pipeline

> **Projet Final - Sécurité Cloud & DevSecOps**
> **ESIEE Paris - Année 2025/2026**

![AWS Badge](https://img.shields.io/badge/AWS-Level%201-orange?style=flat&logo=amazon-aws)
![Security Badge](https://img.shields.io/badge/Security-KMS%20%26%20VPC-red?style=flat&logo=lock)
![DevSecOps Badge](https://img.shields.io/badge/DevSecOps-CodePipeline-blue?style=flat)

## 📖 Description du Projet

**GameVault** est une plateforme de gestion de contenus numériques (DAM) ultra-sécurisée, conçue pour les studios de jeux vidéo. Elle permet aux développeurs et artistes de stocker, versionner et partager des actifs sensibles (code source, textures HD, builds exécutables) tout en garantissant une confidentialité totale et une protection contre les fuites de données (leaks).

[cite_start]Ce projet a été réalisé dans le cadre du cours de **Sécurité Cloud** dirigé par M. Badr TAJINI[cite: 106]. Il met en œuvre une architecture **100% AWS** intégrant les pratiques **DevSecOps** et une recherche sur les attaques adverses.

---

## 👥 Auteurs

* **[TON NOM Prénom]** - [TA FILIÈRE] - [TON EMAIL]
* **[NOM Prénom Binôme]** - [SA FILIÈRE] - [SON EMAIL]

---

## 🏗️ Architecture Cloud (AWS)

[cite_start]L'infrastructure a été conçue pour répondre aux 5 phases du projet[cite: 136]:

### 1. Stockage & Coûts (S3)
* **Buckets Ségrégés :** Séparation des environnements (Source, Prod, Logs).
* [cite_start]**Versioning :** Activé pour garantir l'intégrité des assets de jeu[cite: 141].
* [cite_start]**Lifecycle Policies :** Migration automatique des vieux builds vers **S3 Glacier** pour l'optimisation des coûts[cite: 146].

### 2. Réseau & Isolation (VPC)
* [cite_start]**VPC Custom :** Déploiement dans un Virtual Private Cloud isolé[cite: 150].
* **Subnetting :** Architecture à deux niveaux (Public pour le Bastion/LB, Privé pour l'Application).
* [cite_start]**Pare-feu :** Configuration stricte des Security Groups et NACLs[cite: 151].

### 3. Cryptographie (KMS & Secrets)
* [cite_start]**Chiffrement au repos :** Utilisation de clés **AWS KMS (CMK)** gérées par le client pour chiffrer les S3 et les volumes EBS[cite: 157, 160].
* [cite_start]**Gestion des Secrets :** Utilisation de **AWS Secrets Manager** pour sécuriser les identifiants de base de données[cite: 161].

### 4. Surveillance & Conformité
* [cite_start]**Audit :** Traçabilité complète des actions via **AWS CloudTrail**[cite: 165].
* [cite_start]**Alerting :** Alarmes **CloudWatch** configurées pour détecter les tentatives d'accès non autorisées[cite: 166].
* [cite_start]**Conformité :** Règles **AWS Config** pour vérifier le chiffrement des ressources[cite: 168].

---

## 🚀 Pipeline DevSecOps

[cite_start]L'automatisation du déploiement intègre la sécurité "by design"[cite: 169]:

1.  **Source :** GitHub (Trigger au push).
2.  **Build & Test (AWS CodeBuild) :**
    * Installation des dépendances.
    * [cite_start]🕵️ **Security Scan :** Analyse statique du code (SAST) et scan de vulnérabilités (ex: Trivy/OWASP)[cite: 173].
3.  **Deploy (AWS CodeDeploy) :** Mise à jour automatique des instances EC2 dans le sous-réseau privé.

---

## 🔬 Recherche : Attaques Adverses

[cite_start]Une partie du projet est dédiée à l'étude des menaces spécifiques aux contenus numériques[cite: 191].

* **Sujet :** La Stéganographie et les attaques via métadonnées dans les fichiers multimédias.
* **Contexte :** Comment des acteurs malveillants peuvent dissimuler du code dans des textures de jeu vidéo.
* **Défense :** Analyse des stratégies de mitigation mises en place sur la plateforme GameVault.

---

## 📂 Structure du Dépôt

```bash
├── 📂 .github/             # Documentation et templates
├── 📂 app/                 # Code source de l'application (Backend/Frontend)
├── 📂 infrastructure/      # Templates CloudFormation / Scripts de déploiement
│   ├── buildspec.yml       # Configuration AWS CodeBuild
│   └── appspec.yml         # Configuration AWS CodeDeploy
├── 📂 docs/                # Documentation projet
[cite_start]│   ├── architecture_cloudcraft.png  # Schéma d'architecture [cite: 135]
[cite_start]│   └── estimation_couts.xlsx        # Fichier Excel des coûts [cite: 146]
└── README.md