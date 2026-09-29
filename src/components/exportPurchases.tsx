"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { toast } from "./ui/toast";

export function ExportPurchases({
  endpoint = "/api/order/export",
}: {
  endpoint?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(endpoint, { cache: "no-store" });

      if (!response.ok) {
        let message = "Export failed";
        try {
          const body = await response.json();
          message = body.error ?? message;
        } catch {}
        toast.add({
            type: "error",
            title: "Error Generating Spending Report",
            description: "Could not export data",
          })
        throw new Error(message);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `1306 Orders (Generated ${stamp}).csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
      toast.add({
        type: "error",
        title: "Error Generating Spending Report",
      })
    } finally {
      setLoading(false);
      toast.add({
        type: "success",
        title: "Generated Spending Report",
      })
    }
  };

  return (
    <div>
      <Button className="cursor-pointer text-base w-fit p-3" onClick={handleExport}>Generate Spending Report</Button>
    </div>
  );
}