// Shadow AI Guardian - Background Service Worker v2.0

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

// Default approved AI models list
const DEFAULT_AI_MODELS = [
    { id: "chatgpt", name: "ChatGPT", provider: "OpenAI", enabled: false },
    { id: "claude", name: "Claude", provider: "Anthropic", enabled: false },
    { id: "gemini", name: "Gemini", provider: "Google", enabled: false },
    { id: "copilot", name: "Copilot", provider: "Microsoft", enabled: false },
    { id: "perplexity", name: "Perplexity", provider: "Perplexity AI", enabled: false },
    { id: "deepseek", name: "DeepSeek", provider: "DeepSeek", enabled: false },
    { id: "mistral", name: "Mistral", provider: "Mistral AI", enabled: false },
    { id: "groq", name: "Groq", provider: "Groq", enabled: false },
    { id: "cohere", name: "Cohere", provider: "Cohere", enabled: false },
    { id: "huggingface", name: "HuggingFace", provider: "HuggingFace", enabled: false }
];

// Default settings for users without a group
const DEFAULT_SETTINGS = {
    surveillanceLevel: "LOW",
    approvedUrls: [],
    approvedModels: [],
    blockAllAI: true
};

// Initialize storage on install
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(null, (result) => {
        const defaults = {};

        if (!result.auditLogs) defaults.auditLogs = [];
        if (!result.groups) defaults.groups = [];
        if (!result.sensitiveStats) defaults.sensitiveStats = { email: 0, phone: 0, creditCard: 0, ssn: 0, apiKey: 0, ipAddress: 0 };
        if (!result.adminPassword) defaults.adminPassword = "admin123";
        if (!result.approvedModels) defaults.approvedModels = DEFAULT_AI_MODELS;
        if (!result.defaultSettings) defaults.defaultSettings = DEFAULT_SETTINGS;
        if (!result.sitesScanned) defaults.sitesScanned = 0;

        if (Object.keys(defaults).length > 0) {
            chrome.storage.local.set(defaults);
        }
    });
    console.log("Shadow AI Guardian v2.0 installed and storage initialized.");
});

// Helper to log risk
function logRisk(domain, action, riskLevel, details = "", promptContent = null, sensitiveTypes = null, groupInfo = null) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, domain, action, riskLevel, details };

    if (promptContent) {
        logEntry.promptContent = promptContent;
    }
    if (sensitiveTypes && sensitiveTypes.length > 0) {
        logEntry.sensitiveTypes = sensitiveTypes;
    }

    // Attach group info if provided directly
    if (groupInfo) {
        logEntry.groupCode = groupInfo.groupCode || null;
        logEntry.groupName = groupInfo.groupName || "Standard Mode";
        if (groupInfo.userName) logEntry.userName = groupInfo.userName;
    }

    // Look up user session to attach group info if not already provided
    chrome.storage.local.get(["auditLogs", "userSession"], (result) => {
        const logs = result.auditLogs || [];

        // If no groupInfo was passed, try to get it from stored session
        if (!groupInfo && result.userSession) {
            logEntry.groupCode = result.userSession.groupCode || null;
            logEntry.groupName = result.userSession.groupName || "Standard Mode";
            if (result.userSession.userName) logEntry.userName = result.userSession.userName;
        }

        logs.unshift(logEntry);
        if (logs.length > 1000) logs.pop();
        chrome.storage.local.set({ auditLogs: logs });
    });
    console.log("Risk Logged:", logEntry);
}

// Track sites scanned
chrome.webNavigation.onCompleted.addListener((details) => {
    if (details.frameId === 0) {
        chrome.storage.local.get(["sitesScanned"], (result) => {
            const count = (result.sitesScanned || 0) + 1;
            chrome.storage.local.set({ sitesScanned: count });
        });
    }
});

