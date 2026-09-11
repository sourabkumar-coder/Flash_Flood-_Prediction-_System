import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { chatApi } from '../api/client';
import ChatMarkdown from './ChatMarkdown';
import chatbotIcon from '../assets/ChatGPT Image Sep 12, 2026, 12_33_54 AM.ico';
import './ChatbotWidget.css';

const LANGUAGES = [
  { code: 'en', name: 'English', speechCode: 'en-IN' },
  { code: 'hi', name: 'हिंदी (Hindi)', speechCode: 'hi-IN' },
  { code: 'bn', name: 'বাংলা (Bengali)', speechCode: 'bn-IN' },
  { code: 'as', name: 'অসমীয়া (Assamese)', speechCode: 'as-IN' },
  { code: 'ne', name: 'नेपाली (Nepali)', speechCode: 'ne-NP' },
  { code: 'ta', name: 'தமிழ் (Tamil)', speechCode: 'ta-IN' },
  { code: 'te', name: 'తెలుగు (Telugu)', speechCode: 'te-IN' },
  { code: 'mr', name: 'मराठी (Marathi)', speechCode: 'mr-IN' },
];

const PRESETS = {
  en: [
    { label: '🦺 Safety Measures', prompt: 'What safety measures should I take during a flash flood?' },
    { label: '📞 Emergency Helplines', prompt: 'Give me official emergency helpline numbers for flood rescue.' },
    { label: '⚡ Do\'s and Don\'ts', prompt: 'What are the critical Do\'s and Don\'ts during cloudbursts and floods?' },
    { label: '🎒 Survival Kit', prompt: 'What items must be in an emergency flood survival kit?' },
    { label: '🏃 Evacuation Steps', prompt: 'How should I safely evacuate to high ground?' },
  ],
  hi: [
    { label: '🦺 सुरक्षा उपाय', prompt: 'बाढ़ और बादल फटने के दौरान क्या सुरक्षा उपाय करने चाहिए?' },
    { label: '📞 हेल्पलाइन नंबर', prompt: 'बाढ़ राहत और बचाव के लिए आपातकालीन हेल्पलाइन नंबर बताएं।' },
    { label: '⚡ क्या करें / न करें', prompt: 'बाढ़ के दौरान क्या करें और क्या न करें?' },
    { label: '🎒 आपातकालीन किट', prompt: 'इमरजेंसी सर्वाइवल किट में क्या-क्या सामान होना चाहिए?' },
    { label: '🏃 सुरक्षित निकास', prompt: 'ऊंचे और सुरक्षित स्थानों पर कैसे सुरक्षित निकासी करें?' },
  ],
  bn: [
    { label: '🦺 সুরক্ষা নির্দেশাবলী', prompt: 'বন্যার সময় কী কী সুরক্ষা ব্যবস্থা নেওয়া উচিত?' },
    { label: '📞 জরুরি নম্বর', prompt: 'বন্যার জরুরি হেল্পলাইন নম্বরগুলি কী কী?' },
    { label: '⚡ করণীয় ও বর্জনীয়', prompt: 'বন্যার সময় কী করবেন এবং কী করবেন না?' },
    { label: '🎒 জরুরি কিট', prompt: 'বন্যার জরুরি কিটে কী কী জিনিস রাখা উচিত?' },
  ],
  as: [
    { label: '🦺 সুৰক্ষা ব্যৱস্থা', prompt: 'বানপানীৰ সময়ত কি কি সুৰক্ষা ব্যৱস্থা গ্ৰহণ কৰিব লাগে?' },
    { label: '📞 জৰুৰীকালীন নম্বৰ', prompt: 'বান সাহায্যৰ বাবে জৰুৰীকালীন হেল্পলাইন নম্বৰসমূহ দিয়ক।' },
  ],
  ne: [
    { label: '🦺 सुरक्षा उपायहरू', prompt: 'बाढी र पहिरोको समयमा के कस्ता सुरक्षा उपायहरू अपनाउनुपर्छ?' },
    { label: '📞 आपतकालीन नम्बर', prompt: 'बाढी उद्धारका लागि आपतकालीन हेल्पलाइन नम्बरहरू दिनुहोस्।' },
  ],
  ta: [
    { label: '🦺 பாதுகாப்பு நடவடிக்கைகள்', prompt: 'வெள்ளத்தின் போது எடுக்க வேண்டிய பாதுகாப்பு நடவடிக்கைகள் என்ன?' },
    { label: '📞 அவசர எண்கள்', prompt: 'வெள்ள நிவாரண அவசர உதவி எண்களைக் கொடுங்கள்.' },
  ],
  te: [
    { label: '🦺 భద్రతా చర్యలు', prompt: 'వరదల సమయంలో తీసుకోవలసిన భద్రతా చర్యలు ఏమిటి?' },
    { label: '📞 హెల్ప్‌లైన్ నంబర్లు', prompt: 'వరద సహాయం కోసం అత్యవసర హెల్ప్‌లైన్ నంబర్లను అందించండి.' },
  ],
  mr: [
    { label: '🦺 सुरक्षा उपाय', prompt: 'पुराच्या वेळी कोणते सुरक्षा उपाय योजावेत?' },
    { label: '📞 हेल्पलाईन क्रमांक', prompt: 'पूर मदतीसाठी आपत्कालीन हेल्पलाईन क्रमांक द्या.' },
  ]
};

