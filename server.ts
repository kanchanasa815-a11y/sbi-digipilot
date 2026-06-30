import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json());

  // Safe lazy initializer for Gemini API client
  let aiClient: GoogleGenAI | null = null;
  function getGeminiClient(): GoogleGenAI | null {
    if (!aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
        aiClient = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });
      }
    }
    return aiClient;
  }

  // Multi-Agent Chat Endpoint
  app.post("/api/agents/chat", async (req, res) => {
    const { message, history, selectedAgent } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      // Return high-fidelity mock multi-agent responses if Gemini API Key is not set yet
      const simulatedResponse = getMockAgentResponse(message, selectedAgent || "coordinator");
      return res.json(simulatedResponse);
    }

    try {
      const systemInstruction = `You are the master coordinator for SBI DigiPilot, an intelligent multi-agent platform for State Bank of India (SBI).
We have 6 specialized agents collaborating to help the customer:
1. Onboarding Agent ("onboarding"): Guides through SBI YONO registration, KYC, net banking setup, profile activation.
2. Learning Agent ("learning"): Explains digital banking concepts (UPI, NEFT, IMPS, RTGS, bill payments) with regional language support.
3. Transaction Agent ("transaction"): Guides fund transfers, QR payments, bill payments, and simulates transactional actions safely.
4. Fraud Protection Agent ("fraud"): Scans for fraud/phishing, alerts users on suspicious SMS, and monitors safe transactions.
5. Financial Wellness Agent ("wellness"): Offers custom budgeting tips, spending insights, and recommends SBI products (Savings, FDs, Mutual Funds).
6. Customer Support Agent ("support"): Handles general banking inquiries and guides human-like support resolution.

When the customer sends a message, you must act as the Multi-Agent orchestrator. You will coordinate their responses and generate a JSON structure.
Even if a single agent leads, other agents can chim-in with their thoughts/rebuttals in the 'agentLog' to simulate real collaboration.
For example, if the user asks about transferring money, the Transaction Agent guides it, but the Fraud Protection Agent immediately logs a scanning step.

You MUST respond strictly with a JSON object fitting this schema:
{
  "activeAgent": "onboarding" | "learning" | "transaction" | "fraud" | "wellness" | "support",
  "agentLog": [
    { "agent": "Coordinator", "thought": "Deciding which agent can address this request...", "action": "Routing" },
    { "agent": "Transaction Agent", "thought": "...", "action": "..." }
  ],
  "response": "Elegant markdown formatted customer-facing response. Emphasize SBI's secure digital channels.",
  "wellnessTip": "Optional personalized wellness / budget / saving tip",
  "fraudAlert": {
    "status": "safe" | "warning" | "danger",
    "explanation": "Brief safety or scam warning related to the topic"
  },
  "quickPrompts": ["Next logical query 1", "Next logical query 2"]
}

Ensure the conversation feels professional, highly encouraging for digital adoption, and uses clear visual pointers. Keep instructions focused, simple, and empathetic to first-time digital banking users, seniors, and rural citizens.`;

      const prompt = `User request: "${message}"
Selected agent or preference: "${selectedAgent || "coordinator"}"
History context: ${JSON.stringify(history || [])}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              activeAgent: { type: Type.STRING },
              agentLog: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    agent: { type: Type.STRING },
                    thought: { type: Type.STRING },
                    action: { type: Type.STRING }
                  },
                  required: ["agent", "thought", "action"]
                }
              },
              response: { type: Type.STRING },
              wellnessTip: { type: Type.STRING },
              fraudAlert: {
                type: Type.OBJECT,
                properties: {
                  status: { type: Type.STRING },
                  explanation: { type: Type.STRING }
                },
                required: ["status", "explanation"]
              },
              quickPrompts: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["activeAgent", "agentLog", "response", "fraudAlert", "quickPrompts"]
          }
        }
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json(parsed);
    } catch (error) {
      console.error("Gemini Multi-Agent execution failed:", error);
      res.status(500).json({
        error: "Failed to process banking inquiry with agents",
        fallback: getMockAgentResponse(message, selectedAgent || "coordinator")
      });
    }
  });

  // Scam / Phishing Checker Endpoint
  app.post("/api/agents/check-fraud", async (req, res) => {
    const { content } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json(getMockFraudCheck(content));
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Analyze this SMS, message, email, or UPI request for potential financial fraud, phishing, lottery scam, or impersonation targeting an SBI customer: "${content}"`,
        config: {
          systemInstruction: "You are the SBI Fraud Protection Agent. Analyze the message for urgency, malicious links, requests for OTP/PIN, lottery fraud, or fake customer care numbers. Return a JSON structure ONLY.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              riskLevel: { type: Type.STRING, description: "safe, warning, or danger" },
              scamType: { type: Type.STRING, description: "Type of scam detected, e.g., 'Phishing SMS', 'Lottery Scam', etc." },
              confidence: { type: Type.NUMBER, description: "Match confidence from 0 to 100" },
              indicators: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of red flags found"
              },
              explanation: { type: Type.STRING, description: "Detailed protective explanation" },
              safetyChecklist: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Recommended immediate protective steps for the customer"
              }
            },
            required: ["riskLevel", "scamType", "confidence", "indicators", "explanation", "safetyChecklist"]
          }
        }
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json(parsed);
    } catch (err) {
      console.error("Fraud Protection check failed:", err);
      res.json(getMockFraudCheck(content));
    }
  });

  // Regional language TTS Audio simulator
  app.post("/api/agents/tts", async (req, res) => {
    const { text, languageCode } = req.body;
    // Return standard dummy success status since client-side handles TTS playback elegantly via Web Speech API or friendly UI
    res.json({ success: true, text, languageCode });
  });

  // Serve static UI assets
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SBI DigiPilot Server running on http://0.0.0.0:${PORT}`);
  });
}

