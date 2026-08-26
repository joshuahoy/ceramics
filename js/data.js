'use strict';

// ── Ware catalogue ────────────────────────────────────────────────────────────
// Ordered by frequency for Southern Ontario, late 1800s – mid 1900s
const WARES = [
  // ── Most common refined earthenwares ──
  { label: 'Whiteware',                     material: 'Refined Earthenware', priority: 1 },
  { label: 'Ironstone/White Granite',        material: 'Refined Earthenware', priority: 1 },
  { label: 'Refined Earthenware, unidentifiable', material: 'Refined Earthenware', priority: 1 },
  // ── Porcelain ──
  { label: 'Porcelain, English Bone China',  material: 'Porcelain',           priority: 1 },
  { label: 'Porcelain, unidentifiable',      material: 'Porcelain',           priority: 1 },
  { label: 'Porcellaneous/English Hard Paste', material: 'Porcelain',         priority: 2 },
  { label: 'Porcelain, Chinese',             material: 'Porcelain',           priority: 2 },
  { label: 'Porcelain, English Soft Paste',  material: 'Porcelain',           priority: 2 },
  { label: 'Porcelain, French',              material: 'Porcelain',           priority: 3 },
  { label: 'Porcelain, Japanese',            material: 'Porcelain',           priority: 3 },
  // ── Other refined earthenwares ──
  { label: 'Pearlware',                      material: 'Refined Earthenware', priority: 2 },
  { label: 'Creamware',                      material: 'Refined Earthenware', priority: 2 },
  { label: 'Yellowware',                     material: 'Refined Earthenware', priority: 2 },
  { label: 'Bennington/Rockingham',          material: 'Refined Earthenware', priority: 2 },
  { label: 'Victorian Majolica',             material: 'Refined Earthenware', priority: 2 },
  { label: 'Refined Earthenware, modern',    material: 'Refined Earthenware', priority: 2 },
  { label: 'Luster Ware',                    material: 'Refined Earthenware', priority: 3 },
  { label: 'Delftware, Dutch/British',       material: 'Refined Earthenware', priority: 3 },
  { label: 'Faience',                        material: 'Refined Earthenware', priority: 3 },
  { label: 'Tin-Enameled, unidentified',     material: 'Refined Earthenware', priority: 3 },
  { label: 'Canary Ware',                    material: 'Refined Earthenware', priority: 3 },
  { label: 'Agate, refined (Whieldon-type)', material: 'Refined Earthenware', priority: 3 },
  { label: 'Astbury Type',                   material: 'Refined Earthenware', priority: 3 },
  { label: 'Jackfield Type',                 material: 'Refined Earthenware', priority: 3 },
  { label: "Wedgwood Green",                 material: 'Refined Earthenware', priority: 3 },
  { label: 'Whieldon-type Ware',             material: 'Refined Earthenware', priority: 3 },
  { label: 'Red Agate, refined',             material: 'Refined Earthenware', priority: 3 },
  { label: 'Redware, refined',               material: 'Refined Earthenware', priority: 3 },
  { label: "'Carolina' Creamware",           material: 'Refined Earthenware', priority: 3 },
  // ── Stoneware ──
  { label: 'American Stoneware',             material: 'Stoneware',           priority: 2 },
  { label: 'British Stoneware',              material: 'Stoneware',           priority: 2 },
  { label: 'Stoneware, unidentifiable',      material: 'Stoneware',           priority: 2 },
  { label: 'White Salt Glaze',               material: 'Stoneware',           priority: 2 },
  { label: 'Slip Dip',                       material: 'Stoneware',           priority: 3 },
  { label: 'Turner Type',                    material: 'Stoneware',           priority: 3 },
  { label: 'Black Basalt',                   material: 'Stoneware',           priority: 3 },
  { label: 'Rosso Antico',                   material: 'Stoneware',           priority: 3 },
  { label: 'Jasperware',                     material: 'Stoneware',           priority: 3 },
  { label: 'Fulham Type',                    material: 'Stoneware',           priority: 3 },
  { label: 'Nottingham',                     material: 'Stoneware',           priority: 3 },
  { label: 'Staffordshire Brown Stoneware',  material: 'Stoneware',           priority: 3 },
  { label: 'Shaw Stoneware',                 material: 'Stoneware',           priority: 3 },
  { label: 'Westerwald/Rhenish',             material: 'Stoneware',           priority: 3 },
  { label: 'Frechen Brown',                  material: 'Stoneware',           priority: 3 },
  { label: 'German Stoneware',               material: 'Stoneware',           priority: 3 },
  { label: 'Refined Stoneware, unidentifiable', material: 'Stoneware',        priority: 3 },
  { label: 'Burslem',                        material: 'Stoneware',           priority: 3 },
  // ── Coarse earthenwares ──
  { label: 'Redware',                        material: 'Coarse Earthenware',  priority: 3 },
  { label: 'Buckley',                        material: 'Coarse Earthenware',  priority: 3 },
  { label: 'North Devon Plain',              material: 'Coarse Earthenware',  priority: 3 },
  { label: 'North Devon Gravel Tempered',    material: 'Coarse Earthenware',  priority: 3 },
  { label: 'Slipware, North Midlands/Staffordshire', material: 'Coarse Earthenware', priority: 3 },
  { label: 'Slipware, North Italian',        material: 'Coarse Earthenware',  priority: 3 },
  { label: 'Staffordshire Mottled Glaze',    material: 'Coarse Earthenware',  priority: 3 },
  { label: 'Post-Medieval London-area Redware', material: 'Coarse Earthenware', priority: 3 },
  { label: 'Red Agate, coarse',              material: 'Coarse Earthenware',  priority: 3 },
  { label: 'Red Sandy Ware',                 material: 'Coarse Earthenware',  priority: 3 },
  { label: 'Iberian Ware',                   material: 'Coarse Earthenware',  priority: 3 },
  { label: 'Spanish Coarse Earthenware',     material: 'Coarse Earthenware',  priority: 3 },
  { label: 'French Coarse Earthenware',      material: 'Coarse Earthenware',  priority: 3 },
  { label: 'Derbyshire',                     material: 'Coarse Earthenware',  priority: 3 },
  { label: 'Afro-Caribbean Ware',            material: 'Coarse Earthenware',  priority: 3 },
  { label: 'Colonoware',                     material: 'Coarse Earthenware',  priority: 3 },
  { label: 'Native American, unidentified',  material: 'Coarse Earthenware',  priority: 3 },
  { label: 'Coarse Earthenware, unidentified', material: 'Coarse Earthenware', priority: 3 },
  // ── Unidentifiable ──
  { label: 'Unidentifiable',                 material: 'Unidentifiable',      priority: 1 },
];

