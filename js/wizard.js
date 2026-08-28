'use strict';

// ── Wizard state ──────────────────────────────────────────────────────────────
let currentStep = 0;
const TOTAL_STEPS = 8;
let colourModalTarget = null; // which field the colour picker is writing to
let colourModalPending = null; // pending colour value in modal

// ── Boot ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  if (!window.munsell) console.warn('munsell.js not loaded — swatches will be grey');

  // Splash → app transition
  document.getElementById('start-btn').addEventListener('click', showApp);

  document.getElementById('export-btn').addEventListener('click', exportCSV);
  document.getElementById('prev-btn').addEventListener('click', prevStep);
  document.getElementById('next-btn').addEventListener('click', nextStep);
  document.getElementById('skip-btn').addEventListener('click', skipStep);
  document.getElementById('cancel-edit-btn').addEventListener('click', cancelRemoteEdit);
  document.getElementById('colour-modal-close').addEventListener('click', closeColourModal);
  document.getElementById('colour-confirm').addEventListener('click', confirmColour);
  document.getElementById('colour-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('colour-modal')) closeColourModal();
  });
  document.getElementById('account-btn').addEventListener('click', handleAccountClick);
  document.getElementById('auth-modal-close').addEventListener('click', closeAuthModal);
  document.getElementById('auth-modal').addEventListener('click', event => {
    if (event.target === document.getElementById('auth-modal')) closeAuthModal();
  });
  document.getElementById('auth-form').addEventListener('submit', submitAuthForm);
  document.getElementById('password-reset-form').addEventListener('submit', submitPasswordResetForm);
  updateLogUI();
  renderStep(0);
  try {
    await initializeSupabase();
  } catch (error) {
    setSyncStatus('error', 'Sync unavailable');
    console.error('Supabase initialization failed:', error);
  }
});

async function handleAccountClick() {
  const session = await getSupabaseSession();
  if (session) {
    await signOut();
    return;
  }
  document.getElementById('auth-modal').classList.remove('hidden');
  document.getElementById('auth-email').focus();
}

function closeAuthModal() {
  document.getElementById('auth-modal').classList.add('hidden');
}

function openPasswordResetModal() {
  showApp();
  document.getElementById('password-reset-modal').classList.remove('hidden');
  document.getElementById('new-password').focus();
}

function showApp() {
  document.getElementById('splash').style.display = 'none';
  document.getElementById('app-header').classList.remove('hidden');
  document.getElementById('app-main').classList.remove('hidden');
}

async function submitAuthForm(event) {
  event.preventDefault();
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const message = document.getElementById('auth-message');
  try {
    await signInWithPassword(email, password);
    closeAuthModal();
  } catch (error) {
    message.textContent = error.message || 'Unable to sign in.';
  }
}

async function submitPasswordResetForm(event) {
  event.preventDefault();
  const password = document.getElementById('new-password').value;
  const confirmation = document.getElementById('confirm-password').value;
  const message = document.getElementById('password-reset-message');
  if (password !== confirmation) {
    message.textContent = 'Passwords do not match.';
    return;
  }
  try {
    await updatePassword(password);
    message.textContent = 'Password updated. You can now continue using the app.';
    document.getElementById('password-reset-form').querySelector('button[type="submit"]').disabled = true;
  } catch (error) {
    message.textContent = error.message || 'Unable to update the password.';
  }
}

// ── Navigation ────────────────────────────────────────────────────────────────
function prevStep() {
  if (currentStep > 0) { currentStep--; renderStep(currentStep); }
}

async function nextStep() {
  collectStep(currentStep);
  if (currentStep === 7) {
    const saved = await saveRecord();
    if (saved) currentStep = 0;
  }
  else currentStep++;
  renderStep(currentStep);
}

function skipStep() {
  if (currentStep === 7) return;
  currentStep++;
  renderStep(currentStep);
}

function renderStep(n) {
  currentStep = n;
  document.querySelectorAll('.step-item').forEach((el, i) => {
    el.classList.toggle('active', i === n);
    el.classList.toggle('done', i < n);
  });
  document.getElementById('prev-btn').disabled = (n === 0);
  document.getElementById('next-btn').textContent = n === 7 ? (editingRecordId ? '✓ Save Changes' : '✓ Save Record') : 'Next →';
  document.getElementById('cancel-edit-btn').classList.toggle('hidden', !editingRecordId);
  const skip = document.getElementById('skip-btn');
  skip.classList.toggle('hidden', !(n === 4 || n === 6)); // Measures (4) and Base Mark (6) are skippable
  const panel = document.getElementById('step-content');
  panel.innerHTML = '';
  // Measures moved to index 4; Decoration → 5; Base Mark → 6
  const steps = [step0, step1, step2, step3, step6, step4, step5, step7];
  const stepEl = steps[n]();
  const notesField = makeNotesField(currentRecord.notes);
  // Inject right-side help panel
  const helpContent = typeof STEP_HELP[n] === 'function' ? STEP_HELP[n]() : (STEP_HELP[n] || '');
  if (helpContent) {
    const titleEl = stepEl.querySelector('h2.step-title');
    const layout = document.createElement('div');
    layout.className = 'step-layout';
    const formSide = document.createElement('div');
    formSide.className = 'form-side';
    Array.from(stepEl.children).filter(c => c !== titleEl).forEach(c => formSide.appendChild(c));
    formSide.appendChild(notesField);
    const helpSide = document.createElement('aside');
    helpSide.className = 'help-panel';
    helpSide.innerHTML = helpContent;
    layout.appendChild(formSide);
    layout.appendChild(helpSide);
    stepEl.appendChild(layout);
  } else stepEl.appendChild(notesField);
  panel.appendChild(stepEl);
}

function collectStep(n) {
  const panel = document.getElementById('step-content');
  panel.querySelectorAll('[data-field]').forEach(el => {
    const f = el.dataset.field;
    if (el.type === 'checkbox') { currentRecord[f] = el.checked ? 'Yes' : 'No'; }
    else { currentRecord[f] = el.value || ''; }
  });
  // Collect decoration rows (Decoration is now at index 5)
  if (n === 5) {
    currentRecord.decorations = [];
    panel.querySelectorAll('.dec-row').forEach((row, i) => {
      const d = newDecRow();
      row.querySelectorAll('[data-dec-field]').forEach(el => { d[el.dataset.decField] = el.value || ''; });
      // Colour fields in dec rows stored as data-colour-value
      row.querySelectorAll('[data-colour-value]').forEach(el => { d[el.dataset.colourFor] = el.dataset.colourValue || ''; });
      currentRecord.decorations.push(d);
    });
  }
}