// Helper: Chunks text into bite-sized sentences to bypass browser TTS limits and pause bugs
function chunkTextForTTS(rawText, maxLen = 160) {
  if (!rawText) return [];

  // Strip Markdown, HTML tags, links, phone emojis, tables
  const clean = rawText
    .replace(/[#*_`~|]/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[-–—]{3,}/g, ' ')
    .replace(/🚨|⚠️|✅|❌|📞|🦺|⚡|🎒|🏃|👋|🌊|🔈|🔊|⏹️/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!clean) return [];

  // Split by sentence delimiters
  const sentences = clean.split(/(?<=[.!?\n।])/);
  const chunks = [];
  let buffer = '';

  for (const s of sentences) {
    const trimmed = s.trim();
    if (!trimmed) continue;
    if (buffer.length + trimmed.length > maxLen) {
      if (buffer) chunks.push(buffer);
      buffer = trimmed;
    } else {
      buffer = buffer ? `${buffer} ${trimmed}` : trimmed;
    }
  }

  if (buffer) chunks.push(buffer);
  return chunks.length > 0 ? chunks : [clean];
}

export default function ChatbotWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [windowDimensions, setWindowDimensions] = useState({ width: 400, height: 580 });
  const [language, setLanguage] = useState('en');
  const [availableVoices, setAvailableVoices] = useState([]);
  const [messages, setMessages] = useState([
    {
      id: 'welcome-1',
      role: 'bot',
      content: '### 🌊 Namaste! I am JalDrishti AI (जलदृष्टि)\nYour 24x7 intelligent flood safety & disaster advisor for India.\n\n*Ask me about live flood precautions, rain warnings, relief centers, evacuation routes, and emergency helplines.*',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speakingId, setSpeakingId] = useState(null);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragStartPosRef = useRef({ x: 0, y: 0, startW: 0, startH: 0 });

  // TTS State Refs (Prevent Garbage Collection & Manage Queues)
  const activeChunksRef = useRef([]);
  const chunkIndexRef = useRef(0);
  const activeUtteranceRef = useRef(null);
  const ttsHeartbeatRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Load and listen to browser voices
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        setAvailableVoices(voices);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (ttsHeartbeatRef.current) {
        clearInterval(ttsHeartbeatRef.current);
      }
    };
  }, []);

  // Web Speech Recognition (Mic Input)
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      const activeLangObj = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];
      recognition.lang = activeLangObj.speechCode;

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputMessage(transcript);
          handleSendMessage(transcript);
        }
        setIsRecording(false);
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, [language]);

  const toggleVoiceRecording = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported on this browser. Please use Chrome or Edge.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        const activeLangObj = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];
        recognitionRef.current.lang = activeLangObj.speechCode;
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error('Speech recognition start failed:', err);
        setIsRecording(false);
      }
    }
  };

  // Sequential chunk speaker to prevent Chrome 15s pause bug
  const speakNextChunk = () => {
    if (!('speechSynthesis' in window)) return;

    if (chunkIndexRef.current >= activeChunksRef.current.length) {
      setSpeakingId(null);
      activeUtteranceRef.current = null;
      if (ttsHeartbeatRef.current) clearInterval(ttsHeartbeatRef.current);
      return;
    }

    const chunk = activeChunksRef.current[chunkIndexRef.current];
    if (!chunk || !chunk.trim()) {
      chunkIndexRef.current += 1;
      speakNextChunk();
      return;
    }

    const activeLangObj = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];
    const utterance = new SpeechSynthesisUtterance(chunk);
    activeUtteranceRef.current = utterance; // Keep alive against GC

    utterance.lang = activeLangObj.speechCode;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Pick best available voice
    if (availableVoices.length > 0) {
      const matchVoice = availableVoices.find(
        (v) =>
          v.lang.toLowerCase() === activeLangObj.speechCode.toLowerCase() ||
          v.lang.toLowerCase().replace('_', '-').startsWith(activeLangObj.code) ||
          v.lang.toLowerCase().includes(activeLangObj.code)
      );
      if (matchVoice) {
        utterance.voice = matchVoice;
      }
    }

    utterance.onend = () => {
      chunkIndexRef.current += 1;
      speakNextChunk();
    };

    utterance.onerror = (e) => {
      console.warn('Speech chunk error:', e);
      chunkIndexRef.current += 1;
      speakNextChunk();
    };

    window.speechSynthesis.speak(utterance);
  };

  // Trigger TTS Read Aloud
  const handleSpeakText = (msgId, rawText) => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-speech is not supported in this browser.');
      return;
    }

    // Toggle stop if already playing this message
    if (speakingId === msgId) {
      window.speechSynthesis.cancel();
      activeChunksRef.current = [];
      chunkIndexRef.current = 0;
      activeUtteranceRef.current = null;
      if (ttsHeartbeatRef.current) clearInterval(ttsHeartbeatRef.current);
      setSpeakingId(null);
      return;
    }

    // Stop any ongoing speech
    window.speechSynthesis.cancel();
    if (ttsHeartbeatRef.current) clearInterval(ttsHeartbeatRef.current);

    const chunks = chunkTextForTTS(rawText);
    if (chunks.length === 0) return;

    activeChunksRef.current = chunks;
    chunkIndexRef.current = 0;
    setSpeakingId(msgId);

    // Chrome TTS keep-alive interval
    ttsHeartbeatRef.current = setInterval(() => {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      } else if (!speakingId) {
        clearInterval(ttsHeartbeatRef.current);
      }
    }, 10000);

    // Give browser 50ms to cleanly cancel before starting new utterance
    setTimeout(() => {
      window.speechSynthesis.resume();
      speakNextChunk();
    }, 50);
  };

  // Window drag resize handler
  const handleResizeMouseDown = (e) => {
    e.preventDefault();
    if (isMaximized) return;
    isDraggingRef.current = true;
    dragStartPosRef.current = {
      x: e.clientX,
      y: e.clientY,
      startW: windowDimensions.width,
      startH: windowDimensions.height,
    };

    const onMouseMove = (moveEvt) => {
      if (!isDraggingRef.current) return;
      const deltaX = dragStartPosRef.current.x - moveEvt.clientX;
      const deltaY = dragStartPosRef.current.y - moveEvt.clientY;
      const newWidth = Math.min(Math.max(340, dragStartPosRef.current.startW + deltaX), window.innerWidth - 40);
      const newHeight = Math.min(Math.max(420, dragStartPosRef.current.startH + deltaY), window.innerHeight - 120);

      setWindowDimensions({ width: newWidth, height: newHeight });
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isLoading) return;

    const userMsg = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await chatApi.sendMessage({
        message: query,
        language: language,
        history: messages.slice(-6).map((m) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        })),
        district: user?.district || 'Kullu',
        state: user?.state || 'Himachal Pradesh',
      });

      const data = response.data;
      const botMsg = {
        id: `b-${Date.now()}`,
        role: 'bot',
        content: data.reply || 'Stay safe and monitor local emergency advisories.',
        provider: data.provider,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error('Failed to get chat response:', err);
      const errorMsg = {
        id: `err-${Date.now()}`,
        role: 'bot',
        content: '⚠️ **Unable to connect to AI server.**\n\nFor immediate emergency assistance:\n• **NDRF:** 1078\n• **National Helpline:** 112\n• **Medical Ambulance:** 108',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const activePresets = PRESETS[language] || PRESETS.en;

  return (
    <>
      {/* Floating Action Button */}
      <button
        type="button"
        className="jaldrishti-chat-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="JalDrishti AI Emergency Assistant"
        aria-label="Toggle JalDrishti AI Assistant"
      >
        <span className="pulse-ring"></span>
        {isOpen ? (
          <span className="jaldrishti-toggle-close">✕</span>
        ) : (
          <img
            src={chatbotIcon}
            alt="JalDrishti AI Bot"
            className="jaldrishti-toggle-icon-img"
          />
        )}
      </button>

      {/* Resizable Chat Window */}
      {isOpen && (
        <div
          className={`jaldrishti-chat-window ${isMaximized ? 'maximized' : ''}`}
          style={
            isMaximized
              ? {}
              : {
                  width: `${windowDimensions.width}px`,
                  height: `${windowDimensions.height}px`,
                }
          }
        >
          {/* Top-Left Drag Resize Handle */}
          {!isMaximized && (
            <div
              className="jaldrishti-resize-handle"
              onMouseDown={handleResizeMouseDown}
              title="Drag to resize window width & height"
            />
          )}

          {/* Header */}
          <div className="jaldrishti-chat-header">
            <div className="jaldrishti-chat-header-info">
              <div className="jaldrishti-chat-avatar">
                <img
                  src={chatbotIcon}
                  alt="JalDrishti Avatar"
                  className="jaldrishti-header-avatar-img"
                />
              </div>
              <div>
                <div className="jaldrishti-chat-title">JalDrishti AI (जलदृष्टि)</div>
                <div className="jaldrishti-chat-subtitle">
                  <span className="online-dot"></span> Groq LPU Disaster Advisor
                </div>
              </div>
            </div>

            <div className="jaldrishti-header-actions">
              <select
                className="jaldrishti-lang-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                title="Select Conversation Language"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </select>

              {/* Maximize / Restore Button */}
              <button
                type="button"
                className="jaldrishti-hdr-icon-btn"
                onClick={() => setIsMaximized(!isMaximized)}
                title={isMaximized ? 'Restore window size' : 'Expand / Maximize window'}
              >
                {isMaximized ? '🗗' : '⛶'}
              </button>

              {/* Close Button */}
              <button
                type="button"
                className="jaldrishti-hdr-icon-btn"
                onClick={() => setIsOpen(false)}
                title="Close chat"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Preset Quick Action Chips */}
          <div className="jaldrishti-presets-container">
            {activePresets.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                className="jaldrishti-preset-chip"
                onClick={() => handleSendMessage(preset.prompt)}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Voice Recording Active Bar */}
          {isRecording && (
            <div className="jaldrishti-voice-active-bar">
              <div className="jaldrishti-voice-waveform">
                <span className="waveform-bar"></span>
                <span className="waveform-bar"></span>
                <span className="waveform-bar"></span>
                <span className="waveform-bar"></span>
                <span>Listening... Speak your emergency question</span>
              </div>
              <button
                type="button"
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
                onClick={toggleVoiceRecording}
              >
                Stop ⏹️
              </button>
            </div>
          )}

          {/* Messages Scrolling Area */}
          <div className="jaldrishti-chat-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`jaldrishti-msg-row ${msg.role}`}>
                <div className="jaldrishti-msg-bubble">
                  {msg.role === 'bot' ? (
                    <ChatMarkdown content={msg.content} />
                  ) : (
                    <div>{msg.content}</div>
                  )}
                </div>

                <div className="jaldrishti-msg-actions">
                  <span className="jaldrishti-msg-meta">{msg.timestamp}</span>
                  {msg.role === 'bot' && (
                    <>
                      <button
                        type="button"
                        className={`jaldrishti-tts-btn ${speakingId === msg.id ? 'active' : ''}`}
                        onClick={() => handleSpeakText(msg.id, msg.content)}
                        title="Read aloud in selected language"
                      >
                        {speakingId === msg.id ? '⏹️ Stop' : '🔈 Read Aloud'}
                      </button>
                      <button
                        type="button"
                        className="jaldrishti-copy-btn"
                        onClick={() => navigator.clipboard.writeText(msg.content)}
                        title="Copy text"
                      >
                        📋 Copy
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="jaldrishti-msg-row bot">
                <div className="jaldrishti-typing-indicator">
                  <div className="jaldrishti-typing-dot"></div>
                  <div className="jaldrishti-typing-dot"></div>
                  <div className="jaldrishti-typing-dot"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <form
            className="jaldrishti-chat-input-area"
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
          >
            <button
              type="button"
              className={`jaldrishti-voice-mic-btn ${isRecording ? 'recording' : ''}`}
              onClick={toggleVoiceRecording}
              title={isRecording ? 'Stop Recording' : 'Voice Input (Speak)'}
            >
              🎤
            </button>
            <input
              type="text"
              className="jaldrishti-chat-input"
              placeholder={`Ask flood or weather safety in ${LANGUAGES.find((l) => l.code === language)?.name || 'your language'}...`}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
            />
            <button
              type="submit"
              className="jaldrishti-chat-send-btn"
              disabled={isLoading || !inputMessage.trim()}
              title="Send Message"
            >
              ➤
            </button>
          </form>
        </div>
      )}
    </>
  );
}
