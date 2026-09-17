"use client";

import { useEffect, useRef } from "react";
import { useCall } from "./CallContext";

export default function CallScreen() {
  const { status, callInfo, localStream, remoteStream, muted, cameraOff, acceptCall, declineCall, hangUp, toggleMute, toggleCamera } =
    useCall();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  if (status === "idle" || !callInfo) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/95 text-white">
      {status === "incoming" && (
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-purple text-3xl font-bold">
            {callInfo.otherName.charAt(0).toUpperCase()}
          </div>
          <p className="text-xl font-semibold">
            {callInfo.otherName} is {callInfo.withVideo ? "video calling" : "calling"}...
          </p>
          <div className="mt-4 flex gap-6">
            <button
              onClick={declineCall}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-2xl"
              aria-label="Decline call"
            >
              ✕
            </button>
            <button
              onClick={acceptCall}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-2xl"
              aria-label="Accept call"
            >
              📞
            </button>
          </div>
        </div>
      )}

      {status === "outgoing" && !remoteStream && (
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-purple text-3xl font-bold">
            {callInfo.otherName.charAt(0).toUpperCase()}
          </div>
          <p className="text-xl font-semibold">Calling {callInfo.otherName}...</p>
          <button
            onClick={hangUp}
            className="mt-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-2xl"
            aria-label="Cancel call"
          >
            ✕
          </button>
        </div>
      )}

      {(status === "connected" || (status === "outgoing" && remoteStream)) && (
        <div className="relative h-full w-full">
          {/* Video elements are always mounted -- they carry the audio
              track regardless -- just visually hidden for a voice call, so
              there's no need to juggle a separate <audio> element/ref. */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={callInfo.withVideo ? "h-full w-full bg-gray-900 object-cover" : "hidden"}
          />
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={
              callInfo.withVideo
                ? "absolute bottom-24 right-4 h-32 w-24 rounded-xl border-2 border-white/50 object-cover sm:h-48 sm:w-36"
                : "hidden"
            }
          />

          {!callInfo.withVideo && (
            <div className="flex h-full w-full flex-col items-center justify-center gap-4">
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-brand-purple text-4xl font-bold">
                {callInfo.otherName.charAt(0).toUpperCase()}
              </div>
              <p className="text-xl font-semibold">
                {status === "connected" ? "Voice call connected" : "Calling..."}
              </p>
            </div>
          )}

          <p className="absolute left-4 top-4 rounded-full bg-black/50 px-3 py-1 text-sm">
            {callInfo.otherName}
          </p>

          <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-4">
            <button
              onClick={toggleMute}
              className={`flex h-12 w-12 items-center justify-center rounded-full text-lg ${muted ? "bg-white text-black" : "bg-white/20"}`}
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? "🔇" : "🎤"}
            </button>
            {callInfo.withVideo && (
              <button
                onClick={toggleCamera}
                className={`flex h-12 w-12 items-center justify-center rounded-full text-lg ${cameraOff ? "bg-white text-black" : "bg-white/20"}`}
                aria-label={cameraOff ? "Turn camera on" : "Turn camera off"}
              >
                {cameraOff ? "📷" : "🎥"}
              </button>
            )}
            <button
              onClick={hangUp}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500 text-lg"
              aria-label="Hang up"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
