/** Probe the actual play context before Three reads nullable precision formats. */
export function assertUsableWebGL2(gl: WebGL2RenderingContext | null): asserts gl is WebGL2RenderingContext {
  if (!gl || gl.isContextLost()) throw new Error('WebGL2 context missing or lost');
  for (const shader of [gl.VERTEX_SHADER, gl.FRAGMENT_SHADER]) {
    for (const precision of [gl.HIGH_FLOAT, gl.MEDIUM_FLOAT]) {
      if (!gl.getShaderPrecisionFormat(shader, precision)) {
        throw new Error('WebGL2 shader precision is unavailable');
      }
    }
  }
}
