"use client";

import { ExternalLink, Globe } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";

export function ProductLink({ href, name, className }: { href: string; name: string; className?: string }) {
    let destination: URL;
    try {
        destination = new URL(href);
        if (!["http:", "https:"].includes(destination.protocol)) return null;
    } catch {
        return null;
    }

    return (
        <HoverCard>
            <HoverCardTrigger
                href={destination.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`View product: ${name} (opens in a new tab)`}
                onClick={event => event.stopPropagation()}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "cursor-pointer", className)}
            >
                View product <ExternalLink data-icon="inline-end" />
            </HoverCardTrigger>
            <HoverCardContent align="end" className="w-72 max-w-[calc(100vw-2rem)] space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground"><Globe className="size-4 shrink-0" /><span className="break-all">{destination.hostname}</span></div>
                <p className="font-medium break-words">{name}</p>
                <p className="break-all text-xs text-muted-foreground">{destination.href}</p>
                <p className="text-xs text-muted-foreground">Opens the supplier’s product page in a new tab.</p>
            </HoverCardContent>
        </HoverCard>
    );
}
