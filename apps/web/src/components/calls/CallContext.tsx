"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

type CallStatus = "idle" | "outgoing" | "incoming" | "connected";

type CallInfo = {
  chatId: string;
  otherUserId: string;
  otherName: string;
  withVideo: boolean;
};

type CallContextValue = {
  status: CallStatus;
  callInfo: CallInfo | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  muted: boolean;
  cameraOff: boolean;
  startCall: (chatId: string, otherUserId: string, otherName: string, withVideo: boolean) => void;
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
  const [localStream, setLocalStreamState] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const signalChannelRef = useRef<RealtimeChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Coordinate "send the offer" so it only happens once BOTH sides are
  // actually ready: our own signaling channel subscribed, and the callee
  // has accepted. Whichever finishes second triggers the send. Using refs
  // (not state) here deliberately -- the effect below that reads these is
  // mounted once for the app's lifetime, so a state closure would go stale.
  const signalReadyRef = useRef(false);
  const calleeAcceptedRef = useRef(false);
  const offerSentRef = useRef(false);

  const setLocalStream = useCallback((stream: MediaStream | null) => {
    localStreamRef.current = stream;
    setLocalStreamState(stream);
  }, []);

  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    setLocalStream(null);
    setRemoteStream(null);
    if (signalChannelRef.current) {
      const supabase = createSupabaseBrowserClient();
      supabase.removeChannel(signalChannelRef.current);
      signalChannelRef.current = null;
    }
    signalReadyRef.current = false;
    calleeAcceptedRef.current = false;
    offerSentRef.current = false;
    setStatus("idle");
    setCallInfo(null);
    setMuted(false);
    setCameraOff(false);
  }, [setLocalStream]);

  const maybeSendOffer = useCallback(async (pc: RTCPeerConnection, signalChannel: RealtimeChannel) => {
    if (offerSentRef.current) return;
    if (!signalReadyRef.current || !calleeAcceptedRef.current) return;
    offerSentRef.current = true;

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    signalChannel.send({ type: "broadcast", event: "offer", payload: { sdp: offer } });
    setStatus("connected");
  }, []);

  const setupPeerConnection = useCallback(
    (chatId: string, isCaller: boolean, stream: MediaStream) => {
      const supabase = createSupabaseBrowserClient();
      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;
      const pendingCandidates: RTCIceCandidateInit[] = [];

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
          for (const c of pendingCandidates) await pc.addIceCandidate(new RTCIceCandidate(c));
          pendingCandidates.length = 0;
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          signalChannel.send({ type: "broadcast", event: "answer", payload: { sdp: answer } });
          setStatus("connected");
        })
        .on("broadcast", { event: "answer" }, async ({ payload }) => {
          if (!isCaller) return;
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        })
        .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } else {
            pendingCandidates.push(payload.candidate);
          }
        })
        .on("broadcast", { event: "hang-up" }, () => {
          cleanup();
        })
        .subscribe((subStatus) => {
          if (subStatus === "SUBSCRIBED") {
            signalReadyRef.current = true;
            if (isCaller) maybeSendOffer(pc, signalChannel);
          }
        });
    },
    [cleanup, maybeSendOffer]
  );

  const startCall = useCallback(
    async (chatId: string, otherUserId: string, otherName: string, withVideo: boolean) => {
      const supabase = createSupabaseBrowserClient();
      setCallInfo({ chatId, otherUserId, otherName, withVideo });
      setStatus("outgoing");
      signalReadyRef.current = false;
      calleeAcceptedRef.current = false;
      offerSentRef.current = false;

      const stream = await navigator.mediaDevices.getUserMedia({ video: withVideo, audio: true });
      setLocalStream(stream);
      setCameraOff(!withVideo);

      // One-off signal, not a lasting subscription: httpSend() delivers via
      // REST without needing .subscribe() first, and we remove the channel
      // right after so it doesn't linger in the client's channel registry.
      const inviteChannel = supabase.channel(`user-calls:${otherUserId}`);
      await inviteChannel.httpSend("call-invite", { chatId, callerId: myId, callerName: myName, withVideo });
      supabase.removeChannel(inviteChannel);

      // Subscribes immediately so we're ready the moment the callee
      // accepts, but the offer itself waits for maybeSendOffer's checks.
      setupPeerConnection(chatId, true, stream);
    },
    [myId, myName, setLocalStream, setupPeerConnection]
  );

  const acceptCall = useCallback(async () => {
    if (!callInfo) return;
    const supabase = createSupabaseBrowserClient();
    const stream = await navigator.mediaDevices.getUserMedia({ video: callInfo.withVideo, audio: true });
    setLocalStream(stream);
    setCameraOff(!callInfo.withVideo);

    const acceptChannel = supabase.channel(`user-calls:${callInfo.otherUserId}`);
    await acceptChannel.httpSend("call-accepted", { chatId: callInfo.chatId });
    supabase.removeChannel(acceptChannel);

    setupPeerConnection(callInfo.chatId, false, stream);
  }, [callInfo, setLocalStream, setupPeerConnection]);

  const declineCall = useCallback(() => {
    if (callInfo) {
      const supabase = createSupabaseBrowserClient();
      const declineChannel = supabase.channel(`user-calls:${callInfo.otherUserId}`);
      declineChannel
        .httpSend("call-declined", { chatId: callInfo.chatId })
        .finally(() => supabase.removeChannel(declineChannel));
    }
    cleanup();
  }, [callInfo, cleanup]);

  const hangUp = useCallback(() => {
    signalChannelRef.current?.send({ type: "broadcast", event: "hang-up", payload: {} });
    cleanup();
  }, [cleanup]);

  const toggleMute = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = muted));
    setMuted((m) => !m);
  }, [muted]);

  const toggleCamera = useCallback(() => {
    localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = cameraOff));
    setCameraOff((c) => !c);
  }, [cameraOff]);

  // Global listener: this user's own channel, for incoming call invites --
  // mounted once for the app's lifetime (active on every authenticated
  // page, not just Messages), so everything it reads must come from refs
  // or functional state updates, never a captured state variable.
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`user-calls:${myId}`)
      .on("broadcast", { event: "call-invite" }, ({ payload }) => {
        setCallInfo({
          chatId: payload.chatId,
          otherUserId: payload.callerId,
          otherName: payload.callerName,
          withVideo: payload.withVideo,
        });
        setStatus("incoming");
      })
      .on("broadcast", { event: "call-declined" }, () => {
        cleanup();
      })
      .on("broadcast", { event: "call-accepted" }, () => {
        calleeAcceptedRef.current = true;
        if (pcRef.current && signalChannelRef.current) {
          maybeSendOffer(pcRef.current, signalChannelRef.current);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [myId, cleanup, maybeSendOffer]);

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
