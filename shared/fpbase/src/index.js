'use strict';

// Public surface of fp-base. Plugins consume the vendored copy as
// `require('./_fpbase')` after the build step inlines src/ into
// hooks/_fpbase/. Source repos use `require('@flarepoint/base')`.

module.exports = {
  config: require('./config'),
  state: require('./state'),
  mode: require('./mode'),
  provenance: require('./provenance'),
  audit: require('./audit'),
  queue: require('./queue'),
  inject: require('./inject'),
  statusline: require('./statusline'),
  util: require('./util'),
  host: {
    claude: require('./host/claude'),
    codex: require('./host/codex'),
  },
};