// Wares that use Refined Surface Colors (Individual Glossy entries) for surface colour
const WHITE_BODIED_WARES = new Set([
  'Creamware', "'Carolina' Creamware", 'Delftware, Dutch/British', 'Faience',
  'Ironstone/White Granite', 'Pearlware', 'Tin-Enameled, unidentified', 'Whiteware',
  'Slip Dip', 'Turner Type', 'White Salt Glaze',
  'Porcelain, Chinese', 'Porcelain, English Bone China', 'Porcelain, English Soft Paste',
  'Porcelain, French', 'Porcelain, Japanese', 'Porcelain, unidentifiable',
  'Porcellaneous/English Hard Paste', 'Refined Earthenware, unidentifiable',
]);

// Smart defaults auto-filled when ware is selected
const WARE_PRESETS = {
  'Whiteware':                      { manuTech: 'Press Molded', extSurface: 'Lead Glaze',          intSurface: 'Lead Glaze'          },
  'Ironstone/White Granite':        { manuTech: 'Press Molded', extSurface: 'Lead Glaze',          intSurface: 'Lead Glaze'          },
  'Pearlware':                      { manuTech: 'Press Molded', extSurface: 'Lead Glaze',          intSurface: 'Lead Glaze'          },
  'Creamware':                      { manuTech: 'Press Molded', extSurface: 'Lead Glaze',          intSurface: 'Lead Glaze'          },
  "'Carolina' Creamware":           { manuTech: 'Press Molded', extSurface: 'Lead Glaze',          intSurface: 'Lead Glaze'          },
  'Yellowware':                     { manuTech: 'Press Molded', extSurface: 'Lead Glaze',          intSurface: 'Lead Glaze'          },
  'Bennington/Rockingham':          { manuTech: 'Press Molded', extSurface: 'Lead Glaze',          intSurface: 'Lead Glaze'          },
  'Victorian Majolica':             { manuTech: 'Press Molded', extSurface: 'Tin Glaze',           intSurface: 'Lead Glaze'          },
  'Refined Earthenware, modern':    { manuTech: 'Press Molded', extSurface: 'Lead Glaze',          intSurface: 'Lead Glaze'          },
  'Refined Earthenware, unidentifiable': { manuTech: 'Press Molded', extSurface: 'Lead Glaze',    intSurface: 'Lead Glaze'          },
  'Delftware, Dutch/British':       { manuTech: 'Wheel Thrown', extSurface: 'Tin Glaze',           intSurface: 'Tin Glaze'           },
  'Faience':                        { manuTech: 'Wheel Thrown', extSurface: 'Tin Glaze',           intSurface: 'Tin Glaze'           },
  'Tin-Enameled, unidentified':     { manuTech: 'Wheel Thrown', extSurface: 'Tin Glaze',           intSurface: 'Tin Glaze'           },
  'Porcelain, Chinese':             { manuTech: 'Press Molded', extSurface: 'Feldspathic Glaze',   intSurface: 'Feldspathic Glaze'   },
  'Porcelain, English Bone China':  { manuTech: 'Press Molded', extSurface: 'Lead Glaze',          intSurface: 'Lead Glaze'          },
  'Porcelain, English Soft Paste':  { manuTech: 'Press Molded', extSurface: 'Lead Glaze',          intSurface: 'Lead Glaze'          },
  'Porcelain, French':              { manuTech: 'Press Molded', extSurface: 'Feldspathic Glaze',   intSurface: 'Feldspathic Glaze'   },
  'Porcelain, Japanese':            { manuTech: 'Press Molded', extSurface: 'Feldspathic Glaze',   intSurface: 'Feldspathic Glaze'   },
  'Porcelain, unidentifiable':      { manuTech: 'Press Molded', extSurface: 'Feldspathic Glaze',   intSurface: 'Feldspathic Glaze'   },
  'Porcellaneous/English Hard Paste': { manuTech: 'Press Molded', extSurface: 'Feldspathic Glaze', intSurface: 'Feldspathic Glaze'   },
  'American Stoneware':             { manuTech: 'Wheel Thrown', extSurface: 'Salt Glaze',          intSurface: 'Salt Glaze'          },
  'British Stoneware':              { manuTech: 'Wheel Thrown', extSurface: 'Salt Glaze',          intSurface: 'Salt Glaze'          },
  'White Salt Glaze':               { manuTech: 'Press Molded', extSurface: 'Salt Glaze',          intSurface: 'Salt Glaze'          },
  'Westerwald/Rhenish':             { manuTech: 'Wheel Thrown', extSurface: 'Salt Glaze',          intSurface: 'Salt Glaze'          },
  'Fulham Type':                    { manuTech: 'Wheel Thrown', extSurface: 'Salt Glaze',          intSurface: 'Salt Glaze'          },
  'Nottingham':                     { manuTech: 'Wheel Thrown', extSurface: 'Salt Glaze',          intSurface: 'Salt Glaze'          },
  'Black Basalt':                   { manuTech: 'Press Molded', extSurface: 'Unglazed/Bisque',     intSurface: 'Unglazed/Bisque'     },
  'Rosso Antico':                   { manuTech: 'Press Molded', extSurface: 'Unglazed/Bisque',     intSurface: 'Unglazed/Bisque'     },
  'Jasperware':                     { manuTech: 'Press Molded', extSurface: 'Unglazed/Bisque',     intSurface: 'Unglazed/Bisque'     },
  'Redware':                        { manuTech: 'Wheel Thrown', extSurface: 'Lead Glaze',          intSurface: 'Lead Glaze'          },
};

