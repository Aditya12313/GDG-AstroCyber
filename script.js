// --- Configuration ---
const API_KEY = "AIzaSyCTL6-cYNZprxD937wlD8vN-ZHcl1u-sKA"; // REPLACE WITH YOUR ACTUAL GEMINI API KEY
const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${API_KEY}`;

// --- Global State Variables ---
let currentScreen = 'terminal'; // 'terminal', 'login', 'secret_key'
let originData = null; // Stores name, dob, time, place from login form
let secretKey = null; // The correct key for validation
let terminalOutput = [];
let commandInput = '';


let typingAnimationInterval = null;
let sublineAnimationInterval = null;
let showHelpTextTimeout = null;

// --- DOM Elements ---
const appContainer = document.getElementById('app-container');

// --- Helper Functions ---

// Function to scroll the terminal output to the bottom
function scrollToBottom() {
    const terminalContent = document.getElementById('terminal-content');
    if (terminalContent) {
        terminalContent.scrollTop = terminalContent.scrollHeight;
    }
}

// Helper function to calculate digital root (summing digits until a single digit 1-9)
function digitalRoot(n) {
    if (n === 0) return 0;
    let sum = n;
    while (sum >= 10) {
        sum = String(sum).split('').reduce((acc, digit) => acc + parseInt(digit, 10), 0);
    }
    return sum;
}

// Helper function to generate the secret key based on DOB and Time
function generateSecretKey(dobISO, timeHHMM) {
    const [year, month, day] = dobISO.split('-').map(Number);
    const [hourStr, minuteStr] = timeHHMM.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    const dayRoot = digitalRoot(day);
    const monthRoot = digitalRoot(month);
    const yearRoot = digitalRoot(year);
    const hourRoot = digitalRoot(hour);
    const minuteRoot = digitalRoot(minute);

    const signMap = {
        1: 'O', 2: 'T', 3: 'TH', 4: 'F', 5: 'FI',
        6: 'S', 7: 'SE', 8: 'E', 9: 'N'
    };

    const codeMap = (n) => String(48 + n); // ASCII for '0' is 48

    const dayLetter = signMap[dayRoot];
    const monthLetter = signMap[monthRoot];
    const yearLetter = signMap[yearRoot];

    const hourCode = codeMap(hourRoot);
    const minuteCode = codeMap(minuteRoot);

    return `${dayLetter}${hourCode}${monthLetter}${minuteCode}${yearLetter}`;
}

// Function to update terminal output
function appendTerminalOutput(lines) {
    if (Array.isArray(lines)) {
        terminalOutput = [...terminalOutput, ...lines];
    } else {
        terminalOutput = [...terminalOutput, lines];
    }
    renderScreen(); // Re-render to show new output
    scrollToBottom();
}

// --- API Call Function ---
async function callGemini(prompt, isJson = false) {
    const apiUrl = API_ENDPOINT; // Use the global API_ENDPOINT
    
    const payload = { 
        contents: [{ role: "user", parts: [{ text: prompt }] }] 
    };
    
    if (isJson) {
        payload.generationConfig = {
            responseMimeType: "application/json",
            responseSchema: { type: "ARRAY", items: { type: "STRING" } }
        };
    }
    
    let attempts = 0;
    const maxAttempts = 5;
    let delay = 1000;
    
    while (attempts < maxAttempts) {
        try {
            const response = await fetch(apiUrl, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(payload) 
            });
            
            if (response.ok) {
                const result = await response.json();
                if (isJson) {
                    return JSON.parse(result.candidates?.[0]?.content?.parts?.[0]?.text || "[]");
                }
                return result.candidates?.[0]?.content?.parts?.[0]?.text || "// ERROR: Empty response from AI. //";
            } else if (response.status === 429 || response.status >= 500) {
                attempts++;
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2;
            } else {
                const errorBody = await response.json();
                return `// ERROR: Network response not ok. Status: ${response.status}. Message: ${errorBody.error?.message || 'Unknown error'}. //`;
            }
        } catch (error) {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
        }
    }
    
    return "// ERROR: AI datastream unreachable after multiple attempts. //";
}

