/**
 * 基本模板渲染示例
 *
 * 演示如何使用 @cmtx/template 进行基本的模板变量替换
 */

import { renderTemplate } from '../src/index.js';

function basicTemplateRendering() {
    console.log('=== 基本模板渲染示例 ===\n');

    // 1. 基本变量替换
    console.log('1. 基本变量替换:');
    const basicTemplate = 'Hello, {name}! Welcome to {site}.';
    const basicContext = {
        name: 'Alice',
        site: 'My Blog',
    };
    const basicResult = renderTemplate(basicTemplate, basicContext);
    console.log(`模板: ${basicTemplate}`);
    console.log(`结果: ${basicResult}\n`);

    // 2. 嵌套对象属性访问(NOT SUPPORTED YET)
    console.log('2. 嵌套对象属性:');
    const nestedTemplate = 'Author: {author.name} ({author.email})';
    const nestedContext: any = {
        author: {
            name: 'Bob Smith',
            email: 'bob@example.com',
        },
    };
    const nestedResult = renderTemplate(nestedTemplate, nestedContext);
    console.log(`模板: ${nestedTemplate}`);
    console.log(`结果: ${nestedResult}\n`);

    // 3. 数组元素访问(NOT SUPPORTED YET)
    console.log('3. 数组元素访问:');
    const arrayTemplate = 'First tag: {tags[0]}, Second tag: {tags[1]}';
    const arrayContext: any = {
        tags: ['tech', 'programming', 'javascript'],
    };
    const arrayResult = renderTemplate(arrayTemplate, arrayContext);
    console.log(`模板: ${arrayTemplate}`);
    console.log(`结果: ${arrayResult}\n`);

    // 4. 数字和布尔值处理
    console.log('4. 数字和布尔值处理:');
    const mixedTemplate = 'Score: {score}, Active: {isActive}';
    const mixedContext = {
        score: 95,
        isActive: true,
    };
    const mixedResult = renderTemplate(mixedTemplate, mixedContext);
    console.log(`模板: ${mixedTemplate}`);
    console.log(`结果: ${mixedResult}\n`);

    // 6. 未知变量处理
    console.log('6. 未知变量处理:');
    const unknownTemplate = 'Known: {known}, Unknown: {unknown}';
    const unknownContext = {
        known: 'value',
    };
    const unknownResult = renderTemplate(unknownTemplate, unknownContext);
    console.log(`模板: ${unknownTemplate}`);
    console.log(`结果: ${unknownResult}`);
    console.log('(未知变量保持原样)\n');

    // 7. 空值处理
    console.log('7. 空值处理:');
    const nullTemplate = 'Value: {value}, Null: {nullValue}';
    const nullContext: any = {
        value: 'present',
        nullValue: '',
    };
    const nullResult = renderTemplate(nullTemplate, nullContext);
    console.log(`模板: ${nullTemplate}`);
    console.log(`结果: ${nullResult}`);
    console.log('("" 值显示为空字符串)\n');
}

// 运行示例
if (import.meta.url === `file://${process.argv[1]}`) {
    basicTemplateRendering();
}

export { basicTemplateRendering };
