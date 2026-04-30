export interface ImageElement {
    type: "markdown" | "html";
    originalText: string;
    src: string;
    alt?: string;
    currentWidth?: number;
}

export function parseImageElements(text: string): ImageElement[] {
    const elements: ImageElement[] = [];

    const markdownRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const htmlRegex = /<img\s+[^>]*>/gi;

    let match: RegExpExecArray | null;

    while ((match = markdownRegex.exec(text)) !== null) {
        elements.push({
            type: "markdown",
            originalText: match[0],
            src: match[2],
            alt: match[1],
        });
    }

    while ((match = htmlRegex.exec(text)) !== null) {
        const srcMatch = match[0].match(/src=['"]([^'"]+)['"]/);
        const altMatch = match[0].match(/alt=['"]([^'"]*)['"]/);
        const widthMatch = match[0].match(/width=['"]?(\d+)['"]?/);

        if (srcMatch) {
            elements.push({
                type: "html",
                originalText: match[0],
                src: srcMatch[1],
                alt: altMatch?.[1],
                currentWidth: widthMatch ? parseInt(widthMatch[1], 10) : undefined,
            });
        }
    }

    return elements;
}

export function detectCurrentWidth(elements: ImageElement[], widths: number[]): number {
    for (const element of elements) {
        if (element.currentWidth) {
            return element.currentWidth;
        }
    }
    return widths[Math.floor(widths.length / 2)];
}

export function calculateTargetWidth(
    currentWidth: number,
    direction: "in" | "out",
    widths: number[],
): number {
    const sorted = [...widths].sort((a, b) => a - b);
    const currentIndex = sorted.findIndex((w) => w >= currentWidth);

    if (direction === "in") {
        if (currentIndex === -1) {
            return sorted[sorted.length - 1];
        }
        return currentIndex < sorted.length - 1 ? sorted[currentIndex + 1] : sorted[currentIndex];
    } else {
        if (currentIndex <= 0) {
            return sorted[0];
        }
        return sorted[currentIndex - 1];
    }
}
