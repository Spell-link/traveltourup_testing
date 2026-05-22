"use client";

import { useEffect, useRef } from "react";

export function Video() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.6;
    }
  }, []);

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      loop
      playsInline
      preload="none"
      className="w-full h-full object-cover"
    >
      <source src="/videos/featureFlight.mp4" type="video/mp4" />
 
    </video>
  );
}