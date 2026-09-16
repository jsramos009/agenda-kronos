"use client";

import QRCode from "qrcode";
import Image from "next/image";
import { useEffect, useState } from "react";

export function PixQrCode({ payload, size = 176 }: { payload: string; size?: number }) {
  const [source, setSource] = useState("");
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(payload, { width: size, margin: 1, errorCorrectionLevel: "M", color: { dark: "#24150b", light: "#ffffff" } }).then((value) => { if (active) setSource(value); });
    return () => { active = false; };
  }, [payload, size]);
  return source ? <Image className="pix-qr-code" src={source} width={size} height={size} unoptimized alt="QR Code Pix deste recibo" /> : <span className="pix-qr-code pix-qr-code--loading" aria-label="Gerando QR Code" />;
}
