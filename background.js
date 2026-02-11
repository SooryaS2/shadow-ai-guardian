// Shadow AI Guardian - Background Service Worker

// Known AI Endpoints for Layer 4 Detection
const AI_ENDPOINTS = [
    "api.openai.com",
    "api.anthropic.com",
    "generativelanguage.googleapis.com",
    "api.midjourney.com",
    "api.stability.ai",
    "api.huggingface.co",
    "api.assemblyai.com",
    "api.replicate.com",
    "api.jasper.ai",
    "api.copy.ai",
    "api.writesonic.com",
    "api.perplexity.ai",
    "grpc.character.ai"
];

// Initialize storage on install
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(["auditLogs"], (result) => {
        if (!result.auditLogs) {
            chrome.storage.local.set({ auditLogs: [] });
        }
    });
    console.log("Shadow AI Guardian installed and storage initialized.");
});

// Helper to log risk
function logRisk(domain, action, riskLevel, details = "", promptContent = null) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, domain, action, riskLevel, details };

    if (promptContent) {
        logEntry.promptContent = promptContent;
    }

    chrome.storage.local.get(["auditLogs"], (result) => {
        const logs = result.auditLogs || [];
        logs.unshift(logEntry); // Add to beginning
        // Keep max 1000 logs to prevent storage overflow
        if (logs.length > 1000) logs.pop();
        chrome.storage.local.set({ auditLogs: logs });
    });
    console.log("Risk Logged:", logEntry);
}

// Layer 4: Network Sniffing (The X-Ray)
// Detects background API calls even if UI is hidden
chrome.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
        const url = new URL(details.url);
        // Check if the request hostname contains any known AI endpoint
        const isAI = AI_ENDPOINTS.some(endpoint => url.hostname.includes(endpoint));

        if (isAI) {
            const initiator = details.initiator || "unknown";
            // If the initiator is NOT the AI domain itself, it's likely an embedded integration
            const isThirdParty = !initiator.includes(url.hostname) && !url.hostname.includes(initiator);

            if (isThirdParty) {
                logRisk(
                    initiator,
                    "Background API Call Detected",
                    "High",
                    `Target: ${url.hostname}`
                );
            }
        }
    },
    { urls: ["<all_urls>"] },
    ["requestHeaders"]
);

// Listen for messages from Content Script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "LOG_RISK") {
        logRisk(
            request.payload.domain,
            request.payload.action,
            request.payload.riskLevel,
            request.payload.details
        );
        sendResponse({ status: "logged" });
    }

    if (request.type === "LOG_PROMPT") {
        // Log specifically as a surveillance event with content
        logRisk(
            request.payload.domain,
            "Prompt Captured",
            "High",
            "Content captured via surveillance logic.",
            request.payload.content // Pass content to logRisk
        );

        sendResponse({ status: "logged" });
    }
});