// ── Step renderers ────────────────────────────────────────────────────────────

function step0() {
  const div = makePanel('Identify Sherd', '1 of 8');
  const material = currentRecord.material || 'Refined Earthenware';
  div.innerHTML += `
    <div class="field-group">
      <div class="field">
        <label>Artifact ID <span class="required">*</span></label>
        <input type="text" data-field="id" value="${escHtml(currentRecord.id)}" placeholder="e.g. ONT-2024-001" autocomplete="off" spellcheck="false">
      </div>
      <div class="field">
        <label>Count <span class="required">*</span></label>
        <input type="number" data-field="count" value="${escHtml(currentRecord.count)}" min="1" step="1" placeholder="e.g. 1" inputmode="numeric">
      </div>
      <div class="field">
        <label>Material</label>
        ${sel('material', MATERIALS, material)}
      </div>
      <div class="field full">
        <label>Ware</label>
        <select data-field="ware" id="ware-select">
          <option value="">— Select ware type —</option>
          ${wareOptions(material)}
        </select>
      </div>
    </div>
    <div id="ware-tip-panel"></div>`;
  // Wire up ware select
  setTimeout(() => {
    const wareEl = document.getElementById('ware-select');
    wareEl.value = currentRecord.ware || '';
    if (currentRecord.ware) renderWareTip(currentRecord.ware);
    wareEl.addEventListener('change', e => {
      applyWarePreset(e.target.value);
      renderWareTip(e.target.value);
    });
    const materialEl = div.querySelector('[data-field="material"]');
    materialEl.addEventListener('change', event => {
      const selectedMaterial = event.target.value;
      currentRecord.material = selectedMaterial;
      wareEl.innerHTML = `<option value="">— Select ware type —</option>${wareOptions(selectedMaterial)}`;
      currentRecord.ware = '';
      renderWareTip('');
    });
  }, 0);
  return div;
}

function wareOptions(material) {
  const matchingWares = WARES.filter(w => w.material === material);
  const priority1 = matchingWares.filter(w => w.priority === 1);
  const priority2 = matchingWares.filter(w => w.priority === 2);
  const priority3 = matchingWares.filter(w => w.priority === 3);
  const makeGroup = (label, wares) =>
    `<optgroup label="${label}">${wares.map(w => `<option value="${escHtml(w.label)}">${escHtml(w.label)}</option>`).join('')}</optgroup>`;
  return (priority1.length ? makeGroup('Most Common — Southern Ontario', priority1) : '') +
         (priority2.length ? makeGroup('Common', priority2) : '') +
         (priority3.length ? makeGroup('Less Common', priority3) : '');
}

function applyWarePreset(ware) {
  const p = WARE_PRESETS[ware];
  currentRecord.ware = ware;
  const wareObj = WARES.find(w => w.label === ware);
  if (wareObj) {
    currentRecord.material = wareObj.material;
    const matEl = document.querySelector('[data-field="material"]');
    if (matEl) { matEl.value = wareObj.material; }
  }
  if (p) {
    if (p.manuTech)   currentRecord.manuTech  = p.manuTech;
    if (p.extSurface) currentRecord.extSurface = p.extSurface;
    if (p.intSurface) currentRecord.intSurface = p.intSurface;
  }
}

function renderWareTip(ware) {
  const panel = document.getElementById('ware-tip-panel');
  if (!panel) return;
  const tip = WARE_TIPS[ware];
  if (!tip) { panel.innerHTML = ''; return; }
  const link = tip.url ? `<a href="${tip.url}" target="_blank" rel="noopener">More info ↗</a>` : '';
  panel.innerHTML = `
    <div class="ware-tip">
      <h4>${escHtml(ware)} ${link}</h4>
      <div class="tip-dates">📅 ${escHtml(tip.dates)}</div>
      <div class="tip-rows">
        <div class="tip-row"><strong>Paste / Fabric</strong>${escHtml(tip.fabric)}</div>
        <div class="tip-row"><strong>Glaze</strong>${escHtml(tip.glaze)}</div>
        <div class="tip-row"><strong>Common Decoration</strong>${escHtml(tip.decor)}</div>
      </div>
    </div>`;
}

function step1() {
  const div = makePanel('Form', '2 of 8');
  div.innerHTML += `
    <div class="field-group">
      <div class="field">
        <label>Manufacturing Technique</label>
        ${sel('manuTech', MANU_TECH, currentRecord.manuTech)}
      </div>
      <div class="field">
        <label>Vessel Category</label>
        ${sel('vesselCat', VESSEL_CATEGORIES, currentRecord.vesselCat)}
      </div>
      <div class="field">
        <label>Form</label>
        ${sel('form', FORMS, currentRecord.form)}
      </div>
      <div class="field">
        <label>Completeness</label>
        ${sel('completeness', COMPLETENESS, currentRecord.completeness)}
      </div>
    </div>
    <div id="manu-tech-tip-panel"></div>`;
  setTimeout(() => {
    const techniqueEl = div.querySelector('[data-field="manuTech"]');
    if (!techniqueEl) return;
    renderManuTechTip(techniqueEl.value);
    techniqueEl.addEventListener('change', event => renderManuTechTip(event.target.value));
  }, 0);
  return div;
}

function renderManuTechTip(technique) {
  const panel = document.getElementById('manu-tech-tip-panel');
  if (!panel) return;
  const tip = MANU_TECH_TIPS[technique];
  if (!tip) { panel.innerHTML = ''; return; }
  panel.innerHTML = `
    <div class="ware-tip">
      <h4>${escHtml(technique)} <a href="https://www.daacs.org/wp-content/uploads/2018/10/DAACSCeramicManual.pdf" target="_blank" rel="noopener">DAACS Ceramic Manual, §1.4 (pp. 13–14) ↗</a></h4>
      <div class="tip-rows">
        <div class="tip-row"><strong>Diagnostic evidence</strong>${escHtml(tip.evidence)}</div>
        <div class="tip-row"><strong>Reference guidance</strong>${escHtml(tip.typical)}</div>
      </div>
    </div>`;
}