// Identification tips drawn from DAACS manual + Maryland Diagnostic Artifacts website
const WARE_TIPS = {
  'Whiteware': {
    dates: 'c.1820 – present (dominant from 1820s–1960s)',
    fabric: 'White body. Whiter than pearlware. Often slightly crazed.',
    glaze: 'Clear, colourless lead glaze — NO blue tint. Glaze pools show no yellow or blue (key difference from creamware and pearlware).',
    decor: 'Transfer printing (blue, brown, black, green, pink). Decalcomania from c.1890. Molded designs common.',
    url: 'https://apps.jefpat.maryland.gov/diagnostic/Earthenware/Evolution.aspx',
  },
  'Ironstone/White Granite': {
    dates: 'post 1813 (common in Ontario c.1840–1900)',
    fabric: 'Dense, heavy white body — noticeably heavier than standard whiteware. Very durable, resists chipping.',
    glaze: 'Clear colourless glaze. More durable finish than whiteware.',
    decor: 'Often plain (utilitarian). Relief-molded patterns very common. Transfer printing used.',
    url: 'https://apps.jefpat.maryland.gov/diagnostic/Earthenware/WhiteGranite.aspx',
  },
  'Porcelain, English Bone China': {
    dates: 'post 1794 (very common from c.1800–present)',
    fabric: 'Extremely translucent ivory-white body. Hold to light — can see hand shadow through even thick sherd. Stronger than hard paste, less prone to chipping.',
    glaze: 'Transparent glaze, tends toward crazing. Under UV light: glazed surface appears blueish white.',
    decor: 'Overglaze painting, transfer printing, gold gilt, sprig molding. Cups and saucers most common in Ontario.',
    url: 'https://apps.jefpat.maryland.gov/diagnostic/Porcelain/BoneChina.aspx',
  },
  'Pearlware': {
    dates: 'c.1779 – 1840',
    fabric: 'Thinly potted white body (whiter than creamware).',
    glaze: 'Clear lead glaze pools BLUE in foot rings. Held against white paper: appears distinctly bluish. Key diagnostic difference from creamware.',
    decor: 'Shell edge (blue or green, c.1779–1840+), transfer printing, hand-painted underglaze. Decoration critical for dating.',
    url: 'https://apps.jefpat.maryland.gov/diagnostic/Earthenware/Creamware.aspx',
  },
  'Creamware': {
    dates: 'c.1762 – 1820',
    fabric: 'Thinly potted cream/ivory to tan body. Hard, somewhat porous.',
    glaze: 'Clear lead glaze pools YELLOW in foot rings. Held against white paper: appears yellow/cream.',
    decor: 'Molded rims (Queen\'s shape, Feather Edge, Shell Edge), underglaze blue (post 1780), overglaze enamels, transfer printing.',
    url: 'https://apps.jefpat.maryland.gov/diagnostic/Earthenware/Creamware.aspx',
  },
  'Porcelain, Chinese': {
    dates: 'c.1690 – present (Canton common from 1785–1853; later Chinese porcelain also present)',
    fabric: 'Vitrified, glassy white paste with slight blue/grey tint. Extremely hard — does NOT scratch with a steel file. Glaze fused to body.',
    glaze: 'Clear glossy feldspathic glaze, nearly indistinguishable from paste. Foot rings unglazed.',
    decor: 'Blue underglaze painting most common. Overglaze enamels (famille rose, Imari). Canton: 1785–1853.',
    url: 'https://apps.jefpat.maryland.gov/diagnostic/Porcelain/ChineseHardPastePorcelain.aspx',
  },
  'Porcellaneous/English Hard Paste': {
    dates: 'post 1820 (later European and North American hard paste)',
    fabric: 'Dense, hard, dead white body. Translucent. Very glassy appearance on broken edge.',
    glaze: 'Clear glassy feldspathic glaze. Hard and chip-resistant.',
    decor: 'Transfer printing, decalcomania, liquid gold. 20th-century pieces almost exclusively decal.',
    url: 'https://apps.jefpat.maryland.gov/diagnostic/Porcelain/EuropeanHardPastePorcelain.aspx',
  },
  'Porcelain, English Soft Paste': {
    dates: 'c.1745 – 1810',
    fabric: 'Dense, chalky paste — slightly more porous than hard paste. Can become discoloured/stained from soil. Scratches with a steel file.',
    glaze: 'Clear semi-gloss glaze distinct from body (thin white line in cross-section). Foot rings ARE glazed. Fluoresces dull pink/grey-purple under UV.',
    decor: 'Blue and white most common. Chinoiserie, floral, Willow-type patterns.',
    url: 'https://apps.jefpat.maryland.gov/diagnostic/Porcelain/SoftPastePorcelain.aspx',
  },
  'Yellowware': {
    dates: 'c.1830 – early 1900s (common in Ontario c.1860–1900)',
    fabric: 'Yellow/buff body — ranges from pale yellow to deep ochre. Hard, dense refined earthenware.',
    glaze: 'Clear or coloured lead glaze. Often undecorated. Rockingham (mottled brown) glaze common variant.',
    decor: 'Often plain. Mocha (tree/seaweed), engine-turned bands, cable decoration on utility wares.',
    url: 'https://apps.jefpat.maryland.gov/diagnostic/Earthenware/YellowWare.aspx',
  },
  'Bennington/Rockingham': {
    dates: 'c.1849 – early 1900s',
    fabric: 'Yellow/buff body (same as yellowware).',
    glaze: 'Mottled brown/tortoiseshell lead glaze ranging from honey to dark chocolate. Characteristically uneven and splotchy.',
    decor: 'Decoration inherent in glaze. Molded forms — pitchers, teapots, chamber pots most common.',
    url: 'https://apps.jefpat.maryland.gov/diagnostic/Earthenware/RockinghamWare.aspx',
  },
  'American Stoneware': {
    dates: 'c.1750 – 1920 (most common in Ontario c.1850–1920)',
    fabric: 'Dense, light brown to grey clay body. Hard, impervious to liquids.',
    glaze: 'Salt glaze (pitted "orange peel" texture) or Albany slip (dark glossy brown interior). Alkaline glaze on some.',
    decor: 'Cobalt blue hand-painted or stencilled floral/bird motifs. Many undecorated.',
    url: 'https://apps.jefpat.maryland.gov/diagnostic/Stoneware/NorthAmericanStoneware.aspx',
  },
  'White Salt Glaze': {
    dates: 'c.1720 – 1805',
    fabric: 'Nearly white, dense stoneware body. Fine-pitted "orange peel" surface is the key diagnostic feature.',
    glaze: 'Salt glaze — no separate glaze layer, fused directly to surface.',
    decor: 'Molded rims (Dot/Diaper/Basketweave, Feather Edge, Queen\'s shape, Barley). Scratch Blue, overglaze enamels.',
    url: 'https://apps.jefpat.maryland.gov/diagnostic/Stoneware/WhiteSaltGlazedStoneware.aspx',
  },
  'Delftware, Dutch/British': {
    dates: 'c.1600 – 1800',
    fabric: 'Buff/pale yellow paste (also pink/red). Porous — broken edge sticks to tongue.',
    glaze: 'Thick white TIN glaze "floats" on surface. Often absent in patches or easily flaked. Opaque white appearance.',
    decor: 'Blue and white most common; polychrome (Fazackerly c.1750–1770). Painted underglaze.',
    url: 'https://apps.jefpat.maryland.gov/diagnostic/Earthenware/TinGlazed.aspx',
  },
  'Victorian Majolica': {
    dates: 'c.1851 – 1900',
    fabric: 'Buff/cream earthenware body.',
    glaze: 'Lead glaze coloured with metallic oxides — vivid greens, turquoises, purples, yellows. Typically opaque.',
    decor: 'Decoration inherent in moulded form and coloured glaze. Naturalistic motifs (leaves, flowers, shells).',
    url: 'https://apps.jefpat.maryland.gov/diagnostic/Earthenware/VictorianMajolica.aspx',
  },
  'Refined Earthenware, modern': {
    dates: 'post 1900',
    fabric: 'Various white to buff refined earthenware bodies.',
    glaze: 'Various glazes including lead, Bristol, zinc emulsion.',
    decor: 'Decalcomania very common. Stamped and printed designs.',
    url: null,
  },
};

// ── Authority terms ────────────────────────────────────────────────────────────

