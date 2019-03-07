var THREE = require('three')

export function createHybridMSDFShader (opt) {
  opt = opt || {};
  var opacity = typeof opt.opacity === 'number' ? opt.opacity : 1;
  var precision = opt.precision || 'highp';
  var color = opt.color;
  var map = opt.map;
  var negate = typeof opt.negate === 'boolean' ? opt.negate : true;

  // remove to satisfy r73
  delete opt.map;
  delete opt.color;
  delete opt.precision;
  delete opt.opacity;
  delete opt.negate;
  delete opt.textureSize;

  return Object.assign({
    uniforms: {
      opacity: { type: 'f', value: opacity },
      map: { type: 't', value: map || new THREE.Texture() },
      corners: {value: new THREE.Vector4(0, 0, 100, 100)},
      textureWidth: {value: 512},
    },
    vertexShader:
`#version 300 es
in vec2 uv;
in vec4 position;
in vec3 color;
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
out vec2 vUv;
out vec3 outColor;
out vec2 origXY;
void main() {
  vUv = uv;
  outColor = color;
  gl_Position = projectionMatrix * modelViewMatrix * position;
  origXY = position.xy;
}`,
    fragmentShader: 
`#version 300 es
precision ${precision} float;
uniform float opacity;
uniform vec4 corners; // [x: left(0), y: top(0), z: right, w: bottom]
uniform float textureWidth; // 512.0, or the width of the map texture
in vec3 outColor;
in vec2 origXY;
uniform sampler2D map;
in vec2 vUv;
out vec4 glFragColor;

float median(float r, float g, float b) {
  return max(min(r, g), min(max(r, g), b));
}

bool inside(vec4 corners, vec2 origXY) {
  return corners.x <= origXY.x &&
         origXY.x < corners.z &&
         corners.y <= origXY.y &&
         origXY.y < corners.w;
}
void main() {
  float alpha;
  if (!inside(corners, origXY)) discard;
  vec4 tex = ${negate ? '1.0 - ' : ''} texture(map, vUv);
  float delta = fwidth(vUv.x) * textureWidth;
  if (delta < 1.0) { // if magnified, use MSDF
    float sigDist = median(tex.r, tex.g, tex.b) - 0.5;
    alpha = clamp(sigDist/fwidth(sigDist) + 0.5, 0.0, 1.0);
  } else {
    alpha = tex.a;  // if minified, use mipmap
  }
  glFragColor = vec4(outColor.rgb * alpha * opacity, alpha * opacity);
}`
  }, opt);
};
