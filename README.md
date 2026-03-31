# 📂 Portfolio Cloud Security & Cloud-Native Engineering

## 👥 Présentation du Groupe
Ce dépôt GitHub regroupe les travaux réalisés dans le cadre du module **Sécurité Cloud** à l'**ESIEE Paris** pour l'année universitaire **2025-2026**.

**Membres du binôme :**
* **Yasin GUNDOGDU** (yasin.gundogdu@edu.esiee.fr)
* **Mike CUNHA** (mike.cunha@edu.esiee.fr) 

---

## 🚀 Vue d'Ensemble des Projets
Ce répertoire expose deux architectures majeures démontrant une expertise en déploiement sécurisé, en orchestration de conteneurs et en automatisation **DevSecOps**.

### 🛡️ Projet 1 : SafeBoard (Infrastructure AWS)
**SafeBoard** est un portail d'intégration RH sécurisé conçu pour gérer des données à caractère personnel (PII) hautement critiques. 
* **Objectif :** Permettre l'upload sécurisé de documents (RIB, identité) et la consultation de formations internes.
* **Stack Technique :** AWS (EC2, RDS, S3, ALB), Python/Flask, Boto3.
* **Points Clés Sécurité :** * Chiffrement de bout en bout via **AWS KMS**.
    * Surveillance continue avec **CloudWatch**, **CloudTrail** et **AWS Config**.
    * Pipeline **DevSecOps** intégrant des scans de vulnérabilités automatisés avec **Bandit**.

### 🍽️ Projet 2 : Le Cloud Gourmand (Orchestration Kubernetes)
**Le Cloud Gourmand** est une application cloud-native de menu interactif pour restaurant, déployée sur un cluster Kubernetes.
* **Objectif :** Déployer une architecture microservices robuste, scalable et monitorée.
* **Stack Technique :** K3s, Docker, Nginx, PostgreSQL, Helm.
* **Points Clés Ingénierie :** * Observabilité avancée avec la stack **Prometheus & Grafana** (Modèles USE et RED).
    * Sécurisation réseau via des **NetworkPolicies** et contrôle d'accès **RBAC**.
    * Scans d'images et de cluster avec **Trivy**.

### Veuillez trouver les vidéos explicatives de chacun des projets dans ce lien : https://drive.google.com/drive/folders/1a6Tn3E2P5XCAqC2piMdCUgbEkBt6DPeq?usp=sharing

---

## 📁 Structure du Dépôt
```bash
.
├── Partie 1 - Cloud Security              # Dossier complet du projet AWS
├── Cloud_Native_Devops_With_Kubernetes         # Dossier complet du projet Kubernetes
└── README.md                   # Cette présentation
```

---

## 🛠️ Compétences Démontrées
* **Architecte Cloud :** Conception de réseaux isolés (VPC, Subnets) et gestion de la haute disponibilité via Load Balancing.
* **Ingénieur Sécurité :** Gestion des identités (IAM), des secrets applicatifs et mise en œuvre du chiffrement au repos et en transit.
* **DevOps / DevSecOps :** Automatisation de pipelines CI/CD sécurisés et déploiement d'outils de monitoring/alerting.
* **Cloud-Native :** Conteneurisation d'applications et orchestration de services via Kubernetes.

---
*© 2026 - ESIEE Paris - Unité Sécurité Cloud*