function step2() {
  const isRefined = WHITE_BODIED_WARES.has(currentRecord.ware) || !currentRecord.ware;
  const div = makePanel('Surfaces & Colour', '3 of 8');
  div.innerHTML += `
    <div class="field-group">
      <div class="field">
        <label>Exterior Surface</label>
        ${sel('extSurface', SURFACES, currentRecord.extSurface)}
        <p class="field-hint">Type of glaze or surface treatment. Use <em>Missing</em> if the original surface has completely broken away — then set Exterior Color to <em>Not Applicable</em>.</p>
      </div>
      <div class="field">
        <label>Exterior Color <span class="optional">${isRefined ? 'Refined Surface Colors' : 'DAACS MCRS'}</span></label>
        ${colourField('extColor', currentRecord.extColor, isRefined ? 'refined' : 'mcrs')}
        <p class="field-hint">${isRefined
          ? 'Match the glazed exterior surface to the Refined Surface Colors chart. Record the colour of the <em>base glaze</em>, not any painted decoration on top.'
          : 'Match the exterior surface to the DAACS Detailed Color Groups. If the surface is entirely covered by a slip or wash, select <em>Body Color Obscured by Decoration</em>.'
        }</p>
      </div>
      <div class="field">
        <label>Interior Surface</label>
        ${sel('intSurface', SURFACES, currentRecord.intSurface)}
        <p class="field-hint">Same protocols as Exterior Surface. For hollow forms, record the glaze inside the vessel. Enter <em>Not Applicable</em> for flat wares where there is no interior.</p>
      </div>
      <div class="field">
        <label>Interior Color <span class="optional">${isRefined ? 'Refined Surface Colors' : 'DAACS MCRS'}</span></label>
        ${colourField('intColor', currentRecord.intColor, isRefined ? 'refined' : 'mcrs')}
        <p class="field-hint">Same protocols as Exterior Color. For Albany-slipped stoneware interiors, use the DAACS MCRS Neutrals or Yellow-Red families. Do not use <em>No Applied Color</em>.</p>
      </div>
      <div class="field">
        <label>Paste Color <span class="optional">Munsell Soil — broken edge</span></label>
        ${colourField('pasteColor', currentRecord.pasteColor, 'paste')}
        <p class="field-hint">Examine the <strong>cross-section (broken edge)</strong> of the sherd in consistent light. Match to the Munsell Soil chart. For most refined earthenwares and porcelains, this is optional. Do not record paste colour for batched sherds.</p>
      </div>
      <div class="field">
        <label>Oxidized vs Reduced</label>
        ${sel('oxidized', OXIDIZED, currentRecord.oxidized || 'Not Reduced')}
        <p class="field-hint">Determine by examining the paste cross-section. <em>Reduced</em> = very dark grey or black core. Not recorded for coarse earthenware types — use the Colonoware tab fields instead.</p>
      </div>
    </div>
    <div id="surface-tip-panel"></div>`;
  setTimeout(() => {
    wireSurfaceColourFields(div);
    const exteriorSurface = div.querySelector('[data-field="extSurface"]');
    const interiorSurface = div.querySelector('[data-field="intSurface"]');
    renderSurfaceTip(exteriorSurface?.value || interiorSurface?.value || '');
    exteriorSurface?.addEventListener('change', event => {
      if (interiorSurface) interiorSurface.value = event.target.value;
      renderSurfaceTip(event.target.value, 'Exterior');
    });
    interiorSurface?.addEventListener('change', event => renderSurfaceTip(event.target.value, 'Interior'));
  }, 0);
  return div;
}

function renderSurfaceTip(surface, location) {
  const panel = document.getElementById('surface-tip-panel');
  if (!panel) return;
  const tip = SURFACE_TIPS[surface];
  if (!tip) { panel.innerHTML = ''; return; }
  panel.innerHTML = `
    <div class="ware-tip">
      <h4>${escHtml(location ? `${location} Surface: ${surface}` : surface)} <a href="https://somethingoldsomethingchic.com/blogs/news/ceramic-glazes-explained" target="_blank" rel="noopener">Glaze reference ↗</a></h4>
      <div class="tip-rows">
        <div class="tip-row"><strong>What to look for</strong>${escHtml(tip)}</div>
      </div>
    </div>`;
}

