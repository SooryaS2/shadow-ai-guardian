// Admin Portal Logic

document.addEventListener('DOMContentLoaded', () => {
    // Auth Logic
    const loginBtn = document.getElementById('login-btn');
    const passInput = document.getElementById('admin-pass');

    // Simulate Admin Password
    const ADMIN_PASS = "admin123";

    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            if (passInput.value === ADMIN_PASS) {
                document.getElementById('auth-wall').classList.add('hidden');
                document.getElementById('admin-content').classList.remove('hidden');
                loadSettings();
                loadLogs();
            } else {
                document.getElementById('auth-error').style.display = 'block';
            }
        });
    }

    // Settings Logic
    const slider = document.getElementById('surveillance-slider');
    const sliderDesc = document.getElementById('slider-desc');

    if (slider) {
        slider.addEventListener('input', () => {
            updateSliderUI(slider.value);
            saveSettings(slider.value);
        });
    }

    // Export Logic
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportLogs);
    }
});

function updateSliderUI(value) {
    const desc = document.getElementById('slider-desc');
    const labelHigh = document.getElementById('label-high');
    const labelLow = document.getElementById('label-low');
    const slider = document.getElementById('surveillance-slider');

    if (value == "1") {
        desc.innerHTML = `<strong>Current Mode: Full Surveillance.</strong> <span style="color: var(--danger-color);">WARNING: Capturing all prompt text entered by users.</span>`;
        labelHigh.style.color = "var(--danger-color)";
        labelLow.style.color = "var(--text-secondary)";
        slider.classList.add('high-level');
    } else {
        desc.innerHTML = `<strong>Current Mode: Metadata Only.</strong> Logs only domain, time, and risk level. Content is anonymous.`;
        labelHigh.style.color = "var(--text-secondary)";
        labelLow.style.color = "var(--success-color)";
        slider.classList.remove('high-level');
    }
}

function saveSettings(value) {
    const level = value == "1" ? "HIGH" : "LOW";
    chrome.storage.local.set({ surveillanceLevel: level }, () => {
        console.log("Surveillance Level Updated:", level);
        // Notify background/content scripts? Storage change listener handles it usually.
    });
}

function loadSettings() {
    chrome.storage.local.get(['surveillanceLevel'], (result) => {
        const level = result.surveillanceLevel || "LOW";
        const slider = document.getElementById('surveillance-slider');
        slider.value = level === "HIGH" ? "1" : "0";
        updateSliderUI(slider.value);
    });
}

function loadLogs() {
    chrome.storage.local.get(['auditLogs'], (result) => {
        const logs = result.auditLogs || [];
        renderAdminTable(logs);
    });
}

function renderAdminTable(logs) {
    const tbody = document.getElementById('logs-body');
    tbody.innerHTML = '';

    if (logs.length === 0) {
        document.getElementById('empty-state').classList.remove('hidden');
        return;
    }

    logs.forEach(log => {
        const tr = document.createElement('tr');

        const date = new Date(log.timestamp);
        const formattedDate = date.toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        const riskClass = getRiskClass(log.riskLevel);

        let detailsHtml = log.details || '-';
        // If there is captured prompt content, highlight it
        if (log.promptContent) {
            detailsHtml += `<br><div class="log-details"><strong>CAPTURED PROMPT:</strong><br>${escapeHtml(log.promptContent)}</div>`;
        }

        tr.innerHTML = `
            <td>${formattedDate}</td>
            <td style="font-weight: 500;">${log.domain || 'Unknown'}</td>
            <td>${log.action}</td>
            <td>${detailsHtml}</td>
            <td><span class="risk-badge ${riskClass}">${log.riskLevel}</span></td>
        `;

        tbody.appendChild(tr);
    });
}

function escapeHtml(text) {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getRiskClass(level) {
    switch (level) {
        case 'Critical': return 'risk-critical';
        case 'High': return 'risk-high';
        case 'Medium': return 'risk-medium';
        case 'Low': return 'risk-low';
        default: return 'risk-low';
    }
}

function exportLogs() {
    chrome.storage.local.get(['auditLogs'], (result) => {
        const logs = result.auditLogs || [];
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
        downloadAnchorNode.setAttribute("download", `shadow_ai_audit_logs_${timestamp}.json`);
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    });
}
