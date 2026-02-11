// Shadow AI Guardian - Content Script

// Configuration
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
    "grammarly.com", // Often restricted in strict envs
    "notion.so", // Notion AI (broad, but often flagged)
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
    'iframe[src*="intercom"]',
    'iframe[src*="drift"]',
    'textarea[placeholder*="Ask AI"]',
    'div[aria-label="Copilot"]',
    '#copilot',
    '.copilot',
    '[data-testid="ai-assistant"]'
];

let shadowRoot = null;

// Helper: Create Shadow DOM Host
function getOrCreateShadowHost() {
    const existingHost = document.getElementById("shadow-ai-guardian-host");
    if (existingHost) return existingHost.shadowRoot;

    const host = document.createElement("div");
    host.id = "shadow-ai-guardian-host";
    // Ensure host doesn't interfere with page layout but is visible
    Object.assign(host.style, {
        position: "fixed",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        pointerEvents: "none", // Allow clicks to pass through by default
        zIndex: "2147483647"
    });

    document.body.appendChild(host);
    const root = host.attachShadow({ mode: "open" });

    // Inject Styles
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = chrome.runtime.getURL("styles.css");
    root.appendChild(link);

    return root;
}

// ----------------------------------------------------------------------
// Layer 1: URL Detection (The Blocker)
// ----------------------------------------------------------------------
function checkURL() {
    const currentHostname = window.location.hostname;
    const isHighRisk = HIGH_RISK_DOMAINS.some(domain => currentHostname.includes(domain));

    if (isHighRisk) {
        showOverlay(currentHostname);

        // Log immediate risk
        chrome.runtime.sendMessage({
            type: "LOG_RISK",
            payload: {
                domain: currentHostname,
                action: "Blocked Access",
                riskLevel: "Critical",
                details: "User attempted to access high-risk AI site."
            }
        });
    }
}

function showOverlay(domain) {
    const root = getOrCreateShadowHost();
    // Enable pointer events for the overlay
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

    // Button Logic
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
        // Stop the protection observer since user explicitly allowed it
        if (window.guardianProtectionObserver) {
            window.guardianProtectionObserver.disconnect();
        }
        document.getElementById("shadow-ai-guardian-host").style.pointerEvents = "none";

        // Inject Persistent Monitoring Banner
        const banner = document.createElement("div");
        banner.className = "monitoring-banner";
        banner.innerHTML = `
            <span>
                ⚠️ ACTIVE SURVEILLANCE MODE: ALL INPUTS ARE BEING MONITORED AND LOGGED
            </span>
        `;
        root.appendChild(banner);

        chrome.runtime.sendMessage({
            type: "LOG_RISK",
            payload: {
                domain: domain,
                action: "User Override",
                riskLevel: "High",
                details: "User bypassed the warning block."
            }
        });
    });

    // Anti-Tamper: Re-inject if removed (unless user clicked continue)
    if (!window.guardianProtectionObserver) {
        window.guardianProtectionObserver = new MutationObserver((mutations) => {
            const host = document.getElementById("shadow-ai-guardian-host");
            if (!host) {
                // Host removed, put it back
                showOverlay(domain);
            } else if (host.shadowRoot && !host.shadowRoot.querySelector('.overlay')) {
                // Overlay removed from shadow root, but we haven't clicked continue yet
                showOverlay(domain);
            }
        });
        // Observe body for host removal
        window.guardianProtectionObserver.observe(document.body, { childList: true });
    }
}


// ----------------------------------------------------------------------
// Layer 2: DOM Detection (The Scanner)
// ----------------------------------------------------------------------
let badgeInjected = false;

function scanDOM() {
    if (badgeInjected) return;

    // Skip scanning if we are effectively on a blocked page (Layer 1 already active)
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
                details: "Found AI-like DOM elements on page."
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

    // Allow clicking badge
    badge.style.pointerEvents = "auto";

    root.appendChild(badge);
}


// ----------------------------------------------------------------------
// Surveillance: Prompt Capture
// ----------------------------------------------------------------------
let surveillanceEnabled = false;

function setupSurveillance(surveillanceLevel) {
    surveillanceEnabled = (surveillanceLevel === "HIGH");
    if (surveillanceEnabled) console.log("Shadow AI Guardian: Surveillance Active");
}

