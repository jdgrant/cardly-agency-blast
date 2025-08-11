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
        // Load order by id or readable_order_id
        let found: any = null;
        const byIdResp = await supabase
          .from("orders")
          .select("*")
          .eq("id", orderId)
          .maybeSingle();
        if (byIdResp.data) {
          found = byIdResp.data;
        } else {
          const byReadable = await supabase
            .from("orders")
            .select("*")
            .or(`readable_order_id.eq.${orderId},readable_order_id.ilike.%${orderId}%`)
            .limit(1);
          found = byReadable.data?.[0] || null;
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

  const message = useMemo(() => {
    return (
      order?.custom_message || order?.selected_message ||
      "Warmest wishes for a joyful and restful holiday season."
    );
  }, [order]);

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
    <div>
      <header className="px-6 pt-6">
        <h1 className="text-2xl font-semibold text-foreground">
          {isFront ? "Card Front Preview" : "Card Inside Preview"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Order {order.readable_order_id || order.id} • Template {template.name}
        </p>
      </header>

      <main className="p-6">
        <div className="mb-4 flex gap-3">
          <Link className="underline" to={`/preview/front/${orderId}`}>View Front</Link>
          <Link className="underline" to={`/preview/inside/${orderId}`}>View Inside</Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">7" × 5.125" Preview</CardTitle>
            <CardDescription>Screen preview approximates print area.</CardDescription>
          </CardHeader>
          <CardContent>
            <AspectRatio ratio={56/41}>
              {isFront ? (
                <div className="w-full h-full rounded-md overflow-hidden border bg-card">
                  {template.preview_url ? (
                    <img
                      src={template.preview_url}
                      alt={`${template.name} card front preview`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-muted-foreground">
                      No front preview available
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-full rounded-md overflow-hidden border bg-background">
                  <div className="w-full h-full flex flex-col justify-between p-6">
                    <div className="text-center">
                      <p className="text-lg leading-relaxed italic text-foreground/90">
                        {message}
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-10">
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt="Company logo"
                          className="max-h-14 max-w-[180px] object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">Company Logo</span>
                      )}
                      {sigUrl ? (
                        <img
                          src={sigUrl}
                          alt="Signature"
                          className="max-h-12 max-w-[160px] object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">Signature</span>
                      )}
                    </div>
                    <p className="text-center text-xs text-muted-foreground">
                      Order {order.readable_order_id || order.id} • Quantity {order.card_quantity || 0}
                    </p>
                  </div>
                </div>
              )}
            </AspectRatio>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
