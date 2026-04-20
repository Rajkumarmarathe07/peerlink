import { render, screen } from "@testing-library/react";
import App from "./App";

jest.mock("./socket", () => ({
  socket: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn()
  }
}));

beforeAll(() => {
  class MockRTCPeerConnection {
    constructor() {
      this.connectionState = "new";
      this.onconnectionstatechange = null;
      this.ondatachannel = null;
      this.onicecandidate = null;
    }

    createDataChannel() {
      return {
        onopen: null,
        onclose: null,
        onmessage: null,
        close: jest.fn(),
        send: jest.fn()
      };
    }

    createOffer = jest.fn(async () => ({}));
    createAnswer = jest.fn(async () => ({}));
    setLocalDescription = jest.fn(async () => {});
    setRemoteDescription = jest.fn(async () => {});
    addIceCandidate = jest.fn(async () => {});
    close = jest.fn();
  }

  global.RTCPeerConnection = MockRTCPeerConnection;
});

test("renders PeerLink title and status", () => {
  render(<App />);
  expect(screen.getByText(/PeerLink/i)).toBeInTheDocument();
  expect(screen.getByLabelText("connection-status")).toBeInTheDocument();
});
