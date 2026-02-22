import express, { Request, Response } from 'express';
import { handleAgentAudit } from './auditor_webhook';

const app = express();
app.use(express.json());

// ======================================================================
// CHAINLINK CRE WEBHOOK SIMULATOR
// This endpoint simulates the standard Webhook Trigger in Chainlink Workflows.
// ======================================================================
app.post('/webhook', async (req: Request, res: Response): Promise<any> => {
    console.log("\n[Chainlink CRE] 🔔 Webhook Triggered by Gateway.");

    try {
        // In Chainlink CRE, the trigger passes the raw request to your compute function.
        // We simulate that by passing req to handleAgentAudit.
        const auditResult = await handleAgentAudit(req);

        // Chainlink Workflows automatically return the compute output back to the caller.
        return res.status(auditResult.statusCode).json(auditResult.body);

    } catch (error: any) {
        console.error("[Chainlink CRE] Critical Workflow Error:", error);
        return res.status(500).json({
            auditStatus: "ERROR",
            message: "Internal CRE Workflow Execution Failed"
        });
    }
});

const PORT = process.env.CRE_PORT || 8080;

app.listen(PORT, () => {
    console.log(`\n=================================================`);
    console.log(`⛓️  Chainlink CRE Local Simulator Running`);
    console.log(`📍 Webhook URL: http://localhost:${PORT}/webhook`);
    console.log(`=================================================\n`);
});