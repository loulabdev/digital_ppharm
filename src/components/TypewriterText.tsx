// src/components/TypewriterText.tsx
import React, { useEffect, useRef, useState } from "react";

interface TypewriterTextProps {
  text: string;
  speed?: number;
  onDone?: () => void;
  showCursor?: boolean;
  className?: string;
}

const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  speed = 60,
  onDone,
  showCursor = true,
  className = "",
}) => {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDisplayed("");
    setDone(false);

    if (!text) { setDone(true); return; }

    const chars = [...text];
    let i = 0;

    const next = () => {
      if (i < chars.length) {
        setDisplayed((prev) => prev + chars[i++]);
        timerRef.current = setTimeout(next, speed + Math.floor(Math.random() * 18));
      } else {
        setDone(true);
        onDone?.();
      }
    };

    timerRef.current = setTimeout(next, speed);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [text, speed]);

  return (
    <span
      className={className}
      style={{
        /* 한국어 글자 깨짐 방지 — letter-spacing 완전 차단 */
        letterSpacing: 0,
        wordSpacing: "normal",
        fontKerning: "none",
      }}
    >
      {displayed}
      {showCursor && !done && (
        <span
          aria-hidden="true"
          style={{
            display: "inline-block",
            width: "2px",
            height: "1em",
            background: "currentColor",
            verticalAlign: "text-bottom",
            marginLeft: "2px",
            opacity: 0.6,
            animation: "twBlink 0.8s step-end infinite",
          }}
        />
      )}
      <style>{`@keyframes twBlink { 0%,100%{opacity:.6} 50%{opacity:0} }`}</style>
    </span>
  );
};

export default TypewriterText;
