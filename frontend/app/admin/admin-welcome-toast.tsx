"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { consumeAdminWelcomeToast } from "./admin-session";

export function AdminWelcomeToast() {
  useEffect(() => {
    const message = consumeAdminWelcomeToast();

    if (!message) {
      return;
    }

    toast.success("Selamat datang kembali", {
      description: message,
      duration: 3200,
    });
  }, []);

  return null;
}
