"use client";

import { motion } from "framer-motion";
import { Bot, Shield, TrendingUp, CheckCircle, BrainCircuit } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

// Mock Data for the Agents
export const AGENTS = [
    {
        id: 1,
        name: "Agent Strategy",
        type: "DeFi Analytics",
        score: 95,
        icon: TrendingUp,
        description: "Evaluates tokenomics, audits yield strategies, and calculates TVL risks across multiple EVM chains.",
        transactions: 1042,
    },
    {
        id: 2,
        name: "Agent Security",
        type: "Smart Contract Auditing",
        score: 82,
        icon: Shield,
        description: "Performs static analysis on Solidity bytecode to prevent reentrancy and flash loan vulnerabilities.",
        transactions: 531,
    },
    {
        id: 3,
        name: "Agent Trading",
        type: "High-Frequency Execution",
        score: 68,
        icon: Bot,
        description: "Autonomously executes MEV-resistant swaps and arbitrage natively on Base L2.",
        transactions: 890,
    }
];

// Helper to determine score color
const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-400 stroke-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]";
    if (score >= 70) return "text-yellow-400 stroke-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]";
    return "text-red-400 stroke-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]";
};

// Circular Progress Component
const ScoreRing = ({ score }: { score: number }) => {
    const [currentScore, setCurrentScore] = useState(0);

    useEffect(() => {
        // Animate the score numbers on mount
        let start = 0;
        const end = score;
        const duration = 1500; // ms
        const incrementTime = (duration / end);

        const timer = setInterval(() => {
            start += 1;
            setCurrentScore(start);
            if (start === end) clearInterval(timer);
        }, incrementTime);

        return () => clearInterval(timer);
    }, [score]);

    const radius = 30;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    return (
        <div className="relative flex items-center justify-center w-24 h-24">
            {/* Background Ring */}
            <svg className="absolute w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="transparent"
                    stroke="#1F2937"
                    strokeWidth="6"
                />
                {/* Animated Progress Ring */}
                <motion.circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="6"
                    className={getScoreColor(score)}
                    strokeLinecap="round"
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    style={{ strokeDasharray: circumference }}
                />
            </svg>
            {/* Score Number inside ring */}
            <div className={`text-2xl font-bold ${getScoreColor(score).split(' ')[0]}`}>
                {currentScore}
            </div>
        </div>
    );
};

export default function AgentGrid() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl mx-auto py-12 px-4">
            {AGENTS.map((agent, i) => (
                <motion.div
                    key={agent.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: i * 0.15 }}
                    whileHover={{ y: -5, scale: 1.02 }}
                    className="glass-panel p-6 rounded-2xl flex flex-col justify-between h-[360px] relative group overflow-hidden cursor-pointer"
                >
                    {/* Subtle background glow effect on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#2A5ADA]/0 to-[#00D8FF]/0 group-hover:from-[#2A5ADA]/10 group-hover:to-[#00D8FF]/10 transition-all duration-500 rounded-2xl pointer-events-none" />

                    <Link href={`/agent/${agent.id}`} className="absolute inset-0 z-10 w-full h-full" aria-label={`View ${agent.name} details`} />

                    <div className="relative z-20 pointer-events-none">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-blue-900/40 rounded-xl border border-blue-800/50">
                                    <agent.icon className="w-6 h-6 text-[#00D8FF]" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-white pointer-events-auto group-hover:text-[#00D8FF] transition-colors">{agent.name}</h3>
                                    <span className="text-xs font-medium text-blue-400 bg-blue-900/30 px-2 py-1 rounded-full">
                                        {agent.type}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <p className="text-gray-400 text-sm leading-relaxed mb-6">
                            {agent.description}
                        </p>
                    </div>

                    <div className="relative z-20 flex items-center justify-between border-t border-gray-800 pt-4">
                        <div className="flex flex-col">
                            <span className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-[#2A5ADA]" /> Protocol Score
                            </span>
                            <ScoreRing score={agent.score} />
                        </div>

                        <div className="flex flex-col items-end">
                            <span className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                                <BrainCircuit className="w-3 h-3" /> Executions
                            </span>
                            <span className="font-mono text-gray-300 font-semibold">
                                {agent.transactions.toLocaleString()}
                            </span>
                            <div className="mt-4 flex items-center text-sm text-[#00D8FF] font-medium group-hover:translate-x-1 transition-transform">
                                View Agent →
                            </div>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
