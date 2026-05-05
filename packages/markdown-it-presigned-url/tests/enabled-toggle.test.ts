import MarkdownIt from "markdown-it";
import { describe, expect, it, vi } from "vitest";
import { presignedUrlPlugin } from "../src/index.js";

describe("presignedUrlPlugin enabled toggle", () => {
    const signedUrl = "https://example.com/signed-image.png?token=abc";
    const getSignedUrl = vi.fn().mockReturnValue(signedUrl);

    it("should process images when enabled is true", () => {
        const md = new MarkdownIt({ html: true });
        const gsu = vi.fn().mockReturnValue(signedUrl);

        md.use(presignedUrlPlugin, {
            domains: ["example.com"],
            imageFormat: "html",
            enabled: true,
            getSignedUrl: gsu,
        });

        const result = md.render('<img src="https://example.com/image.png" />');
        expect(gsu).toHaveBeenCalledWith("https://example.com/image.png");
        expect(result).toContain(signedUrl);
    });

    it("should skip processing when enabled is false", () => {
        const md = new MarkdownIt({ html: true });
        const gsu = vi.fn();

        md.use(presignedUrlPlugin, {
            domains: ["example.com"],
            imageFormat: "html",
            enabled: false,
            getSignedUrl: gsu,
        });

        const result = md.render('<img src="https://example.com/image.png" />');
        expect(gsu).not.toHaveBeenCalled();
        expect(result).toContain("https://example.com/image.png");
        expect(result).not.toContain("signed");
    });

    it("should process images when enabled is undefined (default)", () => {
        const md = new MarkdownIt({ html: true });
        const gsu = vi.fn().mockReturnValue(signedUrl);

        md.use(presignedUrlPlugin, {
            domains: ["example.com"],
            imageFormat: "html",
            getSignedUrl: gsu,
        });

        const result = md.render('<img src="https://example.com/image.png" />');
        expect(gsu).toHaveBeenCalledWith("https://example.com/image.png");
        expect(result).toContain(signedUrl);
    });

    it("should support getter function for enabled", () => {
        const md = new MarkdownIt({ html: true });
        const gsu = vi.fn();

        md.use(presignedUrlPlugin, {
            domains: ["example.com"],
            imageFormat: "html",
            enabled: () => false,
            getSignedUrl: gsu,
        });

        const result = md.render('<img src="https://example.com/image.png" />');
        expect(gsu).not.toHaveBeenCalled();
        expect(result).toContain("https://example.com/image.png");
    });

    it("should toggle at runtime via getter", () => {
        const md = new MarkdownIt({ html: true });
        const gsu = vi.fn().mockReturnValue(signedUrl);
        let enabled = true;

        md.use(presignedUrlPlugin, {
            domains: ["example.com"],
            imageFormat: "html",
            enabled: () => enabled,
            getSignedUrl: gsu,
        });

        // Initially enabled
        md.render('<img src="https://example.com/image.png" />');
        expect(gsu).toHaveBeenCalledTimes(1);

        // Disable at runtime
        enabled = false;
        gsu.mockClear();
        md.render('<img src="https://example.com/image.png" />');
        expect(gsu).not.toHaveBeenCalled();

        // Re-enable
        enabled = true;
        gsu.mockClear();
        md.render('<img src="https://example.com/image.png" />');
        expect(gsu).toHaveBeenCalledTimes(1);
    });

    it("should render original HTML when disabled for block-level images", () => {
        const md = new MarkdownIt({ html: true });
        const gsu = vi.fn();

        md.use(presignedUrlPlugin, {
            domains: ["example.com"],
            imageFormat: "html",
            enabled: false,
            getSignedUrl: gsu,
        });

        const input = '<img src="https://example.com/image.png" alt="test">';
        const result = md.render(input);
        expect(gsu).not.toHaveBeenCalled();
        expect(result).toContain('src="https://example.com/image.png"');
    });

    it("should render original markdown image when disabled", () => {
        const md = new MarkdownIt();
        const gsu = vi.fn();

        md.use(presignedUrlPlugin, {
            domains: ["example.com"],
            imageFormat: "all",
            enabled: false,
            getSignedUrl: gsu,
        });

        const result = md.render("![alt](https://example.com/image.png)");
        expect(gsu).not.toHaveBeenCalled();
        expect(result).toContain('src="https://example.com/image.png"');
    });
});
