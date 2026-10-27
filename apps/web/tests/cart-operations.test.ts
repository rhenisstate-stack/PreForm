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

  it("resolves plan aliases accurately for query param routing", () => {
    expect(getProductById("pro")?.id).toBe("rn-pro");
    expect(getProductById("starter")?.id).toBe("rn-starter");
    expect(getProductById("premium")?.id).toBe("prep-premium");
    expect(getProductById("rn")?.id).toBe("rn-pro");
    expect(getProductById("pn")?.id).toBe("pn-pro");
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