// Full mock response generator for offline resilience and fast loading
function getMockAgentResponse(message: string, selectedAgent: string) {
  const normalized = message.toLowerCase();
  
  if (normalized.includes("yono") || normalized.includes("onboard") || normalized.includes("register") || selectedAgent === "onboarding") {
    return {
      activeAgent: "onboarding",
      agentLog: [
        { agent: "Coordinator", thought: "Detected keywords matching SBI YONO registration and setup.", action: "Delegate to Onboarding Agent" },
        { agent: "Onboarding Agent", thought: "Analyzing customer request for digital registration. Ready to outline the safe activation procedure.", action: "Launch Registration Guide" },
        { agent: "Fraud Protection Agent", thought: "Reminding customer to never share MPIN or OTP during onboarding.", action: "Inject Secure Banner" }
      ],
      response: `### Welcome to SBI YONO Digital Onboarding! 🚀\n\nTo activate your **SBI YONO (You Only Need One)** application or Internet Banking safely, please follow these simple steps:\n\n1. **Download YONO SBI** only from the official **Google Play Store** or **Apple App Store**.\n2. **Select 'Existing Customer'** if you already have an SBI Account, or **'New to SBI'** to open a digital savings account instantly using your Aadhaar and PAN.\n3. **SIM Verification:** Ensure your bank-registered mobile number SIM is in the device you are registering from.\n4. **Create a Secure MPIN:** Choose a 6-digit number that is not easily guessable (avoid birthdays or consecutive numbers like 123456).\n\nNeed visual help? You can launch the **Onboarding Hub** in our sidebar to try the interactive YONO KYC simulator!`,
      wellnessTip: "By registering on YONO, you can open a high-interest 'SBI Amrit Kalash' Fixed Deposit in under 2 minutes!",
      fraudAlert: {
        status: "safe",
        explanation: "Always register your account from your own phone. SBI never calls or sends SMS links to install YONO files."
      },
      quickPrompts: ["Launch KYC Simulator", "What documents do I need for YONO?", "How do I set up SBI Internet Banking?"]
    };
  }

  if (normalized.includes("transfer") || normalized.includes("send money") || normalized.includes("pay") || normalized.includes("upi") || selectedAgent === "transaction") {
    return {
      activeAgent: "transaction",
      agentLog: [
        { agent: "Coordinator", thought: "Customer is asking about digital fund transfers or payments.", action: "Delegate to Transaction Agent" },
        { agent: "Transaction Agent", thought: "Preparing secure step-by-step guidance on money transfers and QR scans.", action: "Create Transaction Guide" },
        { agent: "Fraud Protection Agent", thought: "Scanning destination routing check. Reminding user that OTP is ONLY for sending/withdrawing money, never for receiving.", action: "Safety Shield Scanning" }
      ],
      response: `### Safe Fund Transfers & UPI Payments 💸\n\nSBI provides multiple channels for quick and secure fund transfers:\n\n* **BHIM SBI Pay (UPI):** Transfer money instantly using a VPA (Virtual Payment Address) or by scanning a QR code. Ideal for daily small transactions.\n* **IMPS (Immediate Payment Service):** 24x7 instant transfer using Account Number & IFSC, perfect for urgent transfers up to ₹5 Lakhs.\n* **NEFT / RTGS:** Best suited for planned and high-value transfers directly through YONO or net banking.\n\n**To transfer via UPI:**\n1. Open your UPI app and tap **Pay/Send Money**.\n2. Enter the beneficiary's UPI ID, Phone Number, or Scan their QR Code.\n3. Verify the beneficiary's registered name displayed on the screen before entering your **UPI PIN**.\n4. **CRITICAL:** Entering your UPI PIN will **deduct** money from your account. You *never* need to enter your PIN to *receive* money!`,
      wellnessTip: "Set daily UPI transaction limits in your YONO app settings to maintain control over your impulsive spending.",
      fraudAlert: {
        status: "warning",
        explanation: "Beware of 'Collect Money' requests on UPI from strangers. Confirm the name carefully before tapping 'Pay'."
      },
      quickPrompts: ["Go to Transaction Sandbox", "Difference between UPI, NEFT, and IMPS?", "How do I block my SBI Debit Card?"]
    };
  }

  if (normalized.includes("scam") || normalized.includes("scammed") || normalized.includes("phishing") || normalized.includes("fraud") || normalized.includes("sms") || selectedAgent === "fraud") {
    return {
      activeAgent: "fraud",
      agentLog: [
        { agent: "Coordinator", thought: "Identified high-priority concern regarding fraud, scam alerts, or phishing.", action: "Delegate to Fraud Protection Agent" },
        { agent: "Fraud Protection Agent", thought: "Isolating threat indicators. Activating full SBI Cyber Safety protocol.", action: "Initiate Threat Advisory" },
        { agent: "Wellness Agent", thought: "Ensuring user feels reassured and supported to lock down accounts safely.", action: "Post Emergency Guide" }
      ],
      response: `### SBI Cyber Security Alert: Stay Safe! 🛡️\n\nState Bank of India never asks for personal details, passwords, PINs, or OTPs over phone calls, SMS, or emails. \n\n**Common Cyber Scams to Avoid:**\n* **Electricity Bill Scam:** Fake SMS claiming your power will be disconnected. They ask you to call a number and install screen-sharing apps like AnyDesk.\n* **KYC Update Scam:** Fake alerts saying your account is blocked unless you update KYC via a link. SBI only handles KYC through secure branches or the official YONO app.\n* **Part-Time Job/Lottery Scam:** Fake WhatsApp messages offering huge money for liking videos or claiming an SBI lottery prize.\n\n**What to do if you suspect fraud:**\n1. Immediately block your debit card and internet banking via **YONO SBI** or call our Toll-Free Helpline at **1800 11 2211 / 1800 1234**.\n2. Report the incident instantly on the National Cyber Crime Portal: **cybercrime.gov.in** or call **1930**.`,
      wellnessTip: "Use the 'Fraud Shield Desk' in the menu to test suspicious SMS contents before tapping any links!",
      fraudAlert: {
        status: "danger",
        explanation: "Never install remote control or screen-sharing apps on your phone on a caller's request. They can steal your bank OTPs!"
      },
      quickPrompts: ["Analyze a suspicious SMS", "How to block my bank account instantly", "What are safe password habits?"]
    };
  }

  if (normalized.includes("learn") || normalized.includes("tutorial") || normalized.includes("regional") || normalized.includes("language") || selectedAgent === "learning") {
    return {
      activeAgent: "learning",
      agentLog: [
        { agent: "Coordinator", thought: "User wants to understand digital banking mechanisms or change languages.", action: "Delegate to Learning Agent" },
        { agent: "Learning Agent", thought: "Ready to simplify complex terminology. Supporting local dialects for digital inclusion.", action: "Load Regional Glossary" }
      ],
      response: `### Simplify Digital Banking with SBI Learning Hub 📚\n\nLet's break down the core digital banking concepts in simple terms:\n\n* **UPI (Unified Payments Interface):** Think of it as sending a message on WhatsApp. You just type a UPI ID (e.g., name@sbi) and send money directly from your bank account instantly.\n* **OTP (One Time Password):** This is a 6-digit key sent only to your phone. It works like a digital signature to authorize a payment. **Never share this with anyone!**\n* **e-Rupee (CBDC):** Digital currency issued by the RBI, behaving exactly like physical cash notes on your phone.\n\nSelect your preferred language in the **Learning Agent** control block (English, Hindi, Telugu, Tamil, Marathi) and let us read the tutorials out loud for you!`,
      wellnessTip: "Knowledge is the best defense. Share these safety tips with senior citizens and relatives in your local community.",
      fraudAlert: {
        status: "safe",
        explanation: "Always read the transaction SMS carefully. If the OTP message says 'Deducted' and you are expecting to 'Receive', cancel immediately!"
      },
      quickPrompts: ["How does UPI work?", "How can I activate e-Rupee?", "Show UPI Security Guidelines"]
    };
  }

  if (normalized.includes("budget") || normalized.includes("saving") || normalized.includes("invest") || normalized.includes("wellness") || selectedAgent === "wellness") {
    return {
      activeAgent: "wellness",
      agentLog: [
        { agent: "Coordinator", thought: "Query detected regarding smart spending, savings, or SBI financial wellness solutions.", action: "Delegate to Financial Wellness Agent" },
        { agent: "Wellness Agent", thought: "Analyzing financial goals. Generating intelligent savings path.", action: "Construct Wealth Advisory" }
      ],
      response: `### SBI Financial Wellness Hub: Grow Your Wealth 📈\n\nAdopting digital banking is not just about making payments—it's about smart wealth management. Here are a few personalized suggestions:\n\n* **Create a recurring savings habit:** Use **SBI Flexi Recurring Deposit (RD)** to automatically save as little as ₹500 every month directly from your savings balance.\n* **Lock idle funds securely:** Invest in **SBI Fixed Deposits (FD)** or **Amrit Kalash Scheme** for fixed, guaranteed returns with maximum security.\n* **Smart Budgeting:** Follow the 50/30/20 rule (50% Essentials, 30% Savings & Investments, 20% Personal Wants). Keep track of your monthly statements in YONO.\n\nExplore our **Wellness Coach** dashboard to analyze your monthly spendings dynamically!`,
      wellnessTip: "SBI Mutual Funds offer Systematic Investment Plans (SIP) starting from just ₹100 per month on YONO.",
      fraudAlert: {
        status: "safe",
        explanation: "Beware of high-return investment schemes promised by unverified third-party apps. Stick to regulated bank options."
      },
      quickPrompts: ["Go to Wellness Coach", "What is SBI Amrit Kalash?", "Explain SBI Mutual Fund SIP"]
    };
  }

  // General Customer Support
  return {
    activeAgent: "support",
    agentLog: [
      { agent: "Coordinator", thought: "Mapping user question to our specialized Multi-Agent panels.", action: "Route to General Support Agent" },
      { agent: "Support Agent", thought: "Analyzing user's unique question and providing conversational, step-by-step assistance.", action: "Generate Help Outline" }
    ],
    response: `### Welcome to SBI DigiPilot Customer Assistance! 👋\n\nI am your unified DigiPilot multi-agent companion. I can help you onboard, make secure transactions, learn digital systems, keep you safe from frauds, and optimize your savings.\n\n**Here are some popular topics I can guide you through:**\n* **YONO SBI Activation** and Online registration guides\n* **UPI & Digital Transfer Safety** tutorials\n* **Scam SMS Checkers** to verify links or sender details\n* **Personalized Budgets** and SBI investment recommendations\n\n*Tell me what you would like to achieve today, or click on any of our interactive hubs on the screen!*`,
    wellnessTip: "Did you know you can check your SBI account balance instantly via WhatsApp Banking? Ask me how!",
    fraudAlert: {
      status: "safe",
      explanation: "Remember: Bank staff will NEVER ask you for your internet banking username, password, or credit card CVV."
    },
    quickPrompts: ["How do I register for YONO?", "Test a suspicious message", "Start UPI Practice session"]
  };
}

