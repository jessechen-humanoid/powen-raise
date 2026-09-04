// One character, one clock. Gameplay remains the owner's responsibility.
const TAU = Math.PI * 2;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

export function createMotion({ random = Math.random } = {}) {
  let state = 'idle', event = 'idle', eventTime = 0, eventDuration = 3;
  let x = 0, direction = 1, phase = 0, time = 0, speed = 0;
  let initialized = false, lastSpecial = '', specialIn = 2.5;
  let settlingFrom = null, eventFrom = null, settled = false, turns = 0;
  const events = { run: 0, hop: 0, stumble: 0, turn: 0 };
  const roll = () => clamp(Number(random()) || 0, 0, .999999);
  const snapshot = () => ({ state, event, eventTime, eventDuration, x, direction,
    phase, speed, time, settled, turns, events: { ...events }, settlingFrom, eventFrom });
  function begin(name, duration) {
    eventFrom = samplePose(snapshot());
    event = name; eventTime = 0; eventDuration = duration;
    if (name in events) events[name]++;
  }
  return {
    setState(next) {
      if (!['idle', 'running', 'frozen'].includes(next) || next === state) return;
      settlingFrom = samplePose(snapshot());
      state = next; settled = false;
      if (next === 'running') {
        begin('run', 1.8 + roll() * 1.6); specialIn = eventDuration;
      } else begin('settle', .65);
    },
    advance(delta, width) {
      const dt = clamp(Number(delta) || 0, 0, .05);
      width = Math.max(0, Number(width) || 0);
      if (!initialized) { x = width * .42; initialized = true; }
      x = clamp(x, 0, width);
      if (settled && state === 'frozen') return snapshot();
      time += dt; eventTime += dt;
      if (state !== 'running') {
        speed = 0;
        if (event === 'settle' && eventTime >= eventDuration) {
          event = state; eventTime = 0; settlingFrom = null; settled = state === 'frozen';
        }
        return snapshot();
      }
      const p = clamp(eventTime / eventDuration, 0, 1);
      let targetSpeed = 124;
      if (event === 'hop') targetSpeed = 91;
      if (event === 'stumble') targetSpeed = 124 * (1 - .65 * Math.sin(p * Math.PI));
      if (event === 'turn') targetSpeed = 0;
      const edge = direction > 0 ? width - x : x;
      targetSpeed *= smooth(edge / 100);
      speed = mix(speed, targetSpeed, Math.min(1, dt * 9));
      x = clamp(x + direction * speed * dt, 0, width);
      // A planted foot moves backward by the same distance the body travels.
      phase += speed * dt / 152 * TAU;
      if (event === 'turn') {
        if (p >= .5 && direction === this.turnFrom) { direction *= -1; turns++; }
        if (p >= 1) { begin('run', 1.4 + roll()); specialIn = eventDuration; }
      } else if (event === 'run' && edge < 9) {
        this.turnFrom = direction; speed = 0; begin('turn', .52);
      } else if (event !== 'run' && p >= 1) {
        begin('run', 1.6 + roll() * 2.1); specialIn = eventDuration;
      } else if (event === 'run') {
        specialIn -= dt;
        if (specialIn <= 0 && edge > 145 && width > 160) {
          let next = roll() < .6 ? 'hop' : 'stumble';
          if (next === lastSpecial) next = next === 'hop' ? 'stumble' : 'hop';
          lastSpecial = next; begin(next, next === 'hop' ? .96 : 1.12);
        }
      }
      return snapshot();
    },
    get snapshot() { return snapshot(); },
  };
}