// Initialize surveillance state
chrome.storage.local.get("surveillanceLevel", (data) => {
    setupSurveillance(data.surveillanceLevel || "LOW");
});

// Global listener that checks flag
['input', 'change'].forEach(eventType => {
    document.addEventListener(eventType, (e) => {
        if (!surveillanceEnabled) return;

        const target = e.target;
        let shouldCapture = false;

        // 1. Check if on known AI domain
        if (HIGH_RISK_DOMAINS.some(d => window.location.hostname.includes(d))) shouldCapture = true;

        // 2. Check if element matches AI selectors
        if (!shouldCapture && AI_DOM_SELECTORS.some(sel => target.matches && target.matches(sel))) shouldCapture = true;

        // 3. Fallback: If on any page but element has "prompt" or "chat" in placeholder/id/class
        if (!shouldCapture && (target.placeholder?.toLowerCase().includes('ask') || target.className?.includes?.('chat'))) shouldCapture = true;

        if (shouldCapture && (target.tagName === "TEXTAREA" || target.tagName === "INPUT" || target.isContentEditable)) {
            handleInputCapture(target);
        }
    }, { capture: true, passive: true });
});

let captureTimeout;
function handleInputCapture(target) {
    clearTimeout(captureTimeout);
    captureTimeout = setTimeout(() => {
        let content = target.value || target.innerText;
        // Filter out short inputs or passwords
        if (target.type === "password") return;

        if (content && content.length > 3) {
            chrome.runtime.sendMessage({
                type: "LOG_PROMPT",
                payload: {
                    domain: window.location.hostname,
                    content: content
                }
            });
        }
    }, 1500);
}

// Listen for settings changes dynamically
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.surveillanceLevel) {
        setupSurveillance(changes.surveillanceLevel.newValue);
    }
});


// ----------------------------------------------------------------------
// Layer 3: Paste Interception (The Nudge)
// ----------------------------------------------------------------------
function setupPasteInterception() {
    document.addEventListener("paste", (e) => {
        // Only intercept if we are on a "High Risk" page OR we detected AI elements.
        const target = e.target;
        let isAIField = false;

        // Check if directly matches selector
        if (target.matches && AI_DOM_SELECTORS.some(sel => target.matches(sel))) {
            isAIField = true;
        }
        // Check closest ancestor
        else if (target.closest && AI_DOM_SELECTORS.some(sel => target.closest(sel))) {
            isAIField = true;
        }
        // Also check if we are on a high risk domain (Layer 1) but user clicked "Continue".
        else if (HIGH_RISK_DOMAINS.some(d => window.location.hostname.includes(d))) {
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
    }, true); // Use capture to ensure we catch it first
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

    // Enable pointer events on host to block page interaction
    host.style.pointerEvents = "auto";

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

    const check = modalOverlay.querySelector("#confirm-check"); // correct selector scope
    constconfirmBtn = modalOverlay.querySelector("#btn-confirm-paste");
    const cancelBtn = modalOverlay.querySelector("#btn-cancel");
    const confirmBtn = modalOverlay.querySelector("#btn-confirm-paste"); // Redundant but safe

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

        // Programmatically paste
        window.allowNextPaste = true; // Set flag to bypass listener

        targetElement.focus();

        // Try native execCommand first as it's most reliable for text inputs
        const success = document.execCommand("insertText", false, pastedContent);

        // Fallback for modern inputs if execCommand fails or isn't supported
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
                riskLevel: "Medium",
                details: "User confirmed PII check."
            }
        });
    });
}

// Initialize
function init() {
    // Run Layer 1 check immediately
    checkURL();

    // Set up Layer 2 observer
    const observer = new MutationObserver((mutations) => {
        scanDOM();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Initial scan
    scanDOM();

    // Set up Layer 3
    setupPasteInterception();

    // Initialize Surveillance
    chrome.storage.local.get(['surveillanceLevel'], (result) => {
        setupSurveillance(result.surveillanceLevel || "LOW");
    });
}

if (document.body) {
    init();
} else {
    document.addEventListener("DOMContentLoaded", init);
}
