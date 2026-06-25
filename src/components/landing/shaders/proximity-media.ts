export const proximityVertexShader = /* glsl */ `
varying vec2 v_uv;

void main() {
  v_uv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const proximityFragmentShader = /* glsl */ `
uniform sampler2D image;
uniform vec2 uMouseUv;
uniform float uMediaAspect;
uniform float uViewportAspect;
varying vec2 v_uv;

float map(float value, float min1, float max1, float min2, float max2) {
  return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}

vec2 coverUv(vec2 uv) {
  vec2 st = uv;

  if (uViewportAspect > uMediaAspect) {
    st.y = (st.y - 0.5) * (uMediaAspect / uViewportAspect) + 0.5;
  } else {
    st.x = (st.x - 0.5) * (uViewportAspect / uMediaAspect) + 0.5;
  }

  return st;
}

void main() {
  vec2 uv = coverUv(v_uv);

  float dist = distance(v_uv, uMouseUv);
  float proxymity = 1.0 - map(dist, 0.0, 0.25, 0.0, 1.0);
  proxymity = clamp(proxymity, 0.0, 1.0);

  if (proxymity < 0.005) {
    discard;
  }

  vec2 zoomedUv = mix(uv, coverUv(uMouseUv), proxymity * 0.1);
  vec4 color = texture2D(image, zoomedUv);

  gl_FragColor = color;
  #include <colorspace_fragment>
}
`;
