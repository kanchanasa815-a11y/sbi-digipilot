export interface AgentThought {
  agent: string;
  thought: string;
  action: string;
}

export interface ChatMessage {
  sender: "user" | "bot";
  text: string;
  activeAgent?: string;
  agentLog?: AgentThought[];
  wellnessTip?: string;
  fraudAlert?: {
    status: "safe" | "warning" | "danger";
    explanation: string;
  };
  quickPrompts?: string[];
  timestamp: string;
}

export interface FraudAnalysis {
  riskLevel: "safe" | "warning" | "danger";
  scamType: string;
  confidence: number;
  indicators: string[];
  explanation: string;
  safetyChecklist: string[];
}

export interface SBIProduct {
  id: string;
  name: string;
  tag: string;
  description: string;
  interestRate: string;
  minAmount: number;
  duration: string;
  benefits: string[];
}
