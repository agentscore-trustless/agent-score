# 🛡️ AgentScore Protocol
**Trustless AI Reputation Protocol via ERC-8004 & Chainlink CRE**

[![Chainlink Convergence Hackathon](https://img.shields.io/badge/Chainlink-Convergence_Hackathon-2A5ADA?style=flat-square&logo=chainlink)](#)
[![Deployed on Base](https://img.shields.io/badge/Deployed_on-Base_(Tenderly_Virtual_Testnet)-0052FF?style=flat-square&logo=base)](#)
[![L402 Standard](https://img.shields.io/badge/Standard-L402_Paywall-F7931A?style=flat-square)](#)
[![ERC-8004](https://img.shields.io/badge/EIP-ERC--8004_Draft-blueviolet?style=flat-square)](#)

AgentScore is a decentralized Quality Assurance and Reputation infrastructure for Sovereign AI Agents. We enforce an unavoidable audit trail using **Chainlink CRE** and **L402 Paywalls** to guarantee that AI agents (like OpenClaw) deliver high-quality, hallucination-free data before they can build on-chain reputation.

### 🔗 Quick Links
- **📹 Pitch Video (2 mins):** [Link to YouTube/Vimeo]
- **💻 Technical Demo Video:** [Link to YouTube/Vimeo]
- **🌐 Live Dashboard (Next.js):** [Link to Vercel/Netlify Deployment]
- **📜 Smart Contract (Base Sepolia):** [Link to Tenderly/BaseScan]
- **⛓️ Chainlink CRE Workflow:** [Link to Workflow / UUID]

---

## 💡 The Problem
In a Machine-to-Machine (M2M) economy, how can a client trust a Sovereign AI Agent? If an agent charges a user via an L402 paywall but returns hallucinated or incorrectly formatted data, the user loses money, and the agent faces no consequences. Current reputation systems rely on manual user feedback, which can be easily manipulated.

## 🚀 Our Solution: The Quality Gateway
AgentScore introduces a mandatory middleware gateway that intercepts the AI's response. Before the data is delivered to the client, it is autonomously audited by **Chainlink CRE**.

1. **Client Pays:** User pays the L402 invoice to request a task.
2. **AI Executes:** The OpenClaw agent generates a payload.
3. **Mandatory Audit:** The Gateway sends the payload to Chainlink CRE.
4. **Deterministic Validation:** The CRE workflow validates the data structure (SLA).
5. **On-chain Reputation:** The CRE acts as an oracle, updating the agent's **ERC-8004** NFT score on the **Base** blockchain.



## 🏗️ Architecture & Repository Structure
This monorepo contains the three core pillars of the AgentScore Protocol:

* `/contracts` **(Foundry/Solidity):** The `AgentScoreRegistry` implementing the ERC-8004 draft. It combines an ERC-721 Identity Registry with a Reputation system clamped between 0-100.
* `/gateway` **(Node.js/TypeScript):** The API Gateway that handles the HTTP 402 Payment Required flow, routes tasks to the OpenClaw agent, and enforces the Chainlink CRE audit.
* `/frontend` **(Next.js/Tailwind):** A real-time dashboard that reads from the Base blockchain using `ethers.js` to display the agent's live score and an immutable audit trail.

## 🏆 Hackathon Tracks & Bounties
* **Chainlink CRE / Workflows:** We utilized Chainlink CRE as a decentralized, deterministic auditor to evaluate AI payloads and trigger on-chain transactions via the Contract Writer capability.
* **Base:** The ERC-8004 Agent Registry is deployed on the Base (Tenderly Virtual Testnet), leveraging its low latency and cheap fees for frequent reputation updates.

## 🛠️ How to Run Locally

### 1. Smart Contracts
```bash
cd contracts
forge install
forge build
forge script script/Deploy.s.sol:DeployScript --rpc-url $TENDERLY_VIRTUAL_TESTNET_RPC --broadcast
```

## 👥 The Team

Built with ☕ and 💻 for the Chainlink Convergence Hackathon.

Pablo - Smart Contracts & CRE Chainlink

Antônio - OpenClaw Agent & L402 Gateway Integration