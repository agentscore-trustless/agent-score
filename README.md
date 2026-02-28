<div align="center">
    <img src="site/public/images/agent_score_logo.jpg" alt="AgentScore Logo" width="250">
</div>

# 🛡️ AgentScore Protocol
**Trustless AI Reputation Protocol via ERC-8004 & Chainlink CRE**

[![Chainlink Convergence Hackathon](https://img.shields.io/badge/Chainlink-Convergence_Hackathon-2A5ADA?style=flat-square&logo=chainlink)](#)
[![Deployed on Base](https://img.shields.io/badge/Deployed_on-Base_(Tenderly_Virtual_Testnet)-0052FF?style=flat-square&logo=base)](#)
[![ERC-8004](https://img.shields.io/badge/EIP-ERC--8004_Draft-blueviolet?style=flat-square)](#)

AgentScore is a decentralized Quality Assurance and Reputation infrastructure designed for Sovereign AI Agents. In a Machine-to-Machine (M2M) economy, relying on human-voted reputation is flawed and easily manipulated. AgentScore enforces an unavoidable, deterministic audit trail using **Chainlink CRE** and **L402 Paywalls** to guarantee that AI agents (like OpenClaw) deliver high-quality, hallucination-free data before they can build on-chain reputation.

### 🔗 Quick Links
- **💻 Technical Demo Video:** [Link to YouTube/Vimeo]
- **🌐 Live Dashboard:** [https://agent-score-protocol.vercel.app](https://agent-score-protocol.vercel.app)
- **📜 Smart Contract (Base Sepolia):** [Link to Tenderly/BaseScan]

---

## 🏗️ Architecture & Technical Stack
This monorepo is divided into decoupled micro-services, each handling a specific pillar of the M2M economy. 

**For detailed technical instructions on how to run or deploy each specific portion of the protocol, please click into their respective directory READMEs below:**

| Component | Description | Technologies Built With |
| :--- | :--- | :--- |
| **[`/contracts`](./contracts/README.md)** | The ERC-8004 AgentScore Registry deployed on Base. | Solidity, Foundry, OpenZeppelin |
| **[`/cre-workflow`](./cre-workflow/README.md)** | The Deterministic Quality Auditor triggering on-chain updates. | Chainlink CRE, JSON SLAs |
| **[`/site`](./site/README.md)** | The real-time dashboard plotting immutable agent audit scores. | Next.js 14, Tailwind CSS, Recharts |
| **[`/agent`](./agent/README.md)** | The mocked LLM persona (e.g., OpenClaw) performing M2M tasks. | Python/Node, OpenAI API |
| **[`/x402-gateway`](./x402-gateway/README.md)** | The middleware proxy enforcing HTTP 402 Paywalls and audits. | TypeScript, Express |

---

## 🏆 Chainlink Convergence Hackathon Tracks
* **Chainlink CRE / Workflows:** We heavily utilized Chainlink CRE as a decentralized, deterministic auditor to evaluate the AI Agent's output payloads against predefined SLAs and trigger on-chain reputation updates via the Contract Writer Capability.
* **Base:** The ERC-8004 Agent Registry is deployed on the Base network (via Tenderly Virtual Testnet initially), leveraging its low latency and cheap operational costs which makes frequent M2M reputation updates financially viable.

---

## 👥 The Team

Built with ☕ and 💻 for the Chainlink Convergence Hackathon.

* **Pablo** - Smart Contracts & Chainlink CRE Workflows & Frontend
* **Antônio** - OpenClaw Agent AI & Payment Gateway Integration & Presentation

Thanks to Gemini for the help with some issues.