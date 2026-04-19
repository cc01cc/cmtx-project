/**
 * Format validator for image processing
 * @public
 */
export class FormatValidator {
    private imageFormat: 'markdown' | 'html' | 'all';

    constructor(imageFormat: 'markdown' | 'html' | 'all') {
        this.imageFormat = imageFormat;
    }

    shouldProcessMarkdown(): boolean {
        return this.imageFormat === 'markdown' || this.imageFormat === 'all';
    }

    shouldProcessHtml(): boolean {
        return this.imageFormat === 'html' || this.imageFormat === 'all';
    }
}
