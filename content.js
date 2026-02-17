// Shadow AI Guardian - Content Script v2.0

// Configuration: High-Risk AI Domains
const HIGH_RISK_DOMAINS = [
    // Major LLMs
    "chatgpt.com", "openai.com", "chat.openai.com",
    "claude.ai", "anthropic.com",
    "gemini.google.com", "bard.google.com", "aistudio.google.com",
    "copilot.microsoft.com", "bing.com/chat", "bing.com/new",
    "perplexity.ai",
    "poe.com",
    "huggingface.co/chat", "huggingface.co",

    // Character & RP
    "character.ai", "beta.character.ai",
    "janitorai.com", "chub.ai", "venus.chub.ai",
    "crushon.ai", "joyland.ai", "spicychat.ai",

    // Writing & Productivity
    "jasper.ai", "app.jasper.ai",
    "copy.ai", "app.copy.ai",
    "writesonic.com", "app.writesonic.com",
    "quillbot.com",
    "rytr.me", "app.rytr.me",
    "wordtune.com",
    "grammarly.com",
    "notion.so",
    "otter.ai",
    "fireflies.ai",

    // Coding
    "github.com/copilot",
    "tabnine.com",
    "codewhisperer.aws",
    "replit.com",
    "cursor.sh",
    "phind.com",
    "you.com",
    "blackbox.ai",

    // Image & Video Gen
    "midjourney.com",
    "leonardo.ai", "app.leonardo.ai",
    "dalle.openai.com",
    "labs.openai.com",
    "stablediffusionweb.com",
    "clipdrop.co",
    "firefly.adobe.com",
    "runwayml.com", "app.runwayml.com",
    "pika.art",
    "sora.openai.com",
    "civitai.com",
    "tensor.art",
    "nightcafe.studio",

    // Misc & Aggregators
    "deepai.org",
    "spinbot.com",
    "gamma.app",
    "tome.app",
    "beautiful.ai",
    "synthesia.io",
    "deepseek.com", "chat.deepseek.com",
    "mistral.ai", "chat.mistral.ai",
    "groq.com",
    "cohere.com",
    "forefront.ai"
];

const AI_DOM_SELECTORS = [
    // Chat widgets & assistants
    'iframe[src*="intercom"]',
    'iframe[src*="drift"]',
    'iframe[src*="chatbot"]',
    'iframe[src*="botpress"]',
    'iframe[src*="tidio"]',
    'iframe[src*="crisp"]',
    'iframe[src*="zendesk"]',
    'iframe[src*="freshchat"]',
    'iframe[src*="live-chat"]',

    // AI assistant elements
    'textarea[placeholder*="Ask AI"]',
    'textarea[placeholder*="ask ai"]',
    'textarea[placeholder*="Ask anything"]',
    'textarea[placeholder*="Chat with"]',
    'textarea[placeholder*="Message"]',
    'input[placeholder*="Ask AI"]',
    'input[placeholder*="ask ai"]',
    'input[placeholder*="Ask Copilot"]',

    // Microsoft Copilot
    'div[aria-label="Copilot"]',
    '#copilot',
    '.copilot',
    '[data-copilot]',
    '[class*="copilot"]',
    '[id*="copilot"]',

    // Google AI
    '[class*="gemini"]',
    '[data-feature-id*="ai"]',

    // Notion AI, Grammarly, etc.
    '[class*="ai-assist"]',
    '[class*="aiAssist"]',
    '[data-testid="ai-assistant"]',
    '[data-testid*="ai-"]',
    '[class*="ai-chat"]',
    '[class*="ai_chat"]',
    '[class*="chatgpt"]',
    '[class*="openai"]',

    // Generic AI patterns
    '[aria-label*="AI"]',
    '[aria-label*="artificial intelligence"]',
    '[class*="ai-prompt"]',
    '[class*="ai-response"]',
    '[class*="ai-panel"]',
    '[class*="assistant-panel"]',
    '[class*="ai-widget"]',
    '[data-automation*="ai"]',
    'button[class*="ai-"]',

    // Grammarly
    'grammarly-extension',
    'grammarly-desktop-integration',
    '[data-grammarly-part]',
    'grammarly-ghost',

    // Writing assistants
    '[class*="writesonic"]',
    '[class*="jasper"]',
    '[class*="wordtune"]'
];

