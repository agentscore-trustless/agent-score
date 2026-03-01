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
        scoreDelta += 2;
        validationMessages.push("Syntax: OK");
        isSyntaxValid = true;
    } catch (error) {
        scoreDelta -= 5;
        validationMessages.push("Syntax: FAILED");
    }

    if (isSyntaxValid) {
        let isSchemaValid = false;
        // B. Schema: Ensure required fields exist
        if (parsedPayload.response || parsedPayload.data) {
            scoreDelta += 2;
            validationMessages.push("Schema: OK");
            isSchemaValid = true;
        } else {
            scoreDelta -= 5;
            validationMessages.push("Schema: FAILED");
        }

        if (isSchemaValid) {
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
                scoreDelta -= 50;
            } else {
                scoreDelta += 2;
                validationMessages.push("Safety: OK");
            }

            // D. Semantic Density/Minimum Output Length
            // Checking if the actual 'response' block contains enough detail
            if (parsedPayload.response && typeof parsedPayload.response === 'string') {
                const wordCount = parsedPayload.response.split(" ").length;
                if (wordCount < 25) {
                    scoreDelta -= 5;
                    validationMessages.push(`Data Density: FAILED (Analysis too brief: ${wordCount} words)`);
                } else {
                    scoreDelta += 2;
                    validationMessages.push(`Data Density: OK (${wordCount} words)`);
                }
            }

            // E. Cryptographic Authorship Verification
            // Ensures the payload wasn't spoofed by the Gateway, but actually signed by the Agent's private key
            if (parsedPayload.signature && parsedPayload.data) {
                try {
                    // In production, the Expected Agent Address would be fetched via the TokenID from the Base contract
                    // For this validation, we recover the signer from the hashed data payload
                    const messageHash = ethers.id(JSON.stringify(parsedPayload.data));
                    const recoveredAddress = ethers.verifyMessage(messageHash, parsedPayload.signature);

                    // Assuming parsedPayload.agent_address is the public key they claim to be
                    if (recoveredAddress.toLowerCase() !== parsedPayload.agent_address?.toLowerCase()) {
                        scoreDelta -= 50; // Penalty for spoofing
                        validationMessages.push("Cryptographic Attestation: FAILED (Spoofed Signature)");
                    } else {
                        scoreDelta += 2;
                        validationMessages.push("Cryptographic Attestation: OK (Verified Signature)");
                    }
                } catch (err) {
                    scoreDelta -= 50;
                    validationMessages.push("Cryptographic Attestation: FAILED (Invalid Signature Format)");
                }
            } else {
                scoreDelta -= 5;
                validationMessages.push("Cryptographic Attestation: FAILED (Missing Signature)");
            }
        }

        // F. Performance: Tiered Validation Response Time
        if (typeof responseTime === 'number') {
            if (responseTime > 60000) {
                scoreDelta -= 20;
                validationMessages.push(`Performance: DEAD TRACE (${responseTime}ms)`);
                // Optional: forcefully fail the SLA completely if it exceeds 1 minute
                // isSyntaxValid = false; // or return early
            } else if (responseTime > 30000) {
                scoreDelta -= 10;
                validationMessages.push(`Performance: CRITICAL DELAY (${responseTime}ms)`);
            } else if (responseTime > 5000) {
                scoreDelta -= 5;
                validationMessages.push(`Performance: SLOW (${responseTime}ms)`);
            } else {
                scoreDelta += 2;
                validationMessages.push(`Performance: GOOD (${responseTime}ms)`);
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