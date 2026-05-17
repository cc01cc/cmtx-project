/**
 * Normalize 包测试
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MarkdownFileQuery } from "../src/metadata/markdown-file-query.js";
import { MarkdownMetadataExtractor } from "../src/metadata/markdown-metadata-extractor.js";

describe("MarkdownMetadataExtractor (DocumentManager)", () => {
    const manager = new MarkdownMetadataExtractor();

    it("should extract metadata from a file", async () => {
        // Create a temporary file for testing
        const testDir = join(tmpdir(), "cmtx-test");
        await mkdir(testDir, { recursive: true });
        const testFilePath = join(testDir, "test.md");

        const content =
            "---\ntitle: Test Document\nauthor: Test Author\n---\n\n# Test Title\n\nContent here.";
        await writeFile(testFilePath, content);

        const metadata = await manager.extractFromFile(testFilePath);

        expect(metadata.title).toBe("Test Document");
        expect(metadata.author).toBe("Test Author");
        expect(metadata.abspath).toBe(testFilePath);
        expect(metadata.filename).toBe("test.md");

        // Clean up
        await rm(testDir, { recursive: true, force: true });
    });

    it("should extract metadata from a directory", async () => {
        // Create a temporary directory with test files
        const testDir = join(tmpdir(), "cmtx-test-dir");
        await mkdir(testDir, { recursive: true });

        const testFilePath1 = join(testDir, "test1.md");
        const testFilePath2 = join(testDir, "test2.md");

        const content1 =
            "---\ntitle: Test Document 1\nauthor: Test Author 1\n---\n\n# Test Title 1\n\nContent here.";
        const content2 =
            "---\ntitle: Test Document 2\nauthor: Test Author 2\n---\n\n# Test Title 2\n\nMore content here.";

        await writeFile(testFilePath1, content1);
        await writeFile(testFilePath2, content2);

        const metadata = await manager.extractFromDirectory(testDir);

        expect(metadata).toHaveLength(2);
        expect(metadata.some((doc) => doc.title === "Test Document 1")).toBe(true);
        expect(metadata.some((doc) => doc.title === "Test Document 2")).toBe(true);

        // Clean up
        await rm(testDir, { recursive: true, force: true });
    });
});

describe("DocumentQuery", () => {
    let testDir: string;

    beforeEach(async () => {
        testDir = join(tmpdir(), "cmtx-query-test");
        await mkdir(testDir, { recursive: true });

        // Create test files
        const content1 =
            "---\ntitle: Document 1\nauthor: Alice\ntags:\n  - tag1\n  - tag2\n---\n\n# Title 1\n\nContent 1";
        const content2 =
            "---\ntitle: Document 2\nauthor: Bob\ntags:\n  - tag2\n  - tag3\n---\n\n# Title 2\n\nContent 2";
        const content3 =
            "---\ntitle: Document 3\nauthor: Alice\ncategories:\n  - category1\n---\n\n# Title 3\n\nContent 3";

        await Promise.all([
            writeFile(join(testDir, "doc1.md"), content1),
            writeFile(join(testDir, "doc2.md"), content2),
            writeFile(join(testDir, "doc3.md"), content3),
        ]);
    });

    it("should correctly construct a query instance", () => {
        const query = new MarkdownFileQuery(testDir);
        expect(query).toBeDefined();
    });

    it("should list all documents", async () => {
        const query = new MarkdownFileQuery(testDir);
        const documents = await query.list();

        expect(documents).toHaveLength(3);
        expect(documents.some((doc) => doc.title === "Document 1")).toBe(true);
        expect(documents.some((doc) => doc.title === "Document 2")).toBe(true);
        expect(documents.some((doc) => doc.title === "Document 3")).toBe(true);
    });

    it("should find documents by filter", async () => {
        const query = new MarkdownFileQuery(testDir);
        const documents = await query.findBy({ author: "Alice" });

        expect(documents).toHaveLength(2);
        expect(documents.every((doc) => doc.author === "Alice")).toBe(true);
    });

    it("should find document by title", async () => {
        const query = new MarkdownFileQuery(testDir);
        const document = await query.findByTitle("Document 1");

        expect(document?.title).toBe("Document 1");
        expect(document?.author).toBe("Alice");
    });

    it("should find document by ID (if present)", async () => {
        // Create a document with an ID in frontmatter
        const contentWithId =
            "---\ntitle: Document With ID\nid: custom-id-123\n---\n\n# Title\n\nContent";
        await writeFile(join(testDir, "doc-with-id.md"), contentWithId);

        const query = new MarkdownFileQuery(testDir);
        const document = await query.findById("custom-id-123");

        expect(document?.title).toBe("Document With ID");
        expect(document?.id).toBe("custom-id-123");
    });

    it("should get all tags", async () => {
        const query = new MarkdownFileQuery(testDir);
        const tags = await query.getTags();

        expect(tags).toContain("tag1");
        expect(tags).toContain("tag2");
        expect(tags).toContain("tag3");
        expect(tags).toHaveLength(3); // unique tags
    });

    it("should get all categories", async () => {
        const query = new MarkdownFileQuery(testDir);
        const categories = await query.getCategories();

        expect(categories).toContain("category1");
        expect(categories).toHaveLength(1);
    });

    afterEach(async () => {
        // Clean up
        await rm(testDir, { recursive: true, force: true });
    });
});