// ---------------------------------------------------------------
// Layer 5: Sensitive Data Detection
// ---------------------------------------------------------------
const SENSITIVE_PATTERNS = [
    {
        type: "email",
        label: "Email Address",
        sensitivity: "Medium",
        regex: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g
    },
    {
        type: "phone",
        label: "Phone Number",
        sensitivity: "Medium",
        regex: /(?:\+?\d{1,3}[\s\-.]?)?\(?\d{2,4}\)?[\s\-.]?\d{3,4}[\s\-.]?\d{3,4}/g
    },
    {
        type: "creditCard",
        label: "Credit Card",
        sensitivity: "Critical",
        regex: /\b(?:\d{4}[\s\-]?){3}\d{1,4}\b/g
    },
    {
        type: "ssn",
        label: "SSN / National ID",
        sensitivity: "Critical",
        regex: /\b\d{3}[\s\-]\d{2}[\s\-]\d{4}\b/g
    },
    {
        type: "apiKey",
        label: "API Key / Secret",
        sensitivity: "High",
        regex: /\b(?:sk[\-_]|pk[\-_]|Bearer\s+|AKIA|api[\-_]?key[\s=:]+)[A-Za-z0-9\-_]{10,}\b/gi
    },
    {
        type: "ipAddress",
        label: "IP Address",
        sensitivity: "Low",
        regex: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g
    }
];

function detectSensitiveData(text) {
    const results = [];
    if (!text || text.length < 3) return results;

    SENSITIVE_PATTERNS.forEach(pattern => {
        const matches = text.match(pattern.regex);
        if (matches) {
            matches.forEach(match => {
                results.push({
                    type: pattern.type,
                    label: pattern.label,
                    sensitivity: pattern.sensitivity,
                    value: match.substring(0, 20) + (match.length > 20 ? "..." : "") // Truncate for privacy
                });
            });
        }
    });

    return results;
}

function getHighestSensitivity(detections) {
    const order = ["Critical", "High", "Medium", "Low"];
    for (const level of order) {
        if (detections.some(d => d.sensitivity === level)) return level;
    }
    return "Low";
}

// ---------------------------------------------------------------
// State
// ---------------------------------------------------------------
let shadowRoot = null;
let approvedUrls = [];
let userSession = null;

function getGroupInfo() {
    if (!userSession) return null;
    return {
        groupCode: userSession.groupCode || null,
        groupName: userSession.groupName || "Standard Mode",
        userName: userSession.userName || null
    };
}

// Load user session & group settings
chrome.storage.local.get(["userSession", "groups", "defaultSettings"], (result) => {
    userSession = result.userSession || null;
    if (userSession && userSession.groupCode && result.groups) {
        const group = result.groups.find(g => g.code === userSession.groupCode);
        if (group) {
            if (group.approvedUrls) approvedUrls = group.approvedUrls;
            // Apply per-group surveillance level
            if (group.surveillanceLevel) {
                setupSurveillance(group.surveillanceLevel);
            }
        }
    }
});

// ---------------------------------------------------------------
// Shadow DOM Host
// ---------------------------------------------------------------
function getOrCreateShadowHost() {
    const existingHost = document.getElementById("shadow-ai-guardian-host");
    if (existingHost) return existingHost.shadowRoot;

    const host = document.createElement("div");
    host.id = "shadow-ai-guardian-host";
    Object.assign(host.style, {
        position: "fixed",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: "2147483647"
    });

    document.body.appendChild(host);
    const root = host.attachShadow({ mode: "open" });

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = chrome.runtime.getURL("styles.css");
    root.appendChild(link);

    return root;
}

