import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { formatForPublish } from "../src/format-for-publish.js";

describe("formatForPublish", () => {
    let testDir: string;

    beforeEach(async () => {
        testDir = join(tmpdir(), "cmtx-format-test");
        await mkdir(testDir, { recursive: true });
    });

    afterEach(async () => {
        await rm(testDir, { recursive: true, force: true });
    });

    describe("autoMetadata", () => {
        it("should generate ID when generateId is true with plaintext", async () => {
            const content = "# Test Article\n\nContent here.";
            const filePath = join(testDir, "article.md");
            await writeFile(filePath, content);

            const result = await formatForPublish(filePath, {
                convertTitle: true,
                autoMetadata: {
                    generateId: true,
                    idOptions: {
                        encryptionKey: "test-secret-key-32-bytes!",
                        plaintext: "ABC123",
                    },
                },
            });

            expect(result.stats.idGenerated).toBe(true);
            expect(result.content).toMatch(/id: [A-Z0-9]{6}/);
        });

        it("should not generate ID when existing ID exists", async () => {
            const content = "---\nid: existing-id\n---\n\n# Test Article\n\nContent here.";
            const filePath = join(testDir, "article.md");
            await writeFile(filePath, content);

            const result = await formatForPublish(filePath, {
                autoMetadata: {
                    generateId: true,
                    idOptions: {
                        encryptionKey: "test-secret-key-32-bytes!",
                        plaintext: "ABC123",
                    },
                },
            });

            expect(result.stats.idGenerated).toBe(false);
            expect(result.content).toContain("id: existing-id");
        });

        it("should not generate ID when plaintext is not provided", async () => {
            const content = "# Test Article\n\nContent here.";
            const filePath = join(testDir, "article.md");
            await writeFile(filePath, content);

            const result = await formatForPublish(filePath, {
                convertTitle: true,
                autoMetadata: {
                    generateId: true,
                    idOptions: {
                        encryptionKey: "test-secret-key-32-bytes!",
                        plaintext: undefined as unknown as string,
                    },
                },
            });

            expect(result.stats.idGenerated).toBe(false);
        });

        it("should preserve plaintext length (FF1 format-preserving)", async () => {
            const content = "# Test Article\n\nContent here.";
            const filePath = join(testDir, "article.md");
            await writeFile(filePath, content);

            // Test different lengths
            const testCases = ["ABCD", "ABCDEF", "ABCDEFGH"];
            for (const plaintext of testCases) {
                const result = await formatForPublish(filePath, {
                    convertTitle: true,
                    autoMetadata: {
                        generateId: true,
                        idOptions: {
                            encryptionKey: "test-secret-key-32-bytes!",
                            plaintext,
                        },
                    },
                });

                const idMatch = result.content.match(/id: ([A-Z0-9]+)/);
                expect(idMatch).not.toBeNull();
                expect(idMatch![1].length).toBe(plaintext.length);
            }
        });

        it("should add date when autoDate is true and no existing date", async () => {
            const content = "# Test Article\n\nContent here.";
            const filePath = join(testDir, "article.md");
            await writeFile(filePath, content);

            const result = await formatForPublish(filePath, {
                convertTitle: true,
                autoMetadata: {
                    autoDate: true,
                },
            });

            expect(result.stats.dateAdded).toBe(true);
            const today = new Date().toISOString().split("T")[0];
            expect(result.content).toContain(`date: ${today}`);
        });

        it("should not add date when existing date exists", async () => {
            const content = "---\ndate: 2025-01-01\n---\n\n# Test Article\n\nContent here.";
            const filePath = join(testDir, "article.md");
            await writeFile(filePath, content);

            const result = await formatForPublish(filePath, {
                autoMetadata: {
                    autoDate: true,
                },
            });

            expect(result.stats.dateAdded).toBe(false);
            expect(result.content).toContain("date: 2025-01-01");
        });

        it("should add updated when autoUpdated is true", async () => {
            const content = "# Test Article\n\nContent here.";
            const filePath = join(testDir, "article.md");
            await writeFile(filePath, content);

            const result = await formatForPublish(filePath, {
                convertTitle: true,
                autoMetadata: {
                    autoUpdated: true,
                },
            });

            expect(result.stats.updatedAdded).toBe(true);
            const today = new Date().toISOString().split("T")[0];
            expect(result.content).toContain(`updated: ${today}`);
        });

        it("should update updated field even if already exists", async () => {
            const content = "---\nupdated: 2025-01-01\n---\n\n# Test Article\n\nContent here.";
            const filePath = join(testDir, "article.md");
            await writeFile(filePath, content);

            const result = await formatForPublish(filePath, {
                autoMetadata: {
                    autoUpdated: true,
                },
            });

            expect(result.stats.updatedAdded).toBe(true);
            const today = new Date().toISOString().split("T")[0];
            expect(result.content).toContain(`updated: ${today}`);
            expect(result.content).not.toContain("updated: 2025-01-01");
        });

        it("should combine all auto metadata options", async () => {
            const content = "# Test Article\n\nContent here.";
            const filePath = join(testDir, "article.md");
            await writeFile(filePath, content);

            const result = await formatForPublish(filePath, {
                convertTitle: true,
                autoMetadata: {
                    generateId: true,
                    idOptions: {
                        encryptionKey: "test-secret-key-32-bytes!",
                        plaintext: "ABC123",
                    },
                    autoDate: true,
                    autoUpdated: true,
                },
            });

            expect(result.stats.idGenerated).toBe(true);
            expect(result.stats.dateAdded).toBe(true);
            expect(result.stats.updatedAdded).toBe(true);
            expect(result.stats.frontmatterUpdated).toBe(true);

            expect(result.content).toMatch(/id: [A-Z0-9]{6}/);
            const today = new Date().toISOString().split("T")[0];
            expect(result.content).toContain(`date: ${today}`);
            expect(result.content).toContain(`updated: ${today}`);
            expect(result.content).toContain("title: Test Article");
        });

        it("should generate ID with checksum when withChecksum is true", async () => {
            const content = "# Test Article\n\nContent here.";
            const filePath = join(testDir, "article.md");
            await writeFile(filePath, content);

            const result = await formatForPublish(filePath, {
                convertTitle: true,
                autoMetadata: {
                    generateId: true,
                    idOptions: {
                        encryptionKey: "test-secret-key-32-bytes!",
                        plaintext: "ABC123",
                        withChecksum: true,
                    },
                },
            });

            expect(result.stats.idGenerated).toBe(true);
            // 6位输入 + 1位校验 = 7位
            expect(result.content).toMatch(/id: [A-Z0-9]{7}/);
        });

        it("should work with existing frontmatter", async () => {
            const content =
                "---\nauthor: Alice\ntags:\n  - test\n---\n\n# Test Article\n\nContent here.";
            const filePath = join(testDir, "article.md");
            await writeFile(filePath, content);

            const result = await formatForPublish(filePath, {
                convertTitle: true,
                autoMetadata: {
                    generateId: true,
                    idOptions: {
                        encryptionKey: "test-secret-key-32-bytes!",
                        plaintext: "ABCDEF",
                    },
                    autoDate: true,
                    autoUpdated: true,
                },
            });

            expect(result.content).toContain("author: Alice");
            expect(result.content).toContain("tags:");
            expect(result.content).toContain("- test");
            expect(result.content).toMatch(/id: [A-Z0-9]{6}/);
        });
    });

    describe("without autoMetadata", () => {
        it("should work with no autoMetadata options", async () => {
            const content = "# Test Article\n\nContent here.";
            const filePath = join(testDir, "article.md");
            await writeFile(filePath, content);

            const result = await formatForPublish(filePath, {
                convertTitle: true,
            });

            expect(result.stats.idGenerated).toBe(false);
            expect(result.stats.dateAdded).toBe(false);
            expect(result.stats.updatedAdded).toBe(false);
            expect(result.content).toContain("title: Test Article");
        });
    });
});
