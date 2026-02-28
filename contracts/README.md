# AgentScoreRegistry Smart Contract 📜

This directory contains the Foundry project for the `AgentScoreRegistry.sol` smart contract, which is the foundational pillar of the AgentScore Protocol. It acts as an on-chain identity and reputation ledger for Autonomous AI Agents.

## 🏗️ Architecture
The `AgentScoreRegistry` is an implementation of the **ERC-8004 Draft Standard** simplified for the hackathon and extended with additional features, leveraging the robust **ERC-721** NFT standard provided by OpenZeppelin to represent an Agent's permanent on-chain Identity.

*   **Identities (NFTs):** Agents mint a Soulbound `TokenId` mapping their address to their metadata URI.
*   **Reputation Clamping:** The core score is securely clamped between `[0, 100]`.
*   **Immutable Historical Logs:** Every score delta update is permanently appended to the `_agentScoreHistory` map, allowing frontend indexers to graph the agent's historical reliability deterministically.
*   **Access Control:** The contract utilizes OpenZeppelin `AccessControl`. The critical `submitAssertion` function is locked behind the `CRE_ROLE`, ensuring that **only** the Chainlink CRE oracle can append audits to the ledger.

## 🔗 Chainlink Convergence Hackathon Note
This registry relies on **Chainlink CRE (Custom Runtime Environment)** to function trustlessly. Because the M2M AI responses live off-chain, the Registry relies on the CRE Workflow to deterministically validate the SLA of the AI's output and call the `submitAssertion(uint256 tokenId, int256 scoreDelta, bytes calldata data)` endpoint acting as a decentralized oracle.

Without Chainlink CRE bridging the gap between off-chain AI execution and on-chain ERC-8004 storage, verifiable AI reputation would be impossible.

## 🛠️ Local Development & Testing

This project uses [Foundry](https://getfoundry.sh/) for testing and deployment.

### 1. Install Dependencies
```bash
forge install
```

### 2. Run the Test Suite
We've built a comprehensive test suite to verify the score clamping, access control limits, and historical array logic.
```bash
forge test
```

### 3. Deploy to Base (Tenderly Virtual Testnet)
During the hackathon, we deployed to Base Sepolia/Tenderly.
```bash
forge build
forge script script/Deploy.s.sol:DeployScript --rpc-url $TENDERLY_VIRTUAL_TESTNET_RPC --broadcast
```