// --- Command Handling ---
async function handleCommand(command) {
    appendTerminalOutput(`> ${command}`);
    commandInput = '';
    document.getElementById('command-input').value = '';

    const lowerCommand = command.toLowerCase().trim();

    if (lowerCommand === 'help') {
        appendTerminalOutput([
            'Available Commands:',
            '- help: Shows available commands.',
            '- login to astrocyber: Opens the login page.',
            '- clear: Clears the terminal screen.',
            '- ask [your question]: Ask the AI a question (after login and key validation).'
        ]);
    } else if (lowerCommand === 'login to astrocyber') {
        currentScreen = 'login';
        renderScreen();
    } else if (lowerCommand === 'clear') {
        terminalOutput = [];
        renderScreen();
    } else if (lowerCommand.startsWith('ask ') && currentScreen === 'terminal' && originData && secretKey) {
        const query = command.substring(4).trim();
        if (query) {
            appendTerminalOutput(`AI: Processing query "${query}"...`);
            const aiResponse = await callGemini(query);
            if (aiResponse.startsWith("// ERROR")) {
                appendTerminalOutput(aiResponse);
            } else {
                appendTerminalOutput(`AI: ${aiResponse}`);
            }
        } else {
            appendTerminalOutput('AI: Please provide a question after "ask".');
        }
    } else {
        appendTerminalOutput(`Unknown command: ${command}. Type 'help' for a list of commands.`);
    }
}

// --- Render Functions for Each Screen ---

function renderTerminalScreen() {
    const outputHtml = terminalOutput.map((line) => `<div class="text-primary text-sm leading-relaxed">${line}</div>`).join('');

    let initialMessagesHtml = '';
    // Clear any previous animation intervals/timeouts
    if (typingAnimationInterval) clearInterval(typingAnimationInterval);
    if (sublineAnimationInterval) clearInterval(sublineAnimationInterval);
    if (showHelpTextTimeout) clearTimeout(showHelpTextTimeout);

    appContainer.innerHTML = `
        <div class="terminal-window max-w-4xl w-full h-[80vh] flex flex-col p-0">
            <div class="terminal-header">
                <div class="terminal-dot red"></div>
                <div class="terminal-dot yellow"></div>
                <div class="terminal-dot green"></div>
                <span class="text-primary text-sm ml-2">ASTRO-CYBER TERMINAL</span>
            </div>
            <div id="terminal-content" class="terminal-content scanlines flex-grow overflow-y-auto">
                ${initialMessagesHtml}
                ${outputHtml}
            </div>
            <div class="terminal-footer p-4 border-t-2 border-primary">
                <div class="flex items-center">
                    <span class="text-accent mr-2">C:\\ASTROCYBER&gt;</span>
                    <input
                        type="text"
                        id="command-input"
                        class="terminal-input flex-grow"
                        value="${commandInput}"
                        onchange="commandInput = this.value;"
                        onkeypress="if(event.key === 'Enter') handleCommand(this.value);"
                        autofocus
                    />
                </div>
            </div>
        </div>
    `;

    // Re-initialize typing animation AFTER the HTML is in the DOM
    if (!originData) {
        const welcomeText = ">>> ASTRO-CYBER TERMINAL v2.1 INITIALIZED <<<";
        const sublineText = ">>> ACCESSING COSMIC DATABASE... <<<";
        const helpText = "Type 'help' to get started.";

        const typedWelcomeElement = document.getElementById('typed-welcome');
        const typedSublineElement = document.getElementById('typed-subline');
        const helpTextElement = document.getElementById('help-text');

        if (typedWelcomeElement) typedWelcomeElement.textContent = '';
        if (typedSublineElement) typedSublineElement.textContent = '';
        if (helpTextElement) helpTextElement.textContent = '';


        let i = 0;
        typingAnimationInterval = setInterval(() => {
            if (typedWelcomeElement && i < welcomeText.length) {
                typedWelcomeElement.textContent += welcomeText.charAt(i);
                i++;
            } else {
                clearInterval(typingAnimationInterval);
                if (typedWelcomeElement) typedWelcomeElement.classList.remove('typing');
                let j = 0;
                sublineAnimationInterval = setInterval(() => {
                    if (typedSublineElement && j < sublineText.length) {
                        typedSublineElement.textContent += sublineText.charAt(j);
                        j++;
                    } else {
                        clearInterval(sublineAnimationInterval);
                        if (typedSublineElement) typedSublineElement.classList.remove('typing');
                        showHelpTextTimeout = setTimeout(() => {
                            if (helpTextElement) {
                                helpTextElement.textContent = helpText;
                                helpTextElement.classList.add('fade-in');
                            }
                        }, 500);
                    }
                }, 50);
            }
        }, 50);
    }

    scrollToBottom();
}

