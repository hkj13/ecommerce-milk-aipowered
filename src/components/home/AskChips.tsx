"use client";

import { openChat } from "@/components/chat/ChatWidget";
import { SparkIcon } from "@/components/ui/icons";
import { INTENTS, SMART_EXAMPLES } from "@/lib/chat";

/** Every sample question the demo assistant understands, as one-tap buttons. */
export function AskChips() {
  const qs = [
    ...SMART_EXAMPLES.map((q) => ({ q, id: "order or product question" })),
    ...INTENTS.flatMap((i) => i.examples.map((e) => ({ q: e, id: i.id }))).filter((x) => x.q.length > 6),
  ];
  return (
    <ul className="flex flex-wrap gap-2">
      {qs.map((x) => (
        <li key={x.q}>
          <button
            type="button"
            onClick={() => openChat(x.q)}
            className="chip border border-white/15 bg-white/[0.05] py-2 text-left text-milk/85 transition-colors hover:border-butter hover:text-butter"
            title={`Intent: ${x.id}`}
          >
            <SparkIcon size={13} className="text-butter" /> {x.q}
          </button>
        </li>
      ))}
    </ul>
  );
}