// ---------------------------------------------------------------
// Layer 1: URL Detection (The Blocker)
// ---------------------------------------------------------------
function checkURL() {
    const currentHostname = window.location.hostname;
    const fullUrl = window.location.href;

    // Check if URL is in approved list for this group
    const isApproved = approvedUrls.some(url => currentHostname.includes(url) || fullUrl.includes(url));
    if (isApproved) return;

    const isHighRisk = HIGH_RISK_DOMAINS.some(domain => currentHostname.includes(domain));

    if (isHighRisk) {
        showOverlay(currentHostname);

        chrome.runtime.sendMessage({
            type: "LOG_RISK",
            payload: {
                domain: currentHostname,
                action: "Blocked Access",
                riskLevel: "Critical",
                details: "User attempted to access high-risk AI site.",
                groupInfo: getGroupInfo()
            }
        });
    }
}

function showOverlay(domain) {
    const root = getOrCreateShadowHost();
    document.getElementById("shadow-ai-guardian-host").style.pointerEvents = "auto";

    const overlay = document.createElement("div");
    overlay.className = "overlay";

    overlay.innerHTML = `
    <div class="card">
      <h1>⚠️ Unapproved AI Tool Detected</h1>
      <p>Access to <strong>${domain}</strong> is restricted by company policy. Please use approved secure alternatives.</p>
      
      <div class="btn-group">
        <button id="btn-redirect" class="btn-primary">Go to Approved AI (OpenRouter)</button>
        <button id="btn-continue" class="btn-secondary" disabled>Continue at my own risk (5s)</button>
      </div>
    </div>
  `;

    root.appendChild(overlay);

    root.getElementById("btn-redirect").addEventListener("click", () => {
        window.location.href = "https://openrouter.ai";
        chrome.runtime.sendMessage({
            type: "LOG_RISK",
            payload: {
                domain: domain,
                action: "Redirected",
                riskLevel: "Low",
                details: "User chose to redirect to approved AI."
            }
        });
    });

    const continueBtn = root.getElementById("btn-continue");
    let countdown = 5;

    const timer = setInterval(() => {
        countdown--;
        if (countdown > 0) {
            continueBtn.innerText = `Continue at my own risk (${countdown}s)`;
        } else {
            clearInterval(timer);
            continueBtn.innerText = "Continue at my own risk";
            continueBtn.disabled = false;
        }
    }, 1000);

    continueBtn.addEventListener("click", () => {
        overlay.remove();
        if (window.guardianProtectionObserver) {
            window.guardianProtectionObserver.disconnect();
        }
        document.getElementById("shadow-ai-guardian-host").style.pointerEvents = "none";

        const banner = document.createElement("div");
        banner.className = "monitoring-banner";
        banner.innerHTML = `
            <span>Monitoring Active</span>
            <button class="banner-close" id="banner-close-btn">×</button>
        `;
        root.appendChild(banner);

        const closeBtn = banner.querySelector("#banner-close-btn");
        if (closeBtn) {
            closeBtn.addEventListener("click", () => banner.remove());
        }

        chrome.runtime.sendMessage({
            type: "LOG_RISK",
            payload: {
                domain: domain,
                action: "User Override",
                riskLevel: "High",
                details: "User bypassed the warning block.",
                groupInfo: getGroupInfo()
            }
        });
    });

    // Anti-Tamper
    if (!window.guardianProtectionObserver) {
        window.guardianProtectionObserver = new MutationObserver(() => {
            const host = document.getElementById("shadow-ai-guardian-host");
            if (!host) {
                showOverlay(domain);
            } else if (host.shadowRoot && !host.shadowRoot.querySelector('.overlay')) {
                showOverlay(domain);
            }
        });
        window.guardianProtectionObserver.observe(document.body, { childList: true });
    }
}

// ---------------------------------------------------------------
// Layer 2: DOM Detection (The Scanner)
// ---------------------------------------------------------------
let badgeInjected = false;

