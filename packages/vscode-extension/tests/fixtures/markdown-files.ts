export const MARKDOWN_FIXTURES = {
    simple: {
        content: '# Test\n![image](./test.png)',
        description: 'Simple Markdown with one local image',
    },
    multipleImages: {
        content: '# Doc\n![img1](./a.png)\n![img2](./b.png)\n![img3](https://example.com/c.png)',
        description: 'Markdown with multiple local and remote images',
    },
    htmlFormat: {
        content: '# Doc\n<img src="./test.png" alt="test" width="400">',
        description: 'Markdown with HTML format image',
    },
    empty: {
        content: '',
        description: 'Empty Markdown',
    },
    noImages: {
        content: '# Test\n\nThis is a test document without images.',
        description: 'Markdown without images',
    },
};

export const CONFIG_FIXTURES = {
    validAliyun: {
        provider: 'aliyun-oss',
        bucket: 'test-bucket',
        region: 'oss-cn-hangzhou',
    },
    validTencent: {
        provider: 'tencent-cos',
        bucket: 'test-bucket',
        region: 'ap-guangzhou',
    },
    validAws: {
        provider: 'aws',
        bucket: 'test-bucket',
        region: 'us-west-2',
    },
    invalid: {
        provider: 'unknown',
    },
    empty: {},
};
