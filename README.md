# Shadow AI Guardian 🛡️

**Enterprise-Grade AI Usage Monitoring & Protection System**

**Built By: Soorya Selvakumar, Srijit Paul, Natasha Pidwani, Samuel Lyons**

Shadow AI Guardian is a Chrome Extension built for corporate and educational environments to detect, monitor, and manage the use of unauthorized AI tools. It provides multi-layered threat detection, group-based team management, per-user activity tracking, and real-time surveillance capabilities for security auditing.

---

## 🚀 Key Features

### 🔒 Multi-Layered Defense Engine

| Layer | Method | Description |
|-------|--------|-------------|
| **Layer 1** | URL Detection | Instantly blocks known high-risk AI domains (ChatGPT, Claude, Gemini, DeepSeek, Perplexity, etc.) |
| **Layer 2** | DOM Scanning | Heuristically detects embedded AI chatbots, "Ask AI" buttons, and AI-powered widgets within legitimate websites |
| **Layer 3** | Paste Interception | Prevents pasting of sensitive data (emails, credit cards, SSNs, API keys, IP addresses) into AI input fields without explicit user confirmation |
| **Layer 4** | Network Assessment | "X-Ray" vision detects background API calls to AI services (OpenAI, Anthropic, Google AI, Cohere, etc.) even if the UI is hidden |

### 👥 Group & Team Management

* **Create Groups** — Admins create named groups with unique 6-character join codes.
* **Per-Group Settings** — Each group can have its own approved URL whitelist, approved AI model list, and surveillance intensity level (Metadata Only / Full Surveillance).
* **Member Tracking** — Each user provides their name when joining, tracked individually within the group.
* **Dynamic Membership** — Real-time member count and member list visible on group cards.

### 📡 Surveillance System

* **Metadata Only Mode** — Logs domain, timestamp, action, and risk level for every AI interaction.
* **Full Surveillance Mode** — Additionally captures the **full text of prompts** entered into AI tools.
* **Per-Group Surveillance** — Each group can have its own surveillance intensity, independent of the global setting.
* **Enhanced Prompt Capture** — Works with modern AI interfaces, including standard input/textarea elements, ContentEditable & ProseMirror editors, submit-time capture to catch prompts before they are cleared, and periodic polling for Shadow DOM editors.

### 🔍 Sensitive Data Detection

Automatically detects and flags the following data types in real-time:

| Type | Sensitivity | Example Pattern |
|------|-------------|----------------|
| Email Address | Medium | `user@example.com` |
| Phone Number | Medium | `+1-234-567-8900` |
| Credit Card | Critical | `4111-1111-1111-1111` |
| SSN / National ID | Critical | `123-45-6789` |
| API Key / Secret | High | `sk-abc123...`, `Bearer ...` |
| IP Address | Low | `192.168.1.1` |

### 📊 Dynamic User Dashboard

* **Personalized Stats** — Each user sees only their own activity (filtered by name and group).
* **Real-Time Updates** — Dashboard refreshes every 4 seconds + instant updates via storage change listener.
* **Live Monitoring Bar** — Shows current surveillance mode with a pulsing indicator.
* **Threat Pulse Animation** — Stat cards flash red when new threats are detected.
* **Activity Feed** — Slide-in animated activity items with risk-level color coding.
* **Filter by Risk** — View All, Critical, High, Medium, or Low risk events.

### 🏢 Admin Portal

* **Dashboard Overview** — Aggregate stats across all groups and users.
* **Group Management** — Create, edit, and delete groups with per-group settings.
* **Audit Logs** — Searchable, filterable log table with user/group identification, captured prompt display, risk level badges, sensitive data type tags, and JSON export capabilities.

### 🛡️ Stealth & Robustness

* **Shadow DOM Injection** — UI elements are isolated in a Shadow Root to prevent style conflicts and detection.
* **Anti-Tamper Mechanisms** — Automatically re-injects protection layers if removed by the user or third-party scripts.
* **Persistent Banner** — If a user bypasses the block screen, a persistent "Active Surveillance" banner remains visible.

---

## 🛠️ Installation

1. **Clone this repository:**
   ```bash
   git clone [https://github.com/SooryaS2/shadow-ai-guardian.git](https://github.com/SooryaS2/shadow-ai-guardian.git)
   cd shadow-ai-guardian
   ```

2. **Load in Chrome:**
   Open Chrome and navigate to `chrome://extensions`
   Enable **Developer Mode** (toggle in the top right)
   Click **Load unpacked** and select the cloned directory