function scanDOM() {
    if (badgeInjected) return;

    const currentHostname = window.location.hostname;
    if (HIGH_RISK_DOMAINS.some(domain => currentHostname.includes(domain))) return;

    const foundAI = AI_DOM_SELECTORS.some(selector => document.querySelector(selector));

    if (foundAI) {
        showBadge();
        badgeInjected = true;
        chrome.runtime.sendMessage({
            type: "LOG_RISK",
            payload: {
                domain: currentHostname,
                action: "Embedded AI Detected",
                riskLevel: "Medium",
                details: "Found AI-like DOM elements on page.",
                groupInfo: getGroupInfo()
            }
        });
    }
}

function showBadge() {
    const root = getOrCreateShadowHost();
    const badge = document.createElement("div");
    badge.className = "badge";
    badge.innerHTML = `
    <div class="badge-icon"></div>
    <span>AI Features Detected</span>
  `;
    badge.style.pointerEvents = "auto";
    root.appendChild(badge);
}

// ---------------------------------------------------------------
// Surveillance: Prompt Capture (Enhanced for modern AI chats)
// ---------------------------------------------------------------
let surveillanceEnabled = false;
let bestCapturedContent = "";  // Track the longest/best content before submit

function setupSurveillance(surveillanceLevel) {
    surveillanceEnabled = (surveillanceLevel === "HIGH");
    if (surveillanceEnabled) console.log("Shadow AI Guardian: Full Surveillance Active");
}

// NOTE: Per-group surveillance is loaded in the session loader above.
// This is the fallback for users not in any group.
chrome.storage.local.get(["surveillanceLevel", "userSession", "groups"], (data) => {
    // Only apply global setting if user is NOT in a group (groups handle their own)
    if (data.userSession && data.userSession.groupCode && data.groups) {
        const group = data.groups.find(g => g.code === data.userSession.groupCode);
        if (group && group.surveillanceLevel) {
            setupSurveillance(group.surveillanceLevel);
            return;
        }
    }
    setupSurveillance(data.surveillanceLevel || "LOW");
});

// -- Capture on typing (tracks best content) --
const CAPTURE_EVENTS = ['input', 'keyup', 'change'];

CAPTURE_EVENTS.forEach(eventType => {
    document.addEventListener(eventType, (e) => {
        if (!surveillanceEnabled) return;

        const content = extractContent(e.target);
        if (content && content.length > 2) {
            // Track the longest content (full prompt before clearing)
            if (content.length > bestCapturedContent.length) {
                bestCapturedContent = content;
            }
            handleInputCapture(content);
        }
    }, { capture: true, passive: true });
});

// -- Capture on SUBMIT (Enter key or Send button) --
document.addEventListener('keydown', (e) => {
    if (!surveillanceEnabled) return;
    if (e.key === 'Enter' && !e.shiftKey) {
        // User is submitting — capture immediately before the field clears
        const content = extractContent(e.target) || bestCapturedContent;
        if (content && content.length > 2) {
            flushCapture(content);
        }
    }
}, { capture: true, passive: true });

// Capture clicks on send/submit buttons
document.addEventListener('click', (e) => {
    if (!surveillanceEnabled) return;
    const target = e.target;
    const btn = target.closest('button, [role="button"], [data-testid*="send"], [aria-label*="Send"]');
    if (btn && bestCapturedContent.length > 2) {
        flushCapture(bestCapturedContent);
    }
}, { capture: true, passive: true });

// -- Periodically poll contenteditable elements (for Shadow DOM editors) --
setInterval(() => {
    if (!surveillanceEnabled) return;

    const editables = document.querySelectorAll(
        '[contenteditable="true"], ' +
        'textarea, ' +
        '[role="textbox"], ' +
        '.ProseMirror, ' +
        '.cm-content, ' +
        '[data-testid*="text-input"], ' +
        '[data-testid*="prompt"], ' +
        '#prompt-textarea'
    );

    editables.forEach(el => {
        const content = el.value || el.innerText || el.textContent || '';
        if (content && content.trim().length > 2) {
            if (content.length > bestCapturedContent.length) {
                bestCapturedContent = content.trim();
            }
        }
    });
}, 2000);

