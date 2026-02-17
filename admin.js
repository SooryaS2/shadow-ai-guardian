// Shadow AI Guardian - Admin Portal Logic v2.0

document.addEventListener('DOMContentLoaded', () => {
    // ===== AUTH =====
    const loginBtn = document.getElementById('login-btn');
    const passInput = document.getElementById('admin-pass');

    loginBtn.addEventListener('click', () => {
        const entered = passInput.value;
        chrome.runtime.sendMessage({ type: "GET_SETTINGS" }, (response) => {
            const adminPass = response.adminPassword || "admin123";
            if (entered === adminPass) {
                document.getElementById('auth-wall').classList.add('hidden');
                document.getElementById('app-layout').classList.add('active');
                loadAdminDashboard();
                loadGroups();
                loadSettings();
                loadLogs();
            } else {
                document.getElementById('auth-error').style.display = 'block';
                setTimeout(() => document.getElementById('auth-error').style.display = 'none', 3000);
            }
        });
    });

    passInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') loginBtn.click();
    });

    // ===== SIDEBAR NAV =====
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            const tab = item.dataset.tab;
            document.querySelectorAll('.tab-view').forEach(v => v.classList.remove('active'));
            document.getElementById(tab).classList.add('active');
        });
    });

    // ===== LOGOUT =====
    document.getElementById('admin-logout-btn').addEventListener('click', () => {
        document.getElementById('app-layout').classList.remove('active');
        document.getElementById('auth-wall').classList.remove('hidden');
        passInput.value = '';
    });

    // ===== GROUP MODAL =====
    document.getElementById('btn-create-group').addEventListener('click', () => {
        openGroupModal(null);
    });

    document.getElementById('btn-cancel-group').addEventListener('click', () => {
        document.getElementById('group-modal').classList.remove('active');
    });

    document.getElementById('btn-save-group').addEventListener('click', saveGroup);

    // ===== SETTINGS =====
    // Surveillance slider
    const slider = document.getElementById('surveillance-slider');
    slider.addEventListener('input', () => {
        updateSurveillanceUI(slider.value);
        chrome.runtime.sendMessage({
            type: "SAVE_SETTINGS",
            payload: { surveillanceLevel: slider.value === "1" ? "HIGH" : "LOW" }
        });
    });

    // Change password
    document.getElementById('btn-change-pass').addEventListener('click', changePassword);

    // Export logs
    document.getElementById('export-btn').addEventListener('click', exportLogs);

    // Group filter
    document.getElementById('group-filter').addEventListener('change', () => {
        loadLogs();
    });
});

// ===== ADMIN DASHBOARD =====
function loadAdminDashboard() {
    chrome.runtime.sendMessage({ type: "GET_STATS" }, (response) => {
        if (!response) return;

        // Summary cards
        document.getElementById('admin-stat-risks').textContent = response.risksBlocked || 0;
        document.getElementById('admin-stat-sensitive').textContent = response.sensitiveDetections || 0;
        document.getElementById('admin-stat-groups').textContent = response.totalGroups || 0;
        document.getElementById('admin-stat-members').textContent = response.totalMembers || 0;

        // Risk distribution chart
        const riskChart = document.getElementById('admin-risk-chart');
        const dist = response.riskDistribution || { Critical: 0, High: 0, Medium: 0, Low: 0 };
        const maxRisk = Math.max(...Object.values(dist), 1);
        const riskColors = { Critical: '#FF453A', High: '#FF9F0A', Medium: '#FFD60A', Low: '#32D74B' };

        riskChart.innerHTML = Object.entries(dist).map(([level, count]) => `
            <div class="bar-row">
                <span class="bar-label">${level}</span>
                <div class="bar-track">
                    <div class="bar-fill" style="width:${(count / maxRisk * 100)}%;background:${riskColors[level]};"></div>
                </div>
                <span class="bar-value">${count}</span>
            </div>
        `).join('');

        // Sensitive data chart
        const sensitiveChart = document.getElementById('admin-sensitive-chart');
        const ss = response.sensitiveStats || {};
        const sensitiveLabels = { email: 'Email', phone: 'Phone', creditCard: 'Credit Card', ssn: 'SSN', apiKey: 'API Key', ipAddress: 'IP Address' };
        const maxSens = Math.max(...Object.values(ss), 1);

        sensitiveChart.innerHTML = Object.entries(ss).map(([type, count]) => `
            <div class="bar-row">
                <span class="bar-label">${sensitiveLabels[type] || type}</span>
                <div class="bar-track">
                    <div class="bar-fill" style="width:${(count / maxSens * 100)}%;background:#FF9F0A;"></div>
                </div>
                <span class="bar-value">${count}</span>
            </div>
        `).join('');

        // Top domains
        const domainsList = document.getElementById('admin-top-domains');
        const domains = response.topDomains || [];
        if (domains.length === 0) {
            domainsList.innerHTML = '<li class="domain-list-item" style="justify-content:center;color:#555;">No data yet.</li>';
        } else {
            domainsList.innerHTML = domains.map(d => `
                <li class="domain-list-item">
                    <span class="domain-list-name">${escapeHtml(d.domain)}</span>
                    <span class="domain-list-count">${d.count} events</span>
                </li>
            `).join('');
        }
    });
}

