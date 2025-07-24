import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import ReactMarkdown from "react-markdown";

export default function ChatSession() {
  const params = useParams();
  const { token, user } = useAuth();
  const [sessionId, setSessionId] = useState(params.session_id);
  const [loId, setLoId] = useState(null);
  const [mode, setMode] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [question, setQuestion] = useState("");
  const hasAskedQuestion = useRef(false);
  const isLoadingQuestion = useRef(false);
  const chatEndRef = useRef(null);
  const currentSessionLoaded = useRef(null);

  useEffect(() => {
    async function fetchSessionAndMessages() {
      setLoading(true);
      try {
        const sessionRes = await fetch(`http://localhost:8000/api/session/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const sessionData = await sessionRes.json();

        const { lo_id, mode } = sessionData;
        setLoId(lo_id);
        setMode(mode);

        // Prevent multiple triggers
        if (currentSessionLoaded.current === sessionId) {
          console.log("🔁 Session already loaded, skipping reload.");
          return;
        }
        currentSessionLoaded.current = sessionId;

        const msgRes = await fetch(`http://localhost:8000/api/session/${sessionId}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const pastMessages = await msgRes.json();
        const msgs = pastMessages.map((m) => ({ role: m.role, text: m.text }));
        setMessages(msgs); // ✅ reset, not append

        const hasQuestion = msgs.some((m) =>
          m.role === "tutor" && m.text.startsWith("🧠")
        );

        console.log("📜 Messages loaded:", msgs.length, "| Has question:", hasQuestion);

        // Trigger a new question only if none exists
        if (!hasQuestion) {
          hasAskedQuestion.current = false;
          isLoadingQuestion.current = false;
          await loadNewQuestion(lo_id, sessionId);
        } else {
          hasAskedQuestion.current = true;
        }

      } catch (err) {
        console.error("❌ Failed to load session or messages", err);
      } finally {
        setLoading(false);
      }
    }

    if (sessionId) {
      fetchSessionAndMessages();
    }
  }, [sessionId]);


  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || !loId) return;

    setSending(true);
    const userMsg = { role: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    await saveMessage(userMsg);

    try {
      const res = await fetch(`http://localhost:8000/api/evaluate_response`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: sessionId,
          lo_id: loId,
          question,
          user_input: input,
        }),
      });

      const data = await res.json();

      if (data.score === 1) {
        const msgs = [
          { role: "tutor", text: "🎉 Objective complete! You’ve mastered this topic." },
          { role: "tutor", text: data.feedback },
        ];
        setMessages((prev) => [...prev, ...msgs]);
        for (const msg of msgs) await saveMessage(msg);

        // Allow time for feedback to render before transition
        if (mode === "tutor") {
          console.log("🎯 LO complete. Advancing...");
          setTimeout(() => {
            const transition = { role: "tutor", text: "📘 Moving on to the next objective..." };
            setMessages((prev) => [...prev, transition]);
            saveMessage(transition).then(() => {
              goToNextLO(loId);
            });
          }, 4000); // Wait 4s before transition
        }
      } else {
        const msgs = [
          { role: "tutor", text: data.feedback },
          { role: "tutor", text: data.followup },
        ];
        setMessages((prev) => [...prev, ...msgs]);
        for (const msg of msgs) await saveMessage(msg);
      }
    } catch (err) {
      console.error("Error evaluating response", err);
      const errMsg = { role: "tutor", text: "⚠️ Sorry, I couldn't process your response." };
      setMessages((prev) => [...prev, errMsg]);
      await saveMessage(errMsg);
    }

    setInput("");
    setSending(false);

    // Ensure scroll to bottom after messages
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 150);
  }

  async function saveMessage(msg, sessionIdOverride = null, loIdOverride = null) {
    const sid = sessionIdOverride || sessionId;
    const lid = loIdOverride || loId;

    if (!lid || !sid) {
      console.warn("⚠️ loId or sessionId is missing. Message not saved.");
      return;
    }

    try {
      await fetch(`http://localhost:8000/api/session/${sid}/message`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lo_id: lid,
          role: msg.role,
          text: msg.text,
          activity_type: "chat",
        }),
      });
    } catch (err) {
      console.error("❌ Failed to save message:", err);
    }
  }


  async function loadNewQuestion(lo_id, session_id) {
    if (!lo_id || !session_id) return;
    if (hasAskedQuestion.current || isLoadingQuestion.current) return;

    hasAskedQuestion.current = true;
    isLoadingQuestion.current = true;

    try {
      const res = await fetch(`http://localhost:8000/api/assessment_question`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ lo_id }),
      });

      const qData = await res.json();
      setQuestion(qData.question);

      const transitionMsg = { role: "tutor", text: `🧠 **New Learning Objective**` };
      const questionMsg = { role: "tutor", text: qData.question };

      setMessages((prev) => [...prev, transitionMsg, questionMsg]);
      await saveMessage(transitionMsg, session_id, lo_id);
      await saveMessage(questionMsg, session_id, lo_id);
    } catch (err) {
      console.error("❌ Failed to load question:", err);
    } finally {
      isLoadingQuestion.current = false;
    }
  }

  async function goToNextLO(currentLoId) {
    const res = await fetch(`http://localhost:8000/api/session/${currentLoId}/next_lo`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    console.log("🧭 Next LO response:", data);

    if (data.next_lo_id) {
      const newLoId = data.next_lo_id;
      const alreadyMoved = messages.some(m => m.text === "📘 Moving on to the next objective...");
      if (!alreadyMoved) {
        const transition = { role: "tutor", text: "📘 Moving on to the next objective..." };
        setMessages(prev => [...prev, transition]);
        await saveMessage(transition, sessionId, newLoId);
      }

      setLoId(newLoId);
      hasAskedQuestion.current = false;
      isLoadingQuestion.current = false;

      // ✅ Trigger loading next question (in same chat)
      await loadNewQuestion(newLoId, sessionId);
    } else {
      const finalMsg = { role: "tutor", text: "🎉 You’ve completed all objectives!" };
      setMessages((prev) => [...prev, finalMsg]);
      await saveMessage(finalMsg);
    }
  }

  return (
    <div className="wgu-chat-bg">
      <div className="wgu-chat-card">
        <div className="wgu-chat-header">Learning Chat</div>
        <div style={{ textAlign: "right", padding: "10px 24px 0 0" }}>
          <button
            onClick={() => window.location.href = "/select"}
            className="wgu-session-back"
          >
            ⬅ Back to Menu
          </button>
        </div>

        <div className="wgu-chat-messages">
          {loading ? (
            <div style={{ color: "#197278" }}>Loading session...</div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className="wgu-chat-msg-row" style={{
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start"
              }}>
                <div className={msg.role === "user" ? "wgu-chat-msg-user" : "wgu-chat-msg-tutor"}>
                  <div className="wgu-chat-meta">
                    {msg.role === "user" ? "You" : "Tutor"}
                  </div>
                  {msg.text.startsWith("##") ? (
                    <div className="prose prose-sm">
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                  ) : (
                    <div>{msg.text}</div>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={handleSend} className="wgu-chat-input-row">
          <textarea
            className="wgu-chat-textarea"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type or paste your Python code here..."
            disabled={sending}
          />
          <button
            className="wgu-chat-send-btn"
            type="submit"
            disabled={sending}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
