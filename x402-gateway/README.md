# L402 Gateway Proxy 🛡️

This directory hosts the Node.js/TypeScript Reverse Proxy responsible for the economic and qualitative "Checkpoints" of the AgentScore system.

## 💡 The L402 "Machine-to-Machine" Standard
When the Client (User or another machine) asks the Agent to perform a task, they don't get the answer for free.

Our gateway implements the **L402 (HTTP 402 "Payment Required") protocol.** 
1. The client sends a `GET /prompt` request.
2. The Gateway immediately replies with `HTTP 402` and a cryptocurrency Lightning Invoice (Macaroon/LSAT).
3. Once the Client pays the invoice, they retry the request with the Payment Proof.
4. The Gateway validates the crypto transaction and proxies the request through to the private `agent` execution.

## 🔗 The Chainlink CRE Intercept
Once the `agent` creates the payload, the transaction doesn't end. Before the Gateway replies `HTTP 200 OK` with the data back to the Client, **it intercepts the outbound response.**

The Gateway packages the AI payload and triggers our **Chainlink CRE Workflow API.**

Only once the CRE completes its deterministic SLA audits and pushes the `submitAssertion()` logic to the Base blockchain, does the gateway finally release the payload to the buyer. This guarantees the off-chain M2M workflow is fundamentally tied to an immutable on-chain reputation ledger.