// ===== GROUPS =====
let editingGroupCode = null;

function loadGroups() {
    chrome.runtime.sendMessage({ type: "GET_GROUPS" }, (response) => {
        const groups = response.groups || [];
        const container = document.getElementById('groups-list');

        if (groups.length === 0) {
            container.innerHTML = '<div class="empty-state">No groups created yet. Click "+ Create Group" to get started.</div>';
            return;
        }

        container.innerHTML = groups.map(g => {
            const survLabel = g.surveillanceLevel === 'HIGH' ? '🔴 Full Surveillance' : '🟢 Metadata Only';
            const membersHtml = g.members && g.members.length > 0
                ? `<div class="group-urls">
                    <div class="group-section-label">Members</div>
                    <div class="tag-list">${g.members.map(m => `<span class="tag">👤 ${escapeHtml(m)}</span>`).join('')}</div>
                   </div>`
                : '';

            return `
            <div class="group-card" data-code="${g.code}">
                <div class="group-card-header">
                    <span class="group-card-name">${escapeHtml(g.name)}</span>
                    <span class="group-code-badge">${g.code}</span>
                </div>
                <div class="group-meta">
                    <span class="group-meta-item">👤 ${g.members ? g.members.length : 0} members</span>
                    <span class="group-meta-item">📅 ${new Date(g.createdAt).toLocaleDateString()}</span>
                    <span class="group-meta-item">${survLabel}</span>
                </div>
                ${g.approvedUrls && g.approvedUrls.length ? `
                    <div class="group-urls">
                        <div class="group-section-label">Approved URLs</div>
                        <div class="tag-list">${g.approvedUrls.map(u => `<span class="tag">${escapeHtml(u)}</span>`).join('')}</div>
                    </div>
                ` : ''}
                ${g.approvedModels && g.approvedModels.length ? `
                    <div class="group-models">
                        <div class="group-section-label">Approved Models</div>
                        <div class="tag-list">${g.approvedModels.map(m => `<span class="tag">${escapeHtml(m)}</span>`).join('')}</div>
                    </div>
                ` : ''}
                ${membersHtml}
                <div class="group-actions">
                    <button class="btn-sm" onclick="editGroup('${g.code}')">Edit</button>
                    <button class="btn-sm danger" onclick="deleteGroup('${g.code}')">Delete</button>
                </div>
            </div>
        `}).join('');
    });
}

function openGroupModal(group) {
    editingGroupCode = group ? group.code : null;
    document.getElementById('modal-title').textContent = group ? 'Edit Group' : 'Create New Group';
    document.getElementById('group-name').value = group ? group.name : '';
    document.getElementById('group-urls').value = group && group.approvedUrls ? group.approvedUrls.join('\n') : '';
    document.getElementById('group-models').value = group && group.approvedModels ? group.approvedModels.join('\n') : '';
    document.getElementById('group-surveillance').value = group && group.surveillanceLevel ? group.surveillanceLevel : 'LOW';

    if (group) {
        document.getElementById('group-code').value = group.code;
    } else {
        chrome.runtime.sendMessage({ type: "GENERATE_CODE" }, (response) => {
            document.getElementById('group-code').value = response.code;
        });
    }

    document.getElementById('group-modal').classList.add('active');
}

