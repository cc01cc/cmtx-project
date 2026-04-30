import { describe, expect, it } from "vitest";
import {
    calculateTargetWidth,
    detectCurrentWidth,
    type ImageElement,
    parseImageElements,
} from "../../src/utils/image-processor";

describe("parseImageElements", () => {
    describe("markdown image parsing", () => {
        it("should parse simple markdown image", () => {
            const text = "![alt text](./image.png)";
            const result = parseImageElements(text);

            expect(result.length).toBe(1);
            expect(result[0].type).toBe("markdown");
            expect(result[0].src).toBe("./image.png");
            expect(result[0].alt).toBe("alt text");
            expect(result[0].originalText).toBe("![alt text](./image.png)");
        });

        it("should parse markdown image with empty alt", () => {
            const text = "![](./image.png)";
            const result = parseImageElements(text);

            expect(result.length).toBe(1);
            expect(result[0].alt).toBe("");
        });

        it("should parse multiple markdown images", () => {
            const text = "![](./a.png) and ![test](./b.png) and ![img](./c.png)";
            const result = parseImageElements(text);

            expect(result.length).toBe(3);
            expect(result[0].src).toBe("./a.png");
            expect(result[1].src).toBe("./b.png");
            expect(result[2].src).toBe("./c.png");
        });

        it("should parse markdown image with remote URL", () => {
            const text = "![remote](https://example.com/image.png)";
            const result = parseImageElements(text);

            expect(result.length).toBe(1);
            expect(result[0].src).toBe("https://example.com/image.png");
        });
    });

    describe("HTML image parsing", () => {
        it("should parse simple HTML img tag", () => {
            const text = '<img src="./image.png" alt="test">';
            const result = parseImageElements(text);

            expect(result.length).toBe(1);
            expect(result[0].type).toBe("html");
            expect(result[0].src).toBe("./image.png");
            expect(result[0].alt).toBe("test");
        });

        it("should parse HTML img tag with width attribute", () => {
            const text = '<img src="./image.png" width="400">';
            const result = parseImageElements(text);

            expect(result.length).toBe(1);
            expect(result[0].currentWidth).toBe(400);
        });

        it("should parse HTML img tag with all attributes", () => {
            const text = '<img src="./test.png" alt="description" width="600" height="400">';
            const result = parseImageElements(text);

            expect(result.length).toBe(1);
            expect(result[0].src).toBe("./test.png");
            expect(result[0].alt).toBe("description");
            expect(result[0].currentWidth).toBe(600);
        });

        it("should parse HTML img tag with single quotes", () => {
            const text = "<img src='./image.png' alt='test' width='300'>";
            const result = parseImageElements(text);

            expect(result.length).toBe(1);
            expect(result[0].src).toBe("./image.png");
            expect(result[0].alt).toBe("test");
            expect(result[0].currentWidth).toBe(300);
        });
    });

    describe("mixed format parsing", () => {
        it("should parse both markdown and HTML images", () => {
            const text = '![md](./a.png) and <img src="./b.png" width="500">';
            const result = parseImageElements(text);

            expect(result.length).toBe(2);
            expect(result[0].type).toBe("markdown");
            expect(result[1].type).toBe("html");
            expect(result[1].currentWidth).toBe(500);
        });

        it("should parse multiple images in complex text", () => {
            const text =
                '# Header\n\n![img1](./a.png)\n\nParagraph with <img src="./b.png"> and ![img2](./c.png)';
            const result = parseImageElements(text);

            expect(result.length).toBe(3);
        });
    });

    describe("edge cases", () => {
        it("should return empty array for text without images", () => {
            const text = "Plain text without any images";
            const result = parseImageElements(text);

            expect(result.length).toBe(0);
        });

        it("should return empty array for empty string", () => {
            const result = parseImageElements("");

            expect(result.length).toBe(0);
        });

        it("should not parse invalid HTML img tags (missing src)", () => {
            const text = '<img alt="test" width="400">';
            const result = parseImageElements(text);

            expect(result.length).toBe(0);
        });
    });
});

