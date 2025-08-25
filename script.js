const { useState, useEffect, useRef } = React;

const API_KEY = "AIzaSyCTL6-cYNZprxD937wlD8vN-ZHcl1u-sKA";

const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`;

function App() {
    const [screen, setScreen] = useState('terminal');
    const [originData, setOriginData] = useState(null);
    const [secretKey, setSecretKey] = useState(null);
    const [terminalOutput, setTerminalOutput] = useState([]);
    const [commandInput, setCommandInput] = useState('');
    const terminalRef = useRef(null);

    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [terminalOutput, screen]);

    const digitalRoot = (n) => {
        if (n === 0) return 0;
        let sum = n;
        while (sum >= 10) {
            sum = String(sum).split('').reduce((acc, digit) => acc + parseInt(digit, 10), 0);
        }
        return sum;
    };

    const generateSecretKey = (dobISO, timeHHMM) => {
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

        const codeMap = (n) => String(48 + n);

        const dayLetter = signMap[dayRoot];
        const monthLetter = signMap[monthRoot];
        const yearLetter = signMap[yearRoot];

        const hourCode = codeMap(hourRoot);
        const minuteCode = codeMap(minuteRoot);

        return `${dayLetter}${hourCode}${monthLetter}${minuteCode}${yearLetter}`;
    };
            
    const handleCommand = async (command) => {
        const newOutput = [...terminalOutput, `> ${command}`];
        setTerminalOutput(newOutput);
        setCommandInput('');

        const lowerCommand = command.toLowerCase().trim();

        if (lowerCommand === 'help') {
            setTerminalOutput(prev => [...prev,
                'Available Commands:',
                '- help: Shows available commands.',
                '- login to astrocyber: Opens the login page.',
                '- clear: Clears the terminal screen.',
                '- ask [your question]: Ask the AI a question (after login and key validation).'
            ]);
        } else if (lowerCommand === 'login to astrocyber') {
            setScreen('login');
        } else if (lowerCommand === 'clear') {
            setTerminalOutput([]);
        } else if (lowerCommand.startsWith('ask ') && screen === 'terminal' && originData && secretKey) {
            const query = command.substring(4).trim();
            if (query) {
                setTerminalOutput(prev => [...prev, `AI: Processing query "${query}"...`]);
                await handleApiCall(query);
            } else {
                setTerminalOutput(prev => [...prev, 'AI: Please provide a question after "ask".']);
            }
        }
        else {
            setTerminalOutput(prev => [...prev, `Unknown command: ${command}. Type 'help' for a list of commands.`]);
        }
    };

    const handleTerminalInputChange = (e) => {
        setCommandInput(e.target.value);
    };

    const handleTerminalInputSubmit = (e) => {
        if (e.key === 'Enter') {
            handleCommand(commandInput);
        }
    };

    const handleApiCall = async (query) => {
        setTerminalOutput(prev => [...prev, `AI: Connecting to cosmic network...`]);

        const prompt = `You are an ancient, cybernetic astrologer in the year 2050. The user is named ${originData.name}, born on ${originData.dob} at ${originData.time} in ${originData.place}. Respond to the following query in a retro-cyberpunk, cryptic, and profound style, using language that fits the 'ASTRO-CYBER Terminal' theme. Incorporate elements of their birth data subtly if relevant to the query.
        User Query: ${query}
        `;
        
        const maxRetries = 3;
        let currentRetry = 0;
        let success = false;
        
        while (currentRetry < maxRetries && !success) {
            try {
                const payload = { contents: [{ parts: [{ text: prompt }] }] };
                const response = await fetch(API_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`API error: ${response.status} - ${errorData.error.message || response.statusText}`);
                }

                const result = await response.json();
                const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;

                if (text) {
                    setTerminalOutput(prev => [...prev, `AI: ${text}`]);
                    success = true;
                } else {
                    console.error("AI service returned no text or unexpected structure:", result);
                    setTerminalOutput(prev => [...prev, 'AI: Error - Empty or malformed response from cosmic entity.']);
                    throw new Error("Empty or malformed AI response.");
                }
            } catch (err) {
                console.error(`Attempt ${currentRetry + 1} failed:`, err);
                setTerminalOutput(prev => [...prev, `AI: Connection to cosmic entity failed (Attempt ${currentRetry + 1}). Retrying...`]);
                currentRetry++;
                if (currentRetry < maxRetries) {
                    const delay = Math.pow(2, currentRetry) * 1000;
                    await new Promise(res => setTimeout(res, delay));
                }
            }
        }

        if (!success) {
            setTerminalOutput(prev => [...prev, 'AI: All attempts to connect to cosmic entity failed. Access denied.']);
        }
    };

    const Home = () => {
        const [formData, setFormData] = useState({ name: '', dob: '', time: '', place: '' });

        const handleChange = (e) => {
            const { name, value } = e.target;
            setFormData(prev => ({ ...prev, [name]: value }));
        };

        const handleSubmit = (e) => {
            e.preventDefault();
            const newKey = generateSecretKey(formData.dob, formData.time);
            setOriginData(formData);
            setSecretKey(newKey);
            setScreen('secret_key');
        };

        return (
            <div className="terminal-window max-w-2xl w-full p-0">
                <div className="terminal-header">
                    <div className="terminal-dot red"></div>
                    <div className="terminal-dot yellow"></div>
                    <div className="terminal-dot green"></div>
                </div>
                <div className="terminal-content scanlines">
                  
                    <span className="glitch-text text-center text-primary mb-4 text-xl md:text-2xl block" data-text=">>> ASTRO-CYBER TERMINAL v2.1 INITIALIZED <<<">
                        {`>>> ASTRO-CYBER TERMINAL v2.1 INITIALIZED <<<`}
                    </span>
                    <p className="text-center text-accent fade-in mb-8 text-sm md:text-lg">
                        {`>>> ACCESSING COSMIC DATABASE... <<<`}
                    </p>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4 fade-in">
                        <label htmlFor="name" className="text-sm md:text-base text-accent uppercase tracking-wider">NAME:</label>
                        <input id="name" name="name" type="text" value={formData.name} onChange={handleChange} required className="w-full bg-transparent border-b-2 border-primary text-primary outline-none focus:border-accent transition-colors p-2 rounded-md" />
                        <label htmlFor="dob" className="text-sm md:text-base text-accent uppercase tracking-wider">ORIGIN DATE:</label>
                        <input id="dob" name="dob" type="date" value={formData.dob} onChange={handleChange} required className="w-full bg-transparent border-b-2 border-primary text-primary outline-none focus:border-accent transition-colors p-2 rounded-md" />
                        <label htmlFor="time" className="text-sm md:text-base text-accent uppercase tracking-wider">CLOCK:</label>
                        <input id="time" name="time" type="time" value={formData.time} onChange={handleChange} required className="w-full bg-transparent border-b-2 border-primary text-primary outline-none focus:border-accent transition-colors p-2 rounded-md" />
                        <label htmlFor="place" className="text-sm md:text-base text-accent uppercase tracking-wider">PLACE OF ORIGIN:</label>
                        <input id="place" name="place" type="text" value={formData.place} onChange={handleChange} required className="w-full bg-transparent border-b-2 border-primary text-primary outline-none focus:border-accent transition-colors p-2 rounded-md" />
                        <div className="flex justify-center mt-4">
                            <button type="submit" className="cyber-button text-primary">INITIATE QUERY</button>
                        </div>
                    </form>
                </div>
            </div>
        );
    };

    const SecretKey = () => {
        const [inputKey, setInputKey] = useState('');
        const [error, setError] = useState(false);
        const [isLoading, setIsLoading] = useState(false);

        const handleSubmit = async (e) => {
            e.preventDefault();
            console.log("Input Key:", inputKey.toUpperCase());
            console.log("Correct Key:", secretKey ? secretKey.toUpperCase() : "Key not generated");

            if (secretKey && inputKey.toUpperCase() === secretKey.toUpperCase()) {
                setTerminalOutput(prev => [...prev, `Access granted. Welcome, ${originData.name}.`]);
                setScreen('terminal');
            } else {
                setError(true);
                setTimeout(() => setError(false), 2000);
                setTerminalOutput(prev => [...prev, 'ACCESS DENIED. KEY INVALID.']);
            }
        };

        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="terminal-window max-w-2xl w-full p-0">
                    <div className="terminal-header">
                        <div className="terminal-dot red"></div>
                        <div className="terminal-dot yellow"></div>
                        <div className="terminal-dot green"></div>
                    </div>
                    <div className="terminal-content scanlines">
                        <h2 className="text-accent text-xl md:text-2xl mb-4">COSMIC AUTHENTICATION REQUIRED</h2>
                        <p className="text-sm md:text-base mb-6">
                            “Take the digits of your origin and collapse them into one final sign; each sign speaks only by its first letter — O, T, TH, F, FI, S, SE, E, N; let the clock speak in the machine’s language, then bind the two to uncover the key.”
                        </p>
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <label htmlFor="secretKey" className="text-sm md:text-base text-accent uppercase tracking-wider">COSMIC KEY:</label>
                            <input
                                id="secretKey"
                                name="secretKey"
                                type="text"
                                value={inputKey}
                                onChange={(e) => setInputKey(e.target.value)}
                                className={`w-full bg-transparent border-b-2 border-primary text-primary outline-none focus:border-accent transition-colors p-2 rounded-md ${error ? 'text-secondary animate-pulse' : ''}`}
                                required
                                disabled={isLoading}
                            />
                            {error && (
                                <p className="text-secondary text-sm md:text-base animate-pulse">
                                    ACCESS DENIED. KEY INVALID.
                                </p>
                            )}
                            {isLoading && (
                                <p className="text-accent text-center mt-4">
                                    {`>>> ACCESSING COSMIC DATABASE... [AI INTERFACE ACTIVE] <<<`}
                                </p>
                            )}
                            <div className="flex justify-center mt-4">
                                <button type="submit" className="cyber-button text-primary" disabled={isLoading}>
                                    {isLoading ? 'AUTHENTICATING...' : 'VALIDATE'}
                                </button>
                            </div>
                        </form>
                        <div className="text-center mt-8">
                            <span className="text-transparent hover:text-white transition-colors duration-500 text-xs">
                                Clock speaks in the machine’s tongue.
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const Terminal = () => {
        const [typingDone, setTypingDone] = useState(false);
        const [sublineVisible, setSublineVisible] = useState(false);

        useEffect(() => {
            const timeout1 = setTimeout(() => {
                setTypingDone(true);
            }, 3000);
            const timeout2 = setTimeout(() => {
                setSublineVisible(true);
            }, 3500);
            return () => {
                clearTimeout(timeout1);
                clearTimeout(timeout2);
            };
        }, []);

        return (
            <div className="terminal-window max-w-4xl w-full h-[80vh] flex flex-col p-0">
                <div className="terminal-header">
                    <div className="terminal-dot red"></div>
                    <div className="terminal-dot yellow"></div>
                    <div className="terminal-dot green"></div>
                    <span className="text-primary text-sm ml-2">ASTRO-CYBER TERMINAL</span>
                </div>
                <div ref={terminalRef} className="terminal-content scanlines flex-grow overflow-y-auto">
                    {terminalOutput.map((line, index) => (
                        <div key={index} className="text-primary text-sm leading-relaxed">{line}</div>
                    ))}
                    {!originData && (
                        <>
                            <p className={`text-primary mb-4 text-xl md:text-2xl typing ${!typingDone ? '' : 'typing-done'}`}>
                                {`>>> ASTRO-CYBER TERMINAL v2.1 INITIALIZED <<<`}
                            </p>
                            {sublineVisible && (
                                <p className="text-accent fade-in mb-8 text-sm md:text-lg">
                                    {`>>> ACCESSING COSMIC DATABASE... <<<`}
                                </p>
                            )}
                            {sublineVisible && (
                                <p className="text-primary fade-in">Type 'help' to get started.</p>
                            )}
                        </>
                    )}
                </div>
                <div className="terminal-footer p-4 border-t-2 border-primary">
                    <div className="flex items-center">
                        <span className="text-accent mr-2">C:\ASTROCYBER&gt;</span>
                        <input
                            type="text"
                            className="terminal-input flex-grow"
                            value={commandInput}
                            onChange={handleTerminalInputChange}
                            onKeyPress={handleTerminalInputSubmit}
                            autoFocus
                        />
                    </div>
                </div>
            </div>
        );
    };

    const renderScreen = () => {
        switch (screen) {
            case 'terminal':
                return <Terminal />;
            case 'login':
                return <Home />;
            case 'secret_key':
                return <SecretKey />;
            default:
                return <Terminal />;
        }
    };

    return renderScreen();
}

ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));