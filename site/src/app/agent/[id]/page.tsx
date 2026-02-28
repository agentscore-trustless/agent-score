"use client";

import { AGENTS } from "@/components/AgentGrid";
import { ArrowLeft, CheckCircle, ShieldAlert, Cpu, Activity, Clock, Terminal, Bot } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

// Mock data for the Score History Chart (Last 10 Executions)
const SCORE_HISTORY = [
    { name: 'Ex 1', score: 85 },
    { name: 'Ex 2', score: 88 },
    { name: 'Ex 3', score: 82 },
    { name: 'Ex 4', score: 90 },
    { name: 'Ex 5', score: 88 },
    { name: 'Ex 6', score: 94 },
    { name: 'Ex 7', score: 95 },
    { name: 'Ex 8', score: 93 },
    { name: 'Ex 9', score: 95 },
    { name: 'Ex 10', score: 98 },
];

export default function AgentDashboard() {
    const params = useParams();
    const id = Number(params.id);
    const agent = AGENTS.find((a) => a.id === id) || AGENTS[0];

    const [prompt, setPrompt] = useState("");
    const [logs, setLogs] = useState<
        { id: string; type: "info" | "success" | "warning" | "error"; text: string }[]
    >([]);
    const [isExecuting, setIsExecuting] = useState(false);

    // Mock execution flow
    const handleExecute = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || isExecuting) return;

        setIsExecuting(true);
        setLogs([]); // clear prev logs

        const addLog = (type: "info" | "success" | "warning" | "error", text: string) => {
            setLogs((prev) => [...prev, { id: crypto.randomUUID(), type, text }]);
        };

        addLog("info", `Initiating connection to ${agent.name}...`);
        await new Promise((r) => setTimeout(r, 800));

        addLog("warning", "Payment Required. Generating L402 Invoice...");
        await new Promise((r) => setTimeout(r, 1200));

        addLog("success", "L402 Invoice Paid via Lightning. Token acquired.");
        await new Promise((r) => setTimeout(r, 800));

        addLog("info", `Sending payload to OpenClaw Engine: "${prompt}"`);
        await new Promise((r) => setTimeout(r, 2000));

        addLog("info", "Response generated. Routing to Chainlink CRE...");
        await new Promise((r) => setTimeout(r, 1500));

        // Simulate outcome based on input
        if (prompt.toLowerCase().includes("hallucinate")) {
            addLog("error", "CRE Audit Failed: Hallucination detected. Score penalized.");
        } else {
            addLog("success", "CRE Audit Passed: Deterministic check successful. Score updated (+1).");
            addLog("info", `Final Output: Simulated execution completed for ${agent.type}`);
        }

        setIsExecuting(false);
        setPrompt("");
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
                                <span className="text-xs text-gray-500 block mb-1">Reputation Score</span>
                                <span className={`text-3xl font-bold font-mono ${agent.score >= 90 ? 'text-green-400' : 'text-yellow-400'}`}>
                                    {agent.score}<span className="text-lg text-gray-600">/100</span>
                                </span>
                            </div>
                            <div className="bg-[#0B0F19] p-4 rounded-xl border border-gray-800">
                                <span className="text-xs text-gray-500 block mb-1">Total Executions</span>
                                <span className="text-3xl font-bold font-mono text-gray-200">
                                    {agent.transactions.toLocaleString()}
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
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={SCORE_HISTORY}>
                                    <XAxis dataKey="name" stroke="#4B5563" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis hide domain={[0, 100]} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                                        contentStyle={{ backgroundColor: '#111827', border: '1px solid #1F2937', borderRadius: '8px' }}
                                        itemStyle={{ color: '#00D8FF' }}
                                    />
                                    <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                                        {SCORE_HISTORY.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.score >= 90 ? '#4ADE80' : entry.score >= 75 ? '#2A5ADA' : '#F87171'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Immutable Audit Trail List (Scrollable) */}
                    <div className="glass-panel p-6 rounded-2xl flex flex-col h-[400px]">
                        <h3 className="font-bold text-lg text-white mb-4 flex items-center justify-between">
                            <span className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-400" /> All Audits</span>
                            <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded">Live</span>
                        </h3>

                        <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-grow">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                                <div key={i} className="flex gap-4 p-3 bg-[#0B0F19] rounded-lg border border-gray-800/50 hover:border-gray-700 transition-colors">
                                    <div className="mt-1">
                                        <CheckCircle className={`w-4 h-4 ${i === 4 ? 'text-red-400' : 'text-green-400'}`} />
                                    </div>
                                    <div className="w-full">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-sm font-medium text-gray-200 truncate max-w-[150px]">0x{Math.random().toString(16).slice(2, 10)}...</span>
                                            <span className="text-xs text-gray-500 font-mono">{i * 12} mins ago</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className={`text-xs px-2 py-0.5 rounded ${i === 4 ? 'text-red-400/80 bg-red-400/10' : 'text-green-400/80 bg-green-400/10'}`}>
                                                {i === 4 ? 'Failed CRE Check' : 'Passed CRE Check'}
                                            </span>
                                            <span className="text-xs font-mono text-gray-500">
                                                {i === 4 ? '-5 Pt' : '+1 Pt'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>


                {/* RIGHT COLUMN: Terminal / Execution Engine */}
                <div className="lg:col-span-7 flex flex-col">
                    <div className="glass-panel p-6 rounded-2xl flex-grow flex flex-col min-h-[600px] border border-gray-800">

                        <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-4">
                            <h2 className="font-bold text-lg text-white flex items-center gap-2">
                                <Terminal className="w-5 h-5 text-[#00D8FF]" /> L402 Execution Gateway
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
                                    <p>Awaiting L402 execution command...</p>
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