function saveGroup() {
    const name = document.getElementById('group-name').value.trim();
    const code = document.getElementById('group-code').value.trim();
    const urlsRaw = document.getElementById('group-urls').value.trim();
    const modelsRaw = document.getElementById('group-models').value.trim();
    const surveillanceLevel = document.getElementById('group-surveillance').value;

    if (!name) {
        alert('Please enter a group name.');
        return;
    }

    const approvedUrls = urlsRaw ? urlsRaw.split('\n').map(u => u.trim()).filter(u => u) : [];
    const approvedModels = modelsRaw ? modelsRaw.split('\n').map(m => m.trim()).filter(m => m) : [];

    const payload = { name, code, approvedUrls, approvedModels, surveillanceLevel };

    chrome.runtime.sendMessage({ type: "SAVE_GROUP", payload }, () => {
        document.getElementById('group-modal').classList.remove('active');
        loadGroups();
        loadAdminDashboard();
    });
}

window.editGroup = function (code) {
    chrome.runtime.sendMessage({ type: "GET_GROUPS" }, (response) => {
        const group = (response.groups || []).find(g => g.code === code);
        if (group) openGroupModal(group);
    });
};

window.deleteGroup = function (code) {
    if (confirm('Delete this group? This action cannot be undone.')) {
        chrome.runtime.sendMessage({ type: "DELETE_GROUP", payload: { code } }, () => {
            loadGroups();
            loadAdminDashboard();
        });
    }
};

// ===== SETTINGS =====
function loadSettings() {
    chrome.runtime.sendMessage({ type: "GET_SETTINGS" }, (response) => {
        // Surveillance slider
        const slider = document.getElementById('surveillance-slider');
        slider.value = response.surveillanceLevel === "HIGH" ? "1" : "0";
        updateSurveillanceUI(slider.value);

        // Approved models
        const models = response.approvedModels || [];
        renderModels(models);
    });
}

function updateSurveillanceUI(value) {
    const desc = document.getElementById('surveillance-desc');
    const labelHigh = document.getElementById('surv-label-high');
    const labelLow = document.getElementById('surv-label-low');

    if (value === "1") {
        desc.textContent = 'Full Surveillance — WARNING: Capturing all prompt text entered by users.';
        desc.style.color = '#FF453A';
        labelHigh.style.color = '#FF453A';
        labelLow.style.color = '#8E8E93';
    } else {
        desc.textContent = 'Metadata Only — Logs domain, time, and risk level.';
        desc.style.color = '#8E8E93';
        labelHigh.style.color = '#8E8E93';
        labelLow.style.color = '#32D74B';
    }
}

function renderModels(models) {
    const container = document.getElementById('models-list');
    container.innerHTML = models.map((model, i) => `
        <div class="setting-row">
            <div>
                <div class="setting-label">${model.name}</div>
                <div class="setting-desc">${model.provider}</div>
            </div>
            <label class="toggle">
                <input type="checkbox" data-model-index="${i}" ${model.enabled ? 'checked' : ''} onchange="toggleModel(${i}, this.checked)">
                <div class="toggle-track"></div>
                <div class="toggle-thumb"></div>
            </label>
        </div>
    `).join('');
}

window.toggleModel = function (index, enabled) {
    chrome.runtime.sendMessage({ type: "GET_SETTINGS" }, (response) => {
        const models = response.approvedModels || [];
        if (models[index]) {
            models[index].enabled = enabled;
            chrome.runtime.sendMessage({ type: "SAVE_SETTINGS", payload: { approvedModels: models } });
        }
    });
};

