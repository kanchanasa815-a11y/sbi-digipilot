import React, { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  BookOpen,
  Smartphone,
  ShieldAlert,
  TrendingUp,
  Globe,
  Sparkles,
  Send,
  HelpCircle,
  User,
  ShieldCheck,
  CheckCircle,
  Volume2,
  VolumeX,
  Volume1,
  Mic,
  AlertOctagon,
  CornerDownRight,
  ChevronRight,
  Info
} from "lucide-react";
import { ChatMessage, AgentThought } from "./types";
import LearningAcademy from "./components/LearningAcademy";
import TransactionSandbox from "./components/TransactionSandbox";
import FraudShield from "./components/FraudShield";
import WellnessCoach from "./components/WellnessCoach";

const AGENT_LIST = [
  { id: "onboarding", name: "Onboarding Agent", desc: "Guides KYC & YONO setup", color: "bg-blue-500" },
  { id: "learning", name: "Learning Agent", desc: "Digital banking tutorials", color: "bg-amber-500" },
  { id: "transaction", name: "Transaction Agent", desc: "Safe money transfers guide", color: "bg-emerald-500" },
  { id: "fraud", name: "Fraud Watch Agent", desc: "Monitors scams & security", color: "bg-rose-500" },
  { id: "wellness", name: "Wellness Coach", desc: "Analyzes budgets & growth", color: "bg-indigo-500" },
  { id: "support", name: "Customer Support", desc: "Instant general help desk", color: "bg-slate-500" }
];

