import { describe, it, expect } from "vitest";
import { getProductById, getAllProducts } from "@/lib/products";

describe("Canonical Product Catalog & Cart Operations", () => {
  it("provides canonical products with server-validated prices and pathways", () => {
    const products = getAllProducts();
    expect(products.length).toBeGreaterThanOrEqual(6);

    const rnPro = getProductById("rn-pro");
    expect(rnPro).toBeDefined();
    expect(rnPro?.name).toContain("NCLEX-RN");
    expect(rnPro?.price).toBe(59);
    expect(rnPro?.pathway).toBe("RN");

    const pnPro = getProductById("pn-pro");
    expect(pnPro).toBeDefined();
    expect(pnPro?.price).toBe(59);
    expect(pnPro?.pathway).toBe("PN");

    const premium = getProductById("prep-premium");
    expect(premium).toBeDefined();
    expect(premium?.price).toBe(89);
    expect(premium?.pathway).toBe("Both");
  });

  it("provides all 7 NCLEX-PN and All-Access products with exact prices, durations, and savings math", () => {
    const pnStarter = getProductById("pn-starter");
    expect(pnStarter).toMatchObject({
      id: "pn-starter",
      pathway: "PN",
      planType: "starter",
      price: 29,
      billingInterval: "month",
      durationLabel: "30-Day Monthly Access",
    });

    const pnStarter90 = getProductById("pn-starter-90");
    expect(pnStarter90).toMatchObject({
      id: "pn-starter-90",
      pathway: "PN",
      planType: "starter",
      price: 75,
      originalPrice: 87,
      billingInterval: "quarter",
      durationLabel: "90-Day Quarterly Access",
    });
    expect(pnStarter!.price * 3).toBe(pnStarter90!.originalPrice);
    expect(pnStarter90!.originalPrice! - pnStarter90!.price).toBe(12);

    const pnPro = getProductById("pn-pro");
    expect(pnPro).toMatchObject({
      id: "pn-pro",
      pathway: "PN",
      planType: "pro",
      price: 59,
      billingInterval: "month",
      durationLabel: "30-Day Monthly Access",
    });

    const pnPro90 = getProductById("pn-pro-90");
    expect(pnPro90).toMatchObject({
      id: "pn-pro-90",
      pathway: "PN",
      planType: "pro",
      price: 149,
      originalPrice: 177,
      billingInterval: "quarter",
      durationLabel: "90-Day Quarterly Access",
    });
    expect(pnPro!.price * 3).toBe(pnPro90!.originalPrice);
    expect(pnPro90!.originalPrice! - pnPro90!.price).toBe(28);

    const prepPremium = getProductById("prep-premium");
    expect(prepPremium).toMatchObject({
      id: "prep-premium",
      pathway: "Both",
      planType: "premium",
      price: 89,
      billingInterval: "month",
      durationLabel: "30-Day Monthly Access",
    });

    const prepPremium90 = getProductById("prep-premium-90");
    expect(prepPremium90).toMatchObject({
      id: "prep-premium-90",
      pathway: "Both",
      planType: "premium",
      price: 229,
      originalPrice: 267,
      billingInterval: "quarter",
      durationLabel: "90-Day Quarterly Access",
    });
    expect(prepPremium!.price * 3).toBe(prepPremium90!.originalPrice);
    expect(prepPremium90!.originalPrice! - prepPremium90!.price).toBe(38);

    const pnReadiness = getProductById("pn-readiness");
    expect(pnReadiness).toMatchObject({
      id: "pn-readiness",
      pathway: "PN",
      planType: "readiness",
      price: 39,
      billingInterval: "one-time",
      durationLabel: "One-Time Assessment Pack",
    });

    const rnStarter = getProductById("rn-starter");
    expect(rnStarter).toMatchObject({
      id: "rn-starter",
      pathway: "RN",
      planType: "starter",
      price: 29,
      billingInterval: "month",
      durationLabel: "30-Day Monthly Access",
    });

    const rnStarter90 = getProductById("rn-starter-90");
    expect(rnStarter90).toMatchObject({
      id: "rn-starter-90",
      pathway: "RN",
      planType: "starter",
      price: 75,
      originalPrice: 87,
      billingInterval: "quarter",
      durationLabel: "90-Day Quarterly Access",
    });
    expect(rnStarter!.price * 3).toBe(rnStarter90!.originalPrice);
    expect(rnStarter90!.originalPrice! - rnStarter90!.price).toBe(12);

    const rnPro90 = getProductById("rn-pro-90");
    expect(rnPro90).toMatchObject({
      id: "rn-pro-90",
      pathway: "RN",
      planType: "pro",
      price: 149,
      originalPrice: 177,
      billingInterval: "quarter",
      durationLabel: "90-Day Quarterly Access",
    });
    expect(59 * 3).toBe(rnPro90!.originalPrice);
    expect(rnPro90!.originalPrice! - rnPro90!.price).toBe(28);

    const rnReadiness = getProductById("rn-readiness");
    expect(rnReadiness).toMatchObject({
      id: "rn-readiness",
      pathway: "RN",
      planType: "readiness",
      price: 39,
      billingInterval: "one-time",
      durationLabel: "One-Time Assessment Pack",
    });
  });

  it("resolves plan aliases accurately for query param routing and rejects unknown product IDs", () => {
    expect(getProductById("pro")?.id).toBe("rn-pro");
    expect(getProductById("starter")?.id).toBe("rn-starter");
    expect(getProductById("premium")?.id).toBe("prep-premium");
    expect(getProductById("rn")?.id).toBe("rn-pro");
    expect(getProductById("pn")?.id).toBe("pn-pro");
    expect(getProductById("pn-pro-90")?.id).toBe("pn-pro-90");
    expect(getProductById("prep-premium-90")?.id).toBe("prep-premium-90");
    expect(getProductById("non-existent-plan")).toBeUndefined();
    expect(getProductById("")).toBeUndefined();
  });

  it("calculates subtotal and tax-exempt total correctly", () => {
    const item1 = getProductById("rn-pro")!;
    const item2 = getProductById("rn-readiness")!;

    const subtotal = item1.price + item2.price;
    const tax = 0; // Educational prep software is tax exempt
    const total = subtotal + tax;

    expect(subtotal).toBe(98);
    expect(tax).toBe(0);
    expect(total).toBe(98);
  });
});
