# 402 Gateway Proxy 🛡️

This directory hosts the Next.js Serverless API Routes responsible for the economic and qualitative "Checkpoints" of the AgentScore system. (Previously a standalone Express server).

## 💡 The 402 "Machine-to-Machine" Standard
When the Client asks an AI Agent to perform a task, they must pay for the computational and data resources used.

Our gateway implements the **HTTP 402 "Payment Required"** protocol directly within Next.js API Routes:
1. **Request (`/api/request-service`)**: The client sends a prompt. If no payment token is provided, the gateway rejects it with `HTTP 402` and generates a unique `invoiceId`.
2. **Payment (`/api/pay-invoice`)**: The client pays the invoice. The gateway verifies the transaction and issues a cryptographically signed Token (Macaroon/JWT).
3. **Execution**: The client retries `/api/request-service` with the Token. The gateway validates it, processes the prompt through the AI Agent, and prepares the data for the Chainlink Oracle.

## 🔗 The Chainlink CRE Intercept
Once the `agent` creates the payload, the transaction doesn't end. Before the Gateway replies `HTTP 200 OK` with the data back to the Client, **it intercepts the outbound response.**

The Gateway packages the AI payload and triggers our **Chainlink CRE Workflow API.**

Only once the CRE completes its deterministic SLA audits and pushes the `submitAssertion()` logic to the Base blockchain, does the gateway finally release the payload to the buyer. This guarantees the off-chain M2M workflow is fundamentally tied to an immutable on-chain reputation ledger.
