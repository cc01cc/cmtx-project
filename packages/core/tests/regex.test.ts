/**
 * 正则表达式常量测试
 *
 * 测试正则表达式工具函数：
 * - getRegex - 获取正则表达式实例
 * - testRegex - 测试字符串匹配
 * - matchRegex - 提取匹配内容
 */

import { describe, expect, it } from 'vitest';
import {
    FILE_REGEX,
    getRegex,
    IMAGE_REGEX,
    METADATA_REGEX,
    matchRegex,
    testRegex,
    URL_REGEX,
    UTIL_REGEX,
} from '../src/constants/regex.js';

describe('getRegex', () => {
    it('应该返回新的正则表达式实例', () => {
        const regex1 = getRegex(/test/g);
        const regex2 = getRegex(/test/g);

        expect(regex1).not.toBe(regex2);
        expect(regex1.source).toBe('test');
        expect(regex1.flags).toBe('g');
    });

    it('应该保留原始正则表达式的标志', () => {
        const regex = getRegex(/pattern/gi);
        expect(regex.flags).toBe('gi');
    });

    it('应该保留原始正则表达式的 source', () => {
        const regex = getRegex(/[a-z]+/);
        expect(regex.source).toBe('[a-z]+');
    });
});

describe('testRegex', () => {
    it('应该返回 true 当字符串匹配', () => {
        expect(testRegex('hello world', /world/)).toBe(true);
        expect(testRegex('test string', /test/)).toBe(true);
    });

    it('应该返回 false 当字符串不匹配', () => {
        expect(testRegex('hello', /world/)).toBe(false);
        expect(testRegex('abc', /xyz/)).toBe(false);
    });

    it('应该支持全局标志', () => {
        expect(testRegex('abc abc', /abc/g)).toBe(true);
    });

    it('应该支持忽略大小写', () => {
        expect(testRegex('HELLO', /hello/i)).toBe(true);
    });

    it('应该支持锚点', () => {
        expect(testRegex('hello', /^hello$/)).toBe(true);
        expect(testRegex('hello world', /^hello$/)).toBe(false);
    });
});

describe('matchRegex', () => {
    it('应该返回匹配结果', () => {
        const result = matchRegex('hello world', /world/);
        expect(result).not.toBeNull();
        expect(result?.[0]).toBe('world');
    });

    it('应该返回 null 当没有匹配', () => {
        const result = matchRegex('hello', /world/);
        expect(result).toBeNull();
    });

    it('应该返回捕获组', () => {
        const result = matchRegex('hello world', /(hello) (world)/);
        expect(result?.[0]).toBe('hello world');
        expect(result?.[1]).toBe('hello');
        expect(result?.[2]).toBe('world');
    });

    it('应该返回多个捕获组', () => {
        const result = matchRegex('2024-01-15', /(\d{4})-(\d{2})-(\d{2})/);
        expect(result?.[1]).toBe('2024');
        expect(result?.[2]).toBe('01');
        expect(result?.[3]).toBe('15');
    });
});

describe('IMAGE_REGEX', () => {
    describe('MARKDOWN', () => {
        it('应该匹配 Markdown 图片语法', () => {
            const text = '![Alt text](image.png)';
            // 使用 exec 获取捕获组
            const regex = new RegExp(IMAGE_REGEX.MARKDOWN.source, IMAGE_REGEX.MARKDOWN.flags);
            const match = regex.exec(text);
            expect(match).not.toBeNull();
            expect(match?.[0]).toBe('![Alt text](image.png)');
            expect(match?.[1]).toBe('Alt text');
            expect(match?.[2]).toBe('image.png');
        });

        it('应该匹配带标题的 Markdown 图片', () => {
            const text = '![Alt](image.png "Title")';
            const match = text.match(IMAGE_REGEX.MARKDOWN);
            expect(match?.[0]).toBe('![Alt](image.png "Title")');
        });

        it('应该匹配多个图片', () => {
            const text = '![A](a.png) ![B](b.png)';
            const matches = Array.from(text.matchAll(IMAGE_REGEX.MARKDOWN));
            expect(matches).toHaveLength(2);
        });
    });

    describe('HTML_TAG', () => {
        it('应该匹配 HTML img 标签', () => {
            const html = '<img src="image.png" alt="Description">';
            const match = html.match(IMAGE_REGEX.HTML_TAG);
            expect(match).not.toBeNull();
        });

        it('应该匹配自闭合 img 标签', () => {
            const html = '<img src="image.png" />';
            const match = html.match(IMAGE_REGEX.HTML_TAG);
            expect(match).not.toBeNull();
        });

        it('应该忽略大小写', () => {
            const html = '<IMG SRC="image.png">';
            const match = html.match(IMAGE_REGEX.HTML_TAG);
            expect(match).not.toBeNull();
        });
    });

    describe('TITLE', () => {
        it('应该从 URL 部分提取标题', () => {
            const urlPart = 'image.png "My Title"';
            const match = IMAGE_REGEX.TITLE.exec(urlPart);
            expect(match?.[1]).toBe('My Title');
        });

        it('应该支持单引号标题', () => {
            const urlPart = "image.png 'My Title'";
            const match = IMAGE_REGEX.TITLE.exec(urlPart);
            expect(match?.[1]).toBe('My Title');
        });
    });

    describe('ATTRIBUTES', () => {
        it('应该提取 src 属性', () => {
            const attr = 'src="image.png"';
            const match = IMAGE_REGEX.ATTRIBUTES.SRC.exec(attr);
            expect(match?.[1]).toBe('image.png');
        });

        it('应该提取 alt 属性', () => {
            const attr = 'alt="Description"';
            const match = IMAGE_REGEX.ATTRIBUTES.ALT.exec(attr);
            expect(match?.[1]).toBe('Description');
        });

        it('应该提取 title 属性', () => {
            const attr = 'title="My Title"';
            const match = IMAGE_REGEX.ATTRIBUTES.TITLE.exec(attr);
            expect(match?.[1]).toBe('My Title');
        });

        it('应该提取 width 属性', () => {
            const attr = 'width="100"';
            const match = IMAGE_REGEX.ATTRIBUTES.WIDTH.exec(attr);
            expect(match?.[1]).toBe('100');
        });

        it('应该提取 height 属性', () => {
            const attr = 'height="200"';
            const match = IMAGE_REGEX.ATTRIBUTES.HEIGHT.exec(attr);
            expect(match?.[1]).toBe('200');
        });
    });
});

