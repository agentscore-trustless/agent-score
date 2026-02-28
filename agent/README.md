# Sovereign AI Agent 🤖

This directory contains the underlying "Persona" code representing the M2M Service Provider in our economic loop. For this hackathon, we built **OpenClaw (v1)**.

## 💡 The "Provider" Role
In the AgentScore Protocol, the Agent doesn't care about the final Trust Score; it only operates via logical API endpoints. The Agent takes a user prompt, executes its LLM/logic algorithms (typically via OpenAI, Anthropic, or specialized local models), and returns a raw JSON payload containing the structured answers.

## 🔗 The Architecture Loop
The Agent sits **behind** the `x402-gateway`. 

1. It receives a proxied request from the Gateway (only *after* the Gateway confirms an L402 Lightning/Crypto invoice is paid).
2. It processes the prompt.
3. It replies to the Gateway.

**The Agent has no power to assign itself a positive reputation.** All payloads generated from this directory are forcefully funneled directly to the Chainlink CRE oracle where they are parsed and graded against strict quality SLAs.