const MATERIALS = ['Coarse Earthenware', 'Porcelain', 'Refined Earthenware', 'Stoneware', 'Unidentifiable'];

const MANU_TECH = ['Handbuild, coil', 'Handbuild, unidentifiable', 'Missing', 'Not Applicable', 'Press Molded', 'Slip Cast', 'Unidentifiable', 'Wheel Thrown'];

// Identification guidance condensed from DAACS Ceramics Cataloging Manual, section 1.4.
const MANU_TECH_TIPS = {
  'Wheel Thrown': {
    evidence: 'Look for horizontal rilling or throw lines.',
    typical: 'Common for stonewares, many coarse earthenwares, early refined wares such as delft, heavy forms, and some porcelains.',
  },
  'Press Molded': {
    evidence: 'Usually produces thin-bodied vessels and can create complex molded shapes.',
    typical: 'Common for thin refined-earthenware teawares and tablewares, including creamware baskets; some porcelain is also press molded.',
  },
  'Handbuild, coil': {
    evidence: 'Use only where diagnostic coil evidence, such as a coil break, is present.',
    typical: 'Coils are joined spirals or series of clay coils smoothed together with fingers, a paddle and anvil, or similar tools.',
  },
  'Handbuild, unidentifiable': {
    evidence: 'Use when pottery is handbuilt but no diagnostic coil evidence survives on the sherd.',
    typical: 'Handbuilt vessels can be slab-built, coiled, or a combination; these techniques are difficult to distinguish from sherds.',
  },
  'Slip Cast': {
    evidence: 'Look for a negative impression of exterior decoration on the interior surface.',
    typical: 'A watery slip is poured into a mold and allowed to harden. Fine stonewares such as Black Basalt and White Salt Glaze may be slip cast.',
  },
  'Missing': {
    evidence: 'The original surface or diagnostic manufacturing evidence is missing.',
    typical: 'Use only when loss or damage prevents the technique from being observed.',
  },
  'Not Applicable': {
    evidence: 'Manufacturing technique is not applicable to the recorded material.',
    typical: 'Use only where this field does not apply; otherwise select the most supportable technique or Unidentifiable.',
  },
  'Unidentifiable': {
    evidence: 'No diagnostic features support a confident manufacturing-technique identification.',
    typical: 'Use when the technique cannot be determined from the available sherd evidence.',
  },
};

const VESSEL_CATEGORIES = ['Flat', 'Hollow', 'Unidentifiable'];

const FORMS = [
  'Basket','Berry Dish','Bottle','Bottle, blacking','Bowl','Bowl, punch','Bowl, slop','Box',
  'Castor','Chafing Dish','Chamberpot','Coffee Pot','Colander','Creamer','Cup','Cup, lidded',
  'Dish (>10″ diameter)','Dish (7″-10″ diameter)','Drinking Pot','Drug Jar/Salve Pot',
  'Flower Pot','Gaming Piece','Griddle','Inkwell','Jar','Jar, mustard','Jug','Kiln Furniture',
  'Lid','Milk Pan','Mold, jelly','Mug/Can','Not Applicable','Not Recorded','Patty Pan',
  'Pipkin','Pitcher/Ewer','Plate','Platter','Porringer','Pot/Butter Pot','Saucer',
  'Sea Kale Pot','Serving Dish, miscellaneous','Storage Jar','Storage Vessel','Strainer',
  'Tankard','Tea Caddy','Teabowl','Teacup','Teapot','Tureen','Unid: Tableware',
  'Unid: Teaware','Unid: Utilitarian','Unidentifiable','Vegetable Dish','Water Cooler',
];

const COMPLETENESS = [
  'Base','Base, Body','Base, Body, Handle','Base, Body, Rim','Body','Body, Handle',
  'Body, Handle Terminal','Body, Handle, Rim','Body, Handle, Spout','Body, Rim',
  'Body, Shoulder','Body, Shoulder, Neck','Body, Spout','Detached Glaze',
  'Finial','Finial, lid','Foot','Handle','Handle Terminal','Lid','Neck',
  'Neck, Handle Terminal, Rim','Neck, Rim','Not Applicable','Not Recorded','Rim',
  'Shoulder','Shoulder, Handle Terminal','Shoulder, Neck','Shoulder, Neck, Rim',
  'Spout','Unidentifiable',
];

const SURFACES = [
  'Albany Slip','Alkaline Glaze','Bristol Glaze','Feldspathic Glaze',
  'Glaze, unidentifiable','Lead Glaze','Missing','Not Applicable','Not Recorded',
  'Salt Glaze','Tin Glaze','Unglazed/Bisque','Unidentifiable','Wash','Zinc Emulsion Glaze',
];

const OXIDIZED = ['Not Recorded', 'Not Reduced', 'Reduced', 'Unidentifiable'];

const BURNING = [
  'Both Interior and Exterior Burned','Exterior Burned','Interior Burned',
  'Not Recorded','Sides Burned','Unburned',
];

const WEAR_PATTERNS = [
  'Base Abrasion','Fire-clouding','Partial Missing Surface','Residue/Soot',
  'Spalling','Toothbrush Abrasion','Utensil Wear','Worn/Abraded',
];

const DEC_INT_EXT = ['Exterior', 'Interior', 'Perforate'];

const DEC_LOCATIONS = [
  'Base','Body','Finial','Foot Ring','Handle','Lid','Neck',
  'Proximal Rim','Rim','Shoulder','Spout','Terminal','Unidentified',
];

const DEC_TECHNIQUES = [
  'Applied Clay','Applied Powder/Crystals','Bull\'s Eye Inlay','Burnished (w/ visible facets)',
  'Cord Marked','Cut','Decalcomania','Dendritic','Dipped','Impressed','Impressed, fabric',
  'Impressed, fingerprints','Incised, free hand','Incised, lathe/engine turned','Luster',
  'Molded','Not Applicable','Painted, over free hand','Painted, under free hand',
  'Painted, under lathe/engine turned','Pierced','Printed, flow','Printed, over','Printed, under',
  'Punctate','Rouletted','Rusticated/Encrusted','Scratch/Fill','Scratch/Fill Debased',
  'Sgrafitto','Slip','Slip, inlaid','Slip, lathe/engine turned','Sponge','Sprig Molded',
  'Stamped','Stencil','Textured','Unidentifiable',
];

const MOTIFS = [
  'Adjacent Combination A','Adjacent Combination B','Adjacent/Stacked Combo A',
  'Adjacent/Stacked Combo B','Individual A','Individual B','Individual C','Individual D',
  'Individual E','Individual F','Individual G','Individual H','Individual I','Individual J',
  'Individual, repeated A','Individual, repeated B','Individual, repeated C',
  'Not Applicable','Scene Combination A','Scene Combination B',
  'Stacked Combination A','Stacked Combination B',
];

