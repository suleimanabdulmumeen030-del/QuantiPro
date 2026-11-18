// QuantiPro backend: zero dependencies. Run: node server.js  (Render start command: node server.js)
const http = require('http'), fs = require('fs'), path = require('path');
const up = (x) => Math.ceil(x - 1e-9);

function calc(i) {
  const P = (k, d) => (i[k] !== '' && i[k] != null && Number.isFinite(+i[k]) ? +i[k] : d);
  const L = P('wallLen', 0), tw = P('trenchW', .7), td = P('trenchD', .9), ft = P('footT', .23), ov = P('overlap', 0);
  const n = P('cols', 0), bs = P('baseSize', 1.2), bt = P('baseT', .23), bed = P('baseExcD', .23);
  const cs = P('colSize', .225), sh = P('shortColH', .9), eh = P('colExtH', 3.5);
  const nl = P('lintels', 0), ll = P('lintelLen', 1.5), ls = P('lintelSize', .225);
  const wh = P('wallH', 3.3), sc = P('subCourses', 4), bh = .225, bl = .45;
  const pl = P('planL', 0), pw = P('planW', 0), st = P('slabT', .1), area = pl * pw;
  const ops = (i.openings || []).map(o => ({ w: +o.w, h: +o.h, q: +o.q })).filter(o => o.w > 0 && o.h > 0 && o.q > 0);
  const opA = ops.reduce((s, o) => s + o.w * o.h * o.q, 0);
  const items = [];
  const it = (g, d, u, q, l, w, o) => items.push({ g, d, u, q: +q.toFixed(3), l, w, o });
  const scope = i.scope || {};

  const fT = String(i.foundation || 'strip'), S2 = 'Bill 2: Substructure', S3 = 'Bill 3: Superstructure', S4 = 'Bill 4: Reinforcement', S5 = 'Bill 5: Formwork';
  const strp = fT === 'strip', pad = fT === 'pad', gW = P('gW', .225), gD = P('gD', .45);
  let exT = 0, exB = 0, blind = 0, strip = 0, base = 0, fC124 = 0, fKg = 0, fwX = 0;
  const gBeam = () => {
    const v = L * gW * gD;
    it(S2, 'Excavate ground beam trenches', 'm³', L * (gW + .2) * gD, .5, `${L} × ${(gW + .2).toFixed(3)} × ${gD}`);
    it(S2, `Ground beams ${gW} × ${gD} m, 1:2:4`, 'm³', v, 1.5, `${L} × ${gW} × ${gD}`);
    it(S4, 'Ground beam reinforcement (130 kg/m³)', 'kg', v * 130, .01, `${v.toFixed(2)} × 130`);
    it(S5, 'Ground beam sides', 'm²', L * 2 * gD, .35, `${L} × 2 × ${gD}`);
    fC124 += v; fKg += v * 130; fwX += L * 2 * gD;
  };
  if (strp || pad) {
    if (strp) { exT = L * tw * td; it(S2, 'Excavate trenches for strip footing', 'm³', exT, .5, `${L} × ${tw} × ${td}`); }
    const bd = pad ? P('padDepth', 1.2) : bed;
    exB = n * bs * bs * bd; it(S2, 'Excavate column bases', 'm³', exB, .5, `${n} × ${bs} × ${bs} × ${bd}`);
    blind = n * bs * bs * .05; it(S2, 'Blinding to column bases, 50 mm, 1:3:6', 'm³', blind, 1, `${n} × ${bs} × ${bs} × 0.05`);
    if (strp) { strip = L * tw * ft - ov; it(S2, 'Strip footing concrete, 1:3:6', 'm³', strip, 1, `${L} × ${tw} × ${ft} − ${ov} overlap`); }
    base = n * bs * bs * bt; it(S2, (pad ? 'Pad footing' : 'Column base') + ' concrete, 1:3:6', 'm³', base, 1, `${n} × ${bs} × ${bs} × ${bt}`);
    if (pad) gBeam();
  } else if (fT === 'raft') {
    const pj = P('raftProj', .3), rt = P('raftT', .3), rd = P('raftDepth', .5), rA2 = (pl + 2 * pj) * (pw + 2 * pj), rP = 2 * (pl + pw + 4 * pj), rv = rA2 * rt, rk = rA2 * 4 / .15 * .888;
    exB = rA2 * rd; blind = rA2 * .05;
    it(S2, 'Excavate for raft', 'm³', exB, .4, `${rA2.toFixed(2)} × ${rd}`);
    it(S2, 'Blinding to raft, 50 mm, 1:3:6', 'm³', blind, 1, `${rA2.toFixed(2)} × 0.05`);
    it(S2, `Raft slab ${rt * 1000} mm, 1:2:4`, 'm³', rv, 1, `${rA2.toFixed(2)} × ${rt}`);
    it(S4, 'Raft mesh, Y12 at 150 mm, top and bottom', 'kg', rk, .01, `${rA2.toFixed(1)} × 4 / 0.15 × 0.888`);
    it(S5, 'Raft edge formwork', 'm²', rP * rt, .35, `${rP.toFixed(2)} × ${rt}`);
    fC124 += rv; fKg += rk; fwX += rP * rt;
  } else {
    const np = P('pileN', n * 2), pdm = P('pileD', .45), pL = P('pileL', 8), cw = P('capW', .9), ct = P('capT', .6);
    const pv = np * Math.PI * pdm * pdm / 4 * pL, cvv = n * cw * cw * ct, pk = np * pL * 12, ck = cvv * 110;
    exB = n * cw * cw * (ct + .3); blind = n * cw * cw * .05;
    it(S2, `Bored piles Ø${Math.round(pdm * 1000)} mm, ${np} no.`, 'm', np * pL, .5, `${np} × ${pL}`);
    it(S2, 'Pile concrete, 1:2:4', 'm³', pv, 1, `${np} × π × ${pdm}² / 4 × ${pL}`);
    it(S2, 'Excavate for pile caps', 'm³', exB, .5, `${n} × ${cw} × ${cw} × ${(ct + .3).toFixed(2)}`);
    it(S2, 'Pile cap blinding, 50 mm, 1:3:6', 'm³', blind, 1, `${n} × ${cw} × ${cw} × 0.05`);
    it(S2, `Pile caps ${cw} × ${cw} × ${ct} m, 1:2:4`, 'm³', cvv, 1.5, `${n} × ${cw} × ${cw} × ${ct}`);
    it(S4, 'Pile cages (about 12 kg per metre)', 'kg', pk, .01, `${np} × ${pL} × 12`);
    it(S4, 'Pile cap reinforcement (110 kg/m³)', 'kg', ck, .01, `${cvv.toFixed(2)} × 110`);
    it(S5, 'Pile cap sides', 'm²', n * 4 * cw * ct, .35, `${n} × 4 × ${cw} × ${ct}`);
    it(S2, 'Piling mobilisation and pile testing', 'sum', 1, 0, 'Provisional');
    gBeam(); fC124 += pv + cvv; fKg += pk + ck; fwX += n * 4 * cw * ct;
  }
  const subA = L * sc * bh - n * cs * sh;
  it('Bill 2: Substructure', 'Blockwork to DPC (225 mm)', 'm²', subA, .15, `${L} × ${sc} × ${bh} − ${n} short columns`);
  const sc_v = n * cs * cs * sh;
  it('Bill 2: Substructure', 'Short columns, 1:2:4', 'm³', sc_v, 1.5, `${n} × ${cs} × ${cs} × ${sh}`);
  it('Bill 2: Substructure', 'DPM over building area', 'm²', area, .06, `${pl} × ${pw}`);
  const slab = fT === 'raft' ? 0 : area * st;
  it('Bill 2: Substructure', `Ground slab, ${st * 1000} mm, 1:3:6`, 'm³', slab, 1, `${pl} × ${pw} × ${st}`);
  const brc = fT === 'raft' ? 0 : area * 1.1;
  it('Bill 2: Substructure', 'BRC mesh A142 (10% laps)', 'm²', brc, .06, `${pl} × ${pw} × 1.1`);
  it('Bill 2: Substructure', 'DPC to walls (225 mm wide)', 'm²', L * .225, .06, `${L} × 0.225`);

  const ext = n * cs * cs * eh, lin = nl * ll * ls * ls;
  it('Bill 3: Superstructure', 'Column extension, 1:2:4', 'm³', ext, 1.5, `${n} × ${cs} × ${cs} × ${eh}`);
  it('Bill 3: Superstructure', 'Lintels, 1:2:4', 'm³', lin, 1.5, `${nl} × ${ll} × ${ls} × ${ls}`);
  const supA = L * wh - opA - n * cs * wh;
  const p150 = Math.min(P('p150', 0), L), p100 = Math.min(P('p100', 0), L - p150);
  const fr = L > 0 ? [[225, (L - p150 - p100) / L], [150, p150 / L], [100, p100 / L]] : [[225, 1]];
  fr.forEach(([t, f]) => f > 0 && it('Bill 3: Superstructure', `Blockwork above DPC (${t} mm), openings deducted`, 'm²', supA * f, .15, `${supA.toFixed(2)} × ${(f * 100).toFixed(0)}% of wall length`));

  // Reinforcement
  const link = 4 * (cs - .05) + .2, perDir = up((bs - .1) / .175) + 1;
  const y12s = (strp || pad ? n * 2 * perDir * (bs - .1) : 0) + n * 4 * 2.5, y12c = n * 4 * 4, y12l = nl * 4 * ll;
  const y10s = n * (up(sh / .2) + 1) * link, y10c = n * (up(eh / .2) + 1) * link, y10l = nl * (up(ll / .25) + 1) * link;
  [['Y12 bars: column bases and starter bars', y12s, .888], ['Y10 links to starter bars', y10s, .617], ['Y12 bars: column extension', y12c, .888],
   ['Y10 links: column extension', y10c, .617], ['Y12 bars: lintels', y12l, .888], ['Y10 stirrups: lintels', y10l, .617]]
    .forEach(([d, m, kg]) => it('Bill 4: Reinforcement', d, 'kg', m * kg, .01, `${m.toFixed(1)} m × ${kg}`));

  // Formwork
  it('Bill 5: Formwork', 'Short columns', 'm²', n * 4 * cs * sh, .35, `${n} × 4 × ${cs} × ${sh}`);
  it('Bill 5: Formwork', 'Column extension', 'm²', n * 4 * cs * eh, .35, `${n} × 4 × ${cs} × ${eh}`);
  it('Bill 5: Formwork', 'Lintels (sides and soffit)', 'm²', nl * 3 * ls * ll, .35, `${nl} × 3 × ${ls} × ${ll}`);
  const fw = n * 4 * cs * (sh + eh) + nl * 3 * ls * ll;

  // ---- Bills 1, 6-11: preliminaries, roof, joinery, finishes, services, external works
  const B1 = 'Bill 1: Preliminaries', B2 = 'Bill 2: Substructure', B3 = 'Bill 3: Superstructure', B6 = 'Bill 6: Roofing and carpentry',
    B7 = 'Bill 7: Doors and windows', B8 = 'Bill 8: Finishes', B9 = 'Bill 9: Electrical installation',
    B10 = 'Bill 10: Plumbing and drainage', B11 = 'Bill 11: External works (provisional)';
  const E = 2 * (pl + pw), notes = [], sum = (a, f) => a.reduce((s, r) => s + f(r), 0);
  ['Setting out and survey', 'Temporary site office, store and toilet', 'Water and power for the works', 'Insurance, safety and site security', 'Site supervision and administration']
    .forEach(d => it(B1, d, 'sum', 1, 0, 'Lump sum'));
  it(B2, 'Site clearance, building area plus 1 m margin', 'm²', (pl + 2) * (pw + 2), .05, `(${pl} + 2) × (${pw} + 2)`);
  it(B2, 'Strip topsoil, 150 mm', 'm²', area, .05, `${pl} × ${pw}`);
  const fillH = P('fillH', .45), fillV = area * fillH;
  it(B2, 'Backfill and compact in layers to DPC level', 'm³', fillV, .4, `${pl} × ${pw} × ${fillH}`);
  it(B2, 'Hardcore filling, 150 mm, compacted', 'm³', area * .15, .4, `${pl} × ${pw} × 0.15`);
  it(B2, 'Anti-termite treatment to filling', 'm²', area, .03, `${pl} × ${pw}`);
  it(B2, 'Cart away surplus excavated soil', 'm³', Math.max(0, exT + exB - fillV), .3, 'Excavation less backfill');
  it(B2, 'Extra over excavation for rock', 'm³', P('rockV', 0), 1.5, 'Measured on site');
  it(B2, 'Sand blinding to hardcore, 50 mm', 'm²', area, .05, `${pl} × ${pw}`);
  it(B2, 'Planking and strutting to excavation sides', 'm²', strp ? L * td * 2 : n * 4 * bs * (pad ? P('padDepth', 1.2) : bed), .15, 'Both sides of trenches or around pits', 'planking');
  it(B2, 'Keep excavations free of water (dewatering)', 'sum', 1, 0, 'Provisional', 'dewater');
  const rb = P('ringBeam', 0), ring = rb > 0 ? L * rb * rb : 0, rY12 = ring ? L * 4 : 0, rY10 = ring ? (up(L / .25) + 1) * (4 * (rb - .05) + .2) : 0;
  if (ring) {
    it(B3, `Ring beam ${rb} × ${rb} m, 1:2:4`, 'm³', ring, 1.5, `${L} × ${rb} × ${rb}`);
    it('Bill 4: Reinforcement', 'Ring beam: 4Y12 bars and Y10 links at 250 mm', 'kg', rY12 * .888 + rY10 * .617, .01, 'Main bars + links');
    it('Bill 5: Formwork', 'Ring beam sides and soffit', 'm²', L * 3 * rb, .35, `${L} × 3 × ${rb}`);
  }
  // Rooms drive the finishes
  const given = (i.rooms || []).length > 0;
  const rooms = (i.rooms || []).map(r => ({ l: +r.l, w: +r.w, f: String(r.f || 'T').toUpperCase(), t: +r.t || 0, c: String(r.c || 'Y').toUpperCase() })).filter(r => r.l > 0 && r.w > 0);
  if (!rooms.length) { rooms.push({ l: pl, w: pw, f: 'T', t: 0, c: 'Y' }); if (scope.fin !== false || scope.serv !== false) notes.push('No rooms entered, so finishes use the whole plan area. Add your rooms for accurate floors, tiles and ceilings.'); }
  const fA = sum(rooms, r => r.l * r.w), tRooms = rooms.filter(r => r.f === 'T'), tA = sum(tRooms, r => r.l * r.w);
  const cA = sum(rooms.filter(r => r.c === 'Y'), r => r.l * r.w), wetN = rooms.filter(r => r.t > 0).length, wtA = sum(rooms, r => 2 * (r.l + r.w) * r.t);
  const per = given ? sum(rooms, r => 2 * (r.l + r.w)) : 2 * L - E;
  const doors = ops.filter(o => o.h >= 1.9), wins = ops.filter(o => o.h < 1.9);
  const dN = sum(doors, o => o.q), dW = sum(doors, o => o.w * o.q), wA = sum(wins, o => o.w * o.h * o.q), dA = opA - wA;
  const extDA = dN ? P('extDoors', 2) * dA / dN : 0;
  const pI = Math.max(0, per * wh - opA), pE = Math.max(0, E * wh - wA - extDA);
  doors.forEach(o => it(B7, `${i.doorType || 'Timber flush'} door ${o.w} × ${o.h} m, with frame and architrave`, 'no.', o.q, 1, ''));
  it(B7, 'Door ironmongery set (lock, hinges, stoppers)', 'no.', dN, .3, `${dN} doors`);
  wins.forEach(o => it(B7, `${i.winType || 'Aluminium'} window ${o.w} × ${o.h} m, with frame`, 'no.', o.q, 1, ''));
  it(B7, 'Window glazing, 5 mm', 'm²', wA, .2, 'Total window area');
  it(B7, 'Burglar proofing to windows', 'm²', wA, .4, 'Total window area');
  it(B8, 'Cement and sand screed, 50 mm, to floors', 'm²', fA, .1, `${rooms.length} room(s)`);
  it(B8, 'Floor tiles 600 × 600 mm with adhesive', 'm²', tA, .25, 'Rooms marked T');
  it(B8, 'Skirting tiles, 100 mm high', 'm', Math.max(0, sum(tRooms, r => 2 * (r.l + r.w)) - dW), .15, 'Tiled room perimeters less door widths');
  it(B8, 'Wall tiles in wet areas', 'm²', wtA, .4, 'Room perimeters × tile height');
  it(B8, 'Internal plaster, 15 mm', 'm²', pI, .2, `${per.toFixed(2)} × ${wh} − openings`);
  it(B8, 'External plaster, 20 mm', 'm²', pE, .25, `${E.toFixed(2)} × ${wh} − windows − external doors`);
  it(B8, 'Emulsion paint to internal walls, sealer + 2 coats', 'm²', Math.max(0, pI - wtA), .06, 'Plastered area less wall tiles');
  it(B8, 'Weatherproof paint to external walls, 2 coats', 'm²', pE, .06, 'External plaster area');
  it(B8, 'Ceiling boards (PVC or POP) with brandering', 'm²', cA, .3, 'Rooms marked Y');
  it(B8, 'Emulsion paint to ceilings', 'm²', cA, .06, 'Ceiling area');
  it(B8, 'Gloss paint to doors, both sides', 'm²', dA * 2, .15, `${dA.toFixed(2)} × 2`);
  // Roof (gable assumed, ridge along the plan length)
  const oh = P('overhang', .6), pit = P('pitch', 20) * Math.PI / 180, span = pw + 2 * oh, sl = span / 2 / Math.cos(pit), rl = pl + 2 * oh, rA = 2 * sl * rl;
  const steelR = i.roofFrame === 'steel', nT = up(rl / P('trussSp', 1.2)) + 1, tm = nT * (span + 2 * sl + .9 * span), pu = 2 * (up(sl / .9) + 1) * rl;
  it(B6, `Roof trusses 50 × 100 mm (${nT} no., estimate)`, 'm', steelR ? 0 : tm, .08, 'Rafters, tie beam and webs');
  it(B6, 'Purlins 50 × 75 mm at 900 mm', 'm', steelR ? 0 : pu, .05, `2 × rows × ${rl.toFixed(2)}`);
  it(B6, 'Steel roof trusses and purlins (estimate, about 10 kg/m²)', 'kg', steelR ? rA * 10 : 0, .02, 'Roof area × 10');
  it(B6, (i.roofCover || 'Longspan aluminium sheets') + ', fixed', 'm²', rA, .1, `2 × ${sl.toFixed(2)} × ${rl.toFixed(2)}`);
  it(B6, 'Ridge capping', 'm', rl, .1, 'Roof length');
  it(B6, 'Fascia and barge boards, 25 × 200 mm', 'm', 2 * rl + 4 * sl, .15, '');
  it(B6, 'PVC eaves gutter', 'm', 2 * rl, .1, '2 × roof length');
  it(B6, 'PVC downpipes', 'm', P('downpipes', 4) * (wh + .3), .1, `${P('downpipes', 4)} × ${(wh + .3).toFixed(1)}`);
  // Services: blank counts are estimated from the floor area and wet rooms
  const est = (k, d) => P(k, -1) >= 0 ? P(k, 0) : Math.round(d);
  const wc = est('wc', wetN), whb = est('whb', wetN), shw = est('showers', wetN), snk = est('sinks', 1);
  [[B9, 'Lighting points, wired in conduit', est('lights', fA / 9)], [B9, '13 A socket outlets', est('sockets', fA / 10)], [B9, 'Switches', est('switches', fA / 12)],
   [B9, 'Air-conditioner points', est('acPts', 0)], [B9, 'Distribution board, 12-way with breakers', 1], [B9, 'Earthing installation', 1],
   [B10, 'WC suite with cistern', wc], [B10, 'Wash hand basin with taps', whb], [B10, 'Shower unit with mixer', shw], [B10, 'Kitchen sink with taps', snk],
   [B10, 'Septic tank (provisional)', P('septic', 1)], [B10, 'Soakaway (provisional)', P('septic', 1)], [B10, 'Manholes', P('manholes', 2)]]
    .forEach(([g, d, q]) => it(g, d, 'no.', q, 1, ''));
  it(B10, 'Water supply pipework (PPR)', 'sum', 1, 0, 'Provisional');
  it(B10, 'uPVC drain pipes, 110 mm', 'm', P('drainM', 20), .1, 'Provisional length');
  if (scope.serv !== false) notes.push('Electrical and plumbing counts, roof timber and drains are estimates. Enter your own counts in the fields above when you have them.');
  it(B11, 'Concrete apron 900 mm wide round building, 100 mm', 'm²', E * .9, .4, `${E.toFixed(2)} × 0.9`);
  ['Perimeter fence and gate', 'Landscaping and driveway', 'Borehole and water supply'].forEach(d => it(B11, d, 'sum', 1, 0, 'Provisional sum'));

  // ---- Upper floors, staircase, retaining wall
  const fl = Math.max(1, P('floors', 1)) - 1, fh = P('floorH', 3.3);
  if (fl > 0) {
    const sT = P('upSlabT', .15), sv = area * sT * fl, bv = L * .225 * .45 * fl, cv2 = n * cs * cs * fh * fl;
    const kg = sv * 90 + bv * 130 + cv2 * 150, fwm = area * fl + L * (2 * .45 + .225) * fl + n * 4 * cs * fh * fl;
    it(S3, `Suspended slab ${sT * 1000} mm, 1:2:4`, 'm³', sv, 1.5, `${pl} × ${pw} × ${sT} × ${fl} floor(s)`);
    it(S3, 'Floor beams 225 × 450 mm, 1:2:4', 'm³', bv, 1.5, `${L} × 0.225 × 0.45 × ${fl}`);
    it(S3, 'Upper floor columns, 1:2:4', 'm³', cv2, 1.5, `${n} × ${cs} × ${cs} × ${fh} × ${fl}`);
    fr.forEach(([t, f]) => f > 0 && it(S3, `Blockwork to upper floor walls (${t} mm)`, 'm²', supA * fl * f, .15, `${supA.toFixed(1)} × ${fl}`));
    it(S4, 'Upper floor slab, beam and column steel', 'kg', kg, .01, 'Slab 90, beam 130, column 150 kg/m³');
    it(S5, 'Upper floor soffit, beam and column formwork', 'm²', fwm, .35, 'Soffit + beam faces + columns');
    fC124 += sv + bv + cv2; fKg += kg; fwX += fwm;
    if (scope.fin !== false) notes.push('Add your upper floor rooms to the rooms list so their finishes are measured.');
  }
  const sN = P('stairs', fl > 0 ? 1 : 0);
  if (sN > 0) {
    const sW = P('stairW', 1), R = up(fh / .175), slope = Math.hypot((R - 1) * .275, fh);
    const sv2 = sN * (sW * slope * .15 + R * .5 * .175 * .275 * sW + sW * 1.2 * .15), k2 = sv2 * 110, f2m = sN * (sW * slope + R * .175 * sW);
    it(S3, `Staircase, ${R} risers, 150 mm waist, 1:2:4`, 'm³', sv2, 2, `${sN} × (flight + steps + landing)`);
    it(S4, 'Staircase reinforcement (110 kg/m³)', 'kg', k2, .01, `${sv2.toFixed(2)} × 110`);
    it(S5, 'Staircase soffit and risers', 'm²', f2m, .4, '');
    it(B8, 'Stair tread and riser finish', 'm²', sN * R * (.275 + .175) * sW, .3, `${sN} × ${R} × 0.45 × ${sW}`);
    it(B8, 'Handrail and balustrade', 'm', sN * (slope + 1.5), .5, 'Flight + landing');
    fC124 += sv2; fKg += k2; fwX += f2m;
  }
  const rwL = P('rwLen', 0);
  if (rwL > 0) {
    const rH = P('rwH', 1.5), rT = P('rwT', .225), fW = P('rwFootW', 1), fv = rwL * fW * .3, sv3 = rwL * rH * rT, k3 = (fv + sv3) * 90, f3 = rwL * (2 * rH + .6);
    it(B11, 'Excavate for retaining wall footing', 'm³', rwL * (fW + .2) * .35, .5, `${rwL} × ${(fW + .2).toFixed(2)} × 0.35`);
    it(B11, 'Retaining wall footing, 300 mm, 1:2:4', 'm³', fv, 1.2, `${rwL} × ${fW} × 0.3`);
    it(B11, `Retaining wall stem, ${rT * 1000} mm thick, 1:2:4`, 'm³', sv3, 1.5, `${rwL} × ${rH} × ${rT}`);
    it(B11, 'Retaining wall reinforcement (90 kg/m³)', 'kg', k3, .01, `${(fv + sv3).toFixed(2)} × 90`);
    it(B11, 'Retaining wall formwork', 'm²', f3, .35, `${rwL} × (2 × ${rH} + 0.6)`);
    it(B11, 'Weepholes, 75 mm at 1.5 m', 'no.', up(rwL / 1.5), .1, `${rwL} / 1.5`);
    it(B11, 'Granular drainage behind wall', 'm³', rwL * .4 * rH, .4, `${rwL} × 0.4 × ${rH}`);
    it(B11, 'Bituminous waterproofing to earth face', 'm²', rwL * rH, .1, `${rwL} × ${rH}`);
    fC124 += fv + sv3; fKg += k3; fwX += f3;
  }

  // ---- Keep only the sections the user selected, then build materials from the kept items
  const secOf = (x) => {
    const b = +(/\d+/.exec(x.g) || [0])[0];
    if (b === 1) return 'prelim'; if (b === 2) return 'sub'; if (b === 6) return 'roof'; if (b === 7) return 'open'; if (b === 8) return 'fin';
    if (b === 9 || b === 10) return 'serv'; if (b === 11) return 'ext';
    if (/^Blockwork|[Ll]intel|Ring beam/.test(x.d)) return 'wall';
    if (/base|starter|raft|[Pp]ile|[Gg]round beam|[Ss]hort column/.test(x.d)) return 'sub';
    return 'frame';
  };
  items.forEach(x => { x.s = secOf(x); });
  const out = items.filter(x => (x.q > 0 || x.u === 'sum') && scope[x.s] !== false && (!x.o || scope[x.o] === true));
  const bn = x => +(/\d+/.exec(x.g) || [99])[0];
  out.sort((a, b) => bn(a) - bn(b));
  out.forEach(x => { if (x.u === 'm²' && /^Blockwork/.test(x.d)) x.blocks = up(x.q / (bl * bh) * 1.05); });
  const sm = (re, u) => out.filter(x => re.test(x.d) && (!u || x.u === u)).reduce((t, x) => t + x.q, 0);
  const mix = (v, c, s, g) => { const d = v * 1.54, t = c + s + g; return { cem: d * c / t * 28.8, sand: d * s / t * 1.6, gr: d * g / t * 1.5 }; };
  const a = mix(sm(/1:3:6/, 'm³'), 1, 3, 6), b = mix(sm(/1:2:4/, 'm³'), 1, 2, 4);
  const blkA = sm(/^Blockwork/, 'm²'), mortarV = blkA * .03 * 1.33, m = { cem: mortarV / 7 * 28.8, sand: mortarV * 6 / 7 * 1.6 };
  const scrV = sm(/^Cement and sand screed/, 'm²') * .05 * 1.33, plV = (sm(/^Internal plaster/, 'm²') * .015 + sm(/^External plaster/, 'm²') * .02) * 1.33;
  const tA2 = sm(/^Floor tiles/, 'm²'), wtA2 = sm(/^Wall tiles/, 'm²');
  const mat = [], mt = (d, u, q) => mat.push({ d, u, q: +q.toFixed(2) });
  mt('Cement, concrete 1:3:6', 'bags', up(a.cem)); mt('Cement, concrete 1:2:4', 'bags', up(b.cem));
  mt('Cement, blockwork mortar 1:6', 'bags', up(m.cem));
  mt('Cement, screed and plaster', 'bags', up((scrV / 4 + plV / 5) * 28.8));
  mt('Sharp sand, concrete', 'tonnes', a.sand + b.sand); mt('Sand, blockwork mortar', 'tonnes', m.sand);
  mt('Sand, screed and plaster', 'tonnes', (scrV * .75 + plV * .8) * 1.6);
  mt('Gravel / granite', 'tonnes', a.gr + b.gr); mt('Hardcore', 'm³', sm(/^Hardcore/, 'm³'));
  [225, 150, 100].forEach(t => mt(`${t} mm blocks (5% waste)`, 'no.', up(sm(new RegExp('^Blockwork.*\\(' + t + ' mm\\)'), 'm²') / (bl * bh) * 1.05)));
  mt('Y12 bars (12 m lengths)', 'lengths', up(sm(/^Y12/, 'kg') / .888 / 12)); mt('Y10 bars (12 m lengths)', 'lengths', up(sm(/^Y10/, 'kg') / .617 / 12));
  mt('Other reinforcement: beams, slabs, piles, raft, stairs (kg of bars)', 'kg', out.filter(x => x.u === 'kg' && /^Bill 4/.test(x.g) && !/^Y1[02]/.test(x.d)).reduce((t, x) => t + x.q, 0));
  mt('BRC mesh A142 (2.4 × 48 m roll)', 'rolls', up(sm(/^BRC mesh/, 'm²') / 115.2)); mt('DPM', 'm²', sm(/^DPM/, 'm²'));
  mt('Planks 1" × 12" × 12 ft (3 uses)', 'no.', up(out.filter(x => /^Bill 5/.test(x.g)).reduce((t, x) => t + x.q, 0) / 1.08 / 3));
  mt('Floor tiles 600 × 600 (5% waste)', 'm²', tA2 * 1.05); mt('Wall tiles (5% waste)', 'm²', wtA2 * 1.05); mt('Tile adhesive (about 4 m² per bag)', 'bags', up((tA2 + wtA2) / 4));
  mt('Emulsion paint', 'litres', sm(/^Emulsion paint/, 'm²') * 3 / 10); mt('Weatherproof paint', 'litres', sm(/^Weatherproof/, 'm²') * 2 / 8); mt('Gloss paint', 'litres', sm(/^Gloss paint/, 'm²') * 2 / 12);
  mt('Roofing sheets (10% laps)', 'm²', sm(/, fixed$/, 'm²') * 1.1); mt('Steel roof framing', 'kg', sm(/^Steel roof/, 'kg')); mt('Roof truss timber 50 × 100 mm', 'm', sm(/^Roof trusses/, 'm')); mt('Purlins 50 × 75 mm', 'm', sm(/^Purlins/, 'm'));
  mt('Ceiling boards (5% waste)', 'm²', sm(/^Ceiling boards/, 'm²') * 1.05);
  return { items: out, notes, materials: mat.filter(m => m.q > 0), summary: { foundationConcrete: +(strip + base).toFixed(2), openingArea: +opA.toFixed(2) } };
}

