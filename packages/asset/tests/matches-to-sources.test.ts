import { describe, expect, it } from "vitest";
import { matchesToSources } from "../src/upload/matches-to-sources.js";
import type { ImageMatch } from "@cmtx/core";

describe("matchesToSources", () => {
    const baseDir = "/project/docs";

    it("本地图片应转换为 file 类型 source", () => {
        const matches: ImageMatch[] = [
            {
                type: "local",
                src: "./images/foo.png",
                alt: "Foo",
                raw: "![Foo](./images/foo.png)",
            },
        ];

        const sources = matchesToSources(matches, baseDir);

        expect(sources).toHaveLength(1);
        expect(sources[0].kind).toBe("file");
        if (sources[0].kind === "file") {
            expect(sources[0].absPath).toBe("/project/docs/images/foo.png");
        }
    });

    it("远程 URL 应被过滤", () => {
        const matches: ImageMatch[] = [
            {
                type: "web",
                src: "https://example.com/image.png",
                alt: "Remote",
                raw: "![Remote](https://example.com/image.png)",
            },
        ];

        const sources = matchesToSources(matches, baseDir);

        expect(sources).toHaveLength(0);
    });

    it("base64 图片应转换为 buffer 类型 source", () => {
        const pngBase64 =
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
        const matches: ImageMatch[] = [
            {
                type: "local",
                src: `data:image/png;base64,${pngBase64}`,
                alt: "Base64",
                raw: `![Base64](data:image/png;base64,${pngBase64})`,
            },
        ];

        const sources = matchesToSources(matches, baseDir);

        expect(sources).toHaveLength(1);
        expect(sources[0].kind).toBe("buffer");
        if (sources[0].kind === "buffer") {
            expect(sources[0].buffer).toBeInstanceOf(Buffer);
            expect(sources[0].ext).toBe(".png");
        }
    });

    it("混合输入应正确处理", () => {
        const matches: ImageMatch[] = [
            { type: "local", src: "./local.png", alt: "L", raw: "![L](./local.png)" },
            {
                type: "web",
                src: "http://example.com/r.png",
                alt: "R",
                raw: "![R](http://example.com/r.png)",
            },
        ];

        const sources = matchesToSources(matches, baseDir);

        expect(sources).toHaveLength(1);
        expect(sources[0].kind).toBe("file");
    });
});
