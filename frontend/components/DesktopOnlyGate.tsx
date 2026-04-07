"use client";

import { Laptop2, Loader2, Smartphone } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

type DesktopOnlyGateProps = {
  children: ReactNode;
};

function detectMobileDevice(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const userAgent = navigator.userAgent || navigator.vendor || "";
  const hasMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    userAgent,
  );
  const hasCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const hasNarrowViewport = window.innerWidth <= 1024;

  return hasMobileUserAgent || (hasCoarsePointer && hasNarrowViewport);
}

export default function DesktopOnlyGate({ children }: DesktopOnlyGateProps) {
  const [deviceState, setDeviceState] = useState<"checking" | "mobile" | "desktop">("checking");

  useEffect(() => {
    const updateDeviceState = () => {
      setDeviceState(detectMobileDevice() ? "mobile" : "desktop");
    };

    updateDeviceState();
    window.addEventListener("resize", updateDeviceState);
    return () => window.removeEventListener("resize", updateDeviceState);
  }, []);

  if (deviceState === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_34%),_#07130d] px-4 text-gray-100">
        <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.04] px-6 py-5 shadow-2xl backdrop-blur-xl">
          <Loader2 size={18} className="animate-spin text-emerald-300" />
          <span className="text-sm font-medium text-gray-200">Verificando dispositivo...</span>
        </div>
      </div>
    );
  }

  if (deviceState === "mobile") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.18),_transparent_34%),_#07130d] px-4 py-8 text-gray-100">
        <div className="w-full max-w-xl rounded-[32px] border border-amber-400/20 bg-white/[0.04] p-8 text-center shadow-2xl backdrop-blur-xl">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl border border-amber-400/25 bg-amber-500/10 text-amber-200">
            <Smartphone size={28} />
          </div>

          <h1 className="text-2xl font-black tracking-tight text-white">Versao mobile em producao</h1>
          <p className="mt-3 text-sm leading-6 text-gray-300">
            Esta tela ainda esta em producao para dispositivos mobile. No momento, o acesso esta
            liberado somente em desktop.
          </p>

          <div className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-emerald-200">
            <Laptop2 size={16} />
            Acesse por um computador para continuar
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