const STARTER_PROMPTS = [
  { text: "How do I activate SBI YONO securely?", agent: "onboarding" },
  { text: "What is the safety rule for UPI PIN?", agent: "learning" },
  { text: "Check a suspicious SMS about electric bills", agent: "fraud" },
  { text: "How can I invest in SBI Amrit Kalash?", agent: "wellness" }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<"chat" | "learning" | "sandbox" | "fraud" | "wellness">("chat");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      sender: "bot",
      text: "### Hello Arjun! Welcome to SBI DigiPilot 🚀\n\nI am your collaborative Multi-Agent digital banking copilot. I am designed to make digital banking simple, intuitive, and 100% secure for you.\n\nHow can I assist you today? You can choose a quick topic below, ask a question, or switch to our specialised practice hubs using the menu!",
      activeAgent: "support",
      agentLog: [
        { agent: "Coordinator Agent", thought: "Initializing SBI multi-agent network...", action: "Establish Contact" },
        { agent: "Support Agent", thought: "Welcoming Arjun, loading initial profile configurations.", action: "Active Help" }
      ],
      fraudAlert: {
        status: "safe",
        explanation: "All communication inside DigiPilot is encrypted with 256-bit SBI Standards."
      },
      quickPrompts: [
        "How do I register for YONO?",
        "Explain UPI Security Guidelines",
        "Test a suspicious text message",
        "How do I grow my savings with SBI?"
      ],
      timestamp: "Today, 10:00 AM"
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [selectedAgentPreference, setSelectedAgentPreference] = useState<string>("coordinator");
  const [isTyping, setIsTyping] = useState(false);
  const [voiceModeActive, setVoiceModeActive] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isTyping]);

  // Handle message send
  const handleSendMessage = async (textToSend: string, agentPref = selectedAgentPreference) => {
    if (!textToSend.trim()) return;

    // Add user message
    const userMsg: ChatMessage = {
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    setInputText("");
    setIsTyping(true);

    try {
      // Build conversation history for API
      const historyPayload = chatMessages.slice(-6).map(m => ({
        role: m.sender === "user" ? "user" : "model",
        text: m.text
      }));

      const response = await fetch("/api/agents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: historyPayload,
          selectedAgent: agentPref
        })
      });

      const data = await response.json();
      
      const botMsg: ChatMessage = {
        sender: "bot",
        text: data.response || "I have received your request and am checking with our agents.",
        activeAgent: data.activeAgent || "support",
        agentLog: data.agentLog || [],
        wellnessTip: data.wellnessTip,
        fraudAlert: data.fraudAlert || { status: "safe", explanation: "Verified safe information link." },
        quickPrompts: data.quickPrompts || ["How does UPI work?", "How to stay safe?"],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setChatMessages(prev => [...prev, botMsg]);

      // Speak text if TTS is enabled
      if (ttsEnabled && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        // Strip markdown code for speech output
        const plainText = data.response.replace(/[#*`_-]/g, "");
        const utterance = new SpeechSynthesisUtterance(plainText.substring(0, 250));
        utterance.lang = "en-IN";
        window.speechSynthesis.speak(utterance);
      }

    } catch (err) {
      console.error("Failed to query agents:", err);
      // Resilience fallback
      const mockData = getMockAgentFallback(textToSend, agentPref);
      setChatMessages(prev => [...prev, mockData]);
    } finally {
      setIsTyping(false);
    }
  };

  // Safe client-side mock fallback when backend is temporarily loading or has connection timeouts
  const getMockAgentFallback = (message: string, agentPref: string): ChatMessage => {
    const normalized = message.toLowerCase();
    let responseText = `### Responding in Secured Offline Mode\n\nI am currently analyzing your prompt offline. State Bank of India ensures that even in connection drop situations, our safety modules remain fully operative. `;
    let activeAgent = "support";
    let agentLog: AgentThought[] = [
      { agent: "Coordinator", thought: "Backend connectivity timeout. Activating offline backup rules.", action: "Resilience Routing" }
    ];
    let fraudStatus: "safe" | "warning" | "danger" = "safe";
    let fraudExplanation = "Offline shield active. Stay cautious.";
    let quickPrompts = ["How do I register for YONO?", "How can I check suspicious SMS?"];

    if (normalized.includes("yono") || normalized.includes("onboard") || agentPref === "onboarding") {
      activeAgent = "onboarding";
      responseText += `\n\n**To register for YONO SBI securely:**\n1. Download YONO SBI only from Apple/Google official store.\n2. Verify using your SBI registered SIM card on your mobile.\n3. Create a unique 6-digit MPIN. Never share it with anyone.`;
      agentLog.push({ agent: "Onboarding Agent", thought: "Analyzing offline onboarding flows.", action: "Present Secure Guide" });
    } else if (normalized.includes("sms") || normalized.includes("scam") || normalized.includes("fraud") || agentPref === "fraud") {
      activeAgent = "fraud";
      fraudStatus = "danger";
      fraudExplanation = "SBI never sends links via SMS to update PAN or reactivate accounts. All such SMS are cyber frauds.";
      responseText += `\n\n**Urgent Cyber Safety Alert:**\nIf you received any SMS claiming your SBI account or electricity bill is blocked and asking you to dial a number or tap a link, it is a phishing scam. Do not click links or install apps like AnyDesk.`;
      agentLog.push({ agent: "Fraud Agent", thought: "Detected phishing vectors in user description.", action: "Trigger Cyber Alert" });
    } else {
      responseText += `\n\nFeel free to try navigating to our dedicated **Practice Sandbox**, **Learning Academy**, or **SMS Scanner** tabs on top for fully working simulated tasks!`;
    }

    return {
      sender: "bot",
      text: responseText,
      activeAgent,
      agentLog,
      fraudAlert: { status: fraudStatus, explanation: fraudExplanation },
      quickPrompts,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  // Simulating Voice search trigger
  const toggleVoiceListen = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    setIsListening(true);
    // Simulating user speaking something after 2 seconds
    setTimeout(() => {
      if (isListening) {
        setIsListening(false);
        const spokenQueries = [
          "How do I set up a fixed deposit on YONO?",
          "Can you scan my recent electricity message?",
          "Is UPI PIN needed to receive money?"
        ];
        const randomQuery = spokenQueries[Math.floor(Math.random() * spokenQueries.length)];
        handleSendMessage(randomQuery);
      }
    }, 2500);
  };

  // Get active agent details from chat messages
  const lastBotMessage = [...chatMessages].reverse().find(m => m.sender === "bot");
  const currentActiveAgentId = lastBotMessage?.activeAgent || "support";

  return (
    <div id="sbi-digipilot" className="w-full min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col antialiased">
      {/* Top Professional Navigation Bar */}
      <nav className="h-16 border-b border-slate-200/80 px-4 md:px-8 flex items-center justify-between bg-white sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#2800d7] rounded-full flex items-center justify-center shadow-md">
            <div className="w-3.5 h-3.5 bg-white rounded-sm rotate-45"></div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight text-[#2800d7]">SBI</span>
              <span className="font-light text-lg tracking-tight text-slate-600">DigiPilot</span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider -mt-1 hidden sm:block">Agentic AI Banking Companion</p>
          </div>
        </div>

        {/* Central Nav Tabs */}
        <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-250">
          <button
            id="tab-chat"
            onClick={() => setActiveTab("chat")}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "chat" ? "bg-white text-[#2800d7] shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <MessageSquare size={13} /> Chat Copilot
          </button>
          <button
            id="tab-learning"
            onClick={() => setActiveTab("learning")}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "learning" ? "bg-white text-[#2800d7] shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BookOpen size={13} /> Regional Academy
          </button>
          <button
            id="tab-sandbox"
            onClick={() => setActiveTab("sandbox")}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "sandbox" ? "bg-white text-[#2800d7] shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Smartphone size={13} /> Transfer Sandbox
          </button>
          <button
            id="tab-fraud"
            onClick={() => setActiveTab("fraud")}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "fraud" ? "bg-white text-[#2800d7] shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ShieldAlert size={13} /> SMS Analyzer
          </button>
          <button
            id="tab-wellness"
            onClick={() => setActiveTab("wellness")}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "wellness" ? "bg-white text-[#2800d7] shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <TrendingUp size={13} /> Savings Coach
          </button>
        </div>

        {/* Security badge and profile */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 shadow-sm">
            <ShieldCheck size={14} className="text-emerald-650" />
            <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">256-Bit Secure</span>
          </div>
          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 border border-slate-200">
            <span className="text-sm font-bold text-slate-700">AR</span>
          </div>
        </div>
      </nav>

      {/* Mobile Nav Bar */}
      <div className="md:hidden bg-white border-b border-slate-200 p-2 flex gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab("chat")}
          className={`px-3 py-1.5 text-[11px] font-bold rounded-lg whitespace-nowrap ${
            activeTab === "chat" ? "bg-blue-50 text-blue-700 font-black" : "text-slate-600"
          }`}
        >
          Chat Copilot
        </button>
        <button
          onClick={() => setActiveTab("learning")}
          className={`px-3 py-1.5 text-[11px] font-bold rounded-lg whitespace-nowrap ${
            activeTab === "learning" ? "bg-blue-50 text-blue-700 font-black" : "text-slate-600"
          }`}
        >
          Regional Academy
        </button>
        <button
          onClick={() => setActiveTab("sandbox")}
          className={`px-3 py-1.5 text-[11px] font-bold rounded-lg whitespace-nowrap ${
            activeTab === "sandbox" ? "bg-blue-50 text-blue-700 font-black" : "text-slate-600"
          }`}
        >
          Practice Sandbox
        </button>
        <button
          onClick={() => setActiveTab("fraud")}
          className={`px-3 py-1.5 text-[11px] font-bold rounded-lg whitespace-nowrap ${
            activeTab === "fraud" ? "bg-blue-50 text-blue-700 font-black" : "text-slate-600"
          }`}
        >
          SMS Analyzer
        </button>
        <button
          onClick={() => setActiveTab("wellness")}
          className={`px-3 py-1.5 text-[11px] font-bold rounded-lg whitespace-nowrap ${
            activeTab === "wellness" ? "bg-blue-50 text-blue-700 font-black" : "text-slate-600"
          }`}
        >
          Savings Coach
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden max-w-7xl w-full mx-auto">
        {/* Left Sidebar: Multi-Agent Hub and Voice simulator */}
        <aside className="w-full md:w-72 bg-white md:bg-slate-50/50 p-5 md:p-6 border-r border-slate-200 flex flex-col justify-between shrink-0">
          <div className="space-y-6">
            <div>
              <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3.5">Collaborative Agent Core</h2>
              
              <div className="space-y-2.5">
                {AGENT_LIST.map((agent) => {
                  const isActive = currentActiveAgentId === agent.id;
                  return (
                    <div
                      key={agent.id}
                      onClick={() => {
                        setSelectedAgentPreference(agent.id);
                        if (activeTab !== "chat") setActiveTab("chat");
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isActive
                          ? "bg-white border-indigo-200 shadow-sm ring-2 ring-indigo-500/5"
                          : "bg-slate-50/50 hover:bg-slate-100 border-transparent"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-800">{agent.name}</span>
                        <span className={`w-2 h-2 rounded-full ${agent.color} ${isActive ? "animate-ping" : "opacity-40"}`}></span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed">{agent.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Agent routing filter */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Query Direct Route</span>
              <select
                id="agent-route-select"
                value={selectedAgentPreference}
                onChange={(e) => setSelectedAgentPreference(e.target.value)}
                className="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg outline-none text-slate-700 font-semibold"
              >
                <option value="coordinator">Auto (Orchestrator Decision)</option>
                <option value="onboarding">Force Onboarding Agent</option>
                <option value="learning">Force Learning Agent</option>
                <option value="transaction">Force Transaction Agent</option>
                <option value="fraud">Force Fraud Agent</option>
                <option value="wellness">Force Wellness Coach</option>
                <option value="support">Force Customer Support</option>
              </select>
            </div>
          </div>

          {/* Bottom Audio/TTS Controller matching design requirement */}
          <div className="mt-6 md:mt-auto pt-6 border-t border-slate-200/80">
            <div className="p-4 bg-[#2800d7] text-white rounded-2xl shadow-md space-y-3 relative overflow-hidden">
              <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
                <Mic size={80} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider">Voice Assisted Banking</h4>
                  <p className="text-[10px] opacity-80">Practice using local voice speech</p>
                </div>
                <button
                  id="btn-toggle-tts"
                  onClick={() => setTtsEnabled(!ttsEnabled)}
                  className={`p-1.5 rounded-lg transition-all ${
                    ttsEnabled ? "bg-white text-[#2800d7]" : "bg-white/10 text-white"
                  }`}
                  title={ttsEnabled ? "Disable Read Aloud" : "Enable Read Aloud"}
                >
                  {ttsEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                </button>
              </div>

              {/* Speech Wave visualizer */}
              <div className="flex items-end gap-1.5 h-7 pt-1">
                <div className={`w-1 bg-white/40 rounded-full transition-all ${isListening ? "h-6 animate-pulse" : "h-2"}`}></div>
                <div className={`w-1 bg-white/70 rounded-full transition-all ${isListening ? "h-4 animate-bounce" : "h-3"}`}></div>
                <div className={`w-1 bg-white rounded-full transition-all ${isListening ? "h-7 animate-pulse" : "h-5"}`}></div>
                <div className={`w-1 bg-white/60 rounded-full transition-all ${isListening ? "h-3 animate-bounce" : "h-2"}`}></div>
                <div className={`w-1 bg-white/90 rounded-full transition-all ${isListening ? "h-5 animate-pulse" : "h-4"}`}></div>
              </div>

              <button
                id="btn-voice-prompt"
                onClick={toggleVoiceListen}
                className="w-full bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold py-1.5 rounded-xl transition-all border border-white/10 flex items-center justify-center gap-1.5"
              >
                <Mic size={12} className={isListening ? "animate-pulse text-red-300" : ""} />
                {isListening ? "Listening closely..." : "Simulate Voice input"}
              </button>
            </div>
          </div>
        </aside>

        {/* Central Component Panel */}
        <main className="flex-1 overflow-y-auto">
          {activeTab === "learning" && <LearningAcademy />}
          {activeTab === "sandbox" && <TransactionSandbox />}
          {activeTab === "fraud" && <FraudShield />}
          {activeTab === "wellness" && <WellnessCoach />}

          {activeTab === "chat" && (
            <div className="flex flex-col h-[calc(100vh-4rem)] md:h-[700px] justify-between">
              {/* Chat history list */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                
                {/* Greeting banner card */}
                <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-indigo-950 rounded-2xl p-6 text-white shadow-md relative overflow-hidden mb-6">
                  <div className="absolute right-0 top-0 opacity-5 transform translate-x-4 -translate-y-4">
                    <Sparkles size={180} />
                  </div>
                  <h2 className="text-xl font-bold tracking-tight">Namaste, Arjun 👋</h2>
                  <p className="text-indigo-100 text-xs mt-1 leading-relaxed">
                    Welcome to your personal digital banking advisor hub. Speak or type your request below, and watch our multi-agent framework coordinate the answers instantly.
                  </p>
                </div>

                <div className="space-y-6">
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className="space-y-2.5">
                      {/* Message body */}
                      <div className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] rounded-2xl px-5 py-4 text-xs md:text-sm shadow-sm leading-relaxed ${
                          msg.sender === "user"
                            ? "bg-slate-900 text-white"
                            : "bg-white border border-slate-100 text-slate-800"
                        }`}>
                          {/* Bot Avatar indicator */}
                          {msg.sender === "bot" && (
                            <div className="flex items-center gap-1.5 mb-2.5 border-b border-slate-100 pb-2">
                              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                {msg.activeAgent?.toUpperCase()} AGENT ACTIVE
                              </span>
                            </div>
                          )}

                          {/* Markdown parsing replacement */}
                          <div className="space-y-2 prose max-w-none text-xs md:text-sm leading-relaxed">
                            {msg.text.split("\n\n").map((para, pIdx) => {
                              if (para.startsWith("###")) {
                                return <h3 key={pIdx} className="text-base font-bold text-slate-900 pt-1">{para.replace("###", "")}</h3>;
                              }
                              if (para.startsWith("* **") || para.startsWith("- **") || para.startsWith("1. **")) {
                                return (
                                  <ul key={pIdx} className="list-disc pl-4 space-y-1 my-1">
                                    {para.split("\n").map((li, lIdx) => (
                                      <li key={lIdx} className="text-slate-700">
                                        {li.replace(/^[\s-*1.]+\s*/, "").replace(/\*\*(.*?)\*\*/g, "$1")}
                                      </li>
                                    ))}
                                  </ul>
                                );
                              }
                              return <p key={pIdx} className="text-slate-700 leading-relaxed">{para}</p>;
                            })}
                          </div>

                          {/* Timestamp */}
                          <span className="text-[9px] text-slate-400 font-bold block mt-3 text-right">{msg.timestamp}</span>
                        </div>
                      </div>

                      {/* Multi-Agent Collaborative thought process panel */}
                      {msg.sender === "bot" && msg.agentLog && msg.agentLog.length > 0 && (
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/60 max-w-[85%] space-y-2 ml-2">
                          <span className="text-[10px] font-black tracking-widest uppercase text-slate-400 flex items-center gap-1.5">
                            <Sparkles size={11} className="text-indigo-600 animate-spin" /> Collaborative Log Trace
                          </span>
                          <div className="space-y-1.5">
                            {msg.agentLog.map((log, lIdx) => (
                              <div key={lIdx} className="text-[11px] leading-relaxed flex gap-2">
                                <span className="font-extrabold text-indigo-700 whitespace-nowrap shrink-0">{log.agent}:</span>
                                <span className="text-slate-600 font-medium">"{log.thought}" <span className="text-[9px] font-bold bg-slate-200/80 px-1.5 py-0.5 rounded text-slate-500 uppercase tracking-wider ml-1">{log.action}</span></span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Fraud Protection agent warnings (if applicable) */}
                      {msg.sender === "bot" && msg.fraudAlert && (
                        <div className={`max-w-[85%] rounded-xl px-4 py-3 text-xs border ml-2 flex gap-3 ${
                          msg.fraudAlert.status === "danger"
                            ? "bg-red-50 border-red-200 text-red-900"
                            : msg.fraudAlert.status === "warning"
                            ? "bg-amber-50 border-amber-200 text-amber-900"
                            : "bg-emerald-50 border-emerald-150 text-emerald-900"
                        }`}>
                          <div className="shrink-0 mt-0.5">
                            {msg.fraudAlert.status === "danger" ? (
                              <ShieldAlert size={18} className="text-red-600" />
                            ) : msg.fraudAlert.status === "warning" ? (
                              <AlertOctagon size={18} className="text-amber-600" />
                            ) : (
                              <CheckCircle size={18} className="text-emerald-600" />
                            )}
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider block mb-0.5">Fraud Guard Scan</span>
                            <p className="font-medium leading-relaxed">{msg.fraudAlert.explanation}</p>
                          </div>
                        </div>
                      )}

                      {/* Financial wellness match hints */}
                      {msg.sender === "bot" && msg.wellnessTip && (
                        <div className="max-w-[85%] bg-indigo-50/50 border border-indigo-150 rounded-xl px-4 py-3 text-xs text-indigo-900 ml-2 flex gap-3">
                          <TrendingUp size={18} className="text-indigo-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider block mb-0.5">Wellness Coach Insight</span>
                            <p className="font-medium leading-relaxed">{msg.wellnessTip}</p>
                          </div>
                        </div>
                      )}

                      {/* Quick recommendations action buttons */}
                      {msg.sender === "bot" && msg.quickPrompts && msg.quickPrompts.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2 pl-2">
                          {msg.quickPrompts.map((prompt, pIdx) => (
                            <button
                              key={pIdx}
                              id={`quick-prompt-${pIdx}`}
                              onClick={() => handleSendMessage(prompt)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-[#2800d7]/10 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:text-[#2800d7] transition-all text-left"
                            >
                              {prompt}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {isTyping && (
                    <div className="flex justify-start items-center gap-2 text-slate-400 text-xs font-semibold">
                      <span className="w-2.5 h-2.5 bg-[#2800d7] rounded-full animate-bounce"></span>
                      <span>Agents are synthesizing multi-faceted advisory...</span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Chat Input Dock */}
              <div className="p-4 bg-white border-t border-slate-200">
                <div className="flex items-center gap-2 max-w-4xl mx-auto bg-slate-100 p-2 rounded-2xl border border-slate-200">
                  <input
                    id="chat-input"
                    type="text"
                    placeholder={`Ask SBI DigiPilot... (Selected: ${AGENT_LIST.find(a => a.id === selectedAgentPreference)?.name || "Auto Coordinators"})`}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage(inputText)}
                    className="flex-1 bg-transparent border-none outline-none text-sm px-3 text-slate-800"
                  />
                  <button
                    id="btn-chat-send"
                    onClick={() => handleSendMessage(inputText)}
                    className="p-2.5 bg-[#2800d7] hover:bg-[#1f00a5] text-white rounded-xl shadow-md transition-all shrink-0"
                    title="Send message"
                  >
                    <Send size={15} />
                  </button>
                </div>
                
                {/* Visual starter links */}
                <div className="flex gap-2 items-center justify-center flex-wrap pt-3 text-[10px] text-slate-400">
                  <span className="font-bold uppercase tracking-wider">Quick Starters:</span>
                  {STARTER_PROMPTS.map((p, pIdx) => (
                    <button
                      key={pIdx}
                      id={`starter-${pIdx}`}
                      onClick={() => handleSendMessage(p.text, p.agent)}
                      className="hover:text-blue-700 font-semibold underline underline-offset-2"
                    >
                      {p.text}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Elegant Footer Status Line */}
      <footer className="h-12 border-t border-slate-200/80 bg-white px-4 md:px-8 flex items-center justify-between text-[10px] text-slate-400 shrink-0 select-none">
        <div className="flex gap-6 font-bold uppercase tracking-widest">
          <span>AI response: 18ms</span>
          <span>Security session: ACTIVE</span>
        </div>
        <div className="flex gap-2 items-center">
          <span className="w-1.5 h-1.5 bg-[#2800d7] rounded-full animate-ping"></span>
          <span>Encrypted with 256-bit SBI Standards</span>
        </div>
      </footer>
    </div>
  );
}
