/* maze3d.js — Engine Mê Cung 3D (Three.js r147) tích hợp trực tiếp vào Mê Cung Tri Thức (100% offline) */
(function (global) {
  "use strict";

  const CAM_MODES = ["🎥 3D Thám hiểm", "🧭 Nhìn từ trên", "🔭 Góc thấp kịch tính"];
  const CELL = 2.0;
  const WALL_H = 0.92;
  const WALL_OUTER_H = 1.12;
  const WALL_T = 0.22;
  const rand = (a, b) => a + Math.random() * (b - a);

  let H = null; // hooks từ index.html
  let active = false;
  let rafId = 0;
  let resizeObs = null;

  const M3 = {
    ready: false, failed: false,
    scene: null, camera: null, renderer: null, clock: null, container: null,
    mazeGroup: null, propsGroup: null, pawnsGroup: null, fxGroup: null, cursorGroup: null,
    torchFlames: [],
    tileMeshes: [],        // mesh sàn từng ô (dùng cho raycasting)
    tileMap: new Map(),    // "x,y" -> { floor, hlMesh, hlMat, dotsGroup, propRoot, propKey }
    pawns: [],             // [{ group, ring, curX, curZ, startX, startZ, targetX, targetZ, moveT }]
    animatedProps: [],     // [{ obj, kind, phase, baseY }]
    particles: [], rings: [],
    raycaster: null,
    partGeo: null,
    texCache: new Map(),
    coordTexCache: new Map(),
    camMode: 0,
    camTarget: null, camGoalTarget: null,
    camSph: { r: 19, theta: 0, phi: 0.72 },
    camGoalSph: { r: 19, theta: 0, phi: 0.72 },
    userOrbit: { theta: 0, phi: 0, rScale: 1 },
    shakeMag: 0, shakeTime: 0,
    mazeRef: null,
    hoveredKey: "",
    // Shared materials
    matWall: null, matWallOuter: null, matWallTrim: null, matWallTrimOuter: null,
    matFloorDark: null, matFloorSeen: null, matFloorVault: null
  };

  function cellPos(x, y, m, yOff = 0) {
    return new THREE.Vector3(
      (x - (m.w - 1) / 2) * CELL,
      yOff,
      (y - (m.h - 1) / 2) * CELL
    );
  }

  function makeTextSprite(text, { color = "#fef08a", bg = "", border = "", font = "900 44px Segoe UI, Arial, sans-serif", stroke = "#090d1a", scale = 0.78 } = {}) {
    const key = text + "|" + color + "|" + bg + "|" + border + "|" + font;
    let tex = M3.texCache.get(key);
    if (!tex) {
      const cv = document.createElement("canvas");
      const ctx = cv.getContext("2d");
      ctx.font = font;
      const m = ctx.measureText(text);
      const padX = bg ? 24 : 14;
      const w = Math.max(64, Math.ceil(m.width + padX * 2));
      const h = bg ? 72 : 66;
      cv.width = w; cv.height = h;
      ctx.font = font;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      if (bg) {
        const r = 16;
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.moveTo(r, 3); ctx.lineTo(w - r, 3); ctx.quadraticCurveTo(w - 3, 3, w - 3, r);
        ctx.lineTo(w - 3, h - r); ctx.quadraticCurveTo(w - 3, h - 3, w - r, h - 3);
        ctx.lineTo(r, h - 3); ctx.quadraticCurveTo(3, h - 3, 3, h - r);
        ctx.lineTo(3, r); ctx.quadraticCurveTo(3, 3, r, 3); ctx.closePath();
        ctx.fill();
        if (border) { ctx.strokeStyle = border; ctx.lineWidth = 5; ctx.stroke(); }
      }
      if (stroke && !bg) {
        ctx.lineWidth = 10; ctx.strokeStyle = stroke; ctx.lineJoin = "round";
        ctx.strokeText(text, w / 2, h / 2 + 2);
      }
      ctx.fillStyle = color;
      ctx.fillText(text, w / 2, h / 2 + 2);
      tex = new THREE.CanvasTexture(cv);
      tex.minFilter = THREE.LinearFilter;
      tex.userData = { aspect: w / h };
      M3.texCache.set(key, tex);
    }
    const aspect = tex.userData.aspect || 1;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sp = new THREE.Sprite(mat);
    sp.scale.set(scale * aspect, scale, 1);
    sp.renderOrder = 25;
    return sp;
  }

  function getCoordLabelTex(label) {
    let tex = M3.coordTexCache.get(label);
    if (!tex) {
      const cv = document.createElement("canvas");
      cv.width = 96; cv.height = 56;
      const ctx = cv.getContext("2d");
      ctx.font = "900 34px Segoe UI, Arial, sans-serif";
      ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.lineWidth = 6; ctx.strokeStyle = "rgba(9,13,26,0.9)"; ctx.lineJoin = "round";
      ctx.strokeText(label, 8, 8);
      ctx.fillStyle = "#cbd5e1";
      ctx.fillText(label, 8, 8);
      tex = new THREE.CanvasTexture(cv);
      tex.minFilter = THREE.LinearFilter;
      M3.coordTexCache.set(label, tex);
    }
    return tex;
  }

  function clearGroup(g) {
    while (g.children.length) {
      const ch = g.children[0];
      g.remove(ch);
    }
  }

  /* ---------- Dựng nền không gian Đền Cổ 3D ---------- */
  function initScene(containerEl) {
    if (M3.ready || M3.failed) return M3.ready;
    if (typeof THREE === "undefined") { M3.failed = true; return false; }

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance", alpha: false });
    } catch (e) {
      M3.failed = true;
      return false;
    }

    M3.container = containerEl;
    M3.renderer = renderer;
    renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
    const rect = containerEl.getBoundingClientRect();
    const w = Math.max(320, Math.floor(rect.width || 800));
    const h = Math.max(240, Math.floor(rect.height || 560));
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    containerEl.innerHTML = "";
    containerEl.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090f22);
    scene.fog = new THREE.FogExp2(0x090f22, 0.017);
    M3.scene = scene;

    const camera = new THREE.PerspectiveCamera(42, w / h, 0.2, 160);
    M3.camera = camera;
    M3.clock = new THREE.Clock();
    M3.raycaster = new THREE.Raycaster();
    M3.partGeo = new THREE.DodecahedronGeometry(1, 0);
    M3.camTarget = new THREE.Vector3(0, 0, 0);
    M3.camGoalTarget = new THREE.Vector3(0, 0, 0);

    // Ánh sáng Đền Thờ Cổ Đại (tương phản rõ giữa đá tối, tường vàng và ô frontier)
    scene.add(new THREE.HemisphereLight(0x93c5fd, 0x0f172a, 0.58));
    const sun = new THREE.DirectionalLight(0xfffbeb, 0.92);
    sun.position.set(11, 22, 13);
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0x38bdf8, 0.42);
    rim.position.set(-14, 10, -12);
    scene.add(rim);

    // Đèn vàng ấm hắt từ tâm Kho Báu
    const centerLight = new THREE.PointLight(0xfbbf24, 1.35, 16, 1.5);
    centerLight.position.set(0, 2.8, 0);
    scene.add(centerLight);

    // Các hạt bụi phép thuật lơ lửng xung quanh đền
    const starCount = 140;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPos[i * 3] = rand(-22, 22);
      starPos[i * 3 + 1] = rand(0.5, 11);
      starPos[i * 3 + 2] = rand(-18, 18);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xfef08a, size: 0.14, transparent: true, opacity: 0.65 });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);
    M3.stars = stars;

    // Shared materials (tương phản rõ nét trên máy chiếu)
    M3.matWall = new THREE.MeshStandardMaterial({ color: 0x1e2d4d, roughness: 0.68, metalness: 0.22 });
    M3.matWallOuter = new THREE.MeshStandardMaterial({ color: 0x16223a, roughness: 0.58, metalness: 0.28 });
    M3.matWallTrim = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0x92400e, emissiveIntensity: 0.45, roughness: 0.32, metalness: 0.7 });
    M3.matWallTrimOuter = new THREE.MeshStandardMaterial({ color: 0xfde047, emissive: 0xb45309, emissiveIntensity: 0.55, roughness: 0.25, metalness: 0.78 });
    M3.matFloorDark = new THREE.MeshStandardMaterial({ color: 0x0a1326, roughness: 0.92, metalness: 0.05 });
    M3.matFloorSeen = new THREE.MeshStandardMaterial({ color: 0x1d3557, emissive: 0x0f2544, emissiveIntensity: 0.35, roughness: 0.75, metalness: 0.1 });
    M3.matFloorVault = new THREE.MeshStandardMaterial({ color: 0x92400e, emissive: 0xd97706, emissiveIntensity: 0.48, roughness: 0.38, metalness: 0.55 });

    // Nhóm chính
    M3.mazeGroup = new THREE.Group();
    M3.propsGroup = new THREE.Group();
    M3.pawnsGroup = new THREE.Group();
    M3.fxGroup = new THREE.Group();
    M3.cursorGroup = new THREE.Group();
    scene.add(M3.mazeGroup, M3.propsGroup, M3.pawnsGroup, M3.fxGroup, M3.cursorGroup);

    // Khung con trỏ 3D (ô đang chọn bằng phím mũi tên hoặc hover)
    const curFrame = new THREE.Mesh(
      new THREE.RingGeometry(0.68, 0.86, 4),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, side: THREE.DoubleSide })
    );
    curFrame.rotation.x = -Math.PI / 2;
    curFrame.rotation.z = Math.PI / 4;
    curFrame.position.y = 0.13;
    const curBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.58, 0.74, 1.35, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })
    );
    curBeam.position.y = 0.72;
    M3.cursorGroup.add(curFrame, curBeam);
    M3.cursorGroup.visible = false;

    bindPointerEvents(renderer.domElement);

    if (typeof ResizeObserver !== "undefined") {
      resizeObs = new ResizeObserver(() => resize());
      resizeObs.observe(containerEl);
    }
    global.addEventListener("resize", resize);

    M3.ready = true;
    return true;
  }

  /* ---------- Camera presets & Orbit ---------- */
  function computeCameraGoal() {
    const G = H.getState();
    const m = G.maze;
    if (!m) return;
    const span = Math.max(m.w, m.h * 1.18);
    const baseR = span * 2.48 + 4.2;
    if (M3.camMode === 0) {
      // 3D Thám hiểm (góc nghiêng đẹp, thoáng đều 4 cột đuốc)
      M3.camGoalTarget.set(0, 0.1, 0.15);
      M3.camGoalSph = { r: baseR * 0.98, theta: 0, phi: 0.72 };
    } else if (M3.camMode === 1) {
      // Nhìn từ trên (chiến thuật, thoáng gọn toàn bộ bản đồ)
      M3.camGoalTarget.set(0, 0, 0);
      M3.camGoalSph = { r: baseR * 1.08, theta: 0, phi: 0.15 };
    } else {
      // Góc thấp kịch tính
      M3.camGoalTarget.set(0, 0.3, 0.35);
      M3.camGoalSph = { r: baseR * 0.92, theta: 0.32, phi: 1.04 };
    }
  }

  function applyCamera(dt) {
    const k = Math.min(1, dt * 6.5);
    M3.camTarget.lerp(M3.camGoalTarget, k);
    const goalR = M3.camGoalSph.r * M3.userOrbit.rScale;
    const goalTheta = M3.camGoalSph.theta + M3.userOrbit.theta;
    const goalPhi = Math.max(0.12, Math.min(1.24, M3.camGoalSph.phi + M3.userOrbit.phi));

    M3.camSph.r += (goalR - M3.camSph.r) * k;
    M3.camSph.theta += (goalTheta - M3.camSph.theta) * k;
    M3.camSph.phi += (goalPhi - M3.camSph.phi) * k;

    const { r, theta, phi } = M3.camSph;
    let sx = 0, sy = 0, sz = 0;
    if (M3.shakeTime > 0) {
      M3.shakeTime = Math.max(0, M3.shakeTime - dt);
      const amp = M3.shakeMag * (M3.shakeTime * 2.5);
      sx = rand(-amp, amp); sy = rand(-amp * 0.6, amp * 0.6); sz = rand(-amp, amp);
    }

    const x = M3.camTarget.x + r * Math.sin(phi) * Math.sin(theta) + sx;
    const y = M3.camTarget.y + r * Math.cos(phi) + sy;
    const z = M3.camTarget.z + r * Math.sin(phi) * Math.cos(theta) + sz;
    M3.camera.position.set(x, y, z);
    M3.camera.lookAt(M3.camTarget);
  }

  /* ---------- Tương tác chuột: Click chọn ô / Kéo xoay / Cuộn zoom ---------- */
  function getHitCell(clientX, clientY) {
    if (!M3.ready || !M3.tileMeshes.length) return null;
    const rect = M3.renderer.domElement.getBoundingClientRect();
    const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -((clientY - rect.top) / rect.height) * 2 + 1;
    M3.raycaster.setFromCamera({ x: nx, y: ny }, M3.camera);
    const hits = M3.raycaster.intersectObjects(M3.tileMeshes, false);
    if (!hits.length) return null;
    return hits[0].object.userData; // { x, y }
  }

  function bindPointerEvents(dom) {
    let dragging = false, moved = 0, lastX = 0, lastY = 0;
    dom.addEventListener("contextmenu", e => e.preventDefault());

    dom.addEventListener("pointerdown", e => {
      if (!active) return;
      dragging = true; moved = 0; lastX = e.clientX; lastY = e.clientY;
      try { dom.setPointerCapture(e.pointerId); } catch (_) {}
    });

    dom.addEventListener("pointermove", e => {
      if (!active) return;
      if (dragging) {
        const dx = e.clientX - lastX, dy = e.clientY - lastY;
        moved += Math.hypot(dx, dy);
        lastX = e.clientX; lastY = e.clientY;
        if (moved > 5) {
          M3.userOrbit.theta -= dx * 0.0065;
          M3.userOrbit.phi = Math.max(-0.55, Math.min(0.45, M3.userOrbit.phi - dy * 0.0045));
          dom.style.cursor = "grabbing";
        }
        return;
      }
      const G = H.getState();
      if (G.phase !== "pick") { dom.style.cursor = "grab"; return; }
      const hit = getHitCell(e.clientX, e.clientY);
      if (!hit) { dom.style.cursor = "grab"; M3.hoveredKey = ""; return; }
      const cell = G.maze.cells[hit.y][hit.x];
      const isVault = cell.type === "vault";
      const isFront = G.frontier.some(f => f.x === hit.x && f.y === hit.y);
      if (isVault || isFront) {
        dom.style.cursor = "pointer";
        const hk = hit.x + "," + hit.y;
        if (hk !== M3.hoveredKey) {
          M3.hoveredKey = hk;
          if (isFront) H.onHoverCell(hit.x, hit.y);
        }
      } else {
        dom.style.cursor = "grab";
        M3.hoveredKey = "";
      }
    });

    const endDrag = e => {
      if (!dragging) return;
      dragging = false;
      try { dom.releasePointerCapture(e.pointerId); } catch (_) {}
      dom.style.cursor = "grab";
      if (moved < 7) {
        const hit = getHitCell(e.clientX, e.clientY);
        if (hit) H.onSelectCell(hit.x, hit.y);
      }
    };
    dom.addEventListener("pointerup", endDrag);
    dom.addEventListener("pointercancel", endDrag);

    dom.addEventListener("wheel", e => {
      if (!active) return;
      e.preventDefault();
      M3.userOrbit.rScale = Math.max(0.62, Math.min(1.55, M3.userOrbit.rScale + e.deltaY * 0.0008));
    }, { passive: false });
  }

  /* ---------- Dựng Mê Cung 3D (Sàn + Tường + Tọa độ + Đuốc 4 góc) ---------- */
  function buildWallSegment(x, z, len, isHoriz, isOuter) {
    const h = isOuter ? WALL_OUTER_H : WALL_H;
    const t = isOuter ? WALL_T + 0.06 : WALL_T;
    const g = new THREE.Group();
    const w = isHoriz ? len + t : t;
    const d = isHoriz ? t : len + t;
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      isOuter ? M3.matWallOuter : M3.matWall
    );
    body.position.set(x, h / 2, z);
    const trim = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.02, 0.09, d + 0.02),
      isOuter ? M3.matWallTrimOuter : M3.matWallTrim
    );
    trim.position.set(x, h + 0.04, z);
    g.add(body, trim);
    return g;
  }

  function buildCornerTorch(x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const pillar = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, WALL_OUTER_H + 0.45, 0.46),
      M3.matWallOuter
    );
    pillar.position.y = (WALL_OUTER_H + 0.45) / 2;
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.14, 0.56),
      M3.matWallTrimOuter
    );
    cap.position.y = WALL_OUTER_H + 0.48;
    const bowl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.14, 0.22, 8),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.7 })
    );
    bowl.position.y = WALL_OUTER_H + 0.65;
    const flameOuter = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 0.52, 7),
      new THREE.MeshBasicMaterial({ color: 0xf97316 })
    );
    flameOuter.position.y = WALL_OUTER_H + 0.96;
    const flameInner = new THREE.Mesh(
      new THREE.ConeGeometry(0.10, 0.34, 6),
      new THREE.MeshBasicMaterial({ color: 0xfef08a })
    );
    flameInner.position.y = WALL_OUTER_H + 0.90;
    g.add(pillar, cap, bowl, flameOuter, flameInner);
    M3.torchFlames.push({ outer: flameOuter, inner: flameInner, phase: rand(0, 6.28) });
    return g;
  }

  function rebuild() {
    if (!M3.ready) return;
    const G = H.getState();
    const m = G.maze;
    if (!m) return;

    clearGroup(M3.mazeGroup);
    clearGroup(M3.propsGroup);
    clearGroup(M3.pawnsGroup);
    M3.tileMeshes = [];
    M3.tileMap.clear();
    M3.pawns = [];
    M3.animatedProps = [];
    M3.torchFlames = [];

    const totalW = m.w * CELL;
    const totalH = m.h * CELL;

    // Bệ đá nền bao quanh mê cung
    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(totalW + 2.2, 0.7, totalH + 2.2),
      new THREE.MeshStandardMaterial({ color: 0x0b1326, roughness: 0.85, metalness: 0.2 })
    );
    plinth.position.y = -0.37;
    const plinthRim = new THREE.Mesh(
      new THREE.BoxGeometry(totalW + 2.34, 0.12, totalH + 2.34),
      new THREE.MeshStandardMaterial({ color: 0xca8a04, roughness: 0.4, metalness: 0.65 })
    );
    plinthRim.position.y = -0.05;
    M3.mazeGroup.add(plinth, plinthRim);

    // 4 cột đuốc cổ đại ở 4 góc ngoài mê cung
    const hx = totalW / 2 + 0.12, hz = totalH / 2 + 0.12;
    [[-hx, -hz], [hx, -hz], [-hx, hz], [hx, hz]].forEach(([tx, tz]) => {
      M3.mazeGroup.add(buildCornerTorch(tx, tz));
    });

    // Nhãn cột A, B, C... và hàng 1, 2, 3...
    for (let x = 0; x < m.w; x++) {
      const p = cellPos(x, 0, m, 0.35);
      const sp = makeTextSprite("ABCDEFGHIJKLM"[x], { color: "#fef08a", scale: 0.62, stroke: "#090d1a" });
      sp.position.set(p.x, 0.55, -totalH / 2 - 0.68);
      M3.mazeGroup.add(sp);
    }
    for (let y = 0; y < m.h; y++) {
      const p = cellPos(0, y, m, 0.35);
      const sp = makeTextSprite(String(y + 1), { color: "#fef08a", scale: 0.62, stroke: "#090d1a" });
      sp.position.set(-totalW / 2 - 0.68, 0.55, p.z);
      M3.mazeGroup.add(sp);
    }

    // Dựng từng ô phòng + nhãn góc tọa độ + khung highlight
    const floorGeo = new THREE.BoxGeometry(CELL - 0.08, 0.12, CELL - 0.08);
    const lblGeo = new THREE.PlaneGeometry(0.68, 0.40);
    const hlGeo = new THREE.PlaneGeometry(CELL - 0.24, CELL - 0.24);

    for (let y = 0; y < m.h; y++) {
      for (let x = 0; x < m.w; x++) {
        const c = m.cells[y][x];
        const p = cellPos(x, y, m, 0);
        const floor = new THREE.Mesh(floorGeo, c.type === "vault" ? M3.matFloorVault : M3.matFloorDark);
        floor.position.set(p.x, 0, p.z);
        floor.userData = { x, y };
        M3.mazeGroup.add(floor);
        M3.tileMeshes.push(floor);

        // Nhãn tọa độ nhỏ khắc ở góc trên trái mặt gạch (vd A1, B2)
        const lbl = H.coordLabel(x, y);
        const lblMesh = new THREE.Mesh(
          lblGeo,
          new THREE.MeshBasicMaterial({ map: getCoordLabelTex(lbl), transparent: true, opacity: 0.72, depthWrite: false })
        );
        lblMesh.rotation.x = -Math.PI / 2;
        lblMesh.position.set(p.x - CELL * 0.27, 0.072, p.z - CELL * 0.30);
        M3.mazeGroup.add(lblMesh);

        // Khung sáng ô có thể chọn (frontier / vault)
        const hlMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.26, depthWrite: false });
        const hlMesh = new THREE.Mesh(hlGeo, hlMat);
        hlMesh.rotation.x = -Math.PI / 2;
        hlMesh.position.set(p.x, 0.075, p.z);
        hlMesh.visible = false;
        M3.mazeGroup.add(hlMesh);

        // Nhóm chấm màu sở hữu đội + gốc vật phẩm 3D
        const dotsGroup = new THREE.Group();
        dotsGroup.position.set(p.x, 0.08, p.z);
        M3.mazeGroup.add(dotsGroup);

        const propRoot = new THREE.Group();
        propRoot.position.set(p.x, 0.08, p.z);
        M3.propsGroup.add(propRoot);

        M3.tileMap.set(x + "," + y, { floor, hlMesh, hlMat, dotsGroup, propRoot, propKey: "", dotsKey: "" });
      }
    }

    // Dựng toàn bộ tường 3D (không trùng lặp cạnh chung)
    for (let y = 0; y < m.h; y++) {
      for (let x = 0; x < m.w; x++) {
        const c = m.cells[y][x];
        const p = cellPos(x, y, m, 0);
        if (c.w.N) M3.mazeGroup.add(buildWallSegment(p.x, p.z - CELL / 2, CELL, true, y === 0));
        if (c.w.W) M3.mazeGroup.add(buildWallSegment(p.x - CELL / 2, p.z, CELL, false, x === 0));
        if (y === m.h - 1 && c.w.S) M3.mazeGroup.add(buildWallSegment(p.x, p.z + CELL / 2, CELL, true, true));
        if (x === m.w - 1 && c.w.E) M3.mazeGroup.add(buildWallSegment(p.x + CELL / 2, p.z, CELL, false, true));
      }
    }

    // Dựng quân cờ 3D cho từng đội
    buildTeamPawns();

    M3.mazeRef = m;
    M3.userOrbit = { theta: 0, phi: 0, rScale: 1 };
    computeCameraGoal();
    // Khởi tạo ngay vị trí camera ban đầu không bị giật
    M3.camTarget.copy(M3.camGoalTarget);
    M3.camSph = { ...M3.camGoalSph };

    sync();
  }

  /* ---------- Dựng Quân Cờ Thám Hiểm 3D ---------- */
  function buildTeamPawns() {
    clearGroup(M3.pawnsGroup);
    M3.pawns = [];
    const G = H.getState();
    const m = G.maze;
    const isTeam = G.teams.length > 1;

    G.teams.forEach(t => {
      const g = new THREE.Group();
      const col = new THREE.Color(t.c);
      const bodyMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.32, metalness: 0.25, emissive: col, emissiveIntensity: 0.18 });
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.28, metalness: 0.72 });

      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.14, 16), goldMat);
      base.position.y = 0.07;
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.68, 16), bodyMat);
      body.position.y = 0.46;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.20, 14, 12), new THREE.MeshStandardMaterial({ color: 0xfffbeb, roughness: 0.45 }));
      head.position.y = 0.90;
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.31, 0.05, 14), bodyMat);
      brim.position.y = 1.03;
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.20, 0.16, 12), bodyMat);
      crown.position.y = 1.12;

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.42, 0.56, 24),
        new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.04;

      const badge = makeTextSprite(isTeam ? String(t.ico) : "🧭", {
        color: "#ffffff", bg: t.c, border: "#ffffff", scale: 0.44, font: "900 36px Segoe UI, Arial, sans-serif"
      });
      badge.position.y = 1.56;

      g.add(base, body, head, brim, crown, ring, badge);

      const p = cellPos(t.pos.x, t.pos.y, m, 0.08);
      g.position.set(p.x, 0.08, p.z);
      M3.pawnsGroup.add(g);

      M3.pawns.push({
        teamIdx: t.i, group: g, ring,
        curX: p.x, curZ: p.z,
        startX: p.x, startZ: p.z,
        targetX: p.x, targetZ: p.z,
        moveT: 1
      });
    });
  }

  /* ---------- Dựng Mô Hình 3D cho từng loại Phòng & Bẫy / May Mắn ---------- */
  function buildPropMesh(kind, dimmed) {
    const root = new THREE.Group();
    const s = dimmed ? 0.68 : 1.0;

    if (kind === "vault") {
      // Cổng Kho Báu 3D: Bệ bậc thang + Cổng vòm đền cổ + Vương miện xoay + Hào quang + Nhãn
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xb45309, emissiveIntensity: 0.42, roughness: 0.25, metalness: 0.8 });
      const brightGold = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 0.65, roughness: 0.2, metalness: 0.85 });
      const stoneMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.3 });

      const step = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.86, 0.16, 8), goldMat);
      step.position.y = 0.08;
      const pL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.18, 0.22), stoneMat);
      pL.position.set(-0.56, 0.68, 0);
      const pR = pL.clone(); pR.position.x = 0.56;
      const arch = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.20, 0.30), goldMat);
      arch.position.set(0, 1.32, 0);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.88, 0.36, 4), goldMat);
      roof.rotation.y = Math.PI / 4;
      roof.position.set(0, 1.60, 0);

      // Vương miện / khối kho báu xoay ở giữa cổng
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.30, 0), brightGold);
      gem.position.y = 0.72;
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.58, 2.3, 16, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false })
      );
      beam.position.y = 1.25;

      const lbl = makeTextSprite("👑 ĐOÁN MÃ!", {
        color: "#1c1917", bg: "#fde047", border: "#b45309", scale: 0.50, font: "900 32px Segoe UI, Arial, sans-serif"
      });
      lbl.position.y = 2.15;

      root.add(step, pL, pR, arch, roof, gem, beam, lbl);
      M3.animatedProps.push({ obj: gem, kind: "spinFloat", phase: 0, baseY: 0.72 });
      return root;
    }

    if (kind === "shard") {
      // Chìa khóa vàng 3D xoay bồng bềnh
      const keyG = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({
        color: dimmed ? 0x94a3b8 : 0xfde047,
        emissive: dimmed ? 0x334155 : 0xd97706,
        emissiveIntensity: dimmed ? 0.15 : 0.55,
        roughness: 0.25, metalness: 0.8
      });
      const bow = new THREE.Mesh(new THREE.TorusGeometry(0.20, 0.06, 8, 16), mat);
      bow.position.y = 0.24;
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.52, 10), mat);
      shaft.position.y = -0.14;
      const tooth1 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.07, 0.06), mat);
      tooth1.position.set(0.11, -0.26, 0);
      const tooth2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.07, 0.06), mat);
      tooth2.position.set(0.09, -0.37, 0);
      keyG.add(bow, shaft, tooth1, tooth2);
      keyG.position.y = 0.65;
      keyG.scale.setScalar(s);
      root.add(keyG);
      M3.animatedProps.push({ obj: keyG, kind: "spinFloat", phase: rand(0, 6.28), baseY: 0.65 });
      return root;
    }

    if (kind === "chest") {
      // Viên pha lê kho báu ngọc lam 3D
      const mat = new THREE.MeshStandardMaterial({
        color: dimmed ? 0x64748b : 0x38bdf8,
        emissive: dimmed ? 0x1e293b : 0x0284c7,
        emissiveIntensity: dimmed ? 0.15 : 0.6,
        roughness: 0.15, metalness: 0.4
      });
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.30 * s, 0), mat);
      gem.scale.set(1, 1.35, 1);
      gem.position.y = 0.58;
      root.add(gem);
      M3.animatedProps.push({ obj: gem, kind: "spinFloat", phase: rand(0, 6.28), baseY: 0.58 });
      return root;
    }

    if (kind === "hint") {
      // Bùa Gợi Ý ánh sáng vàng
      const g = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({
        color: dimmed ? 0x94a3b8 : 0xfef08a,
        emissive: dimmed ? 0x334155 : 0xf59e0b,
        emissiveIntensity: dimmed ? 0.15 : 0.65,
        roughness: 0.2
      });
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.22 * s, 14, 12), mat);
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.32 * s, 0.03, 8, 20), mat);
      halo.rotation.x = Math.PI / 3;
      g.add(orb, halo);
      g.position.y = 0.58;
      root.add(g);
      M3.animatedProps.push({ obj: g, kind: "spinFloat", phase: rand(0, 6.28), baseY: 0.58 });
      return root;
    }

    if (kind === "start") {
      // Cờ xuất phát nhỏ gọn ở góc ô
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.65, 8), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.6 }));
      pole.position.set(0.55, 0.32, -0.52);
      const flag = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.20, 0.04), new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0x9f1239, emissiveIntensity: 0.35 }));
      flag.position.set(0.70, 0.54, -0.52);
      root.add(pole, flag);
      return root;
    }

    if (kind === "mystery") {
      // Ô Bí Ẩn (chưa lộ Bẫy hay May Mắn): Hộp/khối tinh thể tím-vàng phát sáng + dấu ?
      const g = new THREE.Group();
      const box = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.28, 0),
        new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0x7e22ce, emissiveIntensity: 0.65, roughness: 0.25, metalness: 0.45 })
      );
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.38, 0.035, 8, 18),
        new THREE.MeshBasicMaterial({ color: 0xfde047 })
      );
      ring.rotation.x = Math.PI / 2.2;
      g.add(box, ring);
      g.position.y = 0.54;
      const sp = makeTextSprite("❓", { scale: 0.52, stroke: "#1e1b4b" });
      sp.position.y = 1.05;
      root.add(g, sp);
      M3.animatedProps.push({ obj: g, kind: "spinFloat", phase: rand(0, 6.28), baseY: 0.54 });
      return root;
    }

    // ---- CÁC Ô BẪY 3D ĐÃ LỘ ----
    if (kind === "ev_fire") {
      // 🔥 Lửa Thần 3D: 3 cột lửa cam-vàng bập bùng
      const fg = new THREE.Group();
      const scorch = new THREE.Mesh(
        new THREE.CircleGeometry(0.58 * s, 16),
        new THREE.MeshBasicMaterial({ color: 0x7c2d12, transparent: true, opacity: 0.85 })
      );
      scorch.rotation.x = -Math.PI / 2;
      scorch.position.y = 0.02;
      const f1 = new THREE.Mesh(new THREE.ConeGeometry(0.28 * s, 0.85 * s, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
      f1.position.y = 0.42 * s;
      const f2 = new THREE.Mesh(new THREE.ConeGeometry(0.20 * s, 0.68 * s, 8), new THREE.MeshBasicMaterial({ color: 0xf97316 }));
      f2.position.set(0.16 * s, 0.34 * s, 0.10 * s);
      const f3 = new THREE.Mesh(new THREE.ConeGeometry(0.16 * s, 0.56 * s, 7), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
      f3.position.set(-0.12 * s, 0.30 * s, -0.08 * s);
      fg.add(f1, f2, f3);
      const sp = makeTextSprite("🔥", { scale: 0.48 * s });
      sp.position.y = 1.15 * s;
      root.add(scorch, fg, sp);
      M3.animatedProps.push({ obj: fg, kind: "flicker", phase: rand(0, 6.28), baseY: 0 });
      return root;
    }

    if (kind === "ev_abyss") {
      // 🕳️ Vực Sâu 3D: hố đen xoáy tím sâu hút
      const pit = new THREE.Mesh(
        new THREE.CircleGeometry(0.62 * s, 20),
        new THREE.MeshBasicMaterial({ color: 0x020617 })
      );
      pit.rotation.x = -Math.PI / 2;
      pit.position.y = 0.025;
      const swirl = new THREE.Group();
      const r1 = new THREE.Mesh(new THREE.TorusGeometry(0.56 * s, 0.045 * s, 8, 24), new THREE.MeshBasicMaterial({ color: 0xa855f7 }));
      r1.rotation.x = Math.PI / 2;
      r1.position.y = 0.08;
      const r2 = new THREE.Mesh(new THREE.TorusGeometry(0.36 * s, 0.035 * s, 8, 20), new THREE.MeshBasicMaterial({ color: 0xc084fc }));
      r2.rotation.x = Math.PI / 2;
      r2.position.y = 0.14;
      swirl.add(r1, r2);
      const sp = makeTextSprite("🕳️", { scale: 0.48 * s });
      sp.position.y = 0.92 * s;
      root.add(pit, swirl, sp);
      M3.animatedProps.push({ obj: swirl, kind: "spinOnly", phase: rand(0, 6.28), baseY: 0 });
      return root;
    }

    if (kind === "ev_beast") {
      // 🐺 Thú Dữ 3D: tượng đầu sói đỏ sẫm + mắt đỏ phát sáng
      const bg = new THREE.Group();
      const furMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, emissive: 0x450a0a, emissiveIntensity: 0.45, roughness: 0.55 });
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2e2e });
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.46 * s, 0.40 * s, 0.46 * s), furMat);
      head.position.y = 0.44 * s;
      const snout = new THREE.Mesh(new THREE.BoxGeometry(0.24 * s, 0.18 * s, 0.24 * s), furMat);
      snout.position.set(0, 0.36 * s, 0.26 * s);
      const earL = new THREE.Mesh(new THREE.ConeGeometry(0.11 * s, 0.28 * s, 4), furMat);
      earL.position.set(-0.16 * s, 0.74 * s, -0.04 * s);
      const earR = earL.clone(); earR.position.x = 0.16 * s;
      const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.055 * s, 8, 8), eyeMat);
      eyeL.position.set(-0.12 * s, 0.49 * s, 0.23 * s);
      const eyeR = eyeL.clone(); eyeR.position.x = 0.12 * s;
      bg.add(head, snout, earL, earR, eyeL, eyeR);
      const sp = makeTextSprite("🐺", { scale: 0.48 * s });
      sp.position.y = 1.18 * s;
      root.add(bg, sp);
      M3.animatedProps.push({ obj: bg, kind: "bob", phase: rand(0, 6.28), baseY: 0 });
      return root;
    }

    if (kind === "ev_poison") {
      // 🕸️ Độc Khí 3D: vũng độc & bong bóng khí xanh lục
      const pool = new THREE.Mesh(
        new THREE.CircleGeometry(0.56 * s, 16),
        new THREE.MeshBasicMaterial({ color: 0x166534, transparent: true, opacity: 0.85 })
      );
      pool.rotation.x = -Math.PI / 2;
      pool.position.y = 0.025;
      const bubbles = new THREE.Group();
      const bMat = new THREE.MeshStandardMaterial({ color: 0x84cc16, emissive: 0x4d7c0f, emissiveIntensity: 0.7, roughness: 0.2 });
      [[-0.18, 0.24, 0.10, 0.14], [0.18, 0.38, -0.10, 0.12], [0.0, 0.52, 0.08, 0.10]].forEach(([bx, by, bz, br]) => {
        const b = new THREE.Mesh(new THREE.SphereGeometry(br * s, 10, 8), bMat);
        b.position.set(bx * s, by * s, bz * s);
        bubbles.add(b);
      });
      const sp = makeTextSprite("🕸️", { scale: 0.48 * s });
      sp.position.y = 1.05 * s;
      root.add(pool, bubbles, sp);
      M3.animatedProps.push({ obj: bubbles, kind: "bob", phase: rand(0, 6.28), baseY: 0 });
      return root;
    }

    // ---- CÁC Ô MAY MẮN 3D ĐÃ LỘ ----
    if (kind === "ev_free_clue") {
      // 📜 Gợi Ý Miễn Phí 3D: cuộn giấy cổ vàng buộc ruy-băng đỏ
      const sg = new THREE.Group();
      const paper = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14 * s, 0.14 * s, 0.58 * s, 12),
        new THREE.MeshStandardMaterial({ color: 0xfef3c7, emissive: 0xd97706, emissiveIntensity: 0.35, roughness: 0.5 })
      );
      paper.rotation.z = Math.PI / 3;
      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(0.155 * s, 0.155 * s, 0.10 * s, 12),
        new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xb91c1c, emissiveIntensity: 0.4 })
      );
      band.rotation.z = Math.PI / 3;
      sg.add(paper, band);
      sg.position.y = 0.54 * s;
      const sp = makeTextSprite("📜", { scale: 0.48 * s });
      sp.position.y = 1.12 * s;
      root.add(sg, sp);
      M3.animatedProps.push({ obj: sg, kind: "spinFloat", phase: rand(0, 6.28), baseY: 0.54 * s });
      return root;
    }

    if (kind === "ev_steal_pts") {
      // 🧲 Nam Châm Hút 5% Điểm Đội Bạn 3D
      const mg = new THREE.Group();
      const redMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x991b1b, emissiveIntensity: 0.45, roughness: 0.3, metalness: 0.5 });
      const tipMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.65, roughness: 0.2, metalness: 0.7 });
      const arc = new THREE.Mesh(new THREE.TorusGeometry(0.24 * s, 0.08 * s, 8, 16, Math.PI), redMat);
      arc.position.y = 0.08 * s;
      const tipL = new THREE.Mesh(new THREE.CylinderGeometry(0.082 * s, 0.082 * s, 0.16 * s, 10), tipMat);
      tipL.position.set(-0.24 * s, 0, 0);
      const tipR = tipL.clone(); tipR.position.x = 0.24 * s;
      mg.add(arc, tipL, tipR);
      mg.position.y = 0.56 * s;
      const sp = makeTextSprite("🧲", { scale: 0.48 * s });
      sp.position.y = 1.15 * s;
      root.add(mg, sp);
      M3.animatedProps.push({ obj: mg, kind: "spinFloat", phase: rand(0, 6.28), baseY: 0.56 * s });
      return root;
    }

    if (kind === "ev_bonus_100") {
      // 💰 Kho Báu +100đ: chồng đồng tiền vàng 3D
      const cg = new THREE.Group();
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xfde047, emissive: 0xd97706, emissiveIntensity: 0.55, roughness: 0.2, metalness: 0.85 });
      for (let i = 0; i < 3; i++) {
        const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.26 * s, 0.26 * s, 0.07 * s, 16), goldMat);
        coin.position.set((i - 1) * 0.04 * s, 0.08 + i * 0.09 * s, 0);
        cg.add(coin);
      }
      const sp = makeTextSprite("💰", { scale: 0.48 * s });
      sp.position.y = 1.05 * s;
      root.add(cg, sp);
      M3.animatedProps.push({ obj: cg, kind: "spinFloat", phase: rand(0, 6.28), baseY: 0.18 * s });
      return root;
    }

    if (kind === "ev_free_hint") {
      // 🍀 Bùa May Mắn 3D: viên ngọc lục bảo 4 cánh
      const lg = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: 0x34d399, emissive: 0x059669, emissiveIntensity: 0.6, roughness: 0.2, metalness: 0.35 });
      for (let i = 0; i < 4; i++) {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.14 * s, 10, 8), mat);
        const ang = (i * Math.PI) / 2;
        leaf.position.set(Math.cos(ang) * 0.14 * s, 0, Math.sin(ang) * 0.14 * s);
        leaf.scale.set(1, 0.45, 1);
        lg.add(leaf);
      }
      lg.position.y = 0.52 * s;
      const sp = makeTextSprite("🍀", { scale: 0.48 * s });
      sp.position.y = 1.08 * s;
      root.add(lg, sp);
      M3.animatedProps.push({ obj: lg, kind: "spinFloat", phase: rand(0, 6.28), baseY: 0.52 * s });
      return root;
    }

    return root;
  }

  /* ---------- Đồng bộ Trạng Thái 2D -> 3D ---------- */
  function sync() {
    if (!M3.ready) return;
    const G = H.getState();
    const m = G.maze;
    if (!m) return;

    // Nếu mê cung mới hoặc số ô/đội chưa dựng đúng, rebuild
    if (M3.mazeRef !== m || M3.tileMeshes.length !== m.w * m.h || M3.pawns.length !== G.teams.length) {
      rebuild();
      return;
    }

    const cur = G.teams[G.cur];
    const isEnd = G.phase === "end" || G.phase === "map";
    const anySeen = new Set();
    G.teams.forEach(t => t.visited.forEach(k => anySeen.add(k)));

    const frontierSet = new Set();
    if (G.phase === "pick") G.frontier.forEach(f => frontierSet.add(f.x + "," + f.y));

    // Lọc lại danh sách animatedProps khi cần rebuild prop
    let propsChanged = false;

    for (let y = 0; y < m.h; y++) {
      for (let x = 0; x < m.w; x++) {
        const c = m.cells[y][x];
        const k = x + "," + y;
        const view = M3.tileMap.get(k);
        if (!view) continue;

        const seen = anySeen.has(k);
        const isVault = c.type === "vault";
        view.floor.material = isVault ? M3.matFloorVault : (seen ? M3.matFloorSeen : M3.matFloorDark);

        // Highlight ô frontier hoặc Cổng Kho Báu
        const canClick = G.phase === "pick" && (frontierSet.has(k) || isVault);
        view.hlMesh.visible = canClick;
        if (canClick) {
          view.hlMat.color.set(isVault ? "#fde047" : cur.c);
          view.hlMat.opacity = isVault ? 0.42 : 0.38;
        }

        // Chấm sở hữu đội ở cạnh dưới ô
        const owners = G.teams.filter(t => t.visited.has(k));
        const dKey = owners.map(t => t.i).join(",");
        if (dKey !== view.dotsKey) {
          view.dotsKey = dKey;
          clearGroup(view.dotsGroup);
          owners.forEach((t, oi) => {
            const dot = new THREE.Mesh(
              new THREE.CylinderGeometry(0.11, 0.11, 0.05, 10),
              new THREE.MeshBasicMaterial({ color: t.c })
            );
            dot.position.set(-0.62 + oi * 0.28, 0.02, 0.72);
            view.dotsGroup.add(dot);
          });
        }

        // Xác định prop 3D cần hiển thị trên ô
        let propKind = "", dimmed = false;
        if (isVault) {
          propKind = "vault";
        } else if (c.type === "shard") {
          propKind = "shard";
          dimmed = !!(cur && cur.shardCells.has(k));
        } else if (c.type === "chest") {
          propKind = "chest";
          dimmed = !!c.chestTaken;
        } else if (c.type === "hint") {
          propKind = "hint";
          dimmed = !!c.hintTaken;
        } else if (c.type === "start") {
          propKind = "start";
        } else if (c.event) {
          if (c.event.revealed || isEnd) {
            propKind = "ev_" + c.event.id;
            dimmed = !!c.event.revealed && !isEnd;
          } else {
            propKind = "mystery";
          }
        }

        const pKey = propKind + "|" + (dimmed ? "1" : "0");
        if (pKey !== view.propKey) {
          view.propKey = pKey;
          clearGroup(view.propRoot);
          if (propKind) view.propRoot.add(buildPropMesh(propKind, dimmed));
          propsChanged = true;
        }
      }
    }

    if (propsChanged) {
      // Dọn các animatedProps không còn nằm trong scene
      M3.animatedProps = M3.animatedProps.filter(item => {
        let p = item.obj;
        while (p.parent) p = p.parent;
        return p === M3.scene;
      });
    }

    // Khung con trỏ 3D (ô cursor hiện tại)
    if (G.phase === "pick" && G.cursor) {
      const cp = cellPos(G.cursor.x, G.cursor.y, m, 0);
      M3.cursorGroup.position.set(cp.x, 0, cp.z);
      M3.cursorGroup.visible = true;
    } else {
      M3.cursorGroup.visible = false;
    }

    // Cập nhật vị trí đích của quân cờ 3D (hỗ trợ nhiều đội đứng chung ô)
    const grouped = {};
    G.teams.forEach(t => {
      const k = t.pos.x + "," + t.pos.y;
      (grouped[k] = grouped[k] || []).push(t);
    });
    const offsets = [
      [[0, 0]],
      [[-0.38, -0.18], [0.38, 0.18]],
      [[-0.38, -0.28], [0.38, -0.28], [0, 0.34]],
      [[-0.38, -0.30], [0.38, -0.30], [-0.38, 0.30], [0.38, 0.30]]
    ];
    Object.values(grouped).forEach(list => {
      const off = offsets[Math.min(list.length, 4) - 1];
      list.forEach((t, idx) => {
        const pawn = M3.pawns[t.i];
        if (!pawn) return;
        const p = cellPos(t.pos.x, t.pos.y, m, 0.08);
        const tx = p.x + off[idx][0];
        const tz = p.z + off[idx][1];
        if (Math.hypot(tx - pawn.targetX, tz - pawn.targetZ) > 0.05) {
          pawn.startX = pawn.curX;
          pawn.startZ = pawn.curZ;
          pawn.targetX = tx;
          pawn.targetZ = tz;
          pawn.moveT = 0;
        }
        pawn.ring.visible = t.i === G.cur && G.phase === "pick";
      });
    });
  }

  /* ---------- Hiệu Ứng Hạt & Sóng Vòng 3D (Sự kiện Phòng / Bẫy / May Mắn / Kho Báu) ---------- */
  function fxEvent(kind, x, y, accentColor) {
    if (!M3.ready || !active) return;
    const G = H.getState();
    const m = G.maze;
    if (!m) return;
    const p = cellPos(x, y, m, 0.55);

    const palettes = {
      vault: ["#fde047", "#f59e0b", "#ffffff", "#38bdf8", "#4ade80"],
      shard: ["#fde047", "#f59e0b", "#ffffff", "#a855f7"],
      chest: ["#38bdf8", "#fde047", "#ffffff"],
      hint: ["#fef08a", "#fbbf24", "#ffffff"],
      fire: ["#ef4444", "#f97316", "#fde047"],
      abyss: ["#7e22ce", "#a855f7", "#1e1b4b", "#e879f9"],
      beast: ["#dc2626", "#991b1b", "#f97316", "#ffffff"],
      poison: ["#84cc16", "#22c55e", "#bef264"],
      free_clue: ["#fde047", "#fef3c7", "#f59e0b"],
      steal_pts: ["#38bdf8", "#ef4444", "#fde047"],
      bonus_100: ["#fde047", "#4ade80", "#f59e0b"],
      free_hint: ["#34d399", "#fde047", "#ffffff"]
    };
    const cols = palettes[kind] || [accentColor || "#38bdf8", "#fde047", "#ffffff"];
    const isTrap = ["fire", "abyss", "beast", "poison"].includes(kind);
    const count = kind === "vault" ? 56 : isTrap ? 34 : 26;

    for (let i = 0; i < count; i++) {
      const col = cols[i % cols.length];
      const mesh = new THREE.Mesh(M3.partGeo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 1 }));
      const sz = rand(0.08, kind === "vault" ? 0.22 : 0.16);
      mesh.scale.setScalar(sz);
      mesh.position.copy(p);
      M3.fxGroup.add(mesh);
      const ang = rand(0, Math.PI * 2);
      const spd = rand(1.4, kind === "vault" ? 5.6 : 4.0);
      M3.particles.push({
        mesh,
        vx: Math.cos(ang) * spd,
        vy: rand(2.2, kind === "vault" ? 6.8 : 4.8),
        vz: Math.sin(ang) * spd,
        life: 0,
        maxLife: rand(0.65, 1.25),
        baseSize: sz
      });
    }

    // Sóng vòng tròn lan tỏa trên mặt sàn
    const ringCol = cols[0];
    const ringMesh = new THREE.Mesh(
      new THREE.RingGeometry(0.25, 0.42, 24),
      new THREE.MeshBasicMaterial({ color: ringCol, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
    );
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.set(p.x, 0.14, p.z);
    M3.fxGroup.add(ringMesh);
    M3.rings.push({ mesh: ringMesh, life: 0, maxLife: 0.75, maxScale: kind === "vault" ? 5.5 : 3.2 });

    // Rung nhẹ camera khi gặp bẫy hoặc mở tung kho báu
    if (isTrap || kind === "vault") {
      M3.shakeMag = kind === "vault" ? 0.28 : 0.22;
      M3.shakeTime = 0.42;
    }
  }

  /* ---------- Vòng lặp Animation 3D ---------- */
  function animate() {
    if (!active) { rafId = 0; return; }
    rafId = requestAnimationFrame(animate);
    if (!M3.ready) return;
    if (H.isPaused && H.isPaused()) return;

    const dt = Math.min(0.05, M3.clock.getDelta());
    const t = M3.clock.elapsedTime;

    applyCamera(dt);

    // Xoay nhẹ hạt bụi phép thuật
    if (M3.stars) M3.stars.rotation.y = t * 0.025;

    // 4 ngọn đuốc 4 góc bập bùng
    for (let i = 0; i < M3.torchFlames.length; i++) {
      const f = M3.torchFlames[i];
      const w = 1 + Math.sin(t * 9.5 + f.phase) * 0.16 + Math.cos(t * 14 + f.phase) * 0.08;
      f.outer.scale.set(1, w, 1);
      f.inner.scale.set(1, 0.9 + (w - 1) * 1.2, 1);
    }

    // Hoạt ảnh các vật phẩm & bẫy 3D
    for (let i = 0; i < M3.animatedProps.length; i++) {
      const a = M3.animatedProps[i];
      if (a.kind === "spinFloat") {
        a.obj.rotation.y = t * 1.5 + a.phase;
        a.obj.position.y = a.baseY + Math.sin(t * 2.8 + a.phase) * 0.09;
      } else if (a.kind === "flicker") {
        const s = 1 + Math.sin(t * 11 + a.phase) * 0.14;
        a.obj.scale.set(1, s, 1);
        a.obj.rotation.y = t * 2.2 + a.phase;
      } else if (a.kind === "spinOnly") {
        a.obj.rotation.y = -t * 2.4 + a.phase;
      } else if (a.kind === "bob") {
        a.obj.position.y = a.baseY + Math.sin(t * 3.4 + a.phase) * 0.07;
      }
    }

    // Nhấp nháy con trỏ 3D
    if (M3.cursorGroup.visible) {
      const s = 1 + Math.sin(t * 5.2) * 0.06;
      M3.cursorGroup.scale.set(s, 1, s);
    }

    // Di chuyển mượt + nhảy vòng cung của quân cờ 3D
    for (let i = 0; i < M3.pawns.length; i++) {
      const pw = M3.pawns[i];
      if (pw.moveT < 1) {
        pw.moveT = Math.min(1, pw.moveT + dt * 2.6);
        const ease = 1 - Math.pow(1 - pw.moveT, 3);
        pw.curX = pw.startX + (pw.targetX - pw.startX) * ease;
        pw.curZ = pw.startZ + (pw.targetZ - pw.startZ) * ease;
        const hop = Math.sin(pw.moveT * Math.PI) * 0.78;
        pw.group.position.set(pw.curX, 0.08 + hop, pw.curZ);
      } else {
        const bounce = pw.ring.visible ? Math.abs(Math.sin(t * 3.6)) * 0.09 : 0;
        pw.group.position.set(pw.curX, 0.08 + bounce, pw.curZ);
        if (pw.ring.visible) pw.ring.rotation.z = t * 1.8;
      }
    }

    // Cập nhật hạt FX 3D
    for (let i = M3.particles.length - 1; i >= 0; i--) {
      const pt = M3.particles[i];
      pt.life += dt;
      if (pt.life >= pt.maxLife) {
        M3.fxGroup.remove(pt.mesh);
        pt.mesh.material.dispose();
        M3.particles.splice(i, 1);
        continue;
      }
      pt.vy -= 9.5 * dt;
      pt.mesh.position.x += pt.vx * dt;
      pt.mesh.position.y = Math.max(0.08, pt.mesh.position.y + pt.vy * dt);
      pt.mesh.position.z += pt.vz * dt;
      const frac = 1 - pt.life / pt.maxLife;
      pt.mesh.scale.setScalar(pt.baseSize * frac);
      pt.mesh.material.opacity = frac;
    }

    // Cập nhật sóng vòng tròn 3D
    for (let i = M3.rings.length - 1; i >= 0; i--) {
      const rg = M3.rings[i];
      rg.life += dt;
      if (rg.life >= rg.maxLife) {
        M3.fxGroup.remove(rg.mesh);
        rg.mesh.geometry.dispose();
        rg.mesh.material.dispose();
        M3.rings.splice(i, 1);
        continue;
      }
      const p = rg.life / rg.maxLife;
      const sc = 1 + (rg.maxScale - 1) * p;
      rg.mesh.scale.set(sc, sc, 1);
      rg.mesh.material.opacity = (1 - p) * 0.85;
    }

    M3.renderer.render(M3.scene, M3.camera);
  }

  function resize() {
    if (!M3.ready || !M3.container) return;
    const rect = M3.container.getBoundingClientRect();
    const w = Math.max(240, Math.floor(rect.width));
    const h = Math.max(180, Math.floor(rect.height));
    M3.camera.aspect = w / h;
    M3.camera.updateProjectionMatrix();
    M3.renderer.setSize(w, h, false);
  }

  function setActive(on, containerEl, hooks) {
    if (hooks) H = hooks;
    if (on) {
      if (!initScene(containerEl)) return false;
      active = true;
      resize();
      sync();
      if (!rafId) {
        M3.clock.getDelta();
        rafId = requestAnimationFrame(animate);
      }
      return true;
    } else {
      active = false;
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      return true;
    }
  }

  function cycleCamera() {
    M3.camMode = (M3.camMode + 1) % CAM_MODES.length;
    M3.userOrbit = { theta: 0, phi: 0, rScale: 1 };
    computeCameraGoal();
    return CAM_MODES[M3.camMode];
  }

  global.Maze3D = {
    setActive,
    isActive: () => active && M3.ready,
    rebuild,
    sync,
    fxEvent,
    cycleCamera,
    getCameraLabel: () => CAM_MODES[M3.camMode],
    resize
  };
})(window);
