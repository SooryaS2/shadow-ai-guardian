// Shadow AI Guardian - Dashboard Logic v2.0

document.addEventListener('DOMContentLoaded', () => {
    // Check for existing session
    chrome.storage.local.get(['userSession'], (result) => {
        if (result.userSession) {
            showDashboard(result.userSession);
        } else {
            showEntryScreen();
        }
    });

    // Entry screen tab switching
    document.querySelectorAll('.tab-bar button').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-bar button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tab = btn.dataset.tab;
            document.querySelectorAll('.entry-form').forEach(f => f.classList.remove('active'));
            document.getElementById('form-' + tab).classList.add('active');
        });
    });

    // Join team
    const joinBtn = document.getElementById('btn-join');
    const codeInput = document.getElementById('code-input');
    const codeError = document.getElementById('code-error');

    joinBtn.addEventListener('click', () => {
        const userName = document.getElementById('name-input').value.trim();
        const code = codeInput.value.trim().toUpperCase();

        if (!userName) {
            codeError.textContent = "Please enter your name.";
            codeError.style.display = 'block';
            return;
        }
        if (code.length < 1) {
            codeError.textContent = "Please enter a team code.";
            codeError.style.display = 'block';
            return;
        }

        joinBtn.textContent = "Joining...";
        joinBtn.disabled = true;

        chrome.runtime.sendMessage({ type: "VALIDATE_CODE", payload: { code } }, (response) => {
            if (response && response.valid) {
                const session = {
                    userName: userName,
                    groupCode: response.group.code,
                    groupName: response.group.name,
                    joinedAt: new Date().toISOString()
                };

                // Track member count
                chrome.runtime.sendMessage({
                    type: "ADD_MEMBER",
                    payload: { code: response.group.code, userName: userName }
                });

                chrome.storage.local.set({ userSession: session }, () => {
                    showDashboard(session);
                });
            } else {
                codeError.textContent = "Invalid code. Please check with your admin.";
                codeError.style.display = 'block';
                joinBtn.textContent = "Join Team";
                joinBtn.disabled = false;
                codeInput.style.borderColor = '#FF453A';
                setTimeout(() => {
                    codeInput.style.borderColor = '';
                    codeError.style.display = 'none';
                }, 3000);
            }
        });
    });

    // Enter key on code input
    codeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') joinBtn.click();
    });

    // Open admin portal
    document.getElementById('btn-open-admin').addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('admin.html') });
    });

    // Skip — use defaults
    document.getElementById('btn-skip').addEventListener('click', () => {
        const skipName = document.getElementById('skip-name-input').value.trim() || 'Anonymous';
        const session = {
            userName: skipName,
            groupCode: null,
            groupName: "Standard Mode",
            joinedAt: new Date().toISOString()
        };
        chrome.storage.local.set({ userSession: session }, () => {
            showDashboard(session);
        });
    });

    // Logout
    document.getElementById('btn-logout').addEventListener('click', () => {
        chrome.storage.local.remove('userSession', () => {
            showEntryScreen();
        });
    });

    // Dashboard tab switching
    document.querySelectorAll('.dash-tabs button').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.dash-tabs button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const view = btn.dataset.view;
            document.querySelectorAll('.dash-view').forEach(v => v.classList.remove('active'));
            document.getElementById('view-' + view).classList.add('active');
        });
    });

    // Activity filter pills
    document.querySelectorAll('.filter-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            filterActivity(pill.dataset.filter);
        });
    });
});

// State
let allActivity = [];
let currentFilter = 'all';
let currentSession = null;
let previousRisksBlocked = 0;

function showEntryScreen() {
    document.getElementById('entry-screen').style.display = 'flex';
    document.getElementById('dashboard-container').classList.remove('active');
}

