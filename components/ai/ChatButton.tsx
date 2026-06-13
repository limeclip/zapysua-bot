"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIChatPanel } from "@/components/ai/AIChatPanel";
import {
  Drawer,
  DrawerContent,
} from "@/components/ui/drawer";

type ChatButtonProps = {
  masterId: string;
  businessName: string;
};

function useIsMobile(breakpoint = 640): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [breakpoint]);

  return isMobile;
}

export function ChatButton({ masterId, businessName }: ChatButtonProps) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <>
      <Button
        type="button"
        size="icon"
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg"
        aria-label="Чат з AI-адміністратором"
        onClick={() => setOpen(true)}
      >
        <MessageCircle className="h-6 w-6" />
      </Button>

      <Drawer
        open={open}
        onOpenChange={setOpen}
        direction={isMobile ? "bottom" : "right"}
      >
        <DrawerContent
          className={
            isMobile
              ? "h-[100vh] max-h-[100dvh] rounded-none min-h-screen"
              : "h-full max-h-none data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:sm:max-w-md"
          }
        >
          <AIChatPanel
            masterId={masterId}
            businessName={businessName}
            onClose={() => setOpen(false)}
          />
        </DrawerContent>
      </Drawer>
    </>
  );
}
