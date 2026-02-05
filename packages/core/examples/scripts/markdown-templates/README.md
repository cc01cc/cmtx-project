# Demo Project

This is a demo project for testing image extraction.

![Logo](../images/logo.png)

![Banner](../images/banner.png)

The project demonstrates various features.

## 标准 Markdown 格式

- 内联图片：![inline](./inline.png)
- 带标题：![with-title](./image.png "Image Title")
- 引用式：![reference][ref]

[ref]: ./reference.png "Reference Title"

## HTML 图片格式

### 单行 HTML

<img src="./single-line.png" alt="Single Line HTML">

### 多行 HTML

<img
  src="./multiline.png"
  alt="Multiline HTML Image"
  title="Multiline Title"
>

### 属性顺序不同

<img alt="Different Order" src="./different-order.png" title="Alt First">

### 带 style 属性

<img src="./with-style.png" alt="With Style" style="width: 100px; height: 100px;">

## 代码块中的图片（不应被提取）

```markdown
![code-block](./code-block.png)
```

```html
<img src="./code-html.png" alt="Code HTML">
```

## HTML 注释中的图片（不应被提取）

<!-- ![commented](./commented.png) -->
<!-- <img src="./commented-html.png" alt="Commented HTML"> -->

## 其他格式

### 带查询参数

![with-query](./image.png?v=1&size=large)

### 带 fragment

![with-fragment](./image.png#section)

### URL 编码

![encoded](./image%20with%20spaces.png)

### 相对路径

- ![relative-parent](../images/parent.png)
- ![relative-sibling](../../images/sibling.png)
- ![relative-current](./current.png)

### 网页图片

![web-image](https://example.com/image.png)
![web-cdn](https://cdn.example.com/assets/image.png)
