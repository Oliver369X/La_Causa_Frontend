"use client";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { subscriptionsApi, type Plan, type Subscription } from "@/features/subscriptions/api/subscriptionsApi";
import { useAuthStore } from "@/shared/store/authStore";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Spinner } from "@/shared/ui/Spinner";
import { CreditCard, Check } from "lucide-react";

function formatPrice(n: number) {
  return new Intl.NumberFormat("es-BO", { style: "currency", currency: "BOB" }).format(n);
}

export default function SubscriptionsPage() {
  const { activeOrgId, user } = useAuthStore();
  const { can }        = usePermissions();
  const canManage      = can("managePlans");
  const isVolunteer    = user?.tipo === "voluntario";

  const [plans, setPlans]                   = useState<Plan[]>([]);
  const [subscription, setSubscription]     = useState<Subscription | null>(null);
  const [loading, setLoading]               = useState(true);
  const [subscribing, setSubscribing]       = useState<string | null>(null);
  const [hasError, setHasError]             = useState(false);

  useEffect(() => {
    Promise.all([
      subscriptionsApi.listPlans(),
      activeOrgId ? subscriptionsApi.getOrgSubscription(activeOrgId) : Promise.resolve(null),
    ])
      .then(([p, s]) => { setPlans(p); setSubscription(s); setHasError(false); })
      .catch(() => setHasError(true))
      .finally(() => setLoading(false));
  }, [activeOrgId]);

  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const stripeReturnSynced = useRef(false);

  // Vuelta desde Stripe: ?session_id=cs_... (si no hubo webhook, el backend sincroniza aquí)
  useEffect(() => {
    if (typeof window === "undefined" || !activeOrgId || stripeReturnSynced.current) return;
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (!sessionId) return;
    stripeReturnSynced.current = true;

    (async () => {
      try {
        const res = await subscriptionsApi.syncCheckoutSession({
          session_id: sessionId,
          organizacion_id: activeOrgId,
        });
        toast.success(res.mensaje);
        if (res.factura_url) {
          toast.message("Factura / comprobante", {
            description: "Abre el enlace oficial de Stripe para descargar o imprimir.",
            action: {
              label: "Abrir",
              onClick: () => window.open(res.factura_url!, "_blank", "noopener,noreferrer"),
            },
          });
        }
        const sub = await subscriptionsApi.getOrgSubscription(activeOrgId);
        setSubscription(sub);
      } catch (err: unknown) {
        const detail =
          err && typeof err === "object" && "response" in err
            ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
            : null;
        toast.error(typeof detail === "string" ? detail : "No se pudo confirmar el pago. ¿Webhook o sync falló?");
      } finally {
        window.history.replaceState({}, "", "/dashboard/subscriptions");
      }
    })();
  }, [activeOrgId]);

  const handleSubscribe = async (plan: Plan) => {
    if (!activeOrgId) return;
    setSubscribing(plan.id);
    setCheckoutError(null);
    try {
      // Planes gratuitos no pasan por Stripe: se activan directo en backend.
      if (Number(plan.precio_mensual) <= 0) {
        const sub = await subscriptionsApi.subscribe({
          organizacion_id: activeOrgId,
          plan_id: plan.id,
        });
        setSubscription(sub);
        return;
      }

      const origin = window.location.origin;
      const { checkout_url } = await subscriptionsApi.createCheckoutSession({
        organizacion_id: activeOrgId,
        plan_id: plan.id,
        frecuencia: "mensual",
        success_url: `${origin}/dashboard/subscriptions`,
        cancel_url: `${origin}/dashboard/subscriptions`,
      });
      if (checkout_url) {
        window.location.href = checkout_url;
      } else {
        setCheckoutError("No se obtuvo la URL de pago. Revisa la configuración de Stripe.");
      }
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "response" in err
        ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : null;
      setCheckoutError(msg || "Error al crear la sesión de pago. Verifica que Stripe esté configurado.");
    } finally {
      setSubscribing(null);
    }
  };

  return (
    <div className="p-5 md:p-8 space-y-6" style={{ color: "var(--text)" }}>
      {isVolunteer && (
        <Card>
          <div className="p-5 text-sm">
            Las suscripciones son gestionadas por la organización. Como voluntario no necesitas plan de pago.
          </div>
        </Card>
      )}
      {!isVolunteer && !activeOrgId && (
        <Card>
          <div className="p-5 text-sm">
            Primero debes seleccionar o crear una organización para administrar su suscripción.
          </div>
        </Card>
      )}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <CreditCard className="w-5 h-5" style={{ color: "var(--accent)" }} />
          Suscripción
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Administra el plan de tu organización.
        </p>
      </div>

      {/* Current subscription */}
      {subscription && (
        <div
          className="rounded-2xl p-4 flex items-center gap-4"
          style={{ background: "rgba(168,85,247,.08)", border: "1px solid rgba(168,85,247,.3)" }}
        >
          <CreditCard className="w-5 h-5 shrink-0" style={{ color: "#a855f7" }} />
          <div>
            <p className="text-sm font-semibold">Plan activo</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Estado: <Badge label={subscription.estado} variant={subscription.estado === "activa" ? "success" : "warning"} />
              &nbsp;·&nbsp;Desde {new Date(subscription.fecha_inicio).toLocaleDateString("es-ES")}
              {subscription.fecha_fin && ` · Hasta ${new Date(subscription.fecha_fin).toLocaleDateString("es-ES")}`}
            </p>
            {subscription.ultima_factura_url && (
              <a
                href={subscription.ultima_factura_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium mt-2 inline-block underline"
                style={{ color: "var(--accent)" }}
              >
                Ver factura / comprobante en Stripe →
              </a>
            )}
          </div>
        </div>
      )}

      {checkoutError && (
        <div
          className="p-4 rounded-xl flex items-center gap-2 text-sm"
          style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)", color: "#ef4444" }}
        >
          <CreditCard className="w-4 h-4 shrink-0" />
          {checkoutError}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : hasError ? (
        <Card>
          <div className="p-5 text-sm">No se pudieron cargar planes o suscripción. Revisa sesión y organización activa.</div>
        </Card>
      ) : plans.length === 0 ? (
        <Card>
          <div className="p-6 text-center space-y-3">
            <p className="text-sm font-medium">No hay planes disponibles</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Ejecuta el script de migración para insertar los planes (Plan Semilla, Plan Bosque/Pro) en la base de datos.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const isActive = subscription?.plan_id === plan.id;
            return (
              <Card key={plan.id} className={isActive ? "ring-2 ring-[var(--accent)]" : ""}>
                <div className="flex items-start justify-between mb-2">
                  <p className="font-semibold">{plan.nombre}</p>
                  {isActive && <Badge label="Activo" variant="success" />}
                </div>
                {plan.descripcion && (
                  <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>{plan.descripcion}</p>
                )}
                <p className="text-2xl font-bold mb-4">
                  {formatPrice(plan.precio_mensual)}
                  <span className="text-xs font-normal ml-1" style={{ color: "var(--text-muted)" }}>/mes</span>
                </p>
                <ul className="space-y-1.5 mb-5">
                  {[
                    `Hasta ${plan.max_voluntarios} voluntarios`,
                    `Hasta ${plan.max_eventos} eventos`,
                    ...plan.caracteristicas,
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs">
                      <Check className="w-3.5 h-3.5 shrink-0 text-green-500" />
                      {f}
                    </li>
                  ))}
                </ul>
                {canManage && !isActive && (
                  <Button
                    size="sm"
                    className="w-full"
                    loading={subscribing === plan.id}
                    data-testid={
                      Number(plan.precio_mensual) > 0
                        ? `stripe-subscribe-${plan.slug}`
                        : `free-subscribe-${plan.slug}`
                    }
                    onClick={() => handleSubscribe(plan)}
                  >
                    {Number(plan.precio_mensual) <= 0 ? "Activar plan gratuito" : "Elegir plan"}
                  </Button>
                )}
                {isActive && (
                  <Button variant="outline" size="sm" className="w-full" disabled>
                    Plan actual
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