describe("detectCurrentWidth", () => {
    const defaultWidths = [360, 480, 640, 800, 960, 1200];

    it("should return element current width if available", () => {
        const elements: ImageElement[] = [
            {
                type: "html",
                originalText: '<img src="a.png">',
                src: "a.png",
                currentWidth: 800,
            },
        ];
        const result = detectCurrentWidth(elements, defaultWidths);

        expect(result).toBe(800);
    });

    it("should return first available width from elements", () => {
        const elements: ImageElement[] = [
            { type: "markdown", originalText: "![](a.png)", src: "a.png" },
            {
                type: "html",
                originalText: '<img src="b.png" width="600">',
                src: "b.png",
                currentWidth: 600,
            },
        ];
        const result = detectCurrentWidth(elements, defaultWidths);

        expect(result).toBe(600);
    });

    it("should return middle width from widths array when no element has width", () => {
        const elements: ImageElement[] = [
            { type: "markdown", originalText: "![](a.png)", src: "a.png" },
        ];
        const result = detectCurrentWidth(elements, defaultWidths);

        expect(result).toBe(800); // widths[3] (Math.floor(6/2))
    });

    it("should handle empty elements array", () => {
        const result = detectCurrentWidth([], defaultWidths);

        expect(result).toBe(800); // widths[3]
    });

    it("should handle custom widths array", () => {
        const widths = [200, 400, 600, 800];
        const result = detectCurrentWidth([], widths);

        expect(result).toBe(600); // widths[2] (Math.floor(4/2))
    });
});

describe("calculateTargetWidth", () => {
    const widths = [360, 480, 640, 800, 960, 1200];

    describe("zoom in (increase width)", () => {
        it("should increase width to next level", () => {
            const result = calculateTargetWidth(480, "in", widths);

            expect(result).toBe(640);
        });

        it("should increase width from middle", () => {
            const result = calculateTargetWidth(640, "in", widths);

            expect(result).toBe(800);
        });

        it("should stay at max width when already at maximum", () => {
            const result = calculateTargetWidth(1200, "in", widths);

            expect(result).toBe(1200);
        });

        it("should jump to next width when current is between presets", () => {
            const result = calculateTargetWidth(500, "in", widths);

            expect(result).toBe(800); // 500 -> currentIndex=2 (640), return widths[3]=800
        });

        it("should handle width larger than max", () => {
            const result = calculateTargetWidth(1500, "in", widths);

            expect(result).toBe(1200); // Return max
        });

        it("should increase from minimum", () => {
            const result = calculateTargetWidth(360, "in", widths);

            expect(result).toBe(480);
        });
    });

    describe("zoom out (decrease width)", () => {
        it("should decrease width to previous level", () => {
            const result = calculateTargetWidth(640, "out", widths);

            expect(result).toBe(480);
        });

        it("should decrease from middle", () => {
            const result = calculateTargetWidth(800, "out", widths);

            expect(result).toBe(640);
        });

        it("should stay at min width when already at minimum", () => {
            const result = calculateTargetWidth(360, "out", widths);

            expect(result).toBe(360);
        });

        it("should jump to nearest width when current is between presets", () => {
            const result = calculateTargetWidth(700, "out", widths);

            expect(result).toBe(640); // 700 -> previous level < 700
        });

        it("should handle width smaller than min", () => {
            const result = calculateTargetWidth(200, "out", widths);

            expect(result).toBe(360); // Return min
        });

        it("should decrease from maximum", () => {
            const result = calculateTargetWidth(1200, "out", widths);

            expect(result).toBe(960);
        });
    });

    describe("unsorted widths handling", () => {
        it("should work with unsorted widths array", () => {
            const unsortedWidths = [800, 360, 1200, 480];
            const result = calculateTargetWidth(480, "in", unsortedWidths);

            expect(result).toBe(800); // Next after sorting
        });
    });

    describe("edge cases", () => {
        it("should handle single width in array", () => {
            const singleWidth = [500];
            const result1 = calculateTargetWidth(500, "in", singleWidth);
            const result2 = calculateTargetWidth(500, "out", singleWidth);

            expect(result1).toBe(500);
            expect(result2).toBe(500);
        });

        it("should handle two widths", () => {
            const twoWidths = [400, 800];
            const result1 = calculateTargetWidth(400, "in", twoWidths);
            const result2 = calculateTargetWidth(800, "out", twoWidths);

            expect(result1).toBe(800);
            expect(result2).toBe(400);
        });
    });
});
