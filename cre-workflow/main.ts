import { cre, prepareReportRequest, handler, Runner, type Runtime, type HTTPPayload } from "@chainlink/cre-sdk";
import { encodeAbiParameters, parseAbiParameters, stringToHex, keccak256, recoverAddress, type Address, type Hex } from "viem";

// Define the runtime configuration injection interface
type Config = {
    contractAddress: string,
    authorizedEVMAddress: string
};

/**
 * Main Webhook Handler for Chainlink CRE
 * Triggered by the AgentScore Gateway before responding to the Client.
 * @param request Body containing { agentId, rawPayload, responseTime }
 */
async function handleAgentAudit(request: any) {
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

// IReceiver Payload Format
/**
 * ======================================================================
 * CHAINLINK CRE + WORKFLOW EXECUTOR
 * ======================================================================
 * This runs on the Decentralized Oracle Network (DON). It receives the 
 * payload from the Webhook Trigger Capability, executes our custom
 * mathematical `handleAgentAudit`, and routes positive outcomes to 
 * the Chainlink EVM Contract Writer Capability.
 */
const onHttpTrigger = async (runtime: Runtime<Config>, request: HTTPPayload): Promise<any> => {
    runtime.log("\n[Chainlink DON] 1. Webhook Trigger Capability Fired");

    // Decode the incoming request input (Uint8Array) into a JSON object
    const decodedInput = new TextDecoder().decode(request.input);
    const parsedBody = JSON.parse(decodedInput);

    // Reconstruct the expected shape for `handleAgentAudit`
    const requestObject = { body: parsedBody };

    // 1. Custom Compute Capability (CRE): Execute our SLA Mathematics
    runtime.log("[Chainlink DON] 2. Executing Custom Compute Capability (CRE)...");
    const auditResult = await handleAgentAudit(requestObject);

    const scoreDelta = auditResult.body.reputationImpact;
    const isValidSla = auditResult.body.auditStatus === "PASSED";

    // 2. Contract Writer Capability: Write to Base Testnet
    runtime.log(`[Chainlink DON] 3. Submitting Assertion for Contract Writer Capability`);
    try {
        const evm = new cre.capabilities.EVMClient(cre.capabilities.EVMClient.SUPPORTED_CHAIN_SELECTORS['ethereum-testnet-sepolia-base-1']);

        // Convert audit message into variable-length bytes (Hex string)
        const evidenceData = stringToHex(auditResult.body.message) as Hex;

        const writeData = encodeAbiParameters(
            parseAbiParameters('uint256, int256, bytes'),
            [
                BigInt(parsedBody.agentId || 1),
                BigInt(scoreDelta),
                evidenceData
            ]
        );

        runtime.log(`   └─ Tx -> onReport(AgentID: ${parsedBody.agentId}, Delta: ${scoreDelta > 0 ? '+' : ''}${scoreDelta}, Evidence: ...${evidenceData.substring(0, 8)})`);

        const report = runtime.report(prepareReportRequest(writeData)).result();

        const tx = evm.writeReport(runtime, {
            receiver: runtime.config.contractAddress,
            report: report,
            gasConfig: {
                gasLimit: "1000000",
            },
        }).result();

        runtime.log(`   └─ Success: Triggered capability ${cre.capabilities.EVMClient.CAPABILITY_ID}`);

    } catch (err: any) {
        runtime.log(`   └─ Error submitting assertion via DON: ${err.message}`);
    }

    // Return the audited payload back through the HTTP capability to the Gateway
    return auditResult;
};

const initWorkflow = (config: Config) => {
    const http = new cre.capabilities.HTTPCapability();

    return [
        handler(
            http.trigger({
                authorizedKeys: [
                    {
                        type: "KEY_TYPE_ECDSA_EVM",
                        publicKey: config.authorizedEVMAddress,
                    },
                ],
            }),
            (runtime: Runtime<Config>, request: HTTPPayload) => onHttpTrigger(runtime, request)
        ),
    ];
};

export async function main() {
    const runner = await Runner.newRunner<Config>({});
    await runner.run(initWorkflow);
}