function changePassword() {
    const current = document.getElementById('current-pass').value;
    const newPass = document.getElementById('new-pass').value;
    const confirm = document.getElementById('confirm-pass').value;
    const msg = document.getElementById('pass-msg');

    if (!current || !newPass || !confirm) {
        showPassMsg('Please fill in all fields.', false);
        return;
    }

    if (newPass !== confirm) {
        showPassMsg('New passwords do not match.', false);
        return;
    }

    if (newPass.length < 4) {
        showPassMsg('Password must be at least 4 characters.', false);
        return;
    }

    chrome.runtime.sendMessage({ type: "GET_SETTINGS" }, (response) => {
        if (current !== response.adminPassword) {
            showPassMsg('Current password is incorrect.', false);
            return;
        }

        chrome.runtime.sendMessage({
            type: "SAVE_SETTINGS",
            payload: { adminPassword: newPass }
        }, () => {
            showPassMsg('Password updated successfully!', true);
            document.getElementById('current-pass').value = '';
            document.getElementById('new-pass').value = '';
            document.getElementById('confirm-pass').value = '';
        });
    });
}

function showPassMsg(text, success) {
    const msg = document.getElementById('pass-msg');
    msg.textContent = text;
    msg.className = 'password-msg ' + (success ? 'success' : 'error');
    msg.style.display = 'block';
    setTimeout(() => msg.style.display = 'none', 4000);
}

// ===== LOGS =====
let allLogs = [];

function loadLogs() {
    chrome.storage.local.get(['auditLogs', 'groups'], (result) => {
        allLogs = result.auditLogs || [];
        const groups = result.groups || [];

        // Populate group filter dropdown
        const filter = document.getElementById('group-filter');
        const currentVal = filter.value;

        // Preserve All & Ungrouped, then add groups
        filter.innerHTML = '<option value="all">All Groups</option><option value="ungrouped">Ungrouped / Standard</option>';
        groups.forEach(g => {
            const opt = document.createElement('option');
            opt.value = g.code;
            opt.textContent = g.name + ' (' + g.code + ')';
            filter.appendChild(opt);
        });

        // Restore selection
        if (currentVal) filter.value = currentVal;

        // Apply filter
        const filterValue = filter.value;
        let filtered = allLogs;
        if (filterValue === 'ungrouped') {
            filtered = allLogs.filter(l => !l.groupCode);
        } else if (filterValue !== 'all') {
            filtered = allLogs.filter(l => l.groupCode === filterValue);
        }

        renderAdminTable(filtered);
    });
}

function renderAdminTable(logs) {
    const tbody = document.getElementById('logs-body');
    tbody.innerHTML = '';

    if (logs.length === 0) {
        document.getElementById('empty-state').classList.remove('hidden');
        return;
    }

    document.getElementById('empty-state').classList.add('hidden');

    logs.forEach(log => {
        const tr = document.createElement('tr');

        const date = new Date(log.timestamp);
        const formattedDate = date.toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        const riskClass = getRiskClass(log.riskLevel);

        // Group + User column
        const userLabel = log.userName ? `<span style="font-weight:600;color:#32D74B;">${escapeHtml(log.userName)}</span><br>` : '';
        const groupDisplay = log.groupCode
            ? `${userLabel}<span style="color:#0A84FF;">${escapeHtml(log.groupName || 'Unknown')}</span> <span style="font-size:10px;color:#555;font-family:monospace;">${log.groupCode}</span>`
            : `${userLabel}<span style="color:#555;">Standard</span>`;

        let detailsHtml = escapeHtml(log.details) || '-';
        if (log.promptContent) {
            detailsHtml += `<div class="log-details"><strong>CAPTURED PROMPT:</strong><br>${escapeHtml(log.promptContent)}</div>`;
        }

        let sensitiveHtml = '-';
        if (log.sensitiveTypes && log.sensitiveTypes.length > 0) {
            sensitiveHtml = log.sensitiveTypes.map(t => `<span class="sensitive-tag">${t}</span>`).join('');
        }

        tr.innerHTML = `
            <td>${formattedDate}</td>
            <td>${groupDisplay}</td>
            <td style="font-weight:500;">${escapeHtml(log.domain) || 'Unknown'}</td>
            <td>${escapeHtml(log.action)}</td>
            <td>${detailsHtml}</td>
            <td>${sensitiveHtml}</td>
            <td><span class="risk-badge ${riskClass}">${log.riskLevel}</span></td>
        `;

        tbody.appendChild(tr);
    });
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
        const anchor = document.createElement('a');
        anchor.setAttribute("href", dataStr);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        anchor.setAttribute("download", `shadow_ai_audit_logs_${timestamp}.json`);
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
    });
}

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
