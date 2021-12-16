var createIndices = require('quad-indices')
var vertices = require('./lib/vertices')
var utils = require('./lib/utils')

export var HybridMSDFShader = require('./shaders/hybrid-msdf').createHybridMSDFShader;

let cls = null;

export function getTextGeometry(THREE) {
    if (cls) {return cls;}
    class TextGeometry extends THREE.BufferGeometry {
        constructor(opt) {
            super(opt);
            if (typeof opt === 'string') {
                opt = { text: opt }
            }

            // use these as default values for any subsequent
            // calls to update()
            this._opt = {...opt};

            // also do an initial setup...
            if (opt && opt.font) this.update(opt)
        }

        update(opt) {
            if (typeof opt === 'string') {
                opt = { text: opt }
            }

            // use constructor defaults
            opt = {...this._opt, ...opt};

            if (!opt.font) {
                throw new TypeError('must specify a { font } in options')
            }

            var font = opt.font
            var scaleFactor = opt.scaleFactor || 1

            // get vec2 texcoords
            var flipY = opt.flipY !== false

            // determine texture size from font file
            var texWidth = font.common.scaleW
            var texHeight = font.common.scaleH

            if (!opt.glyphs) {return;}

            var glyphs = opt.glyphs;

            // get visible glyphs
            glyphs = glyphs.filter((glyph) => {
                var bitmap = glyph.data
                return bitmap.width * bitmap.height > 0
            })

            // provide visible glyphs for convenience
            this.visibleGlyphs = glyphs

            // get common vertex data
            var positions = vertices.positions(glyphs)
            var uvs = vertices.uvs(glyphs, texWidth, texHeight, flipY)
            var colors = vertices.colors(glyphs, opt.defaultColor || new THREE.Color(0x000000))
            var indices = createIndices({
                clockwise: true,
                type: 'uint16',
                count: glyphs.length
            })

            // update vertex data
            this.setIndex(new THREE.BufferAttribute(indices, 1)); // buffer.index(this, indices, 1, 'uint16')
            this.setAttribute('position', new THREE.BufferAttribute(positions, 3));//  buffer.attr(this, 'position', positions, 3)

            this.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
            this.setAttribute("color", new THREE.BufferAttribute(colors, 3));

            // update multipage data
            if (!opt.multipage && 'page' in this.attributes) {
                // disable multipage rendering
                this.removeAttribute('page')
            } else if (opt.multipage) {
                var pages = vertices.pages(glyphs)
                // enable multipage rendering
                this.setAttribute("page", new THREE.BufferAttribute(pages, 1));
            }

            this.computeBoundingSphere(scaleFactor);
            this.computeBoundingBox(scaleFactor);
        }

        computeBoundingSphere() {
            if (this.boundingSphere === null) {
                this.boundingSphere = new THREE.Sphere()
            }

            if (!this.attributes.position) {
                this.boundingSphere.radius = 0
                this.boundingSphere.center.set(0, 0, 0)
                return;
            }
            var positions = this.attributes.position.array
            var itemSize = this.attributes.position.itemSize
            if (!positions || !itemSize || positions.length < 2) {
                this.boundingSphere.radius = 0
                this.boundingSphere.center.set(0, 0, 0)
                return
            }
            utils.computeSphere(positions, this.boundingSphere)

            if (isNaN(this.boundingSphere.radius)) {
                console.error('THREE.BufferGeometry.computeBoundingSphere(): ' +
                              'Computed radius is NaN. The ' +
                              '"position" attribute is likely to have NaN values.')
            }
        }

        computeBoundingBox() {
            if (this.boundingBox === null) {
                this.boundingBox = new THREE.Box3()
            }

            var bbox = this.boundingBox
            var positions = this.attributes.position.array
            var itemSize = this.attributes.position.itemSize
            if (!positions || !itemSize || positions.length < 2) {
                bbox.makeEmpty()
                return
            }
            utils.computeBox(positions, bbox)
        }
    }

    cls = TextGeometry;
    return cls;
}
