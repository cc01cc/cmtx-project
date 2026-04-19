# Demo Project

This is a demo project for testing image extraction.

![Logo](../images/logo.png)

![Banner](../images/banner.png)

The project demonstrates various features.

## Typical Markdown Syntax

- Inline image: ![inline](./inline.png)
- With title: ![with-title](./image.png "Image Title")
- Reference style: ![reference][ref]

[ref]: ./reference-image.png "Reference Title"

## HTML Image Syntax

### Single Line
<img src="./single-line.png" alt="Single Line HTML">

### Multiline & Different Attribute Order
<img
  alt="Multiline HTML Image"
  src="./multiline.png"
  title="Multiline Title"
>

### With Style
<img src="./with-style.png" alt="With Style" style="width: 100px;">

## Edge Cases (Exclusion)

### Code Block (Should Not Extract)

```markdown
![code-block](./code-block.png)
```

### HTML Comment (Should Not Extract)

<!-- <img src="./commented.png" alt="Commented"> -->

## Path Variations

### Relative Paths
- ![parent](../images/parent.png)
- ![current](./current.png)
- ![nested](./assets/icons/logo.svg)

## Shared Assets
![Footer](../images/footer.png)

### Absolute Paths (Local)
- ![unix-abs](/usr/share/images/logo.png)
- ![windows-abs](C:\Users\Public\Pictures\banner.jpg)
- ![windows-network-abs](\\Server\Shared\icon.png)

### Web URLs
- ![web-image](https://example.com/image.png)
- ![web-cdn](https://cdn.example.com/assets/banner.jpg)
- ![web-with-query](https://example.com/img.png?size=large#top)