---

## 🖥️ Usage

### For Users

1. Click the extension icon to open the **Dashboard**.
2. Choose to **Join a Team** (enter your name + team code) or **Skip** (standard mode).
3. View your personalized stats, risk distribution, and activity feed.
4. The monitoring bar shows your current surveillance level.

### For Admins

1. Access the Admin Portal via the dashboard footer link or `admin.html`.
2. **Default Password:** `admin123`
3. **Dashboard Tab** — View aggregate statistics and trends.
4. **Groups Tab** — Create and manage teams, set approved URLs/models, configure surveillance intensity, view member lists, and share the 6-character join code.
5. **Logs Tab** — View detailed audit logs, filter by group, inspect user names and captured prompts, and export all logs as JSON.
6. **Settings Tab** — Configure global surveillance level and admin password.

---

## 📁 Project Structure
```
shadow-ai-guardian/
├── manifest.json        # Chrome Extension manifest (Manifest V3)
├── background.js        # Service worker — message handlers, logging, group management
├── content.js           # Content script — threat detection, prompt capture, sensitive data scanning
├── dashboard.html       # User popup dashboard (HTML + inline CSS)
├── dashboard.js         # Dashboard logic — stats, animations, real-time updates
├── admin.html           # Admin portal (HTML + inline CSS)
├── admin.js             # Admin logic — groups, logs, settings
├── styles.css           # Shared styles
├── icons/               # Extension icons (16px, 48px, 128px)
└── README.md

```
---

## ⚙️ Technical Details

* **Platform:** Chrome Extension (Manifest V3)
* **Permissions:** `storage`, `webNavigation`, `webRequest`, `tabs`, `activeTab`
* **Content Security:** Shadow DOM isolation for all injected UI
* **Data Storage:** `chrome.storage.local` for logs, groups, settings, and user sessions
* **Log Capacity:** Up to 1000 entries with automatic rollover

---

## 🔮 Future Improvements

While Shadow AI Guardian currently provides strong client-side protection, transitioning this from a hackathon prototype to a fully deployable enterprise tool requires several key architecture and feature upgrades:

### 🏢 Enterprise Readiness & Cloud Backend

* **Centralized Cloud Management:** Migrate away from `chrome.storage.local` to a dedicated secure backend (e.g., Node.js with PostgreSQL). This allows admins to push dynamic policy updates and sync audit logs across all managed company devices in real-time.
* **SSO & SAML Integration:** Replace the basic "join code" and default admin password with standard enterprise authentication like Google Workspace or Microsoft Entra ID for seamless, secure employee onboarding.
* **MDM Deployment Integration:** Ensure the extension is optimized to be force-installed via Mobile Device Management (MDM) tools or Chrome Enterprise Core, preventing end-users from disabling or uninstalling the protection layer.

### 🛡️ Advanced DLP (Data Loss Prevention) Engine

* **Contextual AI Redaction:** Instead of strictly blocking sensitive pastes, implement a lightweight local WebAssembly NLP model. This would automatically scrub sensitive entities (e.g., replacing a real credit card with `[CARD_REDACTED]`) before the prompt reaches the AI, allowing users to still utilize AI safely.
* **Proprietary Code & Document Fingerprinting:** Move beyond basic Regex patterns to detect specific proprietary company data, source code, or internal database schemas using document fingerprinting or vector embeddings.
* **Image & OCR Support:** Expand the interception layer to include image uploads. If a user attempts to upload a screenshot of an internal financial dashboard to an AI tool, an OCR (Optical Character Recognition) layer should scan the image and block the upload if confidential text is found.

### 📊 Analytics & Administrative UX

* **Automated Threat Reporting:** Build scheduled PDF/CSV security reports that are automatically emailed to the IT department weekly, highlighting top offenders, trending high-risk AI tools, and prevented data leaks.
* **Granular Group Policies:** Allow admins to set time-based policies (e.g., blocking generative AI only during core working hours) or department-specific allowances (e.g., the engineering group can use coding assistants, but the finance group cannot).
* **Customizable Warning Banners:** Allow organizations to display their specific IT acceptable use policy or custom warning messages directly inside the extension's block screen.

---

## ⚠️ Disclaimer

This tool is intended for **educational and authorized enterprise security purposes only**. Use this software responsibly and in accordance with your organization's privacy policies and local laws regarding employee monitoring.

---

*Built for the Alacrity Hackathon • Cardiff University • Verified for Chrome Manifest V3 Compliance*
