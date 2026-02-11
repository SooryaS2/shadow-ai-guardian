# Shadow AI Guardian 🛡️

**Enterprise-Grade AI Usage Monitoring & Protection System**

Shadow AI Guardian is a sophisticated Chrome Extension designed for corporate environments to detect, monitor, and manage the use of unauthorized AI tools. It employs a multi-layered defense system to identify AI interactions, block access to high-risk domains, and provide surveillance capabilities for security auditing.

## 🚀 Key Features

*   **Multi-Layered Defense Engine**:
    *   **Layer 1 (URL Detection)**: Instantly blocks known high-risk AI domains (ChatGPT, Claude, Gemini, DeepSeek, etc.).
    *   **Layer 2 (DOM Scanning)**: Heuristically detects embedded AI chatbots and "Ask AI" buttons within legitimate websites.
    *   **Layer 3 (Paste Interception)**: Prevents pasting of sensitive data into AI input fields without explicit user confirmation.
    *   **Layer 4 (Network Assessment)**: "X-Ray" vision detects background API calls to AI services (OpenAI API, Anthropic API, etc.) even if the UI is hidden.

*   **Administrative Surveillance**:
    *   **Metadata Logging**: Tracks every AI interaction, including domain, timestamp, and risk level.
    *   **Full Text Capture**: (Admin Configurable) Captures the full content of prompts entered into AI tools for audit purposes.
    *   **Persistent Banner**: If a user bypasses the block screen, a persistent "Active Surveillance" banner remains at the top of the viewport.

*   **Stealth & Robustness**:
    *   **Shadow DOM Injection**: UI elements are isolated in a Shadow Root to prevent style conflicts and detection by the host page.
    *   **Anti-Tamper Mechanisms**: Automatically re-injects protection layers if they are removed by the user or third-party scripts.

## 🛠️ Installation

1.  Clone this repository:
    ```bash
    git clone https://github.com/SooryaS2/shadow-ai-guardian.git
    cd shadow-ai-guardian
    ```
2.  Open Chrome and navigate to `chrome://extensions`.
3.  Enable **Developer Mode** (toggle in the top right).
4.  Click **Load unpacked** and select the `shadow-ai-guardian` directory.

## 🖥️ Usage

### User Dashboard
Click the extension icon to view the **Status Dashboard**.
*   **System Status**: Shows if protection is active.
*   **Stats**: Live counters for "Sites Scanned" and "Risks Blocked".
*   **Link**: Quick access to the Admin Portal.

### Admin Portal
Access the portal via the link in the dashboard or `admin.html`.
*   **Password**: `admin123` (Default)
*   **Surveillance Intensity Slider**:
    *   **Metadata Only**: Logs usage stats without capturing text.
    *   **Full Text**: Captures all user inputs into AI fields.
*   **Audit Logs**: View, filter, and export detailed JSON logs of all detected incidents.

## ⚠️ Disclaimer

This tool is intended for **educational and authorized enterprise security purposes only**. Use this software responsibly and in accordance with your organization's privacy policies and local laws regarding employee monitoring.

---

*Verified for Chrome Manifest V3 Compliance.*