function renderLoginScreen() {
    appContainer.innerHTML = `
        <div class="terminal-window max-w-2xl w-full p-0">
            <div class="terminal-header">
                <div class="terminal-dot red"></div>
                <div class="terminal-dot yellow"></div>
                <div class="terminal-dot green"></div>
            </div>
            <div class="terminal-content scanlines">
              
                <span class="glitch-text text-center text-primary mb-4 text-xl md:text-2xl block" data-text=">>> ASTRO-CYBER TERMINAL v2.1 INITIALIZED <<<">
                    >>> ASTRO-CYBER TERMINAL v2.1 INITIALIZED <<<
                </span>
                <p class="text-center text-accent fade-in mb-8 text-sm md:text-lg">
                    >>> ACCESSING COSMIC DATABASE... <<<
                </p>
                <form id="login-form" class="flex flex-col gap-4 fade-in">
                    <label for="name" class="form-label">NAME:</label>
                    <input id="name" name="name" type="text" required class="form-input" />
                    <label for="dob" class="form-label">ORIGIN DATE:</label>
                    <input id="dob" name="dob" type="date" required class="form-input" />
                    <label for="time" class="form-label">CLOCK:</label>
                    <input id="time" name="time" type="time" required class="form-input" />
                    <label for="place" class="form-label">PLACE OF ORIGIN:</label>
                    <input id="place" name="place" type="text" required class="form-input" />
                    <div class="flex justify-center mt-4">
                        <button type="submit" class="cyber-button text-primary">INITIATE QUERY</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('login-form').onsubmit = (e) => {
        e.preventDefault();
        const formData = {
            name: document.getElementById('name').value,
            dob: document.getElementById('dob').value,
            time: document.getElementById('time').value,
            place: document.getElementById('place').value
        };
        originData = formData;
        secretKey = generateSecretKey(formData.dob, formData.time);
        currentScreen = 'secret_key';
        renderScreen();
    };
}

function renderSecretKeyScreen(error = false, isLoading = false) {
    appContainer.innerHTML = `
        <div class="terminal-window max-w-2xl w-full p-0">
            <div class="terminal-header">
                <div class="terminal-dot red"></div>
                <div class="terminal-dot yellow"></div>
                <div class="terminal-dot green"></div>
            </div>
            <div class="terminal-content scanlines">
                <h2 class="text-accent text-xl md:text-2xl mb-4">COSMIC AUTHENTICATION REQUIRED</h2>
                <p class="text-sm md:text-base mb-6">
                    “Take the digits of your origin and collapse them into one final sign; each sign speaks only by its first letter — O, T, TH, F, FI, S, SE, E, N; let the clock speak in the machine’s language, then bind the two to uncover the key.”
                </p>
                <form id="secret-key-form" class="flex flex-col gap-4">
                    <label for="secretKeyInput" class="form-label">COSMIC KEY:</label>
                    <input
                        type="text"
                        id="secretKeyInput"
                        class="form-input ${error ? 'error-message' : ''}"
                        required
                        ${isLoading ? 'disabled' : ''}
                    />
                    ${error ? '<p class="error-message mt-2">ACCESS DENIED. KEY INVALID.</p>' : ''}
                    ${isLoading ? '<p class="text-accent text-center mt-4">>>> AUTHENTICATING... <<<</p>' : ''}
                    <div class="flex justify-center mt-4">
                        <button type="submit" class="cyber-button text-primary" ${isLoading ? 'disabled' : ''}>
                            ${isLoading ? 'AUTHENTICATING...' : 'VALIDATE'}
                        </button>
                    </div>
                </form>
                <div class="text-center mt-8">
                    <span class="text-transparent hover:text-white transition-colors duration-500 text-xs">
                        Clock speaks in the machine’s tongue.
                    </span>
                </div>
            </div>
        </div>
    `;

    document.getElementById('secret-key-form').onsubmit = async (e) => {
        e.preventDefault();
        const inputKey = document.getElementById('secretKeyInput').value;
        console.log("Input Key:", inputKey.toUpperCase());
        console.log("Correct Key:", secretKey ? secretKey.toUpperCase() : "Key not generated");

        if (secretKey && inputKey.toUpperCase() === secretKey.toUpperCase()) {
            appendTerminalOutput(`Access granted. Welcome, ${originData.name}.`);
            currentScreen = 'terminal';
            renderScreen();
        } else {
            renderSecretKeyScreen(true, false);
            setTimeout(() => renderSecretKeyScreen(false, false), 2000);
            appendTerminalOutput('ACCESS DENIED. KEY INVALID.');
        }
    };
}

// --- Main Render Function ---
function renderScreen() {
    if (currentScreen === 'terminal') {
        renderTerminalScreen();
    } else if (currentScreen === 'login') {
        renderLoginScreen();
    } else if (currentScreen === 'secret_key') {
        renderSecretKeyScreen();
    }
}

// Initial render when the page loads
document.addEventListener('DOMContentLoaded', () => {
    renderScreen();
});