describe('FILE_REGEX', () => {
    describe('MARKDOWN_EXTENSIONS', () => {
        it('应该匹配 .md 文件', () => {
            expect(FILE_REGEX.MARKDOWN_EXTENSIONS.test('file.md')).toBe(true);
        });

        it('应该匹配 .markdown 文件', () => {
            expect(FILE_REGEX.MARKDOWN_EXTENSIONS.test('file.markdown')).toBe(true);
        });

        it('应该忽略大小写', () => {
            expect(FILE_REGEX.MARKDOWN_EXTENSIONS.test('file.MD')).toBe(true);
            expect(FILE_REGEX.MARKDOWN_EXTENSIONS.test('file.Markdown')).toBe(true);
        });

        it('不应该匹配其他扩展名', () => {
            expect(FILE_REGEX.MARKDOWN_EXTENSIONS.test('file.txt')).toBe(false);
            expect(FILE_REGEX.MARKDOWN_EXTENSIONS.test('file.png')).toBe(false);
        });
    });

    describe('IMAGE_EXTENSIONS', () => {
        it('应该匹配常见图片格式', () => {
            expect(FILE_REGEX.IMAGE_EXTENSIONS.test('image.jpg')).toBe(true);
            expect(FILE_REGEX.IMAGE_EXTENSIONS.test('image.jpeg')).toBe(true);
            expect(FILE_REGEX.IMAGE_EXTENSIONS.test('image.png')).toBe(true);
            expect(FILE_REGEX.IMAGE_EXTENSIONS.test('image.gif')).toBe(true);
            expect(FILE_REGEX.IMAGE_EXTENSIONS.test('image.svg')).toBe(true);
            expect(FILE_REGEX.IMAGE_EXTENSIONS.test('image.webp')).toBe(true);
        });

        it('应该忽略大小写', () => {
            expect(FILE_REGEX.IMAGE_EXTENSIONS.test('image.PNG')).toBe(true);
            expect(FILE_REGEX.IMAGE_EXTENSIONS.test('image.JPG')).toBe(true);
        });

        it('不应该匹配非图片文件', () => {
            expect(FILE_REGEX.IMAGE_EXTENSIONS.test('file.txt')).toBe(false);
            expect(FILE_REGEX.IMAGE_EXTENSIONS.test('file.md')).toBe(false);
        });
    });
});

describe('URL_REGEX', () => {
    describe('WEB', () => {
        it('应该匹配 http:// URL', () => {
            expect(URL_REGEX.WEB.test('http://example.com')).toBe(true);
        });

        it('应该匹配 https:// URL', () => {
            expect(URL_REGEX.WEB.test('https://example.com')).toBe(true);
        });

        it('不应该匹配其他协议', () => {
            expect(URL_REGEX.WEB.test('ftp://example.com')).toBe(false);
            expect(URL_REGEX.WEB.test('file:///path')).toBe(false);
        });
    });

    describe('ABSOLUTE_PATH', () => {
        it('应该匹配 Unix 绝对路径', () => {
            expect(URL_REGEX.ABSOLUTE_PATH.test('/home/user')).toBe(true);
        });

        it('应该匹配 Windows 盘符路径', () => {
            expect(URL_REGEX.ABSOLUTE_PATH.test('C:\\Users')).toBe(true);
            expect(URL_REGEX.ABSOLUTE_PATH.test('D:/data')).toBe(true);
        });

        it('不应该匹配相对路径', () => {
            expect(URL_REGEX.ABSOLUTE_PATH.test('./relative')).toBe(false);
            expect(URL_REGEX.ABSOLUTE_PATH.test('../parent')).toBe(false);
        });
    });

    describe('QUERY_PARAMS', () => {
        it('应该匹配查询参数', () => {
            const url = 'https://example.com?foo=bar&baz=qux';
            const match = url.match(URL_REGEX.QUERY_PARAMS);
            expect(match?.[0]).toBe('?foo=bar&baz=qux');
        });
    });

    describe('FRAGMENT', () => {
        it('应该匹配片段标识符', () => {
            const url = 'https://example.com#section';
            const match = url.match(URL_REGEX.FRAGMENT);
            expect(match?.[0]).toBe('#section');
        });
    });
});

