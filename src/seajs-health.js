/**
 * The Sea.js plugin for debugging freely
 */
define(function(require, exports, module) {
  var doc = document,
    loc = location

  var debugPanel = require('./seajs-debug-panel')

  // Force switch to health panel
  debugPanel.config.health = true
  debugPanel.render(['health'], function() {
    // todo: render graph into debugPanel.healthElement

    console.log('in health')
  })
})