// ── Step help panel content (right side of each step) ─────────────────────
const STEP_HELP = {
  0: `<h3>Material Types</h3>
    <dl class="help-dl">
      <dt>Refined Earthenware</dt><dd>Harder/denser than coarse. Cream to white body, usually lead-glazed. Tin-enameled wares (Delftware, Faience) cataloged here.</dd>
      <dt>Porcelain</dt><dd>Vitrified, white, translucent. Hard paste (Chinese; European post-1820), soft paste (English c.1745–1810), or bone china (post 1794).</dd>
      <dt>Stoneware</dt><dd>Vitrified, non-porous. Salt-glaze typical (pitted orange-peel surface). American stonewares common in Ontario c.1850–1920.</dd>
      <dt>Coarse Earthenware</dt><dd>Porous paste with visible inclusions. Usually grey/red/brown. Broken edge sticks to tongue.</dd>
      <dt>Unidentifiable</dt><dd>Only when material type (not just ware type) cannot be determined.</dd>
    </dl>
    <h3>Batching Rules</h3>
    <ul class="help-ul">
      <li>Non-diagnostic body sherds 15mm or less may be batched.</li>
      <li>Do <strong>not</strong> batch decorated sherds (except non-diagnostic transfer-print 15mm or less with same Genre).</li>
      <li>All post-1900 unidentifiable refined earthenwares: batch as <em>Refined Earthenware, modern</em>.</li>
    </ul>`,
  1: `<h3>Vessel Category</h3>
    <dl class="help-dl">
      <dt>Hollow</dt><dd>Bowls, cups, mugs, jars, teapots, pitchers, chamberpots</dd>
      <dt>Flat</dt><dd>Plates, platters, saucers. Dish-plates (shallow bowls) are Flat.</dd>
    </dl>
    <h3>Form Shortcuts</h3>
    <dl class="help-dl">
      <dt>Unid: Teaware</dt><dd>Thin, likely tea/coffee related — specific form unclear</dd>
      <dt>Unid: Tableware</dt><dd>Food service or tavern ware — form unclear</dd>
      <dt>Unid: Utilitarian</dt><dd>Thick, functional — jars/crocks, form unclear</dd>
    </dl>
    <h3>Teaware vs Tableware</h3>
    <p>Teaware: teapots, teabowls, teacups, saucers, slop bowls, creamers, coffee pots.<br>Mugs and tankards are <em>Tableware</em>, not teaware.</p>
    <h3>Completeness</h3>
    <p>Record what part of the vessel this sherd represents. "Base" includes any foot ring sherd. "Detached Glaze" = glaze fragment only. Use compound terms (Body, Rim) when both are present.</p>`,
  2: () => buildSurfacesHelp(),
  3: `<h3>Evidence of Burning</h3>
    <p><em>Unburned</em> is the default — only change with visible evidence.</p>
    <dl class="help-dl">
      <dt>Fire-clouding</dt><dd>Dark patches from uneven kiln firing — not use-burning</dd>
      <dt>Residue/Soot</dt><dd>Indicates vessel was used near fire or in cooking</dd>
      <dt>Not Recorded</dt><dd>Only for batched coarse earthenware; all others default to Unburned</dd>
    </dl>
    <h3>Wear Patterns</h3>
    <dl class="help-dl">
      <dt>Utensil Wear</dt><dd>Scratches in the central depression of the interior</dd>
      <dt>Base Abrasion</dt><dd>Glaze worn on the resting surface of the base</dd>
      <dt>Spalling</dt><dd>Small circular flaking of the glaze</dd>
      <dt>Partial Missing Surface</dt><dd>Part of glaze absent; when all glaze is missing, record in the Surface field</dd>
    </dl>
    <h3>Post-Manufacturing Modification</h3>
    <p>Mark <em>Yes</em> only if intentionally reworked after firing — e.g. ground into a gaming piece, hole drilled. Add details in Notes.</p>`,
  4: `<h3>Measurement Protocols</h3>
    <dl class="help-dl">
      <dt>Thickness</dt><dd>Thinnest part of the body wall — not including glaze. In mm.</dd>
      <dt>Max Size</dt><dd>Longest measurement across the sherd using the mat grid. In mm.</dd>
      <dt>Weight</dt><dd>Grams. Individual sherd only — exclude bag weight.</dd>
    </dl>
    <h3>Rim Diameter</h3>
    <p>Use the radius template on the cataloging mat. Match the rim curvature to the nearest arc. For thick sherds, measure along the <strong>exterior</strong>. For scalloped edges, at least 3 points are needed. In mm.</p>
    <h3>Base Diameter</h3>
    <p>Only for base/foot ring sherds with length greater than 20mm. Use the base diameter template.</p>
    <h3>Mended Measurements</h3>
    <p>Only record mended fields when sherds are physically glued or confirmed to join. Measure the joined unit as a whole.</p>`,
  5: `<h3>One Row Per Decoration Instance</h3>
    <p>Interior and exterior decorations are recorded as <strong>separate rows</strong>. Two colours in the same design = two rows, all other fields identical.</p>
    <h3>Decorative Technique</h3>
    <dl class="help-dl">
      <dt>Printed, under</dt><dd>Transfer print underglaze — most common in Ontario assemblages</dd>
      <dt>Decalcomania</dt><dd>Decal transfer — dominant post-1890</dd>
      <dt>Painted, under free hand</dt><dd>Hand-painted underglaze (blue, brown, black)</dd>
      <dt>Painted, over free hand</dt><dd>Overglaze enamel painting</dd>
      <dt>Molded</dt><dd>Design formed in the press mold — shell edge, feather edge, etc.</dd>
      <dt>Sponge</dt><dd>Sponged or spattered oxide decoration</dd>
    </dl>
    <h3>Transfer Printing</h3>
    <p>Set Stylistic Element and Motif to <em>Not Applicable</em>. Genre = specific type (e.g. <em>Transfer Print Under, blue</em>).</p>
    <h3>Decoration Colour</h3>
    <p>Use the DAACS MCRS chart for all decoration regardless of ware type. Copper luster = <em>Gilt</em>. Silver luster = <em>Silver</em>.</p>`,
  6: `<h3>Base Marks</h3>
    <p><em>Not Applicable</em> is the default. Only record when a mark is present on the base.</p>
    <h3>Mark Types</h3>
    <dl class="help-dl">
      <dt>Impressed</dt><dd>Pressed into clay before firing</dd>
      <dt>Incised</dt><dd>Cut or scratched into clay before firing</dd>
      <dt>Printed</dt><dd>Transfer-printed, usually underglaze</dd>
      <dt>Painted</dt><dd>Applied in overglaze enamel after firing</dd>
    </dl>
    <h3>Dating from Marks</h3>
    <ul class="help-ul">
      <li>"Made in [country]" = post 1891 (McKinley Tariff Act)</li>
      <li>"England" alone = post 1891</li>
      <li>"Bone China" in mark = post ~1900</li>
      <li>English Rd. No. marks: consult Godden's Encyclopedia</li>
    </ul>`,
};