// Pose coordinates live in a 300 × 360 illustration, with the floor at y=338.
export function samplePose(s) {
  const phase = s.phase || 0;
  const p = clamp(s.eventTime / s.eventDuration, 0, 1);
  const running = s.state === 'running';
  const gait = clamp(s.speed / 105, 0, 1);
  let hip = { x: 150, y: 259 - Math.cos(phase * 2) * 4 * gait };
  let lean = 6 * gait, lift = 0, squash = 1;
  let armLift = 0, spread = 0, impact = 0;
  function foot(offset, side) {
    const q = ((phase / TAU + offset) % 1 + 1) % 1;
    const swing = q >= .5;
    const t = swing ? (q - .5) * 2 : q * 2;
    const fx = swing ? mix(-38, 38, smooth(t)) : mix(38, -38, t);
    return { x: 150 + side * 8 + fx * gait,
      y: 330 - (swing ? Math.sin(Math.PI * t) * 46 * gait : 0),
      angle: swing ? -24 * Math.sin(Math.PI * t) : mix(-8, 9, t) * gait };
  }
  let left = foot(0, -1), right = foot(.5, 1);
  if (s.event === 'stumble') {
    const lurch = Math.sin(Math.PI * p);
    hip.y += 10 * lurch; lean = 6 + 20 * lurch;
    armLift = 22 * lurch; spread = 29 * lurch;
    impact = Math.max(0, Math.sin(p * Math.PI * 3)) * .6;
  } else if (s.event === 'turn') {
    // Pass through an upright pose when facing flips at the midpoint.
    lean = -12 * Math.sin(p * TAU);
    hip.y += 9 * Math.sin(p * Math.PI);
    left = { x: 123, y: 330, angle: 0 }; right = { x: 177, y: 330, angle: 0 };
    spread = 8; gait && (armLift = 4);
  }
  if (!running) {
    const breathing = s.state === 'idle' ? Math.sin(s.time * 1.8) : 0;
    hip = { x: 150, y: 261 + breathing * 1.8 };
    lean = s.state === 'frozen' ? -3 : 2 + breathing;
    left = { x: 125, y: 330, angle: -4 }; right = { x: 174, y: 330, angle: 3 };
    armLift = s.state === 'frozen' ? 28 : 0;
  }
  const swing = Math.sin(phase) * 28 * gait;
  let pose = {
    hip, lean, squash, lift, impact,
    left, right,
    handL: { x: 110 - swing - spread, y: hip.y - 36 - armLift + Math.cos(phase) * 11 * gait },
    handR: { x: 191 + swing + spread, y: hip.y - 48 - armLift - Math.cos(phase) * 11 * gait },
    headAngle: -lean * .55 + Math.sin(phase - .55) * 2.5 * gait,
  };
  const blend = (a, b, t) => {
    const result = { ...b };
    for (const key of ['hip', 'left', 'right', 'handL', 'handR']) {
      result[key] = { ...b[key] };
      for (const axis of ['x', 'y', 'angle']) {
        if (axis in b[key]) result[key][axis] = mix(a[key][axis] || 0, b[key][axis], t);
      }
    }
    for (const key of ['lean', 'headAngle', 'squash', 'lift', 'impact']) result[key] = mix(a[key], b[key], t);
    return result;
  };
  if (s.event === 'hop') {
    const key = (y, lx, ly, rx, ry, handY, angle, height, impact = 0) => ({
      hip: { x: 150, y }, lean: angle, headAngle: -angle * .5,
      squash: y > 270 ? .955 : 1, lift: height, impact,
      left: { x: lx, y: ly, angle: height ? -23 : 0 },
      right: { x: rx, y: ry, angle: height ? -9 : 0 },
      handL: { x: height > 30 ? 90 : 112, y: handY },
      handR: { x: height > 30 ? 210 : 195, y: handY - 10 },
    });
    const frames = [
      [0, pose], [.18, key(282, 122, 330, 178, 330, 247, 12, 0)],
      [.28, key(243, 120, 319, 174, 317, 163, 3, 12)],
      [.49, key(198, 115, 263, 196, 267, 85, 4, 64)],
      [.70, key(248, 128, 324, 178, 326, 181, 6, 10)],
      [.82, key(279, 128, 330, 178, 330, 234, 11, 0, 1)], [1, pose],
    ];
    const index = frames.findIndex(([t]) => t >= p);
    const [t0, from] = frames[Math.max(0, index - 1)];
    const [t1, to] = frames[Math.max(0, index)];
    pose = blend(from, to, smooth((p - t0) / (t1 - t0 || 1)));
  }
  if (s.eventFrom && s.eventTime < .14 && s.event !== 'settle') {
    pose = blend(s.eventFrom, pose, smooth(s.eventTime / .14));
  }
  // Segment changes share the same world position; settling blends every joint.
  if (s.event === 'settle' && s.settlingFrom) {
    const t = smooth(p), from = s.settlingFrom;
    for (const key of ['hip', 'left', 'right', 'handL', 'handR']) {
      for (const axis of ['x', 'y']) pose[key][axis] = mix(from[key][axis], pose[key][axis], t);
    }
    for (const key of ['lean', 'headAngle', 'squash', 'lift', 'impact']) pose[key] = mix(from[key], pose[key], t);
  }
  return pose;
}