const GENRES = [
  'An Hua','Applied Powder Crystals, purple','Barley','Bartmann','Batavian','Bead and Reel',
  'Blue and Gray','Blue, molded/stamped/incised','Cauliflower','Decalcomania',
  'Dot/Diaper/Basketweave','Feather Edge','Flow, transfer print blue',
  'Flow, transfer print purple/black','Handpainted Blue','Imari','Littler\'s Blue',
  'Luster Decoration','Molded Edge Decoration, other','Not Applicable','Overglaze, handpainted',
  'Polychrome, cool','Polychrome, other','Polychrome, warm','Purple, molded/stamped/incised',
  "Queen's Shape",'Royal Pattern','Scratch Blue','Scratch Brown','Shell Edge, blue',
  'Shell Edge, green','Shell Edge, mulberry','Shell Edge, unidentifiable',
  'Slipware, factory made','Sponge/Spatter','Transfer Print Over',
  'Transfer Print Under, black','Transfer Print Under, blue','Transfer Print Under, brown',
  'Transfer Print Under, gray','Transfer Print Under, green','Transfer Print Under, light blue',
  'Transfer Print Under, pink','Transfer Print Under, polychrome','Transfer Print Under, purple',
  'Transfer Print Under, red','Transfer Print Under, unidentifiable','Victorian Majolica',
];

const PATTERN_NAMES = [
  '"Goat"','Altar of Love (Valentine)','Asiatic Plants','Belzoni','Caledonia','Canton',
  'Chevy Chase','Chinese Landscape Pattern 1','Cornflower','Cyrene','Dagoty et Honore, Paris',
  'Dogs on the Scent','Famille Rose','Famille Verte','Fitzhugh','Flower Basket',
  'Flower, Scroll, Medallion (1820)','Flowers and Leaves','Genoa',
  'Grape, Bamboo, and Squirrel','Grecian Pattern','Nanking','Not Applicable','Oriental',
  'Pinwheel Pattern','Pomerania','Spanish Procession','Sydenham','Syrian',
  'Unidentifiable','Wild Rose','Willow Pattern',
];

const BASE_MARKS = ['Impressed','Incised','Not Applicable','Painted','Printed','Unidentifiable'];

// Common stylistic elements (searchable; the full DAACS list has 544 entries)
const STYLISTIC_ELEMENTS = [
  'Acanthus Leaves','Angular Edge','Animal, unidentified','Bamboo','Band, unidentified',
  'Barley','Basket Weave 01','Basket Weave 02','Basket Weave 03','Basketwork',
  'Bead and Reel','Bird','Bird, stylized','Botanical Band, unidentifed',
  'Botanical, composite','Botanical, sprig','Botanical, unidentified',
  'Cable Band 01','Cable Band 02','Cat\'s Eye, single','Chinese Characters',
  'Circle Band, unidentified','Circle, open','Cloud Band 01','Clouded','Combed',
  'Common Cable','Cordoned','Dash Band, unidentified','Dendritic','Dots',
  'Feather Edge','Fish Roe, unidentified','Floral Medallion','Floral, radiating bloom 01',
  'Fluted','Folded Rim','Fruit','Garland, unidentified','Geometric Band, unidentified',
  'Geometric Circle','Geometric, unidentified','Grass','Half-Circle Band, unidentified',
  'Heart','House','Husk Chain Band, unidentified','Landscape/Hills','Lettering',
  'Marbleized','Medallion, GR','Medallion, unidentified','Molded Band 01','Molded Band 02',
  'Mythical Creature','Not Applicable','Notched','Peacock','Plain Band, unidentified',
  'Plain Edge','Plume Edge','Plume, botanical','Plume, feather','Radiating Lines','Ribbed',
  'Ribbon','Rope Band 01','Roulette Band, unidentified','Royal Pattern 01','Royal Pattern 02',
  'Scales 01','Scallop and Dot','Scallop Band, unidentified','Scallop Pattern 01',
  'Scalloped Edge','Scroll Band, unidentified','Scroll, trellis','Setting Sun','Shading',
  'Shell Edge 01','Shell Edge 02','Shell Edge 03','Shell Edge 04','Shell Edge 05',
  'Shell Edge, unidentified','Solid','Spearhead Band, unidentified','Spearhead, unidentified',
  'Squares','Star','Stippled','Structure, unidentified','Swag, unidentified','T Band 01',
  'Textured','Tick Mark','Tortoiseshell','Trailed','Tree','Trellis 01','Trellis 02',
  'Trellis 03','Trellis Band, unidentified','Trellis, unidentified','Twig',
  'Unidentified','Vertical Lines','Vessel, ceramic','Wall','Water, body of',
  'Wavy Band, unidentified','Wings','Woman',
  // Also include numbered variants for common series
  ...Array.from({length:60}, (_,i) => `Botanical Band ${String(i+1).padStart(2,'0')}`),
  ...Array.from({length:15}, (_,i) => `Dash Band ${String(i+1).padStart(2,'0')}`),
  ...Array.from({length:9},  (_,i) => `Diamond Band ${String(i+1).padStart(2,'0')}`),
  ...Array.from({length:10}, (_,i) => `Dot Band ${String(i+1).padStart(2,'0')}`),
  ...Array.from({length:13}, (_,i) => `Garland ${String(i+1).padStart(2,'0')}`),
  ...Array.from({length:33}, (_,i) => `Geometric Band ${String(i+1).padStart(2,'0')}`),
  ...Array.from({length:15}, (_,i) => `Half-Circle Band ${String(i+1).padStart(2,'0')}`),
  ...Array.from({length:12}, (_,i) => `Husk Chain Band ${String(i+1).padStart(2,'0')}`),
  ...Array.from({length:14}, (_,i) => `Plain Band ${String(i+1).padStart(2,'0')}`),
  ...Array.from({length:15}, (_,i) => `Roulette Band ${String(i+1).padStart(2,'0')}`),
  ...Array.from({length:16}, (_,i) => `Scallop Band ${String(i+1).padStart(2,'0')}`),
  ...Array.from({length:7},  (_,i) => `Scroll Band ${String(i+1).padStart(2,'0')}`),
  ...Array.from({length:24}, (_,i) => `Shell Edge ${String(i+1).padStart(2,'0')}`),
  ...Array.from({length:13}, (_,i) => `Spearhead Band ${String(i+1).padStart(2,'0')}`),
  ...Array.from({length:16}, (_,i) => `Swag ${String(i+1).padStart(2,'0')}`),
  ...Array.from({length:3},  (_,i) => `T Band ${String(i+1).padStart(2,'0')}`),
  ...Array.from({length:46}, (_,i) => `Trellis Band ${String(i+1).padStart(2,'0')}`),
  ...Array.from({length:15}, (_,i) => `Wavy Band ${String(i+1).padStart(2,'0')}`),
].sort();

