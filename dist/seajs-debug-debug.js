/**
 * The Sea.js plugin for debugging freely
 */
(function(seajs, global, doc, loc) {

  var MAX_TRY = 100
  var pollCount = 0
  var config = getConfig()

  // Force debug to true when url contains `?seajs-debug-debug`
  if (loc.search.indexOf("seajs-debug-debug") > -1) {
    config.debug = 1
    config.console = 1
    saveConfig(config)
  }

  // Set debug config
  if (config.debug) {
    seajs.config({
      debug: true
    })
  }

  // Load the config file
  if (config.configFile) {
    doc.title = "[Sea.js Debug Mode] - " + doc.title
    seajs.config({
      preload: config.configFile
    })
  }

  // Show console window
  if (config.console) {
    showConsole(config.configFile)
  }

  // Add find method to seajs in debug mode
  if (!seajs.find) {
    var cachedModules = seajs.cache

    seajs.find = function(selector) {
      var matches = []

      for(var uri in cachedModules) {
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


  // Helpers

  function showConsole(configFile) {
    var style =
        "#seajs-debug-debug-console { " +
        "  position: fixed; bottom: 10px; " +
        "  *position: absolute; *top: 10px; *width: 465px; " +
        "  right: 10px; z-index: 999999999;" +
        "  background: #fff; color: #000; font: 12px arial;" +
        "  border: 2px solid #000; padding: 0 10px 10px;" +
        "}" +
        "#seajs-debug-debug-console h3 {" +
        "  margin: 3px 0 6px -6px; padding: 0;" +
        "  font-weight: bold; font-size: 14px;" +
        "}" +
        "#seajs-debug-debug-console input {" +
        "  width: 400px; margin-left: 10px;" +
        "}" +
        "#seajs-debug-debug-console button {" +
        "  float: right; margin: 6px 0 0 10px;" +
        "  box-shadow: #ddd 0 1px 2px;" +
        "  font-size: 14px; padding: 4px 10px;" +
        "  color: #211922; background: #f9f9f9;" +
        "  text-shadow: 0 1px #eaeaea;" +
        "  border: 1px solid #bbb; border-radius: 3px;" +
        "  cursor: pointer; opacity: .8" +
        "}" +
        "#seajs-debug-debug-console button:hover {" +
        "  background: #e8e8e8; text-shadow: none; opacity: 1" +
        "}" +
        "#seajs-debug-debug-console a {" +
        "  position: relative; top: 10px; text-decoration: none;" +
        "}"

    var html =
        "<div id=\"seajs-debug-debug-console\">" +
        "  <h3>Sea.js Debug Console</h3>" +
        "  <label>Config file: <input value=\"" + configFile + "\"/></label><br/>" +
        "  <button>Exit</button>" +
        "  <button>Hide</button>" +
        "  <button>Save</button>" +
        "</div>"

    var div = doc.createElement("div")
    div.innerHTML = html

    importStyle(style)
    appendToBody(div)

    var buttons = div.getElementsByTagName("button")

    // save
    buttons[2].onclick = function() {
      var href = div.getElementsByTagName("input")[0].value || ""
      config.configFile = href
      saveConfig(config)
      loc.reload()
    }

    // hide
    buttons[1].onclick = function() {
      config.console = 0
      saveConfig(config)
      loc.replace(loc.href.replace("seajs-debug-debug", ""))
    }

    // exit
    buttons[0].onclick = function() {
      config.debug = 0
      saveConfig(config)
      loc.replace(loc.href.replace("seajs-debug-debug", ""))
    }
  }

  function getConfig() {
    var cookie = "", m

    if ((m = doc.cookie.match(
        /(?:^| )seajs-debug-debug(?:(?:=([^;]*))|;|$)/))) {
      cookie = m[1] ? decodeURIComponent(m[1]) : ""
    }

    var parts = cookie.split("`")
    return {
      debug: Number(parts[0]) || 0,
      configFile: parts[1] || "",
      console: Number(parts[2]) || 0
    }
  }

  function saveConfig(o) {
    var date = new Date()
    date.setTime(date.getTime() + 30 * 86400000) // 30 days

    doc.cookie = "seajs-debug-debug=" + o.debug + "`" + o.configFile + "`" +
        o.console + "; path=/; expires=" + date.toUTCString()
  }

  function appendToBody(div) {
    pollCount++

    if (doc.body) {
      doc.body.appendChild(div)
    }
    else if (pollCount < MAX_TRY) {
      setTimeout(function() {
        appendToBody(div)
      }, 200)
    }
  }

  function importStyle(cssText) {
    var element = doc.createElement("style")

    // Add to DOM first to avoid the css hack invalid
    doc.getElementsByTagName("head")[0].appendChild(element)

    // IE
    if (element.styleSheet) {
      element.styleSheet.cssText = cssText
    }
    // W3C
    else {
      element.appendChild(doc.createTextNode(cssText))
    }
  }


  // Register as module
  define("seajs-debug-debug", [], {})

})(seajs, this, document, location);

