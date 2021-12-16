# Hybrid MSDF and bitmap text

Derived from [three-bmfont-text](https://github.com/Jam3/three-bmfont-text) but modified to support a hybrid MSDF approach so that text look fine from near and far. That is, when a character is magnified, it looks totally crisp, and when a character is minified, it is anti-aliased.

The package is designed to work best with Croquet Worldcore, but the implementation is generally usable for any Three.js based application.

Loading font is done something like this with [load-bmfont](https://www.npmjs.com/package/load-bmfont):

```js
let path = "./assets/fonts";
let image = `${path}/${name}.png`;

return new Promise((resolve, reject) => {
    loadFont(`${path}/${name}.json`, (err, font) => {
        if (err) throw err;
        let loader = new THREE.TextureLoader();
        loader.load(
            image,
            (tex) => {
                let preprocessor = new MSDFFontPreprocessor();
                let img = new Image(font.common.scaleW, font.common.scaleH);
                let canvas = document.createElement("canvas");
                canvas.width = font.common.scaleW;
                canvas.height = font.common.scaleH;
                let ctx = canvas.getContext("2d");
                ctx.drawImage(tex.image, 0, 0);
                let inBitmap = ctx.getImageData(0, 0, canvas.width, canvas.height);
                let outImage = preprocessor.process(font, inBitmap.data);
                ctx.putImageData(outImage, 0, 0);

                let processedTexture = new THREE.Texture(outImage);
                processedTexture.minFilter = THREE.LinearMipMapLinearFilter;
                processedTexture.magFilter = THREE.LinearFilter;
                processedTexture.generateMipmaps = true;
                processedTexture.anisotropy = 1; // maxAni

                img.src = canvas.toDataURL("image/png");
                img.onload = () => {
                    processedTexture.needsUpdate = true;
                };

                this.fonts[name] = {font, texture: processedTexture};
                resolve(this.fonts[name]);
            },
            null,
            () => {
                reject(new Error(`failed to load font: ${name}`));
            });
    });
});
```

and updating geometry can be done:

```js
let TextLayout = getTextLayout(THREE);
let layout = new TextLayout({font});
let glyphs = layout.computeGlyphs({font, {x: 0, y: 0, string: "Test", style: "blue"}});
let extent = {width: 600, height: 600};

this.textGeometry.update({font, glyphs});
let bounds = {left: 0, top: 0, bottom: extent.height, right: extent.width};
this.fonts[fontName].material.uniforms.corners.value = new THREE.Vector4(bounds.left, bounds.top, bounds.right, bounds.bottom);
```

## License

MIT, see LICENSE.md.