// ── Colour data ────────────────────────────────────────────────────────────────
// Refined Surface Colors: used for white-bodied ware surface colours (porcelain, whiteware, etc.)
const REFINED_COLOURS = [
  { code: 'N9/',       label: 'N9/ (White/Off-white)'       },
  { code: '5Y 9/1',   label: '5Y 9/1 (Very Pale Yellow)'   },
  { code: '5Y 9/2',   label: '5Y 9/2 (Pale Yellow)'        },
  { code: '2.5Y 7/2', label: '2.5Y 7/2 (Light Gray)'       },
  { code: '2.5Y 8.5/4', label: '2.5Y 8.5/4 (Pale Yellow)' },
  { code: '10Y 9/1',  label: '10Y 9/1 (Pale Green-White)'  },
  { code: '5B 9/1',   label: '5B 9/1 (Pale Blue-White)'    },
  { code: '5B 8/1',   label: '5B 8/1 (Very Pale Blue)'     },
  { code: '5BG 9/1',  label: '5BG 9/1 (Pale Blue-Green)'   },
  { code: '5G 9/1',   label: '5G 9/1 (Pale Green-White)'   },
  { code: '5GY 9/1',  label: '5GY 9/1 (Pale Green-Yellow)' },
  { code: '5P 9/2',   label: '5P 9/2 (Pale Purple-White)'  },
  { code: '10RP 9/1', label: '10RP 9/1 (Pale Pink-White)'  },
  // Admin
  { code: 'Body Color Obscured by Decoration', label: 'Body Color Obscured by Decoration', special: true },
  { code: 'Not Applicable',  label: 'Not Applicable',  special: true },
  { code: 'Not Recorded',    label: 'Not Recorded',    special: true },
  { code: 'Unidentifiable',  label: 'Unidentifiable',  special: true },
  { code: 'Missing',         label: 'Missing',         special: true },
];

// DAACS MCRS colour families for decoration colour and non-white-bodied surface colour
const MCRS_FAMILIES = [
  {
    name: 'Yellow-Red / Orange',
    entries: [
      { name: 'Yellow-Red, Intense Dark',   codes: ['2.5YR 3/8'] },
      { name: 'Yellow-Red, Intense Medium', codes: ['2.5YR 6/10','2.5YR 6/16','2.5YR 4/10','5YR 6/14','5YR 5/10'] },
      { name: 'Yellow-Red, Intense Light',  codes: ['2.5YR 7/8','5YR 7/10','5YR 7/12','7.5YR 8/8','7.5YR 7/16'] },
      { name: 'Yellow-Red, Muted Dark',     codes: ['2.5YR 3/6','2.5YR 2/4','5YR 3/6','7.5YR 2/4','10YR 3/2'] },
      { name: 'Yellow-Red, Muted Medium',   codes: ['2.5YR 6/2','2.5YR 5/6','5YR 6/6','5YR 4/4','7.5YR 5/6','10YR 6/4'] },
      { name: 'Yellow-Red, Muted Light',    codes: ['2.5YR 9/2','2.5YR 7/6','5YR 8/6','5YR 7/4','7.5YR 7/2'] },
    ],
  },
  {
    name: 'Red',
    entries: [
      { name: 'Red, Intense Dark',   codes: ['5R 2/8','7.5R 3/12','10R 3/10'] },
      { name: 'Red, Intense Medium', codes: ['2.5R 6/8','2.5R 5/14','2.5R 4/14','5R 6/12','5R 5/8','7.5R 5/10'] },
      { name: 'Red, Intense Light',  codes: ['2.5R 7/8','10R 7/10'] },
      { name: 'Red, Muted Dark',     codes: ['2.5R 3/2','2.5R 2/6','5R 2/2','7.5R 3/4','7.5R 3/6','10R 2/6'] },
      { name: 'Red, Muted Medium',   codes: ['2.5R 6/2','2.5R 4/6','5R 6/6','5R 5/4','5R 4/2','7.5R 5/2','7.5R 5/6'] },
      { name: 'Red, Muted Light',    codes: ['2.5R 9/2','2.5R 7/7','5R 8/6','5R 7/2','7.5R 8/4','10R 8/6','10R 7/6'] },
    ],
  },
  {
    name: 'Red-Purple',
    entries: [
      { name: 'Red-Purple, Intense Dark',   codes: ['2.5RP 2/8','5RP 3/10','10RP 3/10'] },
      { name: 'Red-Purple, Intense Medium', codes: ['2.5RP 6/12','2.5RP 4/10','5RP 6/12','5RP 5/8','7.5RP 4/10'] },
      { name: 'Red-Purple, Intense Light',  codes: ['2.5RP 7/10','10RP 7/8'] },
      { name: 'Red-Purple, Muted Dark',     codes: ['2.5RP 3/4','5RP 3/2','5RP 3/6','7.5RP 2/6','10RP 3/6','10RP 2/4'] },
      { name: 'Red-Purple, Muted Medium',   codes: ['2.5RP 6/4','2.5RP 5/3','2.5RP 4/6','5RP 6/6','5RP 4/4'] },
      { name: 'Red-Purple, Muted Light',    codes: ['2.5RP 8/2','2.5RP 8/6','5RP 8/4','7.5RP 7/2','7.5RP 7/4'] },
    ],
  },
  {
    name: 'Purple',
    entries: [
      { name: 'Purple, Intense Dark',   codes: ['2.5P 2/10','5P 3/10','10P 3/10'] },
      { name: 'Purple, Intense Medium', codes: ['2.5P 4/12','5P 6/8','5P 5/8','5P 4/12','7.5P 5/10','10P 5/8'] },
      { name: 'Purple, Intense Light',  codes: ['5P 7/8'] },
      { name: 'Purple, Muted Dark',     codes: ['2.5P 3/4','5P 3/2','5P 2/4','7.5P 3/4','7.5P 2/2','10P 2/6'] },
      { name: 'Purple, Muted Medium',   codes: ['2.5P 6/4','2.5P 4/6','5P 6/6','5P 5/6','5P 4/2','7.5P 6/2','7.5P 4/6'] },
      { name: 'Purple, Muted Light',    codes: ['2.5P 8/4','5P 9/2','5P 8/2','5P 7/4','7.5P 8/6','7.5P 7/4','10P 7/6'] },
    ],
  },
  {
    name: 'Purple-Blue',
    entries: [
      { name: 'Purple-Blue, Intense Dark',   codes: ['2.5PB 3/10','5PB 2/8','7.5PB 3/12','10PB 2/10'] },
      { name: 'Purple-Blue, Intense Medium', codes: ['2.5PB 5/10','2.5PB 4/10','5PB 5/10','7.5PB 5/8','7.5PB 4/10'] },
      { name: 'Purple-Blue, Intense Light',  codes: ['2.5PB 7/8','7.5PB 7/8'] },
      { name: 'Purple-Blue, Muted Dark',     codes: ['2.5PB 3/4','2.5PB 2/6','5PB 2/6','7.5PB 3/6','7.5PB 2/4','10PB 3/2'] },
      { name: 'Purple-Blue, Muted Medium',   codes: ['2.5PB 6/4','2.5PB 5/6','5PB 6/4','5PB 4/6','7.5PB 6/4'] },
      { name: 'Purple-Blue, Muted Light',    codes: ['2.5PB 8/2','2.5PB 7/6','5PB 8/4','7.5PB 7/6','10PB 8/2','10PB 7/6'] },
    ],
  },
  {
    name: 'Blue',
    entries: [
      { name: 'Blue, Intense Dark',   codes: ['10B 3/10'] },
      { name: 'Blue, Intense Medium', codes: ['2.5B 5/10','5B 6/10','5B 4/8','7.5B 5/10','10B 6/8','10B 4/10'] },
      { name: 'Blue, Intense Light',  codes: ['7.5B 7/8'] },
      { name: 'Blue, Muted Dark',     codes: ['2.5B 3/4','2.5B 2/4','5B 3/6','7.5B 3/2','7.5B 2/6','10B 2/4'] },
      { name: 'Blue, Muted Medium',   codes: ['2.5B 6/4','2.5B 4/6','5B 6/6','5B 5/6','7.5B 5/4','7.5B 4/2'] },
      { name: 'Blue, Muted Light',    codes: ['2.5B 9/2','2.5B 7/4','5B 8/2','5B 8/4','7.5B 7/4','10B 7/6'] },
    ],
  },
  {
    name: 'Blue-Green',
    entries: [
      { name: 'Blue-Green, Intense Dark',   codes: ['7.5BG 3/8'] },
      { name: 'Blue-Green, Intense Medium', codes: ['2.5BG 6/8','2.5BG 4/8','5BG 6/8','7.5BG 5/8','10BG 4/8'] },
      { name: 'Blue-Green, Intense Light',  codes: ['5BG 7/8'] },
      { name: 'Blue-Green, Muted Dark',     codes: ['2.5BG 3/2','2.5BG 3/6','5BG 2/6','7.5BG 3/6','10BG 2/2','10BG 2/6'] },
      { name: 'Blue-Green, Muted Medium',   codes: ['2.5BG 6/4','2.5BG 4/4','5BG 5/2','5BG 5/4','7.5BG 6/6','7.5B 4/2'] },
      { name: 'Blue-Green, Muted Light',    codes: ['2.5BG 8/4','5BG 8/2','5BG 7/4','7.5BG 7/6','10BG 9/2','10BG 7/4'] },
    ],
  },
  {
    name: 'Green',
    entries: [
      { name: 'Green, Intense Dark',   codes: ['2.5G 3/8'] },
      { name: 'Green, Intense Medium', codes: ['2.5G 6/10','2.5G 5/12','2.5G 4/10','5G 5/10','7.5G 4/10'] },
      { name: 'Green, Intense Light',  codes: ['2.5G 7/10','7.5G 7/8'] },
      { name: 'Green, Muted Dark',     codes: ['2.5G 3/6','2.5G 2/2','5G 2/6','7.5G 3/2','7.5G 3/6','10G 3/4'] },
      { name: 'Green, Muted Medium',   codes: ['2.5G 6/2','2.5G 6/4','2.5G 4/6','5G 5/4','5G 4/2','7.5G 6/6'] },
      { name: 'Green, Muted Light',    codes: ['2.5G 9/4','2.5G 8/2','5G 8/6','7.5G 7/4','10G 9/2','10G 7/6'] },
    ],
  },
  {
    name: 'Green-Yellow',
    entries: [
      { name: 'Green-Yellow, Intense Medium', codes: ['2.5GY 6/8','5GY 5/10','5GY 4/8','7.5GY 4/8','10GY 6/10'] },
      { name: 'Green-Yellow, Intense Light',  codes: ['2.5GY 8/12','5GY 7/8','7.5GY 8/10','7.5GY 6/12','10GY 7/10'] },
      { name: 'Green-Yellow, Muted Dark',     codes: ['2.5GY 3/4','5GY 3/2','7.5GY 3/4','10GY 2/4'] },
      { name: 'Green-Yellow, Muted Medium',   codes: ['2.5GY 6/6','2.5GY 4/6','5GY 6/2','5GY 5/6','7.5GY 5/6'] },
      { name: 'Green-Yellow, Muted Light',    codes: ['2.5GY 9/6','2.5GY 7/6','5GY 9/4','5GY 8/2','7.5GY 7/4'] },
    ],
  },
  {
    name: 'Yellow',
    entries: [
      { name: 'Yellow, Intense Medium', codes: ['2.5Y 6/10','7.5Y 6/8','10Y 6/10'] },
      { name: 'Yellow, Intense Light',  codes: ['2.5Y 8.5/10','2.5Y 8/16','2.5Y 7/10','5Y 8.5/12','5Y 8.5/14'] },
      { name: 'Yellow, Muted Dark',     codes: ['2.5Y 3/4','7.5Y 3/4','10Y 3/2'] },
      { name: 'Yellow, Muted Medium',   codes: ['2.5Y 6/6','2.5Y 5/6','5Y 5/6','5Y 4/4','7.5Y 6/2','7.5Y 6/4'] },
      { name: 'Yellow, Muted Light',    codes: ['2.5Y 9/4','2.5Y 8.5/6','2.5Y 7/2','5Y 8.5/2','5Y 8.5/6'] },
    ],
  },
  {
    name: 'Neutrals',
    entries: [
      { name: 'Neutrals, Dark',   codes: ['N3.75/','N2.75/','N2.25/','N0.5/'] },
      { name: 'Neutrals, Medium', codes: ['N6.75/','N5.5/','N4.25/'] },
      { name: 'Neutrals, Light',  codes: ['N9.5/','N8.25/','N7/'] },
    ],
  },
  {
    name: 'Special',
    entries: [
      { name: 'Body Color Obscured by Decoration', codes: [], special: true },
      { name: 'Clear',               codes: [], special: true },
      { name: 'Gilt',                codes: [], special: true },
      { name: 'Silver',              codes: [], special: true },
      { name: 'Tin',                 codes: [], special: true },
      { name: 'No Applied Color',    codes: [], special: true },
      { name: 'Not Applicable',      codes: [], special: true },
      { name: 'Not Recorded',        codes: [], special: true },
      { name: 'Unidentifiable',      codes: [], special: true },
    ],
  },
];

// Special placeholder colours for display
const SPECIAL_DISPLAY_COLOURS = {
  'Body Color Obscured by Decoration': '#303030',
  'Clear':            '#e8e8f0',
  'Gilt':             '#c8a000',
  'Silver':           '#a8a8b0',
  'Tin':              '#808890',
  'No Applied Color': '#b8b0a0',
  'Not Applicable':   '#505050',
  'Not Recorded':     '#404040',
  'Unidentifiable':   '#484848',
  'Missing':          '#282828',
};

// Munsell Soil colours for paste colour, organized by broad family
const MUNSELL_PASTE_FAMILIES = [
  {
    name: 'Red',
    entries: [
      { munsell: '10R 4/4', desc: 'Weak Red' }, { munsell: '10R 4/6', desc: 'Red' },
      { munsell: '10R 5/4', desc: 'Weak Red' }, { munsell: '10R 5/6', desc: 'Red' },
      { munsell: '10R 5/8', desc: 'Red' },      { munsell: '10R 6/8', desc: 'Light Red' },
      { munsell: '2.5YR 3/2', desc: 'Dusky Red' }, { munsell: '2.5YR 3/6', desc: 'Dark Red' },
      { munsell: '2.5YR 4/6', desc: 'Red' },    { munsell: '2.5YR 5/6', desc: 'Red' },
      { munsell: '2.5YR 5/8', desc: 'Red' },    { munsell: '2.5YR 6/6', desc: 'Light Red' },
      { munsell: '2.5YR 6/8', desc: 'Light Red' }, { munsell: '2.5YR 7/6', desc: 'Light Red' },
    ],
  },
  {
    name: 'Brown',
    entries: [
      { munsell: '2.5YR 3/3', desc: 'Dark Reddish Brown' }, { munsell: '2.5YR 4/3', desc: 'Reddish Brown' },
      { munsell: '2.5YR 4/4', desc: 'Reddish Brown' },     { munsell: '2.5YR 5/3', desc: 'Reddish Brown' },
      { munsell: '2.5YR 5/4', desc: 'Reddish Brown' },     { munsell: '5YR 3/2', desc: 'Dark Reddish Brown' },
      { munsell: '5YR 4/3', desc: 'Reddish Brown' },       { munsell: '5YR 4/4', desc: 'Reddish Brown' },
      { munsell: '5YR 5/3', desc: 'Reddish Brown' },       { munsell: '5YR 5/4', desc: 'Reddish Brown' },
      { munsell: '7.5YR 3/2', desc: 'Dark Brown' },        { munsell: '7.5YR 4/2', desc: 'Brown' },
      { munsell: '7.5YR 4/3', desc: 'Brown' },             { munsell: '7.5YR 4/4', desc: 'Brown' },
      { munsell: '7.5YR 5/2', desc: 'Brown' },             { munsell: '7.5YR 5/3', desc: 'Brown' },
      { munsell: '7.5YR 5/4', desc: 'Brown' },             { munsell: '7.5YR 6/3', desc: 'Light Brown' },
      { munsell: '7.5YR 6/4', desc: 'Light Brown' },       { munsell: '10YR 4/3', desc: 'Brown' },
      { munsell: '10YR 5/3', desc: 'Brown' },              { munsell: '10YR 5/4', desc: 'Yellowish Brown' },
      { munsell: '10YR 6/3', desc: 'Pale Brown' },         { munsell: '10YR 6/4', desc: 'Light Yellowish Brown' },
    ],
  },
  {
    name: 'Orange/Yellow',
    entries: [
      { munsell: '5YR 4/6', desc: 'Yellowish Red' },   { munsell: '5YR 5/6', desc: 'Yellowish Red' },
      { munsell: '5YR 6/6', desc: 'Reddish Yellow' },  { munsell: '5YR 6/8', desc: 'Reddish Yellow' },
      { munsell: '5YR 7/6', desc: 'Reddish Yellow' },  { munsell: '7.5YR 5/6', desc: 'Strong Brown' },
      { munsell: '7.5YR 6/6', desc: 'Reddish Yellow' },{ munsell: '7.5YR 6/8', desc: 'Reddish Yellow' },
      { munsell: '10YR 6/6', desc: 'Brownish Yellow' },{ munsell: '10YR 7/6', desc: 'Yellow' },
      { munsell: '10YR 7/8', desc: 'Yellow' },          { munsell: '2.5Y 7/4', desc: 'Pale Yellow' },
      { munsell: '2.5Y 7/6', desc: 'Yellow' },          { munsell: '2.5Y 8/4', desc: 'Pale Yellow' },
    ],
  },
  {
    name: 'Gray',
    entries: [
      { munsell: '2.5YR 3/1', desc: 'Dark Reddish Gray' }, { munsell: '2.5YR 5/1', desc: 'Reddish Gray' },
      { munsell: '5YR 4/1', desc: 'Dark Gray' },  { munsell: '5YR 5/1', desc: 'Gray' },
      { munsell: '5YR 5/2', desc: 'Reddish Gray' }, { munsell: '5YR 6/2', desc: 'Pinkish Gray' },
      { munsell: '5YR 7/1', desc: 'Light Gray' },  { munsell: '7.5YR 3/1', desc: 'Very Dark Gray' },
      { munsell: '7.5YR 4/1', desc: 'Dark Gray' }, { munsell: '7.5YR 5/1', desc: 'Gray' },
      { munsell: '7.5YR 6/2', desc: 'Pinkish Gray' }, { munsell: '7.5YR 7/2', desc: 'Pinkish Gray' },
      { munsell: '10YR 3/1', desc: 'Very Dark Gray' }, { munsell: '10YR 4/1', desc: 'Dark Gray' },
      { munsell: '10YR 5/1', desc: 'Gray' },       { munsell: '10YR 6/1', desc: 'Gray' },
      { munsell: '10YR 6/2', desc: 'Light Brownish Gray' }, { munsell: '10YR 7/1', desc: 'Light Gray' },
      { munsell: '10YR 7/2', desc: 'Light Gray' }, { munsell: '2.5Y 3/1', desc: 'Very Dark Gray' },
      { munsell: '2.5Y 4/1', desc: 'Dark Gray' },  { munsell: '2.5Y 6/2', desc: 'Light Brownish Gray' },
      { munsell: '2.5Y 7/2', desc: 'Light Gray' },
    ],
  },
  {
    name: 'Black',
    entries: [
      { munsell: '2.5YR 2.5/1', desc: 'Reddish Black' },
      { munsell: '5YR 2.5/1', desc: 'Black' },
      { munsell: '7.5YR 2.5/1', desc: 'Black' },
    ],
  },
  {
    name: 'Pink/White',
    entries: [
      { munsell: '5YR 7/4', desc: 'Pink' },       { munsell: '5YR 8/4', desc: 'Pink' },
      { munsell: '7.5YR 7/4', desc: 'Pink' },     { munsell: '7.5YR 8/2', desc: 'Pinkish White' },
      { munsell: '7.5YR 8/4', desc: 'Pink' },     { munsell: '10YR 8/2', desc: 'Very Pale Brown' },
      { munsell: '10YR 8/3', desc: 'Very Pale Brown' }, { munsell: '10YR 8/4', desc: 'Very Pale Brown' },
      { munsell: '2.5Y 8/2', desc: 'Pale Yellow' }, { munsell: '2.5Y 8/3', desc: 'Pale Yellow' },
      { munsell: '2.5Y 8/4', desc: 'Pale Yellow' },
    ],
  },
];
