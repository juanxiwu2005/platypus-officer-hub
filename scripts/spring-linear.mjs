// Turns a spring (Apple-style: damping ratio + response in seconds) into a CSS `linear()` easing.
// Usage: node scripts/spring-linear.mjs <name> <damping> <response>
//   e.g. node scripts/spring-linear.mjs spring-ui 1 0.3      (critically damped, no bounce)
//        node scripts/spring-linear.mjs spring-pop 0.8 0.35  (a little bounce)
// Prints two custom properties: `--<name>` (the easing) and `--<name>-dur` (how long the spring takes to settle).
// Response is the time of one undamped oscillation, so omega0 = 2*pi/response. Nothing here is hand-typed:
// change the numbers and run this again, then paste the output into src/styles/dx-00-tokens.css.
const [name = "spring", dampingArg = "1", responseArg = "0.3"] = process.argv.slice(2)
const zeta = Number(dampingArg), response = Number(responseArg)
if (!(zeta > 0) || !(response > 0)) { console.error("damping and response must be positive numbers"); process.exit(1) }
const w0 = (2 * Math.PI) / response

/** Position of a spring released from 0 toward 1 with no initial velocity. */
function position(t) {
  if (zeta >= 1 - 1e-9) return 1 - Math.exp(-w0 * t) * (1 + w0 * t)
  const wd = w0 * Math.sqrt(1 - zeta * zeta)
  return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t))
}

// The spring is "settled" when it stays within 0.1% of the target from then on.
const step = 0.001
let settle = 0
for (let t = 0; t < 5; t += step) if (Math.abs(position(t) - 1) > 0.001) settle = t
settle = Math.ceil((settle + step) * 100) / 100

const points = 40
const samples = []
for (let i = 0; i <= points; i++) samples.push(+position((settle * i) / points).toFixed(4))
samples[points] = 1
const peak = Math.max(...samples)
console.log(`  /* damping ${zeta}, response ${response}s, settles in ${settle}s, overshoot ${(Math.max(0, peak - 1) * 100).toFixed(1)}% (made by scripts/spring-linear.mjs) */`)
console.log(`  --${name}: linear(${samples.join(", ")});`)
console.log(`  --${name}-dur: ${Math.round(settle * 1000)}ms;`)
