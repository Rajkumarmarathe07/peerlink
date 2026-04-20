import React, { useEffect, useRef, useState } from "react";
import { socket } from "./socket";
import "./App.css";

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState("Connecting to signaling server...");

  const peerRef = useRef(null);
  const channelRef = useRef(null);
  const remoteIdRef = useRef(null);

  const addSystemMessage = (text) => {
    const timestamp = new Date().toLocaleTimeString();
    setMessages((prev) => [...prev, `[${timestamp}] System: ${text}`]);
  };

  useEffect(() => {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    peerRef.current = peer;

    const onWaiting = () => {
      setStatus("Waiting for a second user to join...");
      addSystemMessage("You are in the queue.");
    };

    const onPaired = ({ peerId, initiator }) => {
      remoteIdRef.current = peerId;
      setStatus(
        initiator
          ? "Partner found! Click Start Connection to begin."
          : "Partner found! Waiting for the initiator's offer..."
      );
      addSystemMessage("Partner found. You can start chatting soon.");
    };

    const onPeerDisconnected = () => {
      remoteIdRef.current = null;
      setConnected(false);
      setStatus("Your peer disconnected. Waiting for a new user...");
      addSystemMessage("Peer disconnected.");
    };

    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "connected") {
        setConnected(true);
        setStatus("Connected");
      }

      if (
        peer.connectionState === "failed" ||
        peer.connectionState === "disconnected" ||
        peer.connectionState === "closed"
      ) {
        setConnected(false);
      }
    };

    peer.ondatachannel = (event) => {
      const channel = event.channel;
      channelRef.current = channel;

      channel.onopen = () => {
        setConnected(true);
        setStatus("Connected");
        addSystemMessage("Data channel is open.");
      };

      channel.onclose = () => {
        setConnected(false);
        setStatus("Data channel closed.");
      };

      channel.onmessage = (e) => {
        setMessages((prev) => [...prev, "Peer: " + e.data]);
      };
    };

    peer.onicecandidate = (event) => {
      if (event.candidate && remoteIdRef.current) {
        socket.emit("ice-candidate", {
          candidate: event.candidate,
          to: remoteIdRef.current
        });
      }
    };

    const onOffer = async ({ offer, from }) => {
      remoteIdRef.current = from;

      await peer.setRemoteDescription(offer);

      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      socket.emit("answer", {
        answer,
        to: from
      });
    };

    const onAnswer = async ({ answer }) => {
      await peer.setRemoteDescription(answer);
    };

    const onIceCandidate = async ({ candidate }) => {
      try {
        await peer.addIceCandidate(candidate);
      } catch (e) {
        addSystemMessage("Could not process remote ICE candidate.");
      }
    };

    socket.on("waiting", onWaiting);
    socket.on("paired", onPaired);
    socket.on("peer-disconnected", onPeerDisconnected);
    socket.on("offer", onOffer);
    socket.on("answer", onAnswer);
    socket.on("ice-candidate", onIceCandidate);

    return () => {
      socket.off("waiting", onWaiting);
      socket.off("paired", onPaired);
      socket.off("peer-disconnected", onPeerDisconnected);
      socket.off("offer", onOffer);
      socket.off("answer", onAnswer);
      socket.off("ice-candidate", onIceCandidate);

      channelRef.current?.close();
      peer.close();
    };
  }, []);

  const startConnection = async () => {
    if (!remoteIdRef.current) {
      addSystemMessage("No partner yet. Please wait.");
      return;
    }

    const peer = peerRef.current;

    const channel = peer.createDataChannel("chat");
    channelRef.current = channel;

    channel.onopen = () => {
      setConnected(true);
      setStatus("Connected");
      addSystemMessage("Data channel is open.");
    };

    channel.onclose = () => {
      setConnected(false);
      setStatus("Data channel closed.");
    };

    channel.onmessage = (e) => {
      setMessages((prev) => [...prev, "Peer: " + e.data]);
    };

    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);

    socket.emit("offer", {
      offer,
      to: remoteIdRef.current
    });
  };

  const sendMessage = () => {
    const trimmed = input.trim();
    if (!channelRef.current || !connected || !trimmed) return;

    channelRef.current.send(trimmed);
    setMessages((prev) => [...prev, "You: " + trimmed]);
    setInput("");
  };

  return (
    <div className="chat-box">
      <h2>PeerLink 🚀</h2>

      <p aria-label="connection-status">
        {connected ? "🟢 Connected" : "🔴 Not connected"}
      </p>
      <p>{status}</p>

      <button onClick={startConnection} disabled={connected}>
        Start Connection
      </button>

      <button onClick={() => setMessages([])} disabled={messages.length === 0}>
        Clear Chat
      </button>

      <div className="messages">
        {messages.map((m, i) => (
          <p key={`${m}-${i}`}>{m}</p>
        ))}
      </div>

      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            sendMessage();
          }
        }}
        placeholder="Type a message"
      />

      <button onClick={sendMessage} disabled={!connected || !input.trim()}>
        Send
      </button>
    </div>
  );
}

export default App;