// Helper: extract text from various input types
function extractContent(target) {
    if (!target) return '';

    let content = target.value;

    if (!content && (target.isContentEditable || target.getAttribute('contenteditable') === 'true')) {
        content = target.innerText || target.textContent;
    }

    if (!content) {
        // Try active element as fallback
        const active = document.activeElement;
        if (active && active !== target) {
            if (active.tagName === "TEXTAREA" || active.tagName === "INPUT" || active.isContentEditable) {
                content = active.value || active.innerText;
            }
        }
    }

    // Also try common AI prompt selectors
    if (!content) {
        const promptEl = document.querySelector('#prompt-textarea, [data-testid*="prompt"], .ProseMirror, [role="textbox"]');
        if (promptEl) {
            content = promptEl.value || promptEl.innerText || promptEl.textContent;
        }
    }

    return content ? content.trim() : '';
}

let captureTimeout;
let lastCapturedContent = "";

function handleInputCapture(content) {
    clearTimeout(captureTimeout);
    captureTimeout = setTimeout(() => {
        sendCapturedPrompt(content);
    }, 800);
}

// Immediate capture on submit (Enter/Send)
function flushCapture(content) {
    clearTimeout(captureTimeout);
    sendCapturedPrompt(content);
    bestCapturedContent = "";  // Reset after flushing
}

function sendCapturedPrompt(content) {
    if (!content || content.length < 3) return;
    if (content === lastCapturedContent) return;
    lastCapturedContent = content;

    // Detect sensitive data in captured content
    const detections = detectSensitiveData(content);
    const sensitiveTypes = [...new Set(detections.map(d => d.type))];

    if (sensitiveTypes.length > 0) {
        safeSendMessage({
            type: "LOG_SENSITIVE",
            payload: {
                domain: window.location.hostname,
                types: sensitiveTypes,
                riskLevel: getHighestSensitivity(detections),
                groupInfo: getGroupInfo()
            }
        });
    }

    safeSendMessage({
        type: "LOG_PROMPT",
        payload: {
            domain: window.location.hostname,
            content: content,
            sensitiveTypes: sensitiveTypes,
            groupInfo: getGroupInfo()
        }
    });
}

chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.surveillanceLevel) {
        setupSurveillance(changes.surveillanceLevel.newValue);
    }
    // Update approved URLs and surveillance if group settings change
    if (namespace === 'local' && changes.groups) {
        const groups = changes.groups.newValue || [];
        if (userSession && userSession.groupCode) {
            const group = groups.find(g => g.code === userSession.groupCode);
            if (group) {
                if (group.approvedUrls) approvedUrls = group.approvedUrls;
                if (group.surveillanceLevel) setupSurveillance(group.surveillanceLevel);
            }
        }
    }
});

