"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

type CallStatus = "idle" | "outgoing" | "incoming" | "connected";

type CallInfo = {
  chatId: string;
  otherUserId: string;
  otherName: string;
};

type CallContextValue = {
  status: CallStatus;
  callInfo: CallInfo | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  muted: boolean;
  cameraOff: boolean;
  startCall: (chatId: string, otherUserId: string, otherName: string) => void;
  acceptCall: () => void;
  declineCall: () => void;
  hangUp: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
};

const CallContext = createContext<CallContextValue | null>(null);

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within CallProvider");
  return ctx;
}

export function CallProvider({ myId, myName, children }: { myId: string; myName: string; children: React.ReactNode }) {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [callInfo, setCallInfo] = useState<CallInfo | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const signalChannelRef = useRef<RealtimeChannel | null>(null);
  const userChannelRef = useRef<RealtimeChannel | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localStream?.getTracks().forEach((t) => t.stop());
    setLocalStream(null);
    setRemoteStream(null);
    if (signalChannelRef.current) {
      const supabase = createSupabaseBrowserClient();
      supabase.removeChannel(signalChannelRef.current);
      signalChannelRef.current = null;
    }
    pendingCandidatesRef.current = [];
    setStatus("idle");
    setCallInfo(null);
    setMuted(false);
    setCameraOff(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localStream]);

  const setupPeerConnection = useCallback(
    (chatId: string, isCaller: boolean, stream: MediaStream) => {
      const supabase = createSupabaseBrowserClient();
      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
      };

      const signalChannel = supabase.channel(`call-signal:${chatId}`);
      signalChannelRef.current = signalChannel;

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          signalChannel.send({
            type: "broadcast",
            event: "ice-candidate",
            payload: { candidate: event.candidate.toJSON() },
          });
        }
      };

      signalChannel
        .on("broadcast", { event: "offer" }, async ({ payload }) => {
          if (isCaller) return;
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          for (const c of pendingCandidatesRef.current) await pc.addIceCandidate(new RTCIceCandidate(c));
          pendingCandidatesRef.current = [];
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          signalChannel.send({ type: "broadcast", event: "answer", payload: { sdp: answer } });
        })
        .on("broadcast", { event: "answer" }, async ({ payload }) => {
          if (!isCaller) return;
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          setStatus("connected");
        })
        .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } else {
            pendingCandidatesRef.current.push(payload.candidate);
          }
        })
        .on("broadcast", { event: "hang-up" }, () => {
          cleanup();
        })
        .subscribe(async (subStatus) => {
          if (subStatus === "SUBSCRIBED" && isCaller) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            signalChannel.send({ type: "broadcast", event: "offer", payload: { sdp: offer } });
            setStatus("connected");
          }
        });
    },
    [cleanup]
  );

  const startCall = useCallback(
    async (chatId: string, otherUserId: string, otherName: string) => {
      const supabase = createSupabaseBrowserClient();
      setCallInfo({ chatId, otherUserId, otherName });
      setStatus("outgoing");

      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);

      supabase
        .channel(`user-calls:${otherUserId}`)
        .send({
          type: "broadcast",
          event: "call-invite",
          payload: { chatId, callerId: myId, callerName: myName },
        });

      setupPeerConnection(chatId, true, stream);
    },
    [myId, myName, setupPeerConnection]
  );

  const acceptCall = useCallback(async () => {
    if (!callInfo) return;
    const supabase = createSupabaseBrowserClient();
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    setLocalStream(stream);

    supabase.channel(`user-calls:${callInfo.otherUserId}`).send({
      type: "broadcast",
      event: "call-accepted",
      payload: { chatId: callInfo.chatId },
    });

    setupPeerConnection(callInfo.chatId, false, stream);
  }, [callInfo, setupPeerConnection]);

  const declineCall = useCallback(() => {
    if (callInfo) {
      const supabase = createSupabaseBrowserClient();
      supabase.channel(`user-calls:${callInfo.otherUserId}`).send({
        type: "broadcast",
        event: "call-declined",
        payload: { chatId: callInfo.chatId },
      });
    }
    cleanup();
  }, [callInfo, cleanup]);

  const hangUp = useCallback(() => {
    signalChannelRef.current?.send({ type: "broadcast", event: "hang-up", payload: {} });
    cleanup();
  }, [cleanup]);

  const toggleMute = useCallback(() => {
    localStream?.getAudioTracks().forEach((t) => (t.enabled = muted));
    setMuted((m) => !m);
  }, [localStream, muted]);

  const toggleCamera = useCallback(() => {
    localStream?.getVideoTracks().forEach((t) => (t.enabled = cameraOff));
    setCameraOff((c) => !c);
  }, [localStream, cameraOff]);

  // Global listener: this user's own channel, for incoming call invites --
  // active on every authenticated page, not just the Messages page.
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`user-calls:${myId}`)
      .on("broadcast", { event: "call-invite" }, ({ payload }) => {
        setCallInfo({ chatId: payload.chatId, otherUserId: payload.callerId, otherName: payload.callerName });
        setStatus("incoming");
      })
      .on("broadcast", { event: "call-declined" }, () => {
        cleanup();
      })
      .on("broadcast", { event: "call-accepted" }, () => {
        // Handled by setupPeerConnection's SUBSCRIBED callback for the caller.
      })
      .subscribe();
    userChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId]);

  return (
    <CallContext.Provider
      value={{
        status,
        callInfo,
        localStream,
        remoteStream,
        muted,
        cameraOff,
        startCall,
        acceptCall,
        declineCall,
        hangUp,
        toggleMute,
        toggleCamera,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}
