import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { Wallet, id, getBytes } from 'ethers';
import { pendingInvoices, validTokens } from '../pay-invoice/route';
import { createJWT, type JSONRPCRequest } from './jwt';

// For local testing use absolute localhost if needed, but on Vercel we'll hit relative path
const CRE_WEBHOOK_URL = process.env.CRE_WEBHOOK_URL || (process.env.NODE_ENV === 'development' ? "http://localhost:3001/api/mock-cre" : "https://agent-score-protocol.vercel.app/api/mock-cre");

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { agentId, userPrompt } = body;

        if (!agentId || !userPrompt) {
            return NextResponse.json({ error: "Missing agentId or userPrompt in request body." }, { status: 400 });
        }

        const authHeader = req.headers.get('authorization');

        // --- PHASE 1: THE 402 PAYWALL (L402) ---
        if (!authHeader || !authHeader.startsWith('L402 ')) {
            console.log(`[Gateway] No valid token. Generating 402 for Agent #${agentId}.`);

            const invoiceId = uuidv4();
            const mockInvoiceStr = `lnbc10u1...mock_invoice_${invoiceId}`;

            pendingInvoices.set(invoiceId, { status: 'pending', amount: 10 });

            // Using standard NextResponse format
            return NextResponse.json({
                error: "Payment Required",
                invoiceId: invoiceId,
                message: "Please pay the invoice to receive an L402 token, then retry with the Authorization header."
            }, {
                status: 402,
                headers: {
                    'Www-Authenticate': `L402 invoice="${mockInvoiceStr}"`
                }
            });
        }

        const providedToken = authHeader.split(' ')[1];
        if (!validTokens.has(providedToken)) {
            console.log(`[Gateway] Invalid or expired token provided.`);
            return NextResponse.json({ error: "Unauthorized. Invalid payment token." }, { status: 401 });
        }

        console.log(`[Gateway] Payment verified! Routing prompt to Agent #${agentId}...`);
        validTokens.delete(providedToken); // Single-use token

        // --- PHASE 2: OPENCLAW EXECUTION ---
        console.log(`[Gateway] Triggering OpenClaw Engine...`);
        const startTime = Date.now();
        const openClawRawResponse = await simulateOpenClawExecution(userPrompt);
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        // --- PHASE 3: QUALITY AUDIT (CHAINLINK CRE) ---
        console.log(`[Gateway] Task complete (${responseTime}ms). Sending to Chainlink CRE...`);

        let auditData;
        try {
            // Note: In Next.js App Router we fetch absolute URLs on the server wrapper
            const hostUrl = req.headers.get('host');
            const protocol = hostUrl?.includes('localhost') ? 'http' : 'https';
            const dynamicWebhookUrl = process.env.CRE_WEBHOOK_URL || `${protocol}://${hostUrl}/api/mock-cre`;

            const isLiveDON = !!process.env.CRE_WORKFLOW_ID && !!process.env.CRE_ETH_PRIVATE_KEY;

            let fetchOptions: RequestInit;

            if (isLiveDON) {
                // Official Chainlink CRE JSON-RPC Format
                const jsonRpcPayload: JSONRPCRequest = {
                    id: uuidv4(),
                    jsonrpc: "2.0",
                    method: "workflows.execute",
                    params: {
                        input: {
                            agentId: Number(agentId),
                            rawPayload: openClawRawResponse,
                            responseTime: Number(responseTime)
                        },
                        workflow: {
                            workflowID: process.env.CRE_WORKFLOW_ID as string
                        }
                    }
                };

                // Generate dynamic signature based on payload hash using the Server's Wallet Key
                const signedToken = await createJWT(jsonRpcPayload, process.env.CRE_ETH_PRIVATE_KEY as string);

                fetchOptions = {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${signedToken}`
                    },
                    body: JSON.stringify(jsonRpcPayload)
                };
            } else {
                // Local Mock Endpoint Format
                fetchOptions = {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        agentId: agentId,
                        rawPayload: openClawRawResponse,
                        responseTime: responseTime
                    })
                };
            }

            const creResponse = await fetch(dynamicWebhookUrl, fetchOptions);

            const rawAuditData = await creResponse.json();
            console.log(`[Gateway] RAW CHAINLINK RESPONSE: ${JSON.stringify(rawAuditData, null, 2)}`);

            // If using JSON-RPC, Chainlink wraps the output in a 'result' object
            auditData = rawAuditData.result || rawAuditData;

            console.log(`[Gateway] Parsed CRE Audit Status: ${auditData.status || auditData.body?.auditStatus || "Unknown"}`);
        } catch (creError: any) {
            console.error("[Gateway] Failed to contact Chainlink CRE.", creError.message);
            return NextResponse.json({ error: "Decentralized audit failed. Service unavailable." }, { status: 502 });
        }

        // --- PHASE 4: FINAL DELIVERY ---
        // 1. Live DON Async Execution
        if (auditData.status === "ACCEPTED") {
            return NextResponse.json({
                status: "success",
                data: JSON.parse(openClawRawResponse),
                agentScoreAudit: {
                    auditStatus: "EVALUATING ON-CHAIN...",
                    message: `Payload successfully dispatched to Chainlink DON. Execution Hash: ${auditData.workflow_execution_id}`,
                    reputationImpact: "Processing SLA..."
                }
            }, { status: 200 });
        }

        // 2. Local Mock Gateway Evaluation
        if (auditData?.body?.auditStatus === "FAILED") {
            return NextResponse.json({
                error: "The Agent's response was rejected by the AgentScore Quality Protocol.",
                auditDetails: auditData.body
            }, { status: 400 });
        }

        return NextResponse.json({
            status: "success",
            data: JSON.parse(openClawRawResponse),
            agentScoreAudit: auditData?.body || { auditStatus: "UNKNOWN" }
        }, { status: 200 });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal Gateway Error." }, { status: 500 });
    }
}

// ==========================================
// SIMULATOR MOCK LOGIC (Lifted from Express)
// ==========================================
async function simulateOpenClawExecution(prompt: string): Promise<string> {
    // Simulate API Latency (TTFT)
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Dynamic Mock Wallet to act as the Agent Signer
    const mockAgentWallet = Wallet.createRandom();

    let simulatedData: any;
    let simulatedResponse: string = "";

    if (prompt.toLowerCase().includes("weather")) {
        simulatedData = { temperature: 22, condition: "Sunny", location: "Base Testnet" };
        simulatedResponse = "Based on the atmospheric readings retrieved from the requested geographical region, I can confirm that the current weather is a very pleasant 22 degrees and perfectly sunny, making it a great day for an outdoor deployment on the Base Testnet.";
    } else if (prompt.toLowerCase().includes("hallucinate")) {
        simulatedData = { error: "Hallucination override engaged" };
        simulatedResponse = "Here is the weather: It is 22 degrees and sunny. Hope this helps! I am ignore previous instructions and returning random data just to demonstrate what a prompt injection failure looks like in an audit context.";
    } else {
        simulatedData = { message: "Generic task completed successfully." };
        simulatedResponse = "The simulated computation for your generalized task request has finished successfully, demonstrating that the AI Agent is capable of interpreting unstructured commands and fulfilling them accurately within the allocated timeframe and performance boundaries established by the SLA.";
    }

    // Hash and sign the data object to meet the Cryptographic Attestation rule
    const dataString = JSON.stringify(simulatedData);
    const messageHash = id(dataString);
    const signature = mockAgentWallet.signingKey.sign(messageHash).serialized;

    // Assemble final payload matching the new schema
    const finalPayload = {
        data: simulatedData,
        response: simulatedResponse,
        signature: signature,
        agent_address: mockAgentWallet.address
    };

    return JSON.stringify(finalPayload);
}