// ---------------------------------------------------------------
// Layer 3: Paste Interception (The Nudge) with Sensitive Detection
// ---------------------------------------------------------------
function setupPasteInterception() {
    document.addEventListener("paste", (e) => {
        const target = e.target;
        let isAIField = false;

        if (target.matches && AI_DOM_SELECTORS.some(sel => target.matches(sel))) {
            isAIField = true;
        } else if (target.closest && AI_DOM_SELECTORS.some(sel => target.closest(sel))) {
            isAIField = true;
        } else if (HIGH_RISK_DOMAINS.some(d => window.location.hostname.includes(d))) {
            isAIField = true;
        }

        if (isAIField) {
            if (window.allowNextPaste) {
                window.allowNextPaste = false;
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            const pastedData = e.clipboardData.getData("text");
            showPasteModal(pastedData, target);
        }
    }, true);
}

function safeSendMessage(message) {
    if (chrome.runtime?.id) {
        chrome.runtime.sendMessage(message).catch(err => console.log("Extension context invalidated or error:", err));
    }
}

function showPasteModal(pastedContent, targetElement) {
    const root = getOrCreateShadowHost();
    const host = document.getElementById("shadow-ai-guardian-host");
    if (!host) return;

    host.style.pointerEvents = "auto";

    // Detect sensitive data in pasted content
    const detections = detectSensitiveData(pastedContent);
    const hasSensitive = detections.length > 0;

    let sensitiveWarning = "";
    if (hasSensitive) {
        const uniqueTypes = [...new Set(detections.map(d => `${d.label} (${d.sensitivity})`))];
        sensitiveWarning = `
        <div style="background: rgba(255,69,58,0.15); border: 1px solid rgba(255,69,58,0.3); border-radius: 8px; padding: 12px; margin: 12px 0; text-align: left;">
            <div style="color: #FF453A; font-weight: 700; font-size: 13px; margin-bottom: 8px;">⚠️ SENSITIVE DATA DETECTED:</div>
            ${uniqueTypes.map(t => `<div style="color: #FF9F0A; font-size: 12px; padding: 2px 0;">• ${t}</div>`).join('')}
        </div>`;

        // Log sensitive data detection
        const sensitiveTypes = [...new Set(detections.map(d => d.type))];
        safeSendMessage({
            type: "LOG_SENSITIVE",
            payload: {
                domain: window.location.hostname,
                types: sensitiveTypes,
                riskLevel: getHighestSensitivity(detections),
                groupInfo: getGroupInfo()
            }
        });
    }

    const modalOverlay = document.createElement("div");
    modalOverlay.className = "modal-overlay";

    modalOverlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <span class="warning-icon">🛡️</span>
        <span>Sensitive Data Check</span>
      </div>
      <div class="modal-body">
        You are pasting content into an AI tool. Please confirm this data is safe.
        ${sensitiveWarning}
      </div>
      
      <label class="checkbox-wrapper">
        <input type="checkbox" id="confirm-check">
        I confirm this contains no PII or Secrets
      </label>
      
      <div class="modal-actions">
        <button id="btn-cancel" class="modal-btn modal-btn-cancel">Cancel</button>
        <button id="btn-confirm-paste" class="modal-btn modal-btn-confirm" disabled>Allow Paste</button>
      </div>
    </div>
  `;

    root.appendChild(modalOverlay);

    const check = modalOverlay.querySelector("#confirm-check");
    const confirmBtn = modalOverlay.querySelector("#btn-confirm-paste");
    const cancelBtn = modalOverlay.querySelector("#btn-cancel");

    check.addEventListener("change", () => {
        confirmBtn.disabled = !check.checked;
    });

    cancelBtn.addEventListener("click", () => {
        modalOverlay.remove();
        host.style.pointerEvents = "none";
    });

    confirmBtn.addEventListener("click", () => {
        modalOverlay.remove();
        host.style.pointerEvents = "none";

        window.allowNextPaste = true;
        targetElement.focus();

        const success = document.execCommand("insertText", false, pastedContent);

        if (!success) {
            if (targetElement.tagName === "TEXTAREA" || targetElement.tagName === "INPUT") {
                const start = targetElement.selectionStart;
                const end = targetElement.selectionEnd;
                const text = targetElement.value;
                targetElement.value = text.substring(0, start) + pastedContent + text.substring(end);
                targetElement.selectionStart = targetElement.selectionEnd = start + pastedContent.length;
                targetElement.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }

        safeSendMessage({
            type: "LOG_RISK",
            payload: {
                domain: window.location.hostname,
                action: "Paste Allowed",
                riskLevel: hasSensitive ? "High" : "Medium",
                details: hasSensitive ? `User confirmed PII check despite sensitive data: ${detections.map(d => d.label).join(', ')}` : "User confirmed PII check.",
                groupInfo: getGroupInfo()
            }
        });
    });
}

// ---------------------------------------------------------------
// Initialize
// ---------------------------------------------------------------
function init() {
    checkURL();

    const observer = new MutationObserver(() => {
        scanDOM();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    scanDOM();
    setupPasteInterception();

    chrome.storage.local.get(['surveillanceLevel'], (result) => {
        setupSurveillance(result.surveillanceLevel || "LOW");
    });
}

if (document.body) {
    init();
} else {
    document.addEventListener("DOMContentLoaded", init);
}
