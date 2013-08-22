/**
 * The Sea.js plugin for debugging freely
 */
define(function(require, exports, module) {
  var doc = document,
    loc = location

  var debugPanel = require('./seajs-debug-panel'),
    config = debugPanel.config

  // if querystring has seajs-debug, force debug: true
  if (loc.search.indexOf("seajs-debug") > -1) {
    config.debug = true
  }

  // Setting seajs.config according config
  seajs.config({
    debug: config.debug
  })

  if (config.debug) {
    // Show console window
    debugPanel.render(['map', 'editor', 'health', 'status', 'action'])

    doc.title = "[Sea.js Debug Mode] - " + doc.title

    seajs.config({
      map: [
        function(uri) {
          // Load map
          var oldUri = uri

          for (var i = 0; i < config.mapping.length; i++) {
            if (!config.mapping[i][0].length || !config.mapping[i][1]) continue

            uri = uri.replace(config.mapping[i][0], config.mapping[i][1])

            debugPanel.setHitInput(i, uri !== oldUri)
          }

          // Add debug file mapping
          if (config.source && !/\-debug\.(js|css)+/g.test(uri) && !/\/seajs\-debug/g.test(uri)) {
            uri = uri.replace(/\/(.*)\.(js|css)/g, "/$1-debug.$2")
          }
          return uri
        }
      ]
    })

    // Add timestamp to load file from server, not from browser cache
    // See: https://github.com/seajs/seajs/issues/264#issuecomment-20719662
    if (config.nocache) {
      var TIME_STAMP = '?t=' + new Date().getTime()

      seajs.on('fetch', function(data) {
        if (data.uri) {
          data.requestUri = data.uri + TIME_STAMP
        }
      })

      seajs.on('define', function(data) {
        if (data.uri) {
          data.uri = data.uri.replace(TIME_STAMP, '')
        }
      })
    }

    // Excludes all url temporarily
    config.combo && seajs.config({
      comboExcludes: /.*/
    })

    // Load log plugin
    config.log && seajs.config({
      preload: [seajs.data.base + "seajs/seajs-log/1.0.0/seajs-log.js"] // http://assets.spmjs.org/
    })

    // Load health plugin
    config.health && seajs.config({
      preload: [seajs.data.base + 'seajs/seajs-health/0.1.0/seajs-health.js']
    })

    // Execute custom config
    if (config.custom) {
      var _config = {}
      try {
        _config = (new Function("return " + config.custom))()
      } catch (e) {
      }
      seajs.config(_config)
    }
  }

  // Add find method to seajs in debug mode
  if (!seajs.find) {
    var cachedModules = seajs.cache

    seajs.find = function(selector) {
      var matches = []

      for (var uri in cachedModules) {
        if (cachedModules.hasOwnProperty(uri)) {
          if (typeof selector === "string" && uri.indexOf(selector) > -1 ||
            selector instanceof RegExp && selector.test(uri)) {
            var mod = cachedModules[uri]

            mod.exports && matches.push(mod.exports)
          }
        }
      }

      return matches
    }
  }
})