function rotatePoint(x, y, degrees) {
  const a = degrees * Math.PI / 180;
  return { x: x * Math.cos(a) - y * Math.sin(a), y: x * Math.sin(a) + y * Math.cos(a) };
}

// Two-bone inverse kinematics, used for feet and hands; no DOM measurements.
export function solveLimb(start, target, upper, lower, bend = 1) {
  const dx = target.x - start.x, dy = target.y - start.y;
  const d = clamp(Math.hypot(dx, dy), Math.abs(upper - lower) + .01, upper + lower - .01);
  const a = Math.atan2(dy, dx);
  const spread = Math.acos(clamp((upper * upper + d * d - lower * lower) / (2 * upper * d), -1, 1));
  const angle = a + bend * spread;
  const joint = { x: start.x + Math.cos(angle) * upper, y: start.y + Math.sin(angle) * upper };
  const end = { x: start.x + Math.cos(a) * d, y: start.y + Math.sin(a) * d };
  return { joint, end, upperAngle: angle * 180 / Math.PI - 90,
    lowerAngle: Math.atan2(end.y - joint.y, end.x - joint.x) * 180 / Math.PI - 90 };
}

export function createPerformer(track) {
  const oldHead = track.querySelector('.head');
  const headURL = oldHead?.getAttribute('src') || 'powen-head.png';
  const mosaic = track.querySelector('svg.body > g:last-child')?.cloneNode(true);
  const oldFallback = track.querySelector('.head-fallback')?.cloneNode(true);
  const bubble = track.querySelector('#powen-bubble');
  const runner = document.createElement('div');
  runner.id = 'runner'; runner.className = 'performer';
  const svgNS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs = {}) => {
    const node = document.createElementNS(svgNS, tag);
    for (const [key, val] of Object.entries(attrs)) node.setAttribute(key, val);
    return node;
  };
  const svg = el('svg', { viewBox: '0 0 300 360', width: 300, height: 360, role: 'img', 'aria-label': '小柏文' });
  const shadow = el('ellipse', { cx: 150, cy: 341, rx: 54, ry: 6, fill: '#bd9856', opacity: .26 });
  svg.append(shadow);
  const facing = el('g'); svg.append(facing);
  const limb = (kind, back) => {
    const group = el('g', { 'data-limb': kind + (back ? '-back' : '-front') });
    const upper = el('g'), lower = el('g'), extremity = el('g');
    const leg = kind === 'leg';
    const skin = back ? '#d6b28c' : '#efd0ac';
    const outline = back ? '#96734d' : '#a4835d';
    const path = (d, fill = skin, stroke = outline, width = 1.4) => el('path', { d, fill, stroke, 'stroke-width': width, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
    upper.append(path(leg ? 'M-12 0 C-14-12 12-13 13 0 L10 39 Q9 51 0 51 Q-10 51-10 40 Z' : 'M-9 0 C-10-12 10-12 10 0 L8 30 Q7 40 0 40 Q-8 40-8 30 Z', skin, 'none'));
    lower.append(path(leg ? 'M-9 0 Q0-9 9 0 L6 39 Q6 49-1 49 Q-7 49-6 38 Z' : 'M-8 0 Q0-9 8 0 L6 29 Q5 37-2 37 Q-8 36-7 28 Z', skin, 'none'));
    if (leg) {
      // The calf overlaps the ankle; only the sole is outlined, not the joint.
      extremity.append(path('M-6-14 L6-14 Q7-5 13-3 Q20-4 25 1 Q29 5 23 8 Q12 11-2 9 Q-10 8-10 2 Q-10-6-6-14Z', skin, 'none'));
      extremity.append(path('M-6 7 Q8 11 23 6', 'none', outline, 1));
    } else {
      // One soft palm and a thumb angled along it, with a continuous wrist.
      extremity.append(path('M-6-7 L6-7 Q6-1 9 2 Q15 6 15 10 Q15 14 12 14 Q10 14 8 10 L8 14 C8 20 4 23-2 22 C-9 21-11 16-10 8 Q-10 0-6-7Z', skin, 'none'));
    }
    group.append(upper, lower, extremity);
    return { group, upper, lower, extremity, leg };
  };
  const backArm = limb('arm', true), backLeg = limb('leg', true);
  const frontLeg = limb('leg', false), frontArm = limb('arm', false);
  facing.append(backArm.group, backLeg.group, frontLeg.group);
  const torso = el('g', { 'data-part': 'torso' });
  // Narrow shoulders open gradually into a rounded lower body; no waist pinch.
  torso.innerHTML = `<path d="M-12-92 C-19-91-22-86-23-78 C-25-62-30-43-33-26 C-36-5-25 11-9 12 L9 12 C25 11 36-5 33-26 C30-43 25-62 23-78 C22-86 19-91 12-92Z" fill="#edcba5" stroke="#a4835d" stroke-width="1.3" stroke-linejoin="round"/>`;
  facing.append(torso, frontArm.group);
  const head = el('g', { 'data-part': 'head' });
  const photo = el('image', { href: headURL, x: -61, y: -130, width: 122, height: 149, preserveAspectRatio: 'xMidYMax meet' });
  if (oldFallback) {
    oldFallback.removeAttribute('style'); oldFallback.removeAttribute('class');
    for (const [k, v] of Object.entries({ x: -54, y: -102, width: 108, height: 108, display: 'none' })) oldFallback.setAttribute(k, v);
    head.append(oldFallback);
    photo.addEventListener('error', () => { photo.style.display = 'none'; oldFallback.removeAttribute('display'); });
  }
  head.append(photo); facing.append(head);
  const censor = el('g', { 'data-part': 'mosaic' });
  if (mosaic) { mosaic.setAttribute('transform', 'translate(-100 -174)'); censor.append(mosaic); }
  // Outside facing: the original nine-cell pattern never changes orientation.
  svg.append(censor);
  const marks = el('g', { fill: 'none', stroke: '#e4be66', 'stroke-width': 2.2, 'stroke-linecap': 'round', opacity: 0 });
  marks.innerHTML = '<path d="M96 333l-16-7 M101 328l-9-13 M199 333l18-8 M201 326l8-13"/>';
  svg.append(marks); runner.append(svg);
  if (bubble) { bubble.className = 'bubble'; runner.append(bubble); }
  track.replaceChildren(runner);

  const motion = createMotion();
  let scale = 1, range = 0, clock = 0, raf = 0, paused = false, destroyed = false, rate = 1;
  let lastPose = null;
  function resize() {
    // Measure only on resize. Keep room for an upright two-line speech bubble.
    const size = track.getBoundingClientRect();
    scale = Math.min(innerHeight * .00094, size.width / 325);
    scale = Math.max(.25, scale);
    range = Math.max(0, size.width / scale - 300);
    runner.style.bottom = `${-22 * scale}px`;
    motion.advance(0, range);
    render();
  }
  const tf = (node, x, y, angle = 0) => node.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${angle.toFixed(2)})`);
  function drawLimb(nodes, start, end, lengths, bend) {
    const solved = solveLimb(start, end, ...lengths, bend);
    tf(nodes.upper, start.x, start.y, solved.upperAngle);
    tf(nodes.lower, solved.joint.x, solved.joint.y, solved.lowerAngle);
    tf(nodes.extremity, solved.end.x, solved.end.y, nodes.leg ? (end.angle || 0) : solved.lowerAngle);
  }
  function render() {
    const s = motion.snapshot, pose = samplePose(s);
    lastPose = pose;
    runner.style.transform = `translate3d(${(s.x * scale).toFixed(2)}px,0,0) scale(${scale})`;
    facing.setAttribute('transform', `translate(150 0) scale(${s.direction} 1) translate(-150 0)`);
    torso.setAttribute('transform', `translate(${pose.hip.x} ${pose.hip.y}) rotate(${pose.lean}) scale(1 ${pose.squash})`);
    const neck = rotatePoint(0, -80 * pose.squash, pose.lean);
    const hx = pose.hip.x + neck.x, hy = pose.hip.y + neck.y;
    tf(head, hx, hy, pose.headAngle);
    const shoulderL = rotatePoint(-20, -76, pose.lean), shoulderR = rotatePoint(20, -74, pose.lean);
    drawLimb(backArm, { x: pose.hip.x + shoulderL.x, y: pose.hip.y + shoulderL.y }, pose.handL, [33, 31], 1);
    drawLimb(backLeg, { x: pose.hip.x - 16, y: pose.hip.y }, pose.left, [44, 43], -1);
    drawLimb(frontLeg, { x: pose.hip.x + 16, y: pose.hip.y }, pose.right, [44, 43], -1);
    drawLimb(frontArm, { x: pose.hip.x + shoulderR.x, y: pose.hip.y + shoulderR.y }, pose.handR, [33, 31], -1);
    tf(censor, 150 + (pose.hip.x - 150) * s.direction, pose.hip.y + 1);
    shadow.setAttribute('rx', (54 - pose.lift * .3 + pose.impact * 9).toFixed(2));
    shadow.setAttribute('opacity', (.26 - pose.lift * .002).toFixed(3));
    marks.setAttribute('opacity', pose.impact.toFixed(3));
    if (bubble) {
      const headTop = rotatePoint(0, -126, pose.headAngle);
      const bx = 150 + (hx + headTop.x - 150) * s.direction;
      const by = hy + headTop.y - 12;
      bubble.style.transform = `translate(${bx.toFixed(2)}px,${by.toFixed(2)}px) translate(-50%,-100%)`;
    }
  }
  function tick(now) {
    raf = 0;
    if (destroyed || paused || document.hidden) return;
    const dt = clock ? Math.min(.05, (now - clock) / 1000) * rate : 0;
    clock = now;
    motion.advance(dt, range); render();
    if (!motion.snapshot.settled) raf = requestAnimationFrame(tick);
  }
  function wake() {
    clock = 0;
    if (!destroyed && !paused && !document.hidden && !raf) raf = requestAnimationFrame(tick);
  }
  function visibility() {
    cancelAnimationFrame(raf); raf = 0; clock = 0;
    if (!document.hidden) wake();
  }
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', visibility);
  resize(); motion.advance(0, range); render(); wake();
  return {
    setState(state) { motion.setState(state); wake(); },
    pause(value = true) { paused = !!value; cancelAnimationFrame(raf); raf = 0; if (!paused) wake(); },
    setRate(value) { rate = clamp(Number(value) || 1, .05, 2); clock = 0; },
    get info() { return { ...motion.snapshot, scale, range, pose: lastPose, paused, rate, scheduled: !!raf }; },
    destroy() { destroyed = true; cancelAnimationFrame(raf); window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', visibility); },
  };
}