// Layer 4: Network Sniffing
chrome.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
        const url = new URL(details.url);
        const isAI = AI_ENDPOINTS.some(endpoint => url.hostname.includes(endpoint));

        if (isAI) {
            const initiator = details.initiator || "unknown";
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

// Generate a random 6-character group code
function generateGroupCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No ambiguous chars (0/O, 1/I)
    let code = "";
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "LOG_RISK") {
        logRisk(
            request.payload.domain,
            request.payload.action,
            request.payload.riskLevel,
            request.payload.details,
            null,
            null,
            request.payload.groupInfo || null
        );
        sendResponse({ status: "logged" });
    }

    if (request.type === "LOG_PROMPT") {
        logRisk(
            request.payload.domain,
            "Prompt Captured",
            "High",
            "Content captured via surveillance logic.",
            request.payload.content,
            request.payload.sensitiveTypes || null,
            request.payload.groupInfo || null
        );
        sendResponse({ status: "logged" });
    }

    if (request.type === "LOG_SENSITIVE") {
        // Update sensitive data stats
        chrome.storage.local.get(["sensitiveStats"], (result) => {
            const stats = result.sensitiveStats || { email: 0, phone: 0, creditCard: 0, ssn: 0, apiKey: 0, ipAddress: 0 };
            const types = request.payload.types || [];
            types.forEach(t => {
                if (stats[t] !== undefined) {
                    stats[t]++;
                }
            });
            chrome.storage.local.set({ sensitiveStats: stats });
        });

        logRisk(
            request.payload.domain,
            "Sensitive Data Detected",
            request.payload.riskLevel || "High",
            `Types: ${(request.payload.types || []).join(", ")}`,
            null,
            request.payload.types
        );
        sendResponse({ status: "logged" });
    }

    // Group management
    if (request.type === "GET_GROUPS") {
        chrome.storage.local.get(["groups"], (result) => {
            sendResponse({ groups: result.groups || [] });
        });
        return true; // async
    }

    if (request.type === "SAVE_GROUP") {
        chrome.storage.local.get(["groups"], (result) => {
            const groups = result.groups || [];
            const existing = groups.findIndex(g => g.code === request.payload.code);
            if (existing >= 0) {
                // Preserve existing members and createdAt
                const prev = groups[existing];
                request.payload.members = prev.members || [];
                request.payload.createdAt = prev.createdAt;
                groups[existing] = request.payload;
            } else {
                request.payload.code = request.payload.code || generateGroupCode();
                request.payload.createdAt = new Date().toISOString();
                request.payload.members = request.payload.members || [];
                groups.push(request.payload);
            }
            chrome.storage.local.set({ groups: groups }, () => {
                sendResponse({ status: "saved", group: request.payload });
            });
        });
        return true; // async
    }

    if (request.type === "DELETE_GROUP") {
        chrome.storage.local.get(["groups"], (result) => {
            const groups = (result.groups || []).filter(g => g.code !== request.payload.code);
            chrome.storage.local.set({ groups: groups }, () => {
                sendResponse({ status: "deleted" });
            });
        });
        return true;
    }

    if (request.type === "VALIDATE_CODE") {
        chrome.storage.local.get(["groups", "defaultSettings"], (result) => {
            const groups = result.groups || [];
            const group = groups.find(g => g.code === request.payload.code.toUpperCase());
            if (group) {
                sendResponse({ valid: true, group: group });
            } else {
                sendResponse({ valid: false });
            }
        });
        return true;
    }

    if (request.type === "ADD_MEMBER") {
        chrome.storage.local.get(["groups"], (result) => {
            const groups = result.groups || [];
            const group = groups.find(g => g.code === request.payload.code);
            if (group) {
                if (!group.members) group.members = [];
                const name = request.payload.userName || 'Anonymous';
                if (!group.members.includes(name)) {
                    group.members.push(name);
                }
                chrome.storage.local.set({ groups: groups }, () => {
                    sendResponse({ status: "added" });
                });
            } else {
                sendResponse({ status: "group_not_found" });
            }
        });
        return true;
    }

    if (request.type === "GET_SETTINGS") {
        chrome.storage.local.get(["adminPassword", "approvedModels", "surveillanceLevel", "defaultSettings"], (result) => {
            sendResponse({
                adminPassword: result.adminPassword || "admin123",
                approvedModels: result.approvedModels || DEFAULT_AI_MODELS,
                surveillanceLevel: result.surveillanceLevel || "LOW",
                defaultSettings: result.defaultSettings || DEFAULT_SETTINGS
            });
        });
        return true;
    }

    if (request.type === "SAVE_SETTINGS") {
        const data = {};
        if (request.payload.adminPassword) data.adminPassword = request.payload.adminPassword;
        if (request.payload.approvedModels) data.approvedModels = request.payload.approvedModels;
        if (request.payload.surveillanceLevel) data.surveillanceLevel = request.payload.surveillanceLevel;
        if (request.payload.defaultSettings) data.defaultSettings = request.payload.defaultSettings;

        chrome.storage.local.set(data, () => {
            sendResponse({ status: "saved" });
        });
        return true;
    }

    if (request.type === "GENERATE_CODE") {
        sendResponse({ code: generateGroupCode() });
    }

    if (request.type === "GET_STATS") {
        chrome.storage.local.get(["auditLogs", "sensitiveStats", "sitesScanned", "groups"], (result) => {
            let logs = result.auditLogs || [];
            const sensitiveStats = result.sensitiveStats || { email: 0, phone: 0, creditCard: 0, ssn: 0, apiKey: 0, ipAddress: 0 };
            const sitesScanned = result.sitesScanned || 0;
            const groups = result.groups || [];

            // Filter logs for this specific user/group if filter provided
            const filter = request.payload || {};
            if (filter.userName || filter.groupCode) {
                logs = logs.filter(log => {
                    if (filter.groupCode && log.groupCode !== filter.groupCode) return false;
                    if (filter.userName && log.userName !== filter.userName) return false;
                    return true;
                });
            }

            // Risk distribution
            const riskDist = { Critical: 0, High: 0, Medium: 0, Low: 0 };
            const domainCounts = {};
            logs.forEach(log => {
                if (riskDist[log.riskLevel] !== undefined) riskDist[log.riskLevel]++;
                if (log.domain) {
                    domainCounts[log.domain] = (domainCounts[log.domain] || 0) + 1;
                }
            });

            // Top domains
            const topDomains = Object.entries(domainCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([domain, count]) => ({ domain, count }));

            // Total sensitive detections
            const totalSensitive = Object.values(sensitiveStats).reduce((a, b) => a + b, 0);

            sendResponse({
                sitesScanned,
                risksBlocked: logs.length,
                sensitiveDetections: totalSensitive,
                sensitiveStats,
                riskDistribution: riskDist,
                topDomains,
                recentActivity: logs.slice(0, 50),
                totalGroups: groups.length,
                totalMembers: groups.reduce((s, g) => s + (g.members ? g.members.length : 0), 0)
            });
        });
        return true;
    }
});
