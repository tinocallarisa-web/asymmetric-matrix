import powerbi from "powerbi-visuals-api";

/**
 * Licence resolution for Bubble & Scatter Chart (offer asymmetric-matrix-tcviz).
 *
 * The previous implementation called `getAvailabilityStatusForServicePlan()`,
 * which is not part of the API. `IVisualLicenseManager` has exactly four
 * methods: getAvailableServicePlans, notifyLicenseRequired, notifyFeatureBlocked
 * and clearLicenseNotification.
 *
 * The call therefore threw, the catch swallowed it, and the fallback read
 * `window.location.hostname === "localhost"` to decide the tier — true while
 * developing, false everywhere else. **Every published user resolved to Free,
 * permanently, whatever they had paid.** It worked perfectly in local
 * development, which is exactly why it survived.
 *
 * Two lessons are baked into what follows: a catch that invents a tier hides the
 * failure that matters, and the environment must never decide entitlement.
 */

export type Tier = "free" | "pro";

export interface LicenseState {
    tier: Tier;
    isLicensed: boolean;
    /** True when the environment cannot resolve licences at all. */
    serviceUnavailable: boolean;
    /** True once the answer is known. Nothing is notified before this. */
    resolved: boolean;
}

/**
 * The service plan identifier of the Pro plan, exactly as defined in Partner
 * Center → the offer → Plan overview → Plan ID.
 *
 * It is NOT the plan's display name. Comparing it is what makes the check
 * specific to this visual: `getAvailableServicePlans()` returns every plan the
 * user holds, so accepting any active plan would unlock this visual for someone
 * who bought a different one.
 */
const PLAN_PRO = "pro";

// El plan gratuito. No se compara -solo nos importa el de pago- pero se deja
// escrito porque explica por que hay que comparar el identificador en lugar de
// mirar si el usuario tiene algun plan activo: quien instala la version gratuita
// TAMBIEN tiene un plan, y esta activo.
const PLAN_FREE = "free";

/** ServicePlanState is a const enum: the numbers are needed at runtime. */
const STATE_ACTIVE = 1;
const STATE_WARNING = 2;

/**
 * spIdentifier es el Service ID completo que genera Partner Center para cada plan
 * ("editor.oferta.plan", p.ej. "tino_callarisa.asymmetric-matrix-tcviz.pro"), no el Plan ID
 * corto: lo dice la documentacion de la licensing API. Comparar solo con "pro" dejaba
 * en Free a quien pagaba. Se acepta el Service ID que termina en ".<plan>" y, por si
 * algun entorno devuelve solo el Plan ID, tambien ese.
 */
function matchesPlan(spIdentifier: unknown, planId: string): boolean {
    const sp = String(spIdentifier ?? "");
    return sp === planId || sp.endsWith("." + planId);
}

/**
 * Estado antes de que la licencia resuelva, y tambien el resultado cuando no hay
 * licencia. Se exporta para que el visual lo use como valor inicial: tener el
 * valor inicial escrito a mano en dos sitios acaba divergiendo (Waterfall 1.1).
 */
export const FREE_STATE: LicenseState = {
    tier: "free",
    isLicensed: false,
    serviceUnavailable: false,
    resolved: true
};

export async function getLicenseState(
    host: powerbi.extensibility.visual.IVisualHost
): Promise<LicenseState> {
    // TEST_FORCE_TIER_MARKER
    const lm = (host as any).licenseManager;
    if (!lm) return { ...FREE_STATE };

    try {
        const result: any = await lm.getAvailableServicePlans();

        // Warning is a payment grace period. Per the licensing API, "only the
        // active and warning states represent a usable license", so a paying
        // customer keeps their features while a billing problem is resolved.
        const licensed = result?.plans?.some(
            (p: any) => matchesPlan(p.spIdentifier, PLAN_PRO) &&
                        (p.state === STATE_ACTIVE || p.state === STATE_WARNING)
        ) ?? false;

        // Publish to Web, embedded, national clouds, PDF/PPT export, offline or
        // signed out: the licence cannot be resolved and a Pro customer reads as
        // Free. The free experience is rendered there, but nobody is asked to buy
        // what they may already own.
        const unsupportedEnv = !!result?.isLicenseUnsupportedEnv;
        const infoUnavailable = result?.isLicenseInfoAvailable === false;

        return {
            tier: licensed ? "pro" : "free",
            isLicensed: licensed,
            serviceUnavailable: unsupportedEnv || infoUnavailable,
            resolved: true
        };
    } catch (e) {
        // Free, and say so in the console. The old code returned Pro here when the
        // hostname looked local, which is how a broken API call turned into a
        // product that could not be bought.
        console.error("[BubbleScatter] licence resolution failed:", e);
        return { ...FREE_STATE, serviceUnavailable: true };
    }
}

