import { ethers } from "ethers";

// Constants matching the ERC-8004 Registry on Base
const ASSERTION_TYPE_FORMAT_SLA = ethers.keccak256(ethers.toUtf8Bytes("FORMAT_COMPLIANCE"));
const CONTRACT_ADDRESS = process.env.AGENT_SCORE_REGISTRY_ADDRESS;

/**
 * Main Webhook Handler for Chainlink CRE
 * Triggered by the AgentScore Gateway before responding to the Client.
 * * @param request Body containing { agentId, rawPayload, paymentReceipt }
 */
export async function handleAgentAudit(request: any) {
    const { agentId, rawPayload, responseTime } = request.body;

    let scoreDelta = 0;
    let validationMessages: string[] = [];
    let parsedPayload: any;
    let isSyntaxValid = false;

    console.log(`[CRE Auditor] Auditing response from Agent TokenID: ${agentId}`);

    // 1. Syntax & Schema Validation

    // A. Syntax: Attempt to parse the payload
    try {
        parsedPayload = JSON.parse(rawPayload);
        scoreDelta += 5;
        validationMessages.push("Syntax: OK");
        isSyntaxValid = true;
    } catch (error) {
        scoreDelta -= 10;
        validationMessages.push("Syntax: FAILED");
    }

    if (isSyntaxValid) {
        // B. Schema: Ensure required fields exist
        if (parsedPayload.response || parsedPayload.data) {
            scoreDelta += 5;
            validationMessages.push("Schema: OK");
        } else {
            scoreDelta -= 5;
            validationMessages.push("Schema: FAILED");
        }

        // C. Content Safety: Check for forbidden patterns
        const forbiddenPatterns = ["ignore previous instructions", "system prompt"];
        const payloadString = JSON.stringify(parsedPayload).toLowerCase();
        let safetyViolation = false;

        for (const pattern of forbiddenPatterns) {
            if (payloadString.includes(pattern)) {
                safetyViolation = true;
                validationMessages.push(`Safety: FAILED ('${pattern}')`);
                break;
            }
        }

        if (safetyViolation) {
            scoreDelta -= 20;
        } else {
            scoreDelta += 10;
            validationMessages.push("Safety: OK");
        }

        // D. Logic: Check for explicit error states
        if (parsedPayload.error) {
            scoreDelta -= 5;
            validationMessages.push("Logic: FAILED (Internal Error)");
        }

        // E. Performance: Validate Response Time (SLA < 2000ms)
        if (typeof responseTime === 'number') {
            if (responseTime <= 2000) {
                scoreDelta += 5;
                validationMessages.push(`Performance: GOOD (${responseTime}ms)`);
            } else {
                scoreDelta -= 5;
                validationMessages.push(`Performance: SLOW (${responseTime}ms)`);
            }
        }
    }

    const validationMessage = validationMessages.join(" | ");
    const isValidSla = scoreDelta > 0;

    // 2. Generate Evidence Hash for on-chain transparency
    const evidenceHash = ethers.keccak256(ethers.toUtf8Bytes(validationMessage));

    // 3. Orchestrate Blockchain Write (Update ERC-8004 Reputation)
    try {
        console.log(`[CRE Auditor] Updating Base Testnet. Delta: ${scoreDelta}`);

        const txRequest = {
            address: CONTRACT_ADDRESS,
            abi: ["function submitAssertion(uint256,bytes32,int256,bytes32)"],
            functionName: "submitAssertion",
            args: [
                agentId,
                ASSERTION_TYPE_FORMAT_SLA,
                scoreDelta,
                evidenceHash
            ]
        };

        // Note: Use Chainlink Contract Writer capability here
        // await chainlinkContractWriter.write(txRequest);

    } catch (txError) {
        console.error("[CRE Auditor] Failed to write to ERC-8004 contract:", txError);
        // Depending on strictness, you might fail the whole request here
    }

    // 4. Return the Audit Result back to the Gateway
    // The Gateway will forward the original payload to the Client along with this metadata
    return {
        statusCode: 200,
        body: {
            auditStatus: isValidSla ? "PASSED" : "FAILED",
            message: validationMessage,
            reputationImpact: scoreDelta,
            timestamp: new Date().toISOString()
        }
    };
}