function showDashboard(session) {
    document.getElementById('entry-screen').style.display = 'none';
    document.getElementById('dashboard-container').classList.add('active');
    currentSession = session;

    // Set group label
    const groupLabel = document.getElementById('group-label');
    if (session.groupCode) {
        groupLabel.textContent = (session.userName || 'User') + ' • ' + session.groupName + ' • ' + session.groupCode;
    } else {
        groupLabel.textContent = (session.userName || 'User') + ' • Standard Mode';
    }

    // Set monitoring bar based on surveillance level
    updateMonitoringBar(session);

    // Load stats immediately
    loadStats();
    // Auto-refresh every 4 seconds
    setInterval(loadStats, 4000);

    // LIVE UPDATE: Listen for storage changes to update instantly
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && (changes.auditLogs || changes.sensitiveStats || changes.sitesScanned)) {
            loadStats();
        }
        // Update monitoring bar if surveillance settings change
        if (namespace === 'local' && (changes.groups || changes.surveillanceLevel)) {
            updateMonitoringBar(currentSession);
        }
    });
}

function updateMonitoringBar(session) {
    const bar = document.getElementById('monitoring-bar');
    const label = document.getElementById('monitoring-label');
    if (!bar || !label) return;

    chrome.storage.local.get(['groups', 'surveillanceLevel'], (data) => {
        let level = data.surveillanceLevel || 'LOW';

        // Per-group surveillance overrides global
        if (session && session.groupCode && data.groups) {
            const group = data.groups.find(g => g.code === session.groupCode);
            if (group && group.surveillanceLevel) {
                level = group.surveillanceLevel;
            }
        }

        bar.className = 'monitoring-bar ' + level.toLowerCase();
        if (level === 'HIGH') {
            label.textContent = 'Full Surveillance Active • Capturing All Prompts';
        } else {
            label.textContent = 'Monitoring Active • Metadata Only';
        }
    });
}

function loadStats() {
    // Build filter based on current user session
    const filter = {};
    if (currentSession) {
        if (currentSession.userName) filter.userName = currentSession.userName;
        if (currentSession.groupCode) filter.groupCode = currentSession.groupCode;
    }

    chrome.runtime.sendMessage({ type: "GET_STATS", payload: filter }, (response) => {
        if (!response) return;

        // Stat cards with animated values
        animateValue('stat-scans', response.sitesScanned || 0);
        animateValue('stat-blocks', response.risksBlocked || 0);
        animateValue('stat-sensitive', response.sensitiveDetections || 0);

        // Detect NEW threats for live pulse effect
        if (response.risksBlocked > previousRisksBlocked && previousRisksBlocked > 0) {
            triggerThreatPulse();
        }
        previousRisksBlocked = response.risksBlocked || 0;

        // Active alerts = Critical + High from last 24h
        const now = Date.now();
        const recent = (response.recentActivity || []).filter(a => {
            return (now - new Date(a.timestamp).getTime()) < 86400000 &&
                (a.riskLevel === 'Critical' || a.riskLevel === 'High');
        });
        animateValue('stat-alerts', recent.length);

        // Risk distribution bar
        renderRiskBar(response.riskDistribution || { Critical: 0, High: 0, Medium: 0, Low: 0 });

        // Top domains
        renderTopDomains(response.topDomains || []);

        // Recent activity preview (last 3)
        const recentPreview = (response.recentActivity || []).slice(0, 3);
        renderActivityPreview(recentPreview);

        // Full activity list
        allActivity = response.recentActivity || [];
        filterActivity(currentFilter);
    });
}

// Visual pulse when new threats are detected
function triggerThreatPulse() {
    const cards = document.querySelectorAll('.stat-card');
    cards.forEach(card => {
        card.style.transition = 'box-shadow 0.3s, transform 0.3s';
        card.style.boxShadow = '0 0 20px rgba(255,69,58,0.6)';
        card.style.transform = 'scale(1.03)';
        setTimeout(() => {
            card.style.boxShadow = '';
            card.style.transform = '';
        }, 1200);
    });

    // Flash the status dot
    const dot = document.querySelector('.dash-status-dot');
    if (dot) {
        dot.style.background = '#FF453A';
        dot.style.boxShadow = '0 0 12px #FF453A';
        setTimeout(() => {
            dot.style.background = '';
            dot.style.boxShadow = '';
        }, 2000);
    }
}