function buildSurfacesHelp() {
  const ware = currentRecord.ware;
  const isRefined = WHITE_BODIED_WARES.has(ware) || !ware;
  const wareNote = surfaceColourNote(ware, isRefined);
  return `
    <h3>Colour Chart: ${escHtml(ware || 'This Ware')}</h3>
    <p><strong>${isRefined ? 'Refined Surface Colors' : 'DAACS Detailed Color Groups'}</strong><br>
    <span style="font-size:0.74rem;color:var(--dim)">${isRefined
      ? 'Match to Individual Glossy swatches (DAACS Color Book)'
      : 'Match to the named MCRS colour categories'}</span></p>
    ${wareNote ? `<div class="help-callout">${wareNote}</div>` : ''}
    <h3>Special Cases</h3>
    <dl class="help-dl">
      <dt>Surface absent</dt><dd>Surface = <em>Missing</em> · Color = <em>Not Applicable</em></dd>
      <dt>Burned or stained</dt><dd>Color = <em>Unidentifiable</em><br><small>Do <strong>not</strong> use "No Applied Color"</small></dd>
      <dt>Decoration covers whole surface</dt><dd>Color = <em>Body Color Obscured by Decoration</em></dd>
    </dl>
    <h3>Paste Color</h3>
    <p>Examine the <strong>cross-section (broken edge)</strong> in consistent light. Match to Munsell Soil chart. Optional for refined wares and porcelain. Do not record for batched sherds.</p>
    <h3>Oxidized vs Reduced</h3>
    <p><em>Reduced</em> = very dark grey or black core in the paste cross-section. Not recorded for coarse earthenware types.</p>
    <h3>Glaze Type Guide</h3>
    <dl class="help-dl">
      <dt>Salt Glaze</dt><dd>Pitted "orange-peel" texture, colorless. No separate layer — fused to body. Stoneware only. Per DAACS manual: record <em>Salt Glaze</em> for the interior of hollow forms even when texture is not visible. For a stoneware plate: both sides = Salt Glaze.</dd>
      <dt>Lead Glaze</dt><dd>Shiny, transparent or semi-transparent. Most refined earthenwares. Pools in foot rings — yellow (creamware) or blue (pearlware).</dd>
      <dt>Feldspathic/Alkaline</dt><dd>Porcelain glaze. Very smooth, glass-like, fused to body. Cannot be scratched off with a fingernail.</dd>
      <dt>Tin Glaze</dt><dd>Thick, opaque white. "Floats" on surface — often flakes easily. Delftware, Faience, Majolica.</dd>
      <dt>Albany Slip</dt><dd>Dark, smooth, glossy brown. Applied as liquid clay. Interior of American stoneware crocks and jugs.</dd>
      <dt>Bristol Glaze</dt><dd>Opaque white stoneware glaze. Often two-toned with dipped brown/yellow upper half.</dd>
      <dt>Zinc Emulsion</dt><dd>Matte or semi-matte white. 20th-century utilitarian wares and commercial stoneware.</dd>
      <dt>Unglazed/Bisque</dt><dd>No glaze. Dry, slightly porous surface. Black Basalt, Rosso Antico, Jasperware exteriors.</dd>
    </dl>`;
}

// Returns a ware-specific colour tip for the surfaces step
function surfaceColourNote(ware, isRefined) {
  const notes = {
    'Whiteware':                     'Clear, colourless glaze — <strong>no blue or yellow tint</strong>. Most common colours: <em>N9/</em> or <em>5Y 9/1</em>. Check for crazing.',
    'Ironstone/White Granite':       'Dense, clear glaze. Heavier than whiteware. Most common: <em>N9/</em> or <em>5Y 9/1</em>. Plain or with printed/moulded decoration.',
    'Pearlware':                     'Glaze pools <strong>blue in foot rings</strong>. Hold sherd against white paper — should appear faintly bluish. Common: <em>5Y 9/1</em>, <em>5B 9/1</em>.',
    'Creamware':                     'Glaze pools <strong>yellow in foot rings</strong>. Hold against white paper — appears cream/yellow. Common: <em>5Y 9/1</em>, <em>10Y 9/1</em>. Earlier pieces are deeper yellow.',
    "'Carolina' Creamware":          'Glaze pools yellow in foot rings. American-made creamware; same colour protocols as standard Creamware.',
    'Porcelain, English Bone China':  'Very white, highly translucent. Glaze may craze finely. Common: <em>N9/</em> or <em>5Y 9/1</em>. Under UV: glazed surface appears blueish white.',
    'Porcelain, Chinese':            'Glaze fused to body; foot rings left <strong>unglazed</strong>. Feldspathic glaze — clear, glossy. Common: <em>5Y 9/1</em> or <em>5BG 9/1</em> (slight blue-grey tint).',
    'Porcelain, English Soft Paste': 'Glaze distinct from body — visible as thin white line in cross-section. Foot rings ARE glazed. Common: <em>5Y 9/1</em>.',
    'Porcellaneous/English Hard Paste': 'Dead white, very glassy. Feldspathic glaze. Common: <em>N9/</em>.',
    'Porcelain, French':             'Hard paste; feldspathic glaze fused to body. Common: <em>N9/</em> or <em>5Y 9/1</em>.',
    'Porcelain, Japanese':           'Feldspathic glaze, often thicker than Chinese — tends to run. Common: <em>5Y 9/1</em>.',
    'Delftware, Dutch/British':      'Thick, opaque <strong>white tin glaze</strong> that floats on the surface — often flakes easily. Paste beneath is buff/yellow. Use Refined Surface Colors for the tin glaze surface.',
    'White Salt Glaze':              'Salt glaze produces a <strong>finely pitted &ldquo;orange peel&rdquo; texture</strong>. No separate glaze layer. Common: <em>N9/</em> or <em>5Y 9/1</em>.',
    'American Stoneware':            'Salt glaze typical: colorless, pitted texture. Albany slip interiors: dark glossy brown — use DAACS MCRS <em>Yellow-Red, Muted Dark</em> or <em>Neutrals, Dark</em>.',
    'Yellowware':                    'Lead glaze over yellow/buff body. Glaze colour reflects paste. Use DAACS MCRS Yellow-Red or Yellow families for surface colour.',
    'Bennington/Rockingham':         'Mottled brown tortoiseshell glaze — inherent in the ware. Enter <em>Body Color Obscured by Decoration</em> or record closest MCRS brown range.',
  };
  return notes[ware] || '';
}

function colourField(fieldName, currentVal, mode) {
  const hex = currentVal ? computeHex(currentVal) : '';
  const dotStyle = hex ? `background:${hex}; border-color:rgba(255,255,255,0.2)` : '';
  return `
    <div class="colour-field" id="cfield-${fieldName}">
      <div class="colour-dot" style="${dotStyle}" data-colour-field="${fieldName}" data-colour-mode="${mode}" title="Click to pick colour"></div>
      <span class="colour-text" style="font-size:0.8rem;color:var(--muted)">${escHtml(currentVal || 'Click to select')}</span>
      <input type="hidden" data-field="${fieldName}" value="${escHtml(currentVal || '')}">
      ${currentVal ? `<button class="colour-clear" data-clear-field="${fieldName}" title="Clear">✕</button>` : ''}
    </div>`;
}

function wireSurfaceColourFields(container) {
  container.querySelectorAll('.colour-dot').forEach(dot => {
    dot.addEventListener('click', () => openColourModal(dot.dataset.colourField, dot.dataset.colourMode));
  });
  container.querySelectorAll('[data-clear-field]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const f = btn.dataset.clearField;
      currentRecord[f] = '';
      re_renderColourField(f, '', btn.dataset.colourMode);
    });
  });
}

