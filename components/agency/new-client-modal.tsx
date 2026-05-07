"use client";

import * as React from "react";
import { RiAddLine } from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { ClientModal } from "@/components/agency/client-modal";
import { useLocale } from "@/lib/i18n/provider";

// Re-export shared form primitives from client-modal so that sibling modals
// (new-skill-modal, new-project-modal, new-invoice-modal) can keep importing
// from this path without changes.
export { Field, Input, Textarea } from "@/components/agency/client-modal";

export function NewClientButton() {
  const { t } = useLocale();
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button
        variant="outline"
        leadingIcon={<RiAddLine size={16} />}
        onClick={() => setOpen(true)}
      >
        {t("clients.new")}
      </Button>
      <ClientModal mode="create" open={open} onOpenChange={setOpen} />
    </>
  );
}
