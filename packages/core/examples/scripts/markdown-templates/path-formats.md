# Path Format Comprehensive Test

This document thoroughly tests various path format handling capabilities.

## Relative Paths

![Local Image](./images/logo.png)
![Parent Directory](../assets/banner.jpg)
![Nested Path](assets/icons/favicon.ico)
![Same Directory](diagram.png)

## Absolute Paths

![Unix Absolute](/usr/share/images/photo.jpg)
![Windows Drive](C:\Users\Public\Pictures\sample.png)
![Network Share](\\server\share\document.pdf)
![Mixed Format](D:/Projects/website/assets/background.jpg)

## Web URLs

![HTTPS Image](https://example.com/images/header.png)
![HTTP Image](http://cdn.site.com/photos/gallery.jpg)
![Protocol Relative](//static.domain.com/icons/loading.gif)

## Complex Cases

![With Spaces](./my photos/vacation 2023/beach.jpg)
![With Special Chars](assets/images/图 片@2x.png)
![Deep Nesting](../../../very/deep/nested/folder/image.svg)
![Query Params](./cache/thumbnail.jpg?width=300&height=200)
![Fragment](./gallery/main.png#lightbox)

## HTML Images with Various Paths

<img src="./html-logo.png" alt="HTML Logo">
<img src="/absolute/path/image.gif" alt="Absolute Path Image">
<img src="https://cdn.example.com/assets/button.svg" alt="CDN Image">
<img src="../parent-folder/graphic.bmp" alt="Parent Folder Image">

## Edge Cases

![Just Filename](icon.png)
![Dot Path](./current.png)
![Double Dot](../../upper.png)
![Current Dir](././same-level.png)