function re_renderColourField(fieldName, val, mode) {
  const container = document.getElementById(`cfield-${fieldName}`);
  if (!container) return;
  const isRefined = WHITE_BODIED_WARES.has(currentRecord.ware) || !currentRecord.ware;
  const m = mode || (fieldName === 'pasteColor' ? 'paste' : (isRefined ? 'refined' : 'mcrs'));
  container.outerHTML = colourField(fieldName, val, m);
  setTimeout(() => {
    const newContainer = document.getElementById(`cfield-${fieldName}`);
    if (newContainer) wireSurfaceColourFields(newContainer.closest('.field-group') || newContainer.parentElement);
  }, 0);
}

function step3() {
  const div = makePanel('Condition', '4 of 8');
  div.innerHTML += `
    <div class="field-group">
      <div class="field">
        <label>Evidence of Burning</label>
        ${sel('burning', BURNING, currentRecord.burning || 'Unburned')}
      </div>
      <div class="field">
        <label>Post-Manufacturing Modification</label>
        ${sel('postMfgMod', ['No','Yes','N/R (Not Recorded)'], currentRecord.postMfgMod || 'No')}
      </div>
      <div class="field">
        <label>Wear Location <span class="optional">optional</span></label>
        ${sel('wearLocation', ['','Exterior','Interior','Not Applicable','Unidentifiable'], currentRecord.wearLocation)}
      </div>
      <div class="field">
        <label>Wear Pattern <span class="optional">optional</span></label>
        ${sel('wearPattern', ['', ...WEAR_PATTERNS], currentRecord.wearPattern)}
      </div>
    </div>`;
  return div;
}

function step4() {
  const div = makePanel('Decoration', '6 of 8');
  // Decorated toggle
  const decYes = currentRecord.decorated === 'Yes';
  div.innerHTML += `
    <div class="toggle-group" id="dec-toggle">
      <button class="toggle-btn${!decYes ? ' active' : ''}" data-val="No">No Decoration</button>
      <button class="toggle-btn${decYes ? ' active' : ''}" data-val="Yes">Decorated</button>
    </div>
    <div id="dec-rows-wrap" ${decYes ? '' : 'style="display:none"'}>
      <div class="dec-rows" id="dec-rows">
        ${currentRecord.decorations.map((d,i) => decRowHTML(d,i)).join('')}
      </div>
      <button class="btn btn-secondary btn-sm add-row-btn" id="add-dec-row" style="margin-top:8px">+ Add Decoration Row</button>
      <div class="field" style="margin-top:12px">
        <label>Genre <span class="optional">overall decorative genre</span></label>
        ${sel2('dec-genre-overall', GENRES, currentRecord.decorations[0]?.genre || '')}
      </div>
      <div class="field" style="margin-top:8px">
        <label>Pattern Name <span class="optional">if identifiable</span></label>
        ${sel2('dec-pattern-overall', PATTERN_NAMES, currentRecord.decorations[0]?.patternName || '')}
      </div>
    </div>`;
  setTimeout(() => {
    // Toggle buttons
    div.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentRecord.decorated = btn.dataset.val;
        div.querySelectorAll('.toggle-btn').forEach(b => b.classList.toggle('active', b === btn));
        div.getElementById && null;
        const wrap = document.getElementById('dec-rows-wrap');
        if (wrap) wrap.style.display = btn.dataset.val === 'Yes' ? '' : 'none';
        if (btn.dataset.val === 'Yes' && currentRecord.decorations.length === 0) {
          addDecRow();
        }
      });
    });
    // Wire existing rows
    wireDecRows();
    // Add row button
    document.getElementById('add-dec-row')?.addEventListener('click', addDecRow);
  }, 0);
  return div;
}

let decRowCount = 0;

function addDecRow() {
  const rows = document.getElementById('dec-rows');
  if (!rows) return;
  const idx = rows.children.length;
  const d = newDecRow();
  currentRecord.decorations.push(d);
  rows.insertAdjacentHTML('beforeend', decRowHTML(d, idx));
  wireDecRows();
}

function decRowHTML(d, idx) {
  return `
    <div class="dec-row" data-dec-idx="${idx}">
      <button class="btn btn-secondary btn-sm remove-row" data-remove-dec>✕</button>
      <div class="dec-row-grid">
        <div class="field">
          <label>Int/Ext</label>
          ${sel2Dc('intExt', DEC_INT_EXT, d.intExt)}
        </div>
        <div class="field">
          <label>Location</label>
          ${sel2Dc('location', DEC_LOCATIONS, d.location)}
        </div>
        <div class="field">
          <label>Technique</label>
          ${sel2Dc('technique', DEC_TECHNIQUES, d.technique)}
        </div>
        <div class="field">
          <label>Decoration Color</label>
          <div class="colour-field" id="dc-colour-${idx}">
            <div class="colour-dot" style="${d.color ? `background:${computeHex(d.color)};border-color:rgba(255,255,255,.2)` : ''}"
              data-dc-colour data-dc-idx="${idx}" title="Pick colour"></div>
            <span style="font-size:0.78rem;color:var(--muted)">${escHtml(d.color || 'Click to select')}</span>
            <input type="hidden" data-colour-value="${escHtml(d.color||'')}" data-colour-for="color">
          </div>
        </div>
        <div class="field">
          <label>Stylistic Element</label>
          <input type="text" list="sty-list" data-dec-field="stylElement" value="${escHtml(d.stylElement||'')}">
          <datalist id="sty-list">${STYLISTIC_ELEMENTS.map(s=>`<option value="${escHtml(s)}">`).join('')}</datalist>
        </div>
        <div class="field">
          <label>Motif</label>
          ${sel2Dc('motif', MOTIFS, d.motif)}
        </div>
      </div>
    </div>`;
}

function wireDecRows() {
  document.querySelectorAll('.dec-row').forEach((row, i) => {
    // Remove button
    const removeBtn = row.querySelector('[data-remove-dec]');
    if (removeBtn && !removeBtn._wired) {
      removeBtn._wired = true;
      removeBtn.addEventListener('click', () => {
        currentRecord.decorations.splice(i, 1);
        row.remove();
      });
    }
    // Colour dot in dec row
    const dot = row.querySelector('[data-dc-colour]');
    if (dot && !dot._wired) {
      dot._wired = true;
      dot.addEventListener('click', () => openDecColourModal(i, row));
    }
  });
}

function openDecColourModal(rowIdx, rowEl) {
  colourModalTarget = { type: 'dec', rowIdx, rowEl };
  openColourModal(null, 'mcrs');
}