function animateValue(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    const current = parseInt(el.textContent) || 0;
    if (current === target) return;

    const diff = target - current;
    const steps = Math.min(Math.abs(diff), 30);
    const increment = diff / steps;
    let step = 0;

    const interval = setInterval(() => {
        step++;
        el.textContent = Math.round(current + increment * step);
        if (step >= steps) {
            el.textContent = target;
            clearInterval(interval);
        }
    }, 20);
}

function renderRiskBar(dist) {
    const total = dist.Critical + dist.High + dist.Medium + dist.Low;
    const bar = document.getElementById('risk-bar');
    const legend = document.getElementById('risk-legend');

    if (total === 0) {
        bar.innerHTML = '<div style="width:100%;background:rgba(255,255,255,0.05);height:100%;border-radius:4px;"></div>';
        legend.innerHTML = '<span class="risk-legend-item" style="color:#555;">No data yet</span>';
        return;
    }

    const colors = { Critical: '#FF453A', High: '#FF9F0A', Medium: '#FFD60A', Low: '#32D74B' };
    let barHTML = '';
    let legendHTML = '';

    for (const [level, count] of Object.entries(dist)) {
        const pct = ((count / total) * 100).toFixed(1);
        if (count > 0) {
            barHTML += `<div class="risk-bar-segment" style="width:${pct}%;background:${colors[level]};"></div>`;
        }
        legendHTML += `
            <span class="risk-legend-item">
                <span class="risk-legend-dot" style="background:${colors[level]};"></span>
                ${level} ${pct}%
            </span>`;
    }

    bar.innerHTML = barHTML;
    legend.innerHTML = legendHTML;
}

function renderTopDomains(domains) {
    const list = document.getElementById('top-domains');
    if (domains.length === 0) {
        list.innerHTML = '<li class="domain-item" style="justify-content:center;color:#555;">No domains detected yet.</li>';
        return;
    }

    list.innerHTML = domains.map((d, i) => `
        <li class="domain-item">
            <span class="domain-name">${i + 1}. ${d.domain}</span>
            <span class="domain-count">${d.count} event${d.count !== 1 ? 's' : ''}</span>
        </li>
    `).join('');
}

function renderActivityPreview(items) {
    const container = document.getElementById('recent-activity');
    if (items.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding:16px;">
                <div class="empty-state-icon">🛡️</div>
                No activity yet. You're all clear!
            </div>`;
        return;
    }

    container.innerHTML = items.map(item => renderActivityItem(item)).join('');
}

function renderActivityItem(item) {
    const riskClass = item.riskLevel ? item.riskLevel.toLowerCase() : 'low';
    const time = formatTime(item.timestamp);

    return `
        <div class="activity-item risk-${riskClass}-border">
            <div class="activity-info">
                <div class="activity-action">${escapeHtml(item.action)}</div>
                <div class="activity-domain">${escapeHtml(item.domain || 'Unknown')}${item.sensitiveTypes ? ' • ' + item.sensitiveTypes.join(', ') : ''}</div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px;">
                <span class="risk-badge-sm risk-badge-${riskClass}">${item.riskLevel}</span>
                <span class="activity-time">${time}</span>
            </div>
        </div>`;
}

function filterActivity(filter) {
    currentFilter = filter;
    const container = document.getElementById('activity-list');
    let filtered = allActivity;

    if (filter !== 'all') {
        filtered = allActivity.filter(a => a.riskLevel === filter);
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                No ${filter === 'all' ? '' : filter + ' '}activity found.
            </div>`;
        return;
    }

    container.innerHTML = filtered.map(item => renderActivityItem(item)).join('');
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
