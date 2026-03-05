import { stringToHex, keccak256, recoverAddress } from "viem";

/**
 * Main Webhook Handler for Chainlink CRE
 * Triggered by the AgentScore Gateway before responding to the Client.
 * @param request Body containing { agentId, rawPayload, responseTime }
 */
export async function handleAgentAudit(request: any) {
    const { agentId, rawPayload, responseTime } = request.body;

    let scoreDelta = 0;
    let validationMessages: string[] = [];
    let parsedPayload: any;
    let keepValidating = true;

    console.log(`[CRE Auditor] Auditing response from Agent TokenID: ${agentId} `);

    // ==========================================
    // A. SYNTAX VALIDATION
    // ==========================================
    try {
        parsedPayload = JSON.parse(rawPayload);
        validationMessages.push("Syntax: OK");
    } catch (error) {
        scoreDelta -= 5;
        validationMessages.push("Syntax: FAILED");
        keepValidating = false;
    }

    if (keepValidating) {
        // ==========================================
        // B. SCHEMA VALIDATION
        // ==========================================
        const hasResponse = !!parsedPayload.response;
        const hasData = !!parsedPayload.data;

        if (hasResponse || hasData) {
            validationMessages.push("Schema: OK");
        } else {
            scoreDelta -= 5;
            validationMessages.push("Schema: FAILED (Missing 'response' or 'data')");
            keepValidating = false;
        }
    }

    if (keepValidating) {
        // ==========================================
        // C. CONTENT SAFETY (-20 Penalty)
        // ==========================================
        const forbiddenPatterns = ["ignore previous instructions", "system prompt"];
        const payloadString = JSON.stringify(parsedPayload).toLowerCase();
        const safetyViolation = forbiddenPatterns.some(pattern => payloadString.includes(pattern));

        if (safetyViolation) {
            scoreDelta -= 20;
            validationMessages.push("Safety: FAILED (Prompt Injection Detected)");
            keepValidating = false;
        } else {
            validationMessages.push("Safety: OK");
        }
    }

    if (keepValidating) {
        // ==========================================
        // D. SEMANTIC DENSITY (-5 Penalty)
        // ==========================================
        if (typeof parsedPayload.response === 'string') {
            const wordCount = parsedPayload.response.split(" ").length;
            if (wordCount < 25) {
                scoreDelta -= 5;
                validationMessages.push(`Density: FAILED(${wordCount} words - Too brief)`);
                keepValidating = false;
            } else {
                validationMessages.push(`Density: OK(${wordCount} words)`);
            }
        } else {
            scoreDelta -= 5;
            validationMessages.push("Density: FAILED (Missing string response)");
            keepValidating = false;
        }
    }

    if (keepValidating) {
        // ==========================================
        // E. CRYPTOGRAPHIC ATTESTATION (-20 Penalty)
        // ==========================================
        if (parsedPayload.signature && parsedPayload.data && parsedPayload.agent_address) {
            try {
                const messageStr = JSON.stringify(parsedPayload.data);
                const messageHash = keccak256(stringToHex(messageStr));
                const recoveredAddress = await recoverAddress({
                    hash: messageHash,
                    signature: parsedPayload.signature
                });

                if (recoveredAddress.toLowerCase() !== parsedPayload.agent_address.toLowerCase()) {
                    scoreDelta -= 20;
                    validationMessages.push("Crypto Attestation: FAILED (Spoofed Signature)");
                    keepValidating = false;
                } else {
                    validationMessages.push("Crypto Attestation: OK (Verified Signature)");
                }
            } catch (err) {
                scoreDelta -= 20;
                validationMessages.push("Crypto Attestation: FAILED (Invalid Signature Format)");
                keepValidating = false;
            }
        } else {
            scoreDelta -= 20;
            validationMessages.push("Crypto Attestation: FAILED (Missing Signature/Data)");
            keepValidating = false;
        }
    }

    if (keepValidating) {
        // ==========================================
        // F. PERFORMANCE SLA (Tiered Latency / Post-Validation)
        // ==========================================
        if (typeof responseTime === 'number') {
            if (responseTime > 60000) {
                scoreDelta -= 10;
                validationMessages.push(`Performance: DEAD TRACE(${responseTime}ms)`);
            } else if (responseTime > 30000) {
                scoreDelta -= 4;
                validationMessages.push(`Performance: CRITICAL DELAY(${responseTime}ms)`);
            } else if (responseTime > 5000) {
                scoreDelta -= 2;
                validationMessages.push(`Performance: SLOW(${responseTime}ms)`);
            } else {
                validationMessages.push(`Performance: OK(${responseTime}ms)`);
            }
        } else {
            scoreDelta -= 5;
            validationMessages.push("Performance: FAILED (Missing Latency Metric)");
        }
    }

    // ==========================================
    // AGGREGATE POST-VALIDATION SCORE (+10)
    // Applied once if the payload passed SLAs
    // ==========================================
    if (scoreDelta > -5) {
        scoreDelta += 10;
    }

    // ==========================================
    // RESULT: BLOCKCHAIN FINALIZATION
    // ==========================================
    const validationMessage = validationMessages.join(" | ");
    const isValidSla = scoreDelta > 0;

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