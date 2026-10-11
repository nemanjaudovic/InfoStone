// Provera upita koje generise Gemma (guide §7.2 i §13.10):
// dozvoljeni su SAMO whitelist operatori, zabranjeno izvrsavanje koda.
const ALLOWED_OPERATORS = new Set(['$eq', '$gt', '$lt', '$in', '$regex', '$and', '$or']);

// Query konzola: dozvoljeni stage-ovi i izrazi za aggregation pipeline
const ALLOWED_STAGES = new Set([
  '$match', '$group', '$sort', '$limit', '$skip', '$count',
  '$project', '$unwind', '$addFields', '$sortByCount',
]);
const ALLOWED_EXPRESSIONS = new Set([
  '$sum', '$avg', '$min', '$max', '$first', '$last', '$push', '$addToSet',
  '$size', '$add', '$subtract', '$multiply', '$divide',
  '$toLower', '$toUpper', '$concat', '$dateToString',
  '$year', '$month', '$week', '$dayOfWeek',
]);

function assertSafeQuery(value, path = 'query') {
  if (Array.isArray(value)) {
    value.forEach((v, i) => assertSafeQuery(v, `${path}[${i}]`));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, v] of Object.entries(value)) {
      if (key.startsWith('$') && !ALLOWED_OPERATORS.has(key)) {
        const err = new Error(`Nedozvoljen operator ${key} u ${path}`);
        err.status = 400;
        throw err;
      }
      assertSafeQuery(v, `${path}.${key}`);
    }
  }
}

// Rekurzivna provera izraza unutar stage-ova (bez $where/$function/$expr)
function assertSafeExpr(value, path) {
  if (Array.isArray(value)) {
    value.forEach((v, i) => assertSafeExpr(v, `${path}[${i}]`));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, v] of Object.entries(value)) {
      if (key.startsWith('$') && !ALLOWED_OPERATORS.has(key) && !ALLOWED_EXPRESSIONS.has(key)) {
        const err = new Error(`Nedozvoljen operator ${key} u ${path}`);
        err.status = 400;
        throw err;
      }
      assertSafeExpr(v, `${path}.${key}`);
    }
  }
}

// Provera aggregation pipeline-a: samo dozvoljeni stage-ovi i izrazi
function assertSafePipeline(pipeline, path = 'pipeline') {
  if (!Array.isArray(pipeline)) {
    const err = new Error('Pipeline mora biti niz stage-ova, npr. [{"$group": {"_id": "$polje"}}]');
    err.status = 400;
    throw err;
  }
  pipeline.forEach((stage, i) => {
    if (!stage || typeof stage !== 'object' || Array.isArray(stage)) {
      const err = new Error(`Stage ${i} mora biti objekat`);
      err.status = 400;
      throw err;
    }
    for (const [key, value] of Object.entries(stage)) {
      if (!ALLOWED_STAGES.has(key)) {
        const err = new Error(`Nedozvoljen stage ${key} u ${path}[${i}]`);
        err.status = 400;
        throw err;
      }
      assertSafeExpr(value, `${path}[${i}].${key}`);
    }
  });
}

module.exports = { ALLOWED_OPERATORS, ALLOWED_STAGES, assertSafeQuery, assertSafePipeline };