function step5() {
  const div = makePanel('Base Mark', '7 of 8 — Optional');
  div.innerHTML += `
    <div class="field-group">
      <div class="field">
        <label>Base Mark Type</label>
        ${sel('baseMark', BASE_MARKS, currentRecord.baseMark || 'Not Applicable')}
      </div>
      <div class="field">
        <label>Base Mark Color <span class="optional">optional</span></label>
        <input type="text" data-field="baseMarkColor" value="${escHtml(currentRecord.baseMarkColor)}" placeholder="e.g. Blue, Intense Medium">
      </div>
      <div class="field full">
        <label>Base Mark Reference <span class="optional">optional</span></label>
        <input type="text" data-field="baseMarkRef" value="${escHtml(currentRecord.baseMarkRef)}" placeholder="e.g. Godden #1234">
      </div>
    </div>`;
  return div;
}

function step6() {
  const div = makePanel('Measurements', '5 of 8 — Optional');
  const f = currentRecord;
  div.innerHTML += `
    <div class="measures-section">
      <p class="section-label">Standard measurements</p>
      <div class="measure-grid">
        ${mField('Thickness (mm)',     'thickness',  f.thickness)}
        ${mField('Max Size (mm)',      'maxSize',    f.maxSize)}
        ${mField('Weight (g)',         'weight',     f.weight)}
        ${mField('Rim Length (mm)',    'rimLength',  f.rimLength)}
        ${mField('Rim Diameter (mm)', 'rimDiam',    f.rimDiam)}
        ${mField('Base Length (mm)',   'baseLength', f.baseLength)}
        ${mField('Base Diameter (mm)', 'baseDiam',  f.baseDiam)}
      </div>
    </div>
    <div class="measures-section">
      <p class="section-label">Mended measurements <span class="optional">only when sherds are physically joined</span></p>
      <div class="measure-grid">
        ${mField('Mended Weight (g)',    'mendedWeight',   f.mendedWeight)}
        ${mField('Mended Rim Diam (mm)', 'mendedRimDiam',  f.mendedRimDiam)}
        ${mField('Mended Base Diam (mm)','mendedBaseDiam', f.mendedBaseDiam)}
      </div>
    </div>`;
  return div;
}

function step7() {
  const div = makePanel('Review & Save', '8 of 8');
  const f = currentRecord;
  div.innerHTML += `
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:14px;font-size:0.8rem;line-height:1.9">
      <strong style="display:block;margin-bottom:8px;color:var(--muted);text-transform:uppercase;font-size:0.7rem;letter-spacing:.06em">Summary</strong>
      ${summaryRow('ID', f.id)}
      ${summaryRow('Ware', f.ware)}
      ${summaryRow('Form', [f.vesselCat, f.form, f.completeness].filter(Boolean).join(' · '))}
      ${summaryRow('Exterior', [f.extSurface, f.extColor].filter(Boolean).join(' · '))}
      ${summaryRow('Interior', [f.intSurface, f.intColor].filter(Boolean).join(' · '))}
      ${summaryRow('Paste Color', f.pasteColor)}
      ${summaryRow('Burning', f.burning)}
      ${summaryRow('Decorated', f.decorated === 'Yes' ? `Yes — ${f.decorations.length} row(s)` : 'No')}
      ${summaryRow('Base Mark', f.baseMark !== 'Not Applicable' ? f.baseMark : '')}
      ${summaryRow('Created On', formatAuditDate(f.createdOn))}
      ${summaryRow('Created By', f.createdBy)}
      ${summaryRow('Modified On', formatAuditDate(f.modifiedOn))}
      ${summaryRow('Modified By', f.modifiedBy)}
    </div>`;
  return div;
}

// ── Colour modal ──────────────────────────────────────────────────────────────
function openColourModal(fieldName, mode) {
  if (fieldName) colourModalTarget = { type: 'surface', fieldName, mode };
  colourModalPending = null;
  const modal = document.getElementById('colour-modal');
  const title = document.getElementById('colour-modal-title');
  title.textContent = mode === 'refined' ? 'Select Refined Surface Color'
                    : mode === 'paste'   ? 'Select Paste Color (Munsell Soil)'
                    :                      'Select DAACS Colour';
  renderFamilyBar(mode);
  const firstFamily = mode === 'refined' ? null
                    : mode === 'paste'   ? MUNSELL_PASTE_FAMILIES[0].name
                    :                      MCRS_FAMILIES[0].name;
  renderColourGrid(mode, firstFamily);
  document.getElementById('colour-confirm').disabled = true;
  document.getElementById('colour-preview-dot').style.background = '';
  document.getElementById('colour-preview-label').textContent = 'No colour selected';
  modal.classList.remove('hidden');
}

function closeColourModal() {
  document.getElementById('colour-modal').classList.add('hidden');
  colourModalTarget = null;
  colourModalPending = null;
}

function renderFamilyBar(mode) {
  const bar = document.getElementById('colour-family-bar');
  if (mode === 'refined') { bar.innerHTML = ''; return; }
  const families = mode === 'paste' ? MUNSELL_PASTE_FAMILIES : MCRS_FAMILIES;
  bar.innerHTML = families.map(f =>
    `<button class="fam-btn" data-fam="${escHtml(f.name)}">${escHtml(f.name)}</button>`
  ).join('');
  bar.querySelectorAll('.fam-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      bar.querySelectorAll('.fam-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderColourGrid(mode, btn.dataset.fam);
    });
  });
  if (bar.firstChild) { bar.firstChild.classList.add('active'); }
}

function renderColourGrid(mode, familyName) {
  const grid = document.getElementById('colour-grid');
  grid.innerHTML = '';
  if (mode === 'refined') {
    renderRefinedGrid(grid);
  } else if (mode === 'paste') {
    const fam = MUNSELL_PASTE_FAMILIES.find(f => f.name === familyName);
    if (fam) renderMunsellGrid(grid, fam.entries);
  } else {
    const fam = MCRS_FAMILIES.find(f => f.name === familyName);
    if (fam) renderMCRSGrid(grid, fam.entries);
  }
}

