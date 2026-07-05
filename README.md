# Blockchain-Supported Federated Learning Simulation for Healthcare

This project demonstrates how blockchain can support auditability, reputation tracking, and incentive mechanisms in a federated learning workflow. It combines a multi-client federated learning simulation with Ethereum smart contracts that log model updates, performance metrics, model hashes, client reputation, and token-based rewards.

The project was developed as part of doctoral coursework exploring privacy-preserving machine learning, federated learning governance, and secure healthcare data collaboration.

## Project Overview

Federated learning allows multiple organizations to collaboratively train machine learning models without directly sharing raw data. This project simulates that process using multiple local clients and a central federated learning coordinator. Blockchain is used as an audit and governance layer to record training activity and support transparent tracking of client contributions.

The system includes:

* Multi-client federated learning simulation
* Flower-based federated averaging workflow
* Python machine learning pipeline
* Ethereum smart contract for model update logging
* Client reputation and token reward tracking
* SHA-256 model hash generation for provenance
* Automated JSON export and PDF reporting
* Hardhat-based smart contract testing and deployment

## Tech Stack

**Machine Learning & Data Processing**

* Python
* Flower
* PyTorch / scikit-learn
* pandas
* NumPy
* joblib

**Blockchain**

* Solidity
* Hardhat 3
* Ethereum local development network
* viem
* TypeScript

**Automation & Reporting**

* Python scripts
* ReportLab
* JSON exports
* Node.js test runner

## Key Features

### Federated Learning Simulation

The project simulates multiple clients training locally on separate datasets. Model updates are aggregated through a federated learning workflow, allowing collaborative model improvement without direct raw data sharing.

### Blockchain Audit Logging

Each submitted model update can be logged to a smart contract with metadata such as:

* Client ID
* Round number
* Model version
* Performance metric
* Model hash
* Submission address
* Acceptance status
* Reputation change
* Token reward amount

### Reputation and Rewards

The smart contract tracks client participation and contribution quality through reputation scores and token-based rewards. This demonstrates how blockchain can support incentive mechanisms in federated learning environments.

### Automated Workflow

The project includes scripts for:

* Preparing client datasets
* Running federated learning rounds
* Exporting model update metadata
* Submitting updates to the blockchain
* Checking logged updates and client reputation
* Generating a summary report

## Project Structure

```text
contracts/              Solidity smart contracts
ignition/modules/       Hardhat Ignition deployment modules
scripts/                TypeScript blockchain interaction scripts
test/                   Smart contract tests
ml/                     Python ML and reporting workflow
flwr_app/               Flower federated learning application
clients/                Local simulated client data and outputs
```

## Running the Project

Install dependencies for the Hardhat project:

```bash
npm install
```

Create and activate a Python virtual environment:

```bash
python -m venv .venv
```

On Windows:

```bash
.venv\Scripts\activate
```

On macOS/Linux:

```bash
source .venv/bin/activate
```

Install Python dependencies:

```bash
pip install -r requirements.txt
```

Run smart contract tests:

```bash
npx hardhat test
```

Start a local Hardhat node:

```bash
npx hardhat node
```

Deploy the smart contract locally:

```bash
npx hardhat ignition deploy ignition/modules/FederatedTrainingCoordinator.ts --network localhost
```

Run the Python federated learning workflow:

```bash
python ml/run_full_project.py
```

Check submitted model updates:

```bash
npx hardhat run scripts/checkUpdates.ts --network localhost
```

Check client reputation:

```bash
npx hardhat run scripts/checkReputation.ts --network localhost
```

## Limitations

This project is a simulation and proof of concept. The federated learning workflow uses a central coordinator, and blockchain is used for audit logging, reputation tracking, and incentives rather than fully decentralized model aggregation. Future work could explore decentralized coordination, on-chain validation, stronger privacy protections, and production-grade deployment patterns.

## Purpose

The goal of this project is to explore how federated learning, blockchain, and healthcare data governance concepts can be combined to support more transparent and accountable machine learning collaboration across organizations.