function getMockFraudCheck(content: string) {
  const normalized = content.toLowerCase();
  let riskLevel = "safe";
  let scamType = "Unrecognized Pattern";
  let confidence = 10;
  let indicators = ["No obvious lottery keywords or links"];
  let explanation = "The entered message does not match known phishing templates. However, please remain vigilant.";
  let safetyChecklist = ["Do not share OTPs", "Verify the sender ID"];

  if (normalized.includes("congratulations") || normalized.includes("won") || normalized.includes("lottery") || normalized.includes("prize") || normalized.includes("kbc") || normalized.includes("crore")) {
    riskLevel = "danger";
    scamType = "Lottery / Prize Scam";
    confidence = 98;
    indicators = [
      "Unsolicited lottery winnings",
      "Demands urgent processing fees",
      "Impersonation of SBI or public lottery boards (like KBC)"
    ];
    explanation = "This is a classic financial scam. Authentic lotteries or banks never announce crores of prizes via random SMS or WhatsApp. They will usually ask you to pay a 'processing fee' or 'tax' in advance, which is a total scam.";
    safetyChecklist = [
      "Do NOT click any links in this message.",
      "Do NOT call the phone number provided.",
      "Do NOT pay any amount of 'processing fee' or 'registration tax'.",
      "Block the sender on your phone and WhatsApp instantly."
    ];
  } else if (normalized.includes("blocked") || normalized.includes("suspended") || normalized.includes("kyc") || normalized.includes("pan card") || normalized.includes("update") || normalized.includes("electricity") || normalized.includes("power")) {
    riskLevel = "danger";
    scamType = "Phishing / Account Takeover";
    confidence = 95;
    indicators = [
      "Artificial urgency / panic triggers ('account blocked today')",
      "Malicious unverified web link",
      "Impersonation of SBI Security, KYC Desk, or Electricity Board"
    ];
    explanation = "This message is designed to trigger panic and force you to click a link. The link leads to a fake replica of the SBI banking page, where scammers capture your username, password, and subsequent OTPs.";
    safetyChecklist = [
      "Never click any link starting with bit.ly, tinyurl, or unverified secure sites.",
      "SBI only requests KYC updates directly inside branches or the official secure YONO portal.",
      "If they claim to be from the Electricity Board, check your official bill or call the local subdivision directly."
    ];
  } else if (normalized.includes("part-time") || normalized.includes("earn") || normalized.includes("salary") || normalized.includes("work from home") || normalized.includes("telegram")) {
    riskLevel = "warning";
    scamType = "Part-Time Task Scam";
    confidence = 88;
    indicators = [
      "Promises high daily returns for simple digital tasks",
      "Encourages joining unverified Telegram groups",
      "Requests small deposit to unlock larger rewards"
    ];
    explanation = "Scammers tempt you with 'earn ₹5000/day by reviewing movies or liking YouTube videos.' Initially, they pay small sums, then force you into a 'VIP Deposit' program where you lose your entire investment.";
    safetyChecklist = [
      "Never send money to get paid for simple tasks.",
      "Avoid clicking unverified Telegram group invitations.",
      "Ignore recruiters offering high salaries for trivial work."
    ];
  }

  return {
    riskLevel,
    scamType,
    confidence,
    indicators,
    explanation,
    safetyChecklist
  };
}

startServer();