// Login: set SUPABASE_URL and SUPABASE_ANON_KEY in Render. Without them the takeoff stays locked (set ALLOW_OPEN=true only for local testing).
const AUTH_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, ''), AUTH_KEY = process.env.SUPABASE_ANON_KEY || '';
const authOn = !!(AUTH_URL && AUTH_KEY), devOpen = process.env.ALLOW_OPEN === 'true' && !authOn, seen = new Map();
async function userFor(token) {
  const hit = seen.get(token); if (hit && hit.t > Date.now()) return hit.u;
  try {
    const r = await fetch(AUTH_URL + '/auth/v1/user', { headers: { apikey: AUTH_KEY, Authorization: 'Bearer ' + token } });
    if (!r.ok) return null;
    const u = await r.json(); if (u.banned_until && new Date(u.banned_until) > new Date()) return null; if (seen.size > 500) seen.clear(); seen.set(token, { u, t: Date.now() + 60000 });
    return u;
  } catch (e) { return null; }
}
// Admin: set SUPABASE_SERVICE_KEY (secret, server only) and ADMIN_EMAILS (comma separated) in Render.
const SVC = process.env.SUPABASE_SERVICE_KEY || '', ADMINS = (process.env.ADMIN_EMAILS || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
const adminOn = authOn && !!SVC && ADMINS.length > 0;
async function adminFor(req) {
  const t = (req.headers.authorization || '').replace(/^Bearer /, ''), u = t && await userFor(t);
  return u && u.email && (u.email_confirmed_at || u.confirmed_at) && ADMINS.includes(u.email.toLowerCase()) ? u : null;
}
const gotrue = (p, method = 'GET', body) => fetch(AUTH_URL + '/auth/v1/admin/' + p, { method, headers: { apikey: SVC, Authorization: 'Bearer ' + SVC, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
const readBody = (req) => new Promise((ok, no) => { let raw = ''; req.on('data', c => { raw += c; if (raw.length > 1e5) req.destroy(); }); req.on('end', () => ok(raw)); req.on('error', no); });
const send = (res, code, body, type = 'application/json') => {
  res.writeHead(code, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
};
http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, '');
  if (req.url === '/api/health') return send(res, 200, { ok: true });
  if (req.url === '/api/config') return send(res, 200, { auth: authOn, open: devOpen, url: AUTH_URL, key: AUTH_KEY });
  if (req.url === '/api/me') return send(res, 200, { admin: !!(adminOn && await adminFor(req)) });
  if (req.url.startsWith('/api/admin/')) {
    if (!adminOn) return send(res, 503, { error: 'Admin is not set up on the server yet' });
    const me = await adminFor(req); if (!me) return send(res, 403, { error: 'Admins only' });
    try {
      if (req.method === 'GET' && req.url === '/api/admin/users') {
        const r = await gotrue('users?per_page=1000'); if (!r.ok) throw new Error(); const d = await r.json();
        return send(res, 200, { users: (d.users || []).map(u => ({ id: u.id, email: u.email, created: u.created_at, last: u.last_sign_in_at, confirmed: !!(u.email_confirmed_at || u.confirmed_at), banned: !!(u.banned_until && new Date(u.banned_until) > new Date()), plan: (u.app_metadata || {}).plan || '' })) });
      }
      if (req.method === 'POST' && req.url === '/api/admin/user') {
        const b = JSON.parse(await readBody(req)), id = String(b.id || ''), PL = ['', 'Free trial', 'Student', 'Professional', 'Team or school'];
        if (!/^[0-9a-f-]{36}$/i.test(id)) return send(res, 400, { error: 'Invalid user' });
        if (id === me.id && (b.action === 'block' || b.action === 'delete')) return send(res, 400, { error: 'You cannot do that to your own account' });
        const r = b.action === 'delete' ? await gotrue('users/' + id, 'DELETE')
          : b.action === 'block' ? await gotrue('users/' + id, 'PUT', { ban_duration: '876000h' })
          : b.action === 'unblock' ? await gotrue('users/' + id, 'PUT', { ban_duration: 'none' })
          : b.action === 'plan' && PL.includes(b.plan) ? await gotrue('users/' + id, 'PUT', { app_metadata: { plan: b.plan } }) : null;
        if (!r) return send(res, 400, { error: 'Unknown action' });
        if (!r.ok) throw new Error();
        seen.clear(); return send(res, 200, { ok: true });
      }
    } catch (e) { return send(res, 502, { error: 'The request failed. Please try again.' }); }
    return send(res, 404, { error: 'Not found' });
  }
  if (req.method === 'POST' && req.url === '/api/takeoff') {
    if (authOn) { const t = (req.headers.authorization || '').replace(/^Bearer /, ''); if (!t || !(await userFor(t))) return send(res, 401, { error: 'Please log in' }); } else if (!devOpen) return send(res, 503, { error: 'Login is not set up on the server' });
    let raw = ''; req.on('data', c => { raw += c; if (raw.length > 1e6) req.destroy(); });
    return req.on('end', () => { try { send(res, 200, calc(JSON.parse(raw || '{}'))); } catch (e) { send(res, 400, { error: 'Invalid input' }); } });
  }
  if (req.method === 'GET' && req.url.startsWith('/img/')) {
    const f = path.join(__dirname, 'img', path.basename(req.url.split('?')[0])), T = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }, t = T[path.extname(f).toLowerCase()];
    return t ? fs.readFile(f, (e, d) => e ? send(res, 404, 'Not found', 'text/plain') : send(res, 200, d, t)) : send(res, 404, 'Not found', 'text/plain');
  }
  fs.readFile(path.join(__dirname, 'index.html'), (e, d) => e ? send(res, 404, 'Not found', 'text/plain') : send(res, 200, d, 'text/html'));
}).listen(process.env.PORT || 3000, () => console.log('QuantiPro running'));
