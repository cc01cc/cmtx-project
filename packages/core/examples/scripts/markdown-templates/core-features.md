# Core Features Test

This document tests core functionality of the image processing system.

![Logo](../images/logo.png)

![Banner](../images/banner.png)

## Basic Markdown Syntax

- Inline image: ![inline](./inline.png)
- With title: ![with-title](./image.png "Image Title")
- Reference style: ![reference][ref]

[ref]: ./reference.png "Reference Title"

## HTML Image Formats

### Single Line HTML

<img src="./single-line.png" alt="Single Line HTML">

### Attribute Order Variations

<img alt="Different Order" src="./different-order.png" title="Alt First">

### With Style Attributes

<img src="./with-style.png" alt="With Style" style="width: 100px; height: 100px;">

## Edge Cases

### Query Parameters and Fragments

![with-query](./image.png?v=1&size=large)
![with-fragment](./image.png#section)

### URL Encoding

![encoded](./image%20with%20spaces.png)

### Relative Path Variations

- ![relative-parent](../images/parent.png)
- ![relative-sibling](../../images/sibling.png)
- ![relative-current](./current.png)

### Web Images

![web-image](https://example.com/image.png)
![web-cdn](https://cdn.example.com/assets/image.png)