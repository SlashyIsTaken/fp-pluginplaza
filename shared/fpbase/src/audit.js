'use strict';

// Grounds a "verified" claim in an action actually taken this session. This is
// what makes honesty trustworthy rather than just more model self-report: the
// model can *say* "verified", but if no tool in the session touched the thing
// the claim is about, audit pulls it down to "inferred".
//
// Pure and host-agnostic: it takes a normalized tool log (the host layer reads
// the real transcript and maps it to {tool, target} entries). No IO here, so it
// stays trivially testable.

const provenance = require('./provenance');

// Tools whose use counts as having looked at something firsthand.
const GROUNDING_TOOLS = new Set([
  'read', 'grep', 'glob', 'bash', 'cat', 'search',
  'webfetch', 'websearch', 'lsp', 'notebookread',
]);

function grounds(ref, entry) {
  if (!GROUNDING_TOOLS.has(String(entry.tool || '').toLowerCase())) return false;
  const target = String(entry.target || '').toLowerCase();
  const r = String(ref || '').toLowerCase();
  return r.length > 0 && (target.includes(r) || r.includes(target));
}

// True if any session action plausibly looked at any of the claim's references.
function isGrounded(claim, toolLog = []) {
  const refs = claim.refs || [];
  if (refs.length === 0) return false; // nothing concrete to have checked
  return refs.some((ref) => toolLog.some((entry) => grounds(ref, entry)));
}

// Verify one claim. Returns { grounded, provenance } where provenance is capped
// to at most "inferred" when the claim was not grounded by a real action.
function verify(claim, toolLog = []) {
  const grounded = isGrounded(claim, toolLog);
  const level = grounded
    ? provenance.normalize(claim.provenance || 'verified')
    : provenance.cap(claim.provenance || 'inferred', 'inferred');
  return { grounded, provenance: level };
}

// Cap a batch of claims in place-free fashion (returns new objects). Anything
// asserted as "verified" without grounding is downgraded.
function capClaims(claims = [], toolLog = []) {
  return claims.map((c) => {
    const { grounded, provenance: level } = verify(c, toolLog);
    return Object.assign({}, c, { grounded, provenance: level });
  });
}

module.exports = { GROUNDING_TOOLS, isGrounded, verify, capClaims };
