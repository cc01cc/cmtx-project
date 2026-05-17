import { describe, expect, it } from "vitest";
import { IdGenerator } from "../src/index.js";

const generator = new IdGenerator();

describe("IdGenerator", () => {
    it("should generate correct slug", () => {
        const id = generator.generate("slug", "My Doc Title!");
        expect(id).toBe("My-Doc-Title");
    });

    it("should generate UUID", () => {
        const id = generator.generate("uuid");
        expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it("should generate hashes (md5, sha1, sha256)", () => {
        const input = "Test content";
        const md5 = generator.generate("md5", input);
        const sha1 = generator.generate("sha1", input);
        const sha256 = generator.generate("sha256", input);
        expect(md5).toMatch(/^[a-f0-9]{8}$/);
        expect(sha1).toMatch(/^[a-f0-9]{8}$/);
        expect(sha256).toMatch(/^[a-f0-9]{8}$/);
    });

    it("should support specific hash variables in templates", () => {
        const id = generator.generate("{md5}_{sha1}_{sha256}", "My Article");
        const parts = id.split("_");
        expect(parts).toHaveLength(3);
        expect(parts[0]).toMatch(/^[a-f0-9]{8}$/);
        expect(parts[1]).toMatch(/^[a-f0-9]{8}$/);
        expect(parts[2]).toMatch(/^[a-f0-9]{8}$/);
    });

    it("should handle special characters", () => {
        const id = generator.generate("slug", "Short Title!");
        expect(id).toBe("Short-Title");
    });

    it("should support template generation", () => {
        const id = generator.generate("{date}_{slug}", "My Article");
        const expectedDate = new Date().toISOString().split("T")[0];
        expect(id).toContain(`${expectedDate}_My-Article`);
    });

    it("should generate batch IDs", () => {
        const inputs = ["Article 1", "Article 2", "Article 3"];
        const ids = generator.generateBatch(inputs, "slug");
        expect(ids).toHaveLength(3);
        expect(ids[0]).toBe("Article-1");
        expect(ids[1]).toBe("Article-2");
        expect(ids[2]).toBe("Article-3");
    });
});
