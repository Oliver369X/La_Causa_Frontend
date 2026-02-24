"use client";

import { useState } from "react";
import {
  MessageCircle,
  Facebook,
  Twitter,
  Linkedin,
  Send,
  Link2,
  Share2,
  Check,
} from "lucide-react";
import { Modal } from "@/shared/ui/Modal";
import { Button } from "@/shared/ui/Button";
import type { ShareCanal } from "../api/shareApi";

const CANALES: { id: ShareCanal; label: string; icon: React.ReactNode; urlPrefix?: string }[] = [
  { id: "whatsapp", label: "WhatsApp", icon: <MessageCircle className="w-5 h-5" />, urlPrefix: "https://wa.me/?text=" },
  { id: "facebook", label: "Facebook", icon: <Facebook className="w-5 h-5" />, urlPrefix: "https://www.facebook.com/sharer/sharer.php?u=" },
  { id: "x", label: "X (Twitter)", icon: <Twitter className="w-5 h-5" />, urlPrefix: "https://twitter.com/intent/tweet?url=" },
  { id: "linkedin", label: "LinkedIn", icon: <Linkedin className="w-5 h-5" />, urlPrefix: "https://www.linkedin.com/sharing/share-offsite/?url=" },
  { id: "telegram", label: "Telegram", icon: <Send className="w-5 h-5" />, urlPrefix: "https://t.me/share/url?url=" },
  { id: "copy_link", label: "Copiar enlace", icon: <Link2 className="w-5 h-5" /> },
  { id: "native", label: "Compartir (nativo)", icon: <Share2 className="w-5 h-5" /> },
];

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  onShare: (canal: ShareCanal) => Promise<{ url: string; mensaje_sugerido: string }>;
}

export function ShareModal({ open, onClose, title = "Compartir", onShare }: ShareModalProps) {
  const [loading, setLoading] = useState<ShareCanal | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCanal = async (canal: ShareCanal) => {
    setLoading(canal);
    try {
      const { url, mensaje_sugerido } = await onShare(canal);
      const texto = encodeURIComponent(`${mensaje_sugerido} ${url}`);

      if (canal === "copy_link") {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else if (canal === "native" && typeof navigator.share === "function") {
        await navigator.share({
          title: "Certificado de voluntariado",
          text: mensaje_sugerido,
          url,
        });
        onClose();
      } else {
        const item = CANALES.find((c) => c.id === canal);
        const texto = `${mensaje_sugerido} ${url}`;
        const shareUrl = item?.urlPrefix
          ? (canal === "whatsapp" || canal === "telegram"
              ? `${item.urlPrefix}${encodeURIComponent(texto)}`
              : `${item.urlPrefix}${encodeURIComponent(url)}`)
          : url;
        window.open(shareUrl, "_blank", "noopener,noreferrer,width=600,height=500");
        onClose();
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(null);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title} description="Elige dónde compartir" size="md">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {CANALES.map((c) => (
          <button
            key={c.id}
            onClick={() => handleCanal(c.id)}
            disabled={loading !== null}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border transition-colors hover:opacity-80 disabled:opacity-50"
            style={{
              background: "var(--bg-subtle)",
              borderColor: "var(--border)",
              color: "var(--text)",
            }}
          >
            {loading === c.id ? (
              <span className="text-xs">...</span>
            ) : copied && c.id === "copy_link" ? (
              <Check className="w-5 h-5 text-green-500" />
            ) : (
              c.icon
            )}
            <span className="text-xs font-medium">{c.label}</span>
          </button>
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </Modal>
  );
}