/**
 * Power BI's own notifications, which carry the purchase path.
 *
 * The visual draws no licensing UI of its own: Microsoft's guidance is explicit
 * that a visual "shouldn't display its own licensing UX, instead use one of Power
 * BI supported predefined notifications".
 */
export class LicenseNotifier {
    private lastBlocked = "";
    private noticeShown = false;
    private upgradeTimer: number | null = null;

    /**
     * Lo que dura el banner de Power BI antes de desvanecerse. La barra de Upgrade se
     * levanta despues, para que no lo pise: si se levantan a la vez, el usuario ve una
     * sola de las dos y la que gana es la ultima que se llamo.
     */
    private static readonly BANNER_MS = 10500;

    constructor(private host: powerbi.extensibility.visual.IVisualHost) {}

    /** The user reached for something the free tier does not do. */
    /**
     * @param feature  texto que ve el usuario
     * @param key      huella para no repetir. Incluye los VALORES de los ajustes,
     *                 no solo cuales son: Power BI llama a update() muchas veces
     *                 por razones ajenas al usuario, asi que hace falta una
     *                 huella; pero si solo mira que ajustes hay tocados, cambiar
     *                 uno de ellos a otro valor no vuelve a avisar.
     */
    public blocked(state: LicenseState, feature: string, key = feature): void {
        if (!this.actionable(state)) return;
        if (key === this.lastBlocked) return;
        this.lastBlocked = key;

        const lm = (this.host as any).licenseManager;
        if (!lm) return;

        // Limpiar primero: si hay una barra de Upgrade levantada, el banner la sustituiria
        // y al expirar no quedaria nada. Limpiando, el banner sale sobre lienzo vacio y la
        // barra vuelve despues por su cuenta.
        try { lm.clearLicenseNotification?.(); } catch { /* older host */ }
        this.noticeShown = false;

        try { lm.notifyFeatureBlocked(feature); } catch { /* older host */ }
        this.scheduleUpgrade(lm);
    }

    /** Levanta la barra de Upgrade cuando el banner ya se ha ido. */
    private scheduleUpgrade(lm: any): void {
        this.cancelUpgrade();
        this.upgradeTimer = window.setTimeout(() => {
            this.upgradeTimer = null;
            try {
                lm.notifyLicenseRequired(0);
                this.noticeShown = true;
            } catch { /* older host */ }
        }, LicenseNotifier.BANNER_MS);
    }

    private cancelUpgrade(): void {
        if (this.upgradeTimer !== null) {
            window.clearTimeout(this.upgradeTimer);
            this.upgradeTimer = null;
        }
    }

    /** El visual se destruye: un temporizador vivo notificaria sobre un visual que ya no esta. */
    public dispose(): void {
        this.cancelUpgrade();
    }

    /** A persistent notice while the report needs a licence it does not have. */
    public required(state: LicenseState, needed: boolean): void {
        const lm = (this.host as any).licenseManager;
        if (!lm) return;

        if (!needed || !this.actionable(state)) {
            this.cancelUpgrade();
            if (this.noticeShown) {
                try { lm.clearLicenseNotification(); } catch { /* older host */ }
                this.noticeShown = false;
                this.lastBlocked = "";
            }
            return;
        }
        // Con un banner en curso la barra ya viene programada; levantarla ahora lo pisaria.
        // Por eso este metodo puede llamarse ANTES que blocked() sin romper la secuencia,
        // que es justo lo que hace el render.
        if (!this.noticeShown && this.upgradeTimer === null) {
            try {
                // LicenseNotificationType.General = 0. It is a const enum, so the
                // literal is required at runtime.
                lm.notifyLicenseRequired(0);
                this.noticeShown = true;
            } catch { /* older host */ }
        }
    }

    /**
     * Whether it makes sense to ask this user to buy anything.
     *
     * Not before the licence resolves — the tier is Free at start for a licensed
     * customer too — not when they already hold one, and not where the licence
     * cannot be resolved at all.
     */
    private actionable(state: LicenseState): boolean {
        return state.resolved && !state.isLicensed && !state.serviceUnavailable;
    }
}
