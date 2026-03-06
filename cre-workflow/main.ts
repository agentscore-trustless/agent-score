import { cre, prepareReportRequest, handler, Runner, type Runtime, type HTTPPayload } from "@chainlink/cre-sdk";
import { handleAgentAudit } from './auditor'
import { encodeFunctionData, stringToHex, type Address, type Hex } from "viem";

// Define the runtime configuration injection interface
type Config = {
    contractAddress: string,
    authorizedEVMAddress: string
};

// ABI for the Base Sepolia Registry
const AGENT_SCORE_REGISTRY_ABI = [
    {
        type: "function",
        name: "submitAssertion",
        inputs: [
            { name: "agentId", type: "uint256" },
            { name: "scoreDelta", type: "int256" },
            { name: "evidenceHash", type: "bytes32" }
        ],
        outputs: []
    }
];

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
    runtime.log(`[Chainlink DON] 3. Evaluating Output for Contract Writer Capability`);
    if (isValidSla) {
        try {
            const evm = new cre.capabilities.EVMClient(cre.capabilities.EVMClient.SUPPORTED_CHAIN_SELECTORS['ethereum-testnet-sepolia-base-1']);

            // Create 32-byte Evidence Hash dynamically from audit message
            const evidenceHash = stringToHex(auditResult.body.message.substring(0, 32), { size: 32 }) as Hex;

            const writeData = encodeFunctionData({
                abi: AGENT_SCORE_REGISTRY_ABI,
                functionName: "submitAssertion",
                args: [
                    BigInt(parsedBody.agentId || 1),
                    BigInt(scoreDelta),
                    evidenceHash
                ]
            });

            runtime.log(`   └─ Tx -> submitAssertion(AgentID: ${parsedBody.agentId}, Delta: +${scoreDelta}, Evidence: ...${evidenceHash.substring(0, 8)})`);

            const report = runtime.report(prepareReportRequest(writeData)).result();

            const tx = evm.writeReport(runtime, {
                receiver: runtime.config.contractAddress,
                report: report
            }).result();

            runtime.log(`   └─ Success: Triggered capability ${cre.capabilities.EVMClient.CAPABILITY_ID}`);

        } catch (err: any) {
            runtime.log(`   └─ Error submitting assertion via DON: ${err.message}`);
        }
    } else {
        runtime.log(`   └─ SLA FAILED (${scoreDelta}). Aborting Contract Writer Capability.`);
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