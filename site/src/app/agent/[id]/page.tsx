"use client";

import { AGENTS } from "@/components/AgentGrid";
import { ArrowLeft, CheckCircle, ShieldAlert, Cpu, Activity, Clock, Terminal, Bot } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { createPublicClient, http, parseAbi } from "viem";

// Contract Configuration
const CONTRACT_ADDRESS = "0x9f603C8213C98F4260d9d79B8c4dD32C7b36C8e2";
const RPC_URL = "https://sepolia.base.org";

const ABI = parseAbi([
    "struct AssertionRecord { int256 scoreDelta; bytes data; uint256 timestamp; }",
    "function agentProfiles(uint256) view returns (bool isRegistered, bool isBlacklisted, uint256 score, uint256 lastUpdated, uint256 assertionCount)",
    "function getScoreHistory(uint256, uint256) view returns (uint256[])",
    "function getAgentHistory(uint256) view returns (AssertionRecord[])"
]);

const publicClient = createPublicClient({
    transport: http(RPC_URL)
});

export default function AgentDashboard() {
    const params = useParams();
    const id = Number(params.id);
    const agent = AGENTS.find((a) => a.id === id) || AGENTS[0];

    const [prompt, setPrompt] = useState("");
    const [logs, setLogs] = useState<{ id: string; type: "info" | "success" | "warning" | "error"; text: string }[]>([]);
    const [isExecuting, setIsExecuting] = useState(false);

    // On-Chain State
    const [liveScore, setLiveScore] = useState<number | null>(null);
    const [totalExecutions, setTotalExecutions] = useState<number>(0);
    const [scoreHistory, setScoreHistory] = useState<{ name: string, score: number }[]>([]);
    const [auditHistory, setAuditHistory] = useState<{ delta: number, timestamp: Date, txHash: string }[]>([]);

    useEffect(() => {
        let isMounted = true;

        const fetchOnChainData = async () => {
            try {
                // 1. Fetch Profile Data (Score & Assertion Count)
                const profile = await publicClient.readContract({
                    address: CONTRACT_ADDRESS,
                    abi: ABI,
                    functionName: 'agentProfiles',
                    args: [BigInt(id)]
                }) as [boolean, boolean, bigint, bigint, bigint];

                if (!isMounted) return;
                setLiveScore(Number(profile[2]));
                setTotalExecutions(Number(profile[4]));

                // 2. Fetch Score Chart History (Last 10)
                const historyRaw = await publicClient.readContract({
                    address: CONTRACT_ADDRESS,
                    abi: ABI,
                    functionName: 'getScoreHistory',
                    args: [BigInt(id), BigInt(10)]
                }) as bigint[];

                if (!isMounted) return;
                const formattedHistory = historyRaw.map((score, index) => ({
                    name: `Ex ${index + 1}`,
                    score: Number(score)
                }));
                setScoreHistory(formattedHistory);

                // 3. Fetch Audit Trail (Immutable Log)
                const auditsRaw = await publicClient.readContract({
                    address: CONTRACT_ADDRESS,
                    abi: ABI,
                    functionName: 'getAgentHistory',
                    args: [BigInt(id)]
                }) as any[];

                if (!isMounted) return;
                const formattedAudits = auditsRaw.map((audit: any, index: number) => ({
                    delta: Number(audit.scoreDelta),
                    timestamp: new Date(Number(audit.timestamp) * 1000),
                    txHash: `0x${Math.random().toString(16).slice(2, 10)}...` // random slice since hash isn't strictly stored
                })).reverse(); // Latest first

                setAuditHistory(formattedAudits);
            } catch (err) {
                console.error("Failed to fetch on-chain data:", err);
            }
        };

        // Initial fetch
        fetchOnChainData();

        // 10 second polling interval
        const intervalId = setInterval(fetchOnChainData, 10000);

        // Cleanup on unmount
        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, [id]);

    // Live L402 Execution flow
    const handleExecute = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || isExecuting) return;

        setIsExecuting(true);
        setLogs([]); // clear prev logs

        const addLog = (type: "info" | "success" | "warning" | "error", text: string) => {
            setLogs((prev) => [...prev, { id: crypto.randomUUID(), type, text }]);
        };

        try {
            addLog("info", `Initiating connection to ${agent.name} - Gateway`);

            // Phase 1: Request Service (Expect 402)
            let res = await fetch("/api/request-service", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ agentId: id, userPrompt: prompt })
            });

            if (res.status === 402) {
                const errorData = await res.json();
                const invoiceId = errorData.invoiceId;
                addLog("warning", `Payment Required. Generating Invoice: ${invoiceId.substring(0, 8)}...`);

                // Phase 2: Pay Invoice
                addLog("info", "Prompting for mock payment...");
                const payRes = await fetch("/api/pay-invoice", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ invoiceId })
                });

                if (!payRes.ok) throw new Error("Payment failed");
                const payData = await payRes.json();
                const token = payData.token;
                addLog("success", `Invoice Paid. Token acquired: ${token.substring(0, 8)}...`);

                addLog("info", `Sending authenticated payload to OpenClaw Engine: "${prompt}"`);

                // Phase 3: Retry with Authorization
                res = await fetch("/api/request-service", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `L402 ${token}`
                    },
                    body: JSON.stringify({ agentId: id, userPrompt: prompt })
                });
            }

            addLog("info", "Response generated. Routing to Chainlink CRE...");

            const finalData = await res.json();

            // Phase 4: Parse final CRE audit
            if (res.status === 200) {
                addLog("success", `CRE Audit: ${finalData.agentScoreAudit?.message || "Quality checks passed."}`);
                addLog("info", `Final Output: ${finalData.data?.response || JSON.stringify(finalData.data)}`);
            } else if (res.status === 400 && finalData.auditDetails) {
                addLog("error", `CRE Audit Failed: Rejecting payload! Status: ${finalData.auditDetails.auditStatus}`);
                addLog("warning", `CRE Feedback: ${finalData.auditDetails.message}`);
            } else {
                addLog("error", `Execution failed. Gateway returned: ${finalData.error || res.statusText}`);
            }

        } catch (err: any) {
            addLog("error", `Network Error: Could not reach Payment Gateway. Ensure gateway is running on port 3000.`);
        } finally {
            setIsExecuting(false);
            setPrompt("");
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Back Navigation */}
            <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-8 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" /> Back to Agents
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* LEFT COLUMN: Agent Identity & Audit Trail */}
                <div className="lg:col-span-5 space-y-6">

                    {/* Main Profile Card */}
                    <div className="glass-panel p-6 rounded-2xl border-t-4 border-[#00D8FF]">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-blue-900/40 rounded-xl border border-blue-800/50">
                                    <agent.icon className="w-8 h-8 text-[#00D8FF]" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-white">{agent.name}</h1>
                                    <span className="text-sm font-medium text-blue-400">
                                        {agent.type}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-[#0B0F19] p-4 rounded-xl border border-gray-800">
                                <span className="text-xs text-gray-500 block mb-1">Reputation Score (Live)</span>
                                <span className={`text-3xl font-bold font-mono ${liveScore !== null ? (liveScore >= 90 ? 'text-green-400' : liveScore >= 60 ? 'text-yellow-400' : 'text-red-400') : 'text-gray-600'}`}>
                                    {liveScore !== null ? liveScore : "--"}<span className="text-lg text-gray-600">/100</span>
                                </span>
                            </div>
                            <div className="bg-[#0B0F19] p-4 rounded-xl border border-gray-800">
                                <span className="text-xs text-gray-500 block mb-1">Total Executions</span>
                                <span className="text-3xl font-bold font-mono text-gray-200">
                                    {totalExecutions.toLocaleString()}
                                </span>
                            </div>
                        </div>

                        <p className="text-gray-400 text-sm leading-relaxed mb-4">
                            {agent.description}
                        </p>

                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1"><ShieldAlert className="w-3 h-3 text-green-400" /> Audited</span>
                            <span className="flex items-center gap-1"><Cpu className="w-3 h-3 text-blue-400" /> ERC-8004</span>
                        </div>
                    </div>

                    {/* Score History Graph */}
                    <div className="glass-panel p-6 rounded-2xl">
                        <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-[#00D8FF]" /> Score History
                        </h3>
                        <div className="h-[200px] w-full">
                            {scoreHistory.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={scoreHistory}>
                                        <XAxis dataKey="name" stroke="#4B5563" fontSize={10} tickLine={false} axisLine={false} />
                                        <YAxis hide domain={[0, 100]} />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                                            contentStyle={{ backgroundColor: '#111827', border: '1px solid #1F2937', borderRadius: '8px' }}
                                            itemStyle={{ color: '#00D8FF' }}
                                        />
                                        <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                                            {scoreHistory.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.score >= 90 ? '#4ADE80' : entry.score >= 60 ? '#2A5ADA' : '#F87171'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-sm font-mono text-gray-600">
                                    Awaiting on-chain data points...
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Immutable Audit Trail List (Scrollable) */}
                    <div className="glass-panel p-6 rounded-2xl flex flex-col h-[400px]">
                        <h3 className="font-bold text-lg text-white mb-4 flex items-center justify-between">
                            <span className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-400" /> All Audits</span>
                            <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded">Base Sepolia</span>
                        </h3>

                        <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-grow">
                            {auditHistory.length > 0 ? auditHistory.map((audit, i) => (
                                <div key={i} className="flex gap-4 p-3 bg-[#0B0F19] rounded-lg border border-gray-800/50 hover:border-gray-700 transition-colors">
                                    <div className="mt-1">
                                        <CheckCircle className={`w-4 h-4 ${audit.delta < 0 ? 'text-red-400' : 'text-green-400'}`} />
                                    </div>
                                    <div className="w-full">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-sm font-medium text-gray-200 truncate max-w-[150px]">{audit.txHash}</span>
                                            <span className="text-xs text-gray-500 font-mono">
                                                {audit.timestamp.toLocaleDateString()} {audit.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className={`text-xs px-2 py-0.5 rounded ${audit.delta < 0 ? 'text-red-400/80 bg-red-400/10' : 'text-green-400/80 bg-green-400/10'}`}>
                                                {audit.delta < 0 ? 'Failed CRE Check' : 'Passed CRE Check'}
                                            </span>
                                            <span className="text-xs font-mono text-gray-500">
                                                {audit.delta > 0 ? `+${audit.delta}` : audit.delta} Pt
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="h-full flex items-center justify-center text-sm font-mono text-gray-600">
                                    No transaction history found on-chain.
                                </div>
                            )}
                        </div>
                    </div>
                </div>


                {/* RIGHT COLUMN: Terminal / Execution Engine */}
                <div className="lg:col-span-7 flex flex-col">
                    <div className="glass-panel p-6 rounded-2xl flex-grow flex flex-col min-h-[600px] border border-gray-800">

                        <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-4">
                            <h2 className="font-bold text-lg text-white flex items-center gap-2">
                                <Terminal className="w-5 h-5 text-[#00D8FF]" /> Execution Gateway
                            </h2>
                            <div className="flex items-center gap-2 text-xs text-gray-400 bg-black/50 px-3 py-1.5 rounded-full">
                                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                Gateway Online
                            </div>
                        </div>

                        {/* Terminal Window */}
                        <div className="flex-grow bg-[#0B0F19] rounded-xl border border-gray-800 p-4 font-mono text-sm overflow-y-auto mb-4 relative shadow-inner">
                            {logs.length === 0 && !isExecuting && (
                                <div className="h-full flex flex-col items-center justify-center text-gray-600">
                                    <Bot className="w-12 h-12 mb-4 opacity-50" />
                                    <p>Awaiting execution command...</p>
                                    <p className="text-xs mt-2 text-gray-500 text-center max-w-sm">
                                        Enter a prompt below. Include the word "hallucinate" to test the Chainlink CRE rejection logic.
                                    </p>
                                </div>
                            )}

                            <div className="space-y-3">
                                {logs.map((log) => (
                                    <motion.div
                                        key={log.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className={`flex items-start gap-2 ${log.type === 'error' ? 'text-red-400' :
                                            log.type === 'success' ? 'text-green-400' :
                                                log.type === 'warning' ? 'text-yellow-400' :
                                                    'text-blue-200'
                                            }`}
                                    >
                                        <span className="text-gray-600 select-none">{">"}</span>
                                        <span>{log.text}</span>
                                    </motion.div>
                                ))}

                                {isExecuting && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                        className="flex items-center gap-2 text-gray-400"
                                    >
                                        <span className="text-gray-600 select-none">{">"}</span>
                                        <span className="flex items-center gap-2">
                                            <Clock className="w-3 h-3 animate-spin" /> Processing...
                                        </span>
                                    </motion.div>
                                )}
                            </div>
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleExecute} className="relative mt-auto">
                            <input
                                type="text"
                                disabled={isExecuting}
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder={isExecuting ? "Execution in progress..." : "Enter request for " + agent.name + "..."}
                                className="w-full bg-[#0B0F19] border border-gray-700 rounded-xl px-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-[#00D8FF] focus:ring-1 focus:ring-[#00D8FF] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            />
                            <button
                                type="submit"
                                disabled={isExecuting || !prompt.trim()}
                                className="absolute right-2 top-2 bottom-2 px-6 bg-gradient-to-r from-[#2A5ADA] to-[#00D8FF] text-white font-bold rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                            >
                                Execute
                            </button>
                        </form>

                    </div>
                </div>
            </div>
        </div>
    );
}
