import React, { useEffect, useRef, useState } from "react";
import { socket } from "./socket";
import "./App.css";

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);

  const peerRef = useRef(null);
  const channelRef = useRef(null);
  const remoteIdRef = useRef(null);

  useEffect(() => {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    peerRef.current = peer;

    // READY EVENT
    socket.on("ready", (id) => {
      console.log("Ready:", id);
      remoteIdRef.current = id;
    });

    // RECEIVE CHANNEL
    peer.ondatachannel = (event) => {
      const channel = event.channel;
      channelRef.current = channel;

      channel.onopen = () => {
        console.log("Connected ✅");
        setConnected(true);
      };

      channel.onmessage = (e) => {
        setMessages((prev) => [...prev, "Peer: " + e.data]);
      };
    };

    // ICE SEND
    peer.onicecandidate = (event) => {
      if (event.candidate && remoteIdRef.current) {
        socket.emit("ice-candidate", {
          candidate: event.candidate,
          to: remoteIdRef.current
        });
      }
    };

    // OFFER
    socket.on("offer", async ({ offer, from }) => {
      remoteIdRef.current = from;

      await peer.setRemoteDescription(offer);

      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      socket.emit("answer", {
        answer,
        to: from
      });
    });

    // ANSWER
    socket.on("answer", async ({ answer }) => {
      await peer.setRemoteDescription(answer);
    });

    // ICE RECEIVE
    socket.on("ice-candidate", async ({ candidate }) => {
      try {
        await peer.addIceCandidate(candidate);
      } catch (e) {
        console.log("ICE error");
      }
    });

  }, []);

  // START CONNECTION
  const startConnection = async () => {
    if (!remoteIdRef.current) {
      alert("Wait for second user!");
      return;
    }

    const peer = peerRef.current;

    const channel = peer.createDataChannel("chat");
    channelRef.current = channel;

    channel.onopen = () => {
      console.log("Connected ✅");
      setConnected(true);
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
    if (!channelRef.current || !connected) return;

    channelRef.current.send(input);
    setMessages((prev) => [...prev, "You: " + input]);
    setInput("");
  };

  return (
    <div className="chat-box">
      <h2>PeerLink 🚀</h2>

      <p>{connected ? "🟢 Connected" : "🔴 Waiting"}</p>

      <button onClick={startConnection}>
        Start Connection
      </button>

      <div className="messages">
        {messages.map((m, i) => (
          <p key={i}>{m}</p>
        ))}
      </div>

      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      <button onClick={sendMessage} disabled={!connected}>
        Send
      </button>
    </div>
  );
}

export default App;