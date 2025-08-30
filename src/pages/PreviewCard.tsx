import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface Order {
  id: string;
  readable_order_id?: string | null;
  template_id: string;
  selected_message?: string | null;
  custom_message?: string | null;
  card_quantity?: number | null;
  logo_url?: string | null;
  signature_url?: string | null;
}

interface TemplateRow {
  id: string;
  name: string;
  preview_url: string;
  description?: string | null;
}

const bucket = "holiday-cards";

const getPublicUrl = (path?: string | null) => {
  if (!path) return "";
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

export default function PreviewCard() {
  const { which, orderId } = useParams<{ which: "front" | "inside"; orderId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [template, setTemplate] = useState<TemplateRow | null>(null);
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [sigUrl, setSigUrl] = useState<string>("");
  const whichSafe = (which === "front" || which === "inside") ? which : "front";

  useEffect(() => {
    const t = whichSafe === "front" ? "Card Front Preview" : "Card Inside Preview";
    const idLabel = order?.readable_order_id || order?.id || orderId || "";
    document.title = `${t} – ${idLabel}`;

    // Minimal SEO meta tags
    const desc = `${t} for order ${idLabel}. Holiday card preview.`;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", desc);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", window.location.href);
  }, [whichSafe, orderId, order]);

  useEffect(() => {
    const load = async () => {
      if (!orderId) return;
      setLoading(true);
      try {
        const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i.test(orderId);

        let found: any = null;

        // Try to get order data using the public preview function
        if (isUuid) {
          try {
            // Use the SQL REST API directly since the function isn't in types yet
            const response = await fetch(
              `https://wsibvneidsmtsazfbmgc.supabase.co/rest/v1/rpc/get_order_for_preview`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzaWJ2bmVpZHNtdHNhemZibWdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNzM2NTQsImV4cCI6MjA2NjY0OTY1NH0.wqh-oGLHEeSTx-7pUuzk4yRDfV7VZxoaFx-1bwAdLZQ'
                },
                body: JSON.stringify({ order_id: orderId })
              }
            );
            if (response.ok) {
              const data = await response.json();
              if (data && data.length > 0) {
                found = data[0];
              }
            }
          } catch (err) {
            console.error('Preview function error:', err);
          }
        }

        // 2) Short-id prefix (first 8 hex chars of UUID) - need to find full UUID first
        if (!found && /^[0-9a-fA-F]{6,12}$/.test(orderId)) {
          try {
            const shortResp = await supabase.rpc("find_order_by_short_id", { short_id: orderId });
            if (shortResp.data && Array.isArray(shortResp.data) && shortResp.data.length > 0) {
              // Now get the preview data using the found UUID
              const fullId = shortResp.data[0].id;
              const response = await fetch(
                `https://wsibvneidsmtsazfbmgc.supabase.co/rest/v1/rpc/get_order_for_preview`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzaWJ2bmVpZHNtdHNhemZibWdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNzM2NTQsImV4cCI6MjA2NjY0OTY1NH0.wqh-oGLHEeSTx-7pUuzk4yRDfV7VZxoaFx-1bwAdLZQ'
                  },
                  body: JSON.stringify({ order_id: fullId })
                }
              );
              if (response.ok) {
                const data = await response.json();
                if (data && data.length > 0) {
                  found = data[0];
                }
              }
            }
          } catch (err) {
            console.error('Short ID lookup error:', err);
          }
        }

        if (!found) {
          setOrder(null);
          setTemplate(null);
          setLogoUrl("");
          setSigUrl("");
          setLoading(false);
          return;
        }

        setOrder({
          id: found.id,
          readable_order_id: found.readable_order_id ?? null,
          template_id: found.template_id,
          selected_message: found.selected_message ?? null,
          custom_message: found.custom_message ?? null,
          card_quantity: found.card_quantity ?? null,
          logo_url: found.logo_url ?? null,
          signature_url: found.signature_url ?? null,
        });

        // Fetch template
        const tplResp = await supabase
          .from("templates")
          .select("id,name,preview_url,description")
          .eq("id", found.template_id)
          .maybeSingle();
        setTemplate((tplResp.data as any) ?? null);

        // Resolve storage public URLs
        setLogoUrl(getPublicUrl(found.logo_url));
        setSigUrl(getPublicUrl(found.signature_url));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [orderId]);

  // Business rule for splitting message at halfway point by character length (same as order processing preview)
  const formatMessageWithLineBreak = (msg: string) => {
    if (!msg) return '' as any;

    const halfLength = Math.floor(msg.length / 2);
    const words = msg.split(' ');

    let characterCount = 0;
    let splitIndex = 0;

    for (let i = 0; i < words.length; i++) {
      const wordLength = words[i].length + (i > 0 ? 1 : 0); // +1 for space
      if (characterCount + wordLength >= halfLength) {
        const beforeSplit = characterCount;
        const afterSplit = characterCount + wordLength;
        splitIndex = Math.abs(halfLength - beforeSplit) <= Math.abs(halfLength - afterSplit) ? i : i + 1;
        break;
      }
      characterCount += wordLength;
    }

    if (splitIndex > 0 && splitIndex < words.length && msg.length > 30) {
      const firstLine = words.slice(0, splitIndex).join(' ');
      const secondLine = words.slice(splitIndex).join(' ');
      return (
        <>
          {firstLine}
          <br />
          {secondLine}
        </>
      );
    }

    return msg as any;
  };

  const message = useMemo(() => {
    return (
      order?.custom_message || order?.selected_message ||
      "Warmest wishes for a joyful and restful holiday season."
    );
  }, [order]);

  const formattedMessage = useMemo(() => formatMessageWithLineBreak(message), [message]);

  if (!orderId) {
    return (
      <main className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>Provide an order ID in the URL.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Example: #/preview/front/ORDER_ID</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Loading preview…</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 rounded-md bg-muted animate-pulse" />
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!order || !template) {
    return (
      <main className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Order not found</CardTitle>
            <CardDescription>No order matches “{orderId}”.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Double‑check the ID or go back to the Admin page.
            </p>
            <div className="mt-4 flex gap-3">
              <Link className="underline" to="/admin">Admin</Link>
              <button
                className="underline"
                onClick={() => navigate(-1)}
              >Go Back</button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  const isFront = whichSafe === "front";

  return (
    <div className="min-h-screen bg-white">
      <AspectRatio ratio={41/56}>
        {isFront ? (
          <div className="w-full h-full border-2 border-border rounded-md overflow-hidden bg-card">
            <img
              src={template.preview_url}
              alt={`${template.name} card front preview`}
              className="w-full h-full object-contain"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="w-full h-full bg-background border-2 border-border rounded-md overflow-hidden">
            <div className="w-full h-full grid grid-rows-3 p-8 relative">
              {/* Top third: message */}
              <div className="row-start-1 row-end-2 flex items-center justify-center">
                <div className="text-center max-w-[80%]">
                  <p className="text-lg leading-relaxed italic text-foreground/90">
                    {formattedMessage}
                  </p>
                </div>
              </div>

              {/* Middle third: spacer (empty) */}
              <div className="row-start-2 row-end-3" />

              {/* Logo + signature slightly above midline */}
              <div className="absolute left-1/2 -translate-x-1/2 top-[56%] flex items-center justify-center gap-10 w-full px-8">
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt="Company logo"
                    className="max-h-14 max-w-[180px] object-contain"
                    loading="lazy"
                  />
                )}
                {sigUrl && (
                  <img
                    src={sigUrl}
                    alt="Signature"
                    className="max-h-12 max-w-[160px] object-contain"
                    loading="lazy"
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </AspectRatio>
    </div>
  );
}
