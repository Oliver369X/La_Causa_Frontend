import type { Page } from "@playwright/test";

import { pauseForVideoRecording } from "./videoHelpers";

/**
 * Completa el Checkout alojado de Stripe (modo test) con tarjeta 4242…
 * La UI de Stripe cambia; este helper prueba varios selectores / iframes.
 */
export async function completeStripeTestCheckout(page: Page, opts: { customerEmail?: string } = {}) {
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 60_000 });
  await page.waitForLoadState("load");
  try {
    await page.waitForLoadState("networkidle", { timeout: 15_000 });
  } catch {
    /* */
  }
  await pauseForVideoRecording(page, 2800);

  // A veces aparece Link u otros métodos; priorizar tarjeta si hay pestaña/botón explícito
  const cardTab = page.getByRole("button", { name: /^(Card|Tarjeta|Pay with card)$/i });
  if (await cardTab.isVisible({ timeout: 4000 }).catch(() => false)) {
    await cardTab.click();
    await pauseForVideoRecording(page, 800);
  }

  const email = opts.customerEmail?.trim();
  if (email) {
    const emailInput = page.getByLabel(/email/i).or(page.locator('input[type="email"], input[name="email"], input[autocomplete="email"]')).first();
    if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await emailInput.click();
      await emailInput.pressSequentially(email, { delay: 55 });
    }
  }

  const filled = await tryFillCardFields(page, "4242424242424242", "1234", "123");
  if (!filled) {
    throw new Error(
      "No se encontraron campos de tarjeta en Checkout de Stripe. Revisa la grabación de Playwright o actualiza stripeCheckoutHelpers.ts."
    );
  }

  await pauseForVideoRecording(page, 2000);

  const pay = page.getByRole("button", {
    name: /^(Pay|Subscribe|Pagar|Suscribirse|Start subscription|Comenzar|Pay and subscribe|Subscribe and pay)/i,
  });
  await pay.first().click({ timeout: 15_000 });

  // 3DS de prueba: a veces aparece “Complete authentication”
  const completeAuth = page.getByRole("button", { name: /complete authentication|completar/i });
  if (await completeAuth.isVisible({ timeout: 8000 }).catch(() => false)) {
    await completeAuth.click();
  }
}

const TYPE_DELAY = 55;

async function tryFillCardFields(page: Page, number: string, expiryMMYY: string, cvc: string): Promise<boolean> {
  // 1) Campos en el documento principal
  const mainNumber = page.locator('input[autocomplete="cc-number"], input[name="cardnumber"]').first();
  if (await mainNumber.isVisible({ timeout: 2500 }).catch(() => false)) {
    await mainNumber.click();
    await mainNumber.pressSequentially(number, { delay: TYPE_DELAY });
    const expEl = page.locator('input[autocomplete="cc-exp"], input[name="cc-exp"], input[name="exp-date"]').first();
    await expEl.click();
    await expEl.pressSequentially(expiryMMYY, { delay: TYPE_DELAY });
    const cvcEl = page.locator('input[autocomplete="cc-csc"], input[name="cvc"], input[name="cc-csc"]').first();
    await cvcEl.click();
    await cvcEl.pressSequentially(cvc, { delay: TYPE_DELAY });
    return true;
  }

  // 2) Placeholders típicos (Stripe Elements)
  const mainPh = page.getByPlaceholder(/1234|Card number|Número de tarjeta/i).first();
  if (await mainPh.isVisible({ timeout: 2500 }).catch(() => false)) {
    await mainPh.click();
    await mainPh.pressSequentially(number, { delay: TYPE_DELAY });
    const exp = page.getByPlaceholder(/MM/i).or(page.getByLabel(/expir/i)).first();
    if (await exp.isVisible({ timeout: 2000 }).catch(() => false)) {
      await exp.click();
      await exp.pressSequentially(expiryMMYY, { delay: TYPE_DELAY });
    }
    const cvcBox = page.getByPlaceholder(/CVC|cvc/i).or(page.getByLabel(/CVC/i)).first();
    if (await cvcBox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cvcBox.click();
      await cvcBox.pressSequentially(cvc, { delay: TYPE_DELAY });
    }
    return true;
  }

  // 3) Cualquier iframe (Stripe suele aislar el PAN)
  for (const frame of page.frames()) {
    if (frame === page.mainFrame()) continue;
    try {
      const n = frame.locator('input[autocomplete="cc-number"]').first();
      if (await n.isVisible({ timeout: 800 }).catch(() => false)) {
        await n.click();
        await n.pressSequentially(number, { delay: TYPE_DELAY });
        const e = frame.locator('input[autocomplete="cc-exp"]').first();
        if (await e.isVisible({ timeout: 800 }).catch(() => false)) {
          await e.click();
          await e.pressSequentially(expiryMMYY, { delay: TYPE_DELAY });
        }
        const c = frame.locator('input[autocomplete="cc-csc"]').first();
        if (await c.isVisible({ timeout: 800 }).catch(() => false)) {
          await c.click();
          await c.pressSequentially(cvc, { delay: TYPE_DELAY });
        }
        return true;
      }
      const ph = frame.getByPlaceholder(/1234|Card|tarjeta/i).first();
      if (await ph.isVisible({ timeout: 800 }).catch(() => false)) {
        await ph.click();
        await ph.pressSequentially(number, { delay: TYPE_DELAY });
        const exp2 = frame.getByPlaceholder(/MM/i).first();
        if (await exp2.isVisible({ timeout: 800 }).catch(() => false)) {
          await exp2.click();
          await exp2.pressSequentially(expiryMMYY, { delay: TYPE_DELAY });
        }
        const c2 = frame.getByPlaceholder(/CVC/i).first();
        if (await c2.isVisible({ timeout: 800 }).catch(() => false)) {
          await c2.click();
          await c2.pressSequentially(cvc, { delay: TYPE_DELAY });
        }
        return true;
      }
    } catch {
      /* siguiente frame */
    }
  }

  return false;
}