function renderRefinedGrid(grid) {
  REFINED_COLOURS.forEach(c => {
    if (c.special) {
      const btn = document.createElement('button');
      btn.style.cssText = `background:${SPECIAL_DISPLAY_COLOURS[c.code]||'#444'};width:auto;padding:4px 10px;font-size:0.7rem;color:var(--text);border-radius:5px;border:2px solid transparent;cursor:pointer;margin:2px`;
      btn.textContent = c.label;
      btn.addEventListener('click', () => selectColour(c.code, SPECIAL_DISPLAY_COLOURS[c.code]||'#444'));
      grid.appendChild(btn);
      return;
    }
    const hex = computeHex(c.code);
    const wrap = document.createElement('div');
    wrap.className = 'cswatch-lab';
    wrap.title = c.label;
    wrap.innerHTML = `<div class="cswatch-lab-color" style="background:${hex}"></div><div class="cswatch-lab-code">${escHtml(c.code)}</div>`;
    wrap.addEventListener('click', () => selectColour(c.code, hex));
    grid.appendChild(wrap);
  });
}

function renderMunsellGrid(grid, entries) {
  entries.forEach(e => {
    const hex = computeHex(e.munsell);
    const wrap = document.createElement('div');
    wrap.className = 'cswatch-lab';
    wrap.title = `${e.munsell} — ${e.desc}`;
    wrap.innerHTML = `<div class="cswatch-lab-color" style="background:${hex}"></div><div class="cswatch-lab-code">${escHtml(e.munsell)}</div>`;
    wrap.addEventListener('click', () => selectColour(e.munsell, hex));
    grid.appendChild(wrap);
  });
}

function renderMCRSGrid(grid, entries) {
  const wrap = document.createElement('div');
  wrap.className = 'mcrs-grid';
  entries.forEach(e => {
    const hex = e.special ? (SPECIAL_DISPLAY_COLOURS[e.name]||'#444') : computeHex(e.codes[0]||'');
    const shortLabel = e.name.includes(', ') ? e.name.split(', ').slice(1).join(', ') : e.name;
    const cell = document.createElement('div');
    cell.className = 'cswatch-named';
    cell.title = e.codes.join(' · ') || e.name;
    const repCode = (!e.special && e.codes.length) ? e.codes[0] : '';
    cell.innerHTML = `<div class="cswatch-named-color" style="background:${hex}"></div><div class="cswatch-named-label">${escHtml(shortLabel)}${repCode ? `<span class="swatch-code">${escHtml(repCode)}</span>` : ''}</div>`;
    cell.addEventListener('click', () => selectColour(e.name, hex));
    wrap.appendChild(cell);
  });
  grid.appendChild(wrap);
}

function selectColour(code, hex) {
  colourModalPending = { code, hex };
  // Highlight selected
  document.querySelectorAll('.cswatch.selected, .cswatch-named.selected').forEach(el => el.classList.remove('selected'));
  // (we can't easily re-find the element so skip visual selection highlight)
  document.getElementById('colour-preview-dot').style.background = hex;
  document.getElementById('colour-preview-label').textContent = code;
  document.getElementById('colour-confirm').disabled = false;
}

function confirmColour() {
  if (!colourModalPending || !colourModalTarget) { closeColourModal(); return; }
  const { code, hex } = colourModalPending;
  if (colourModalTarget.type === 'surface') {
    const f = colourModalTarget.fieldName;
    currentRecord[f] = code;
    // Update the field in the DOM
    const hidden = document.querySelector(`[data-field="${f}"]`);
    if (hidden) hidden.value = code;
    const cfield = document.getElementById(`cfield-${f}`);
    if (cfield) {
      const dot = cfield.querySelector('.colour-dot');
      const label = cfield.querySelector('.colour-text');
      if (dot) dot.style.cssText = `background:${hex};border-color:rgba(255,255,255,0.2)`;
      if (label) label.textContent = code;
      // Show clear button
      if (!cfield.querySelector('.colour-clear')) {
        const clr = document.createElement('button');
        clr.className = 'colour-clear'; clr.title = 'Clear'; clr.textContent = '✕';
        clr.dataset.clearField = f;
        clr.addEventListener('click', e => { e.stopPropagation(); currentRecord[f]=''; re_renderColourField(f,'',colourModalTarget.mode); });
        cfield.appendChild(clr);
      }
    }
  } else if (colourModalTarget.type === 'dec') {
    const { rowIdx, rowEl } = colourModalTarget;
    if (currentRecord.decorations[rowIdx]) currentRecord.decorations[rowIdx].color = code;
    const dot = rowEl.querySelector('[data-dc-colour]');
    const label = dot?.nextElementSibling;
    const hidden = rowEl.querySelector('[data-colour-for="color"]');
    if (dot) dot.style.cssText = `background:${hex};border-color:rgba(255,255,255,.2)`;
    if (label && label.tagName !== 'INPUT') label.textContent = code;
    if (hidden) hidden.dataset.colourValue = code;
  }
  closeColourModal();
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function makePanel(title, badge) {
  const div = document.createElement('div');
  div.className = 'step-panel';
  div.innerHTML = `<h2 class="step-title">${escHtml(title)} <span class="step-title-badge">${badge}</span></h2>`;
  return div;
}

function makeNotesField(notes) {
  const field = document.createElement('div');
  field.className = 'field notes-field';
  field.innerHTML = `<label>Notes <span class="optional">optional</span></label><textarea data-field="notes" rows="3">${escHtml(notes)}</textarea>`;
  return field;
}

function sel(field, opts, current) {
  return `<select data-field="${field}"><option value="">— Select —</option>${opts.map(o => `<option value="${escHtml(o)}"${o===current?' selected':''}>${escHtml(o)}</option>`).join('')}</select>`;
}

// select without data-field (for use in sub-contexts)
function sel2(id, opts, current) {
  return `<select id="${id}"><option value="">— Select —</option>${opts.map(o => `<option value="${escHtml(o)}"${o===current?' selected':''}>${escHtml(o)}</option>`).join('')}</select>`;
}

// select for decoration rows using data-dec-field
function sel2Dc(field, opts, current) {
  return `<select data-dec-field="${field}"><option value="">— Select —</option>${opts.map(o => `<option value="${escHtml(o)}"${o===current?' selected':''}>${escHtml(o)}</option>`).join('')}</select>`;
}

function mField(label, field, val) {
  return `<div class="measure-field"><label>${label}</label><input type="number" data-field="${field}" value="${escHtml(val||'')}"></div>`;
}

function summaryRow(label, val) {
  if (!val) return '';
  return `<div><span style="color:var(--muted);min-width:120px;display:inline-block">${escHtml(label)}:</span> ${escHtml(val)}</div>`;
}

function formatAuditDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
