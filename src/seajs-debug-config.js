define(function(require, exports, module) {

  var store = require('./seajs-debug-store')

  // Main config
  var config = {
    // Force debug when execute debug plugin
    debug: true,
    // Console panel status: true = show, false = hide
    show: true,
    // Load -debug file
    source: false,
    // Disable cache
    nocache: false,
    // Untie combo url
    combo: false,
    // Show seajs.log message: true = show, false = hide
    log: false,
    // Show seajs.health message: true = show, false = hide
    health: false,
    // Mode: mapping(false), editor(true)
    mode: false,
    // Custom config, highest priority
    custom: "",
    // mapping items
    mapping: []
  }


  // Load local config and merge
  var _config = store.get("seajs-debug-config")

  for (var key in _config) {
    config[key] = _config[key]
  }

  module.exports = config
})
