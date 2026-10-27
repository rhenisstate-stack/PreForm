import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PublicFooter from "@/components/layout/public-footer";

describe("PublicFooter Component & Navigation Integrity", () => {
  it("renders distinct destinations for Help/Support and Contact Us", () => {
    render(<PublicFooter />);

    // Contact Us link
    const contactLinks = screen.getAllByRole("link", { name: /contact us/i });
    expect(contactLinks.length).toBeGreaterThan(0);
    for (const link of contactLinks) {
      expect(link).toHaveAttribute("href", "/contact");
    }

    // Help & FAQs link
    const faqLink = screen.getByRole("link", { name: /help & faqs/i });
    expect(faqLink).toBeInTheDocument();
    expect(faqLink).toHaveAttribute("href", "/faq");

    // Defect verification: Help & FAQs destination MUST NOT equal Contact Us destination
    expect(faqLink.getAttribute("href")).not.toBe(contactLinks[0].getAttribute("href"));
  });

  it("links to the new Blog & Learning Hub", () => {
    render(<PublicFooter />);

    const blogLink = screen.getByRole("link", { name: /blog & learning hub/i });
    expect(blogLink).toBeInTheDocument();
    expect(blogLink).toHaveAttribute("href", "/blog");
  });

  it("links to legal pages with valid paths", () => {
    render(<PublicFooter />);

    const privacyLinks = screen.getAllByRole("link", { name: /privacy policy/i });
    expect(privacyLinks.length).toBeGreaterThan(0);
    for (const link of privacyLinks) {
      expect(link).toHaveAttribute("href", "/privacy-policy");
    }

    const termsLinks = screen.getAllByRole("link", { name: /terms (and conditions|of use)/i });
    expect(termsLinks.length).toBeGreaterThan(0);
    for (const link of termsLinks) {
      expect(link).toHaveAttribute("href", "/terms-and-conditions");
    }
  });

  it("contains verified external social profiles without dead hash anchors", () => {
    render(<PublicFooter />);

    const socialLinks = screen.getAllByRole("link", { name: /Follow PREform NCLEX on/i });
    expect(socialLinks.length).toBe(4);

    for (const link of socialLinks) {
      const href = link.getAttribute("href");
      expect(href).not.toBe("#");
      expect(href).toMatch(/^https:\/\//);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });

  it("displays the official NCSBN examination disclaimer", () => {
    render(<PublicFooter />);

    expect(
      screen.getByText(/PREform NCLEX is an independent test preparation and educational platform/i)
    ).toBeInTheDocument();
  });
});