describe('METADATA_REGEX', () => {
    describe('FRONTMATTER_BOUNDARY', () => {
        it('应该匹配 Frontmatter 分隔符', () => {
            expect(METADATA_REGEX.FRONTMATTER_BOUNDARY.test('---')).toBe(true);
            expect(METADATA_REGEX.FRONTMATTER_BOUNDARY.test('--- ')).toBe(true);
        });

        it('不应该匹配非分隔符', () => {
            expect(METADATA_REGEX.FRONTMATTER_BOUNDARY.test('--')).toBe(false);
            expect(METADATA_REGEX.FRONTMATTER_BOUNDARY.test('----')).toBe(false);
        });
    });

    describe('HEADING_LEVEL_1', () => {
        it('应该匹配一级标题', () => {
            const content = '# Title';
            const match = METADATA_REGEX.HEADING_LEVEL_1.exec(content);
            expect(match?.[1]).toBe('Title');
        });

        it('不应该匹配其他级别标题', () => {
            expect(METADATA_REGEX.HEADING_LEVEL_1.test('## Title')).toBe(false);
            expect(METADATA_REGEX.HEADING_LEVEL_1.test('### Title')).toBe(false);
        });
    });

    describe('ALL_HEADINGS', () => {
        it('应该匹配所有级别标题', () => {
            const content = '# H1\n## H2\n### H3';
            const matches = Array.from(content.matchAll(METADATA_REGEX.ALL_HEADINGS));
            expect(matches).toHaveLength(3);
            expect(matches[0][1]).toBe('#');
            expect(matches[1][1]).toBe('##');
            expect(matches[2][1]).toBe('###');
        });
    });
});

describe('UTIL_REGEX', () => {
    describe('WHITESPACE', () => {
        it('应该匹配空白字符', () => {
            expect('hello world'.match(UTIL_REGEX.WHITESPACE)).not.toBeNull();
            expect('hello\tworld'.match(UTIL_REGEX.WHITESPACE)).not.toBeNull();
            expect('hello\nworld'.match(UTIL_REGEX.WHITESPACE)).not.toBeNull();
        });

        it('应该全局替换所有空白', () => {
            const text = 'a b\tc\nd';
            const result = text.replace(UTIL_REGEX.WHITESPACE, '-');
            expect(result).toBe('a-b-c-d');
        });
    });

    describe('LEADING_WHITESPACE', () => {
        it('应该匹配行首空白', () => {
            const text = '   hello';
            const match = text.match(UTIL_REGEX.LEADING_WHITESPACE);
            expect(match?.[0]).toBe('   ');
        });

        it('不应该匹配无行首空白的文本', () => {
            const text = 'hello';
            expect(UTIL_REGEX.LEADING_WHITESPACE.test(text)).toBe(false);
        });
    });

    describe('TRAILING_WHITESPACE', () => {
        it('应该匹配行尾空白', () => {
            const text = 'hello   ';
            const match = text.match(UTIL_REGEX.TRAILING_WHITESPACE);
            expect(match?.[0]).toBe('   ');
        });

        it('不应该匹配无行尾空白的文本', () => {
            const text = 'hello';
            expect(UTIL_REGEX.TRAILING_WHITESPACE.test(text)).toBe(false);
        });
    });

    describe('MULTIPLE_SPACES', () => {
        it('应该匹配多个连续空白字符', () => {
            // 正则使用 \s{2,} 匹配两个或更多空白字符
            // 注意：使用 match 而非 test 避免 lastIndex 问题
            const text1 = 'hello  world';
            const text2 = 'hello\t\tworld';
            const text3 = 'hello \tworld';

            expect(text1.match(UTIL_REGEX.MULTIPLE_SPACES)).not.toBeNull();
            expect(text2.match(UTIL_REGEX.MULTIPLE_SPACES)).not.toBeNull();
            expect(text3.match(UTIL_REGEX.MULTIPLE_SPACES)).not.toBeNull();
        });

        it('不应该匹配单个空白字符', () => {
            expect('hello world'.match(UTIL_REGEX.MULTIPLE_SPACES)).toBeNull();
            expect('hello\tworld'.match(UTIL_REGEX.MULTIPLE_SPACES)).toBeNull();
        });

        it('应该全局替换多个空白为单个', () => {
            const text = 'hello  world\t\tfoo';
            const result = text.replace(UTIL_REGEX.MULTIPLE_SPACES, ' ');
            expect(result).toBe('hello world foo');
        });
    });
});
