/**
 * The Sea.js plugin for debugging freely
 */
(function(seajs, global, doc, loc) {

  var MAX_TRY = 100
  var pollCount = 0
  var store = {}


  // Simple Store: https://github.com/marcuswestin/store.js/blob/master/store.js
  ~function(win, doc) {
    var localStorageName = 'localStorage',
      namespace = '__storejs__',
      storage

    store.disabled = false
    store.set = function(key, value) {
    }
    store.get = function(key) {
    }

    // Different from store.js
    function isString(val) {
      return {}.toString.call(val) == "[object String]"
    }
    store.serialize = function(value) {
      if (isString(value)) return value

      var html = []
      for(var key in value) {
        var val = value[key]
        if (isString(val)) {
          val = val.replace(/'/g, '"').replace(/\n/g, '\\n').replace(/\r/g, '\\r')
          val = "'" + val + "'"
        }
        html.push('' + key +':' + val)
      }
      return "{" + html.join(",") + "}"
    }
    store.deserialize = function(value) {
      if (!isString(value)) return undefined
      try {
        return (new Function("return " + value))()
      }
      catch (e) {
        return undefined
      }
    }
    // end

    function isLocalStorageNameSupported() {
      try {
        return (localStorageName in win && win[localStorageName])
      }
      catch (err) {
        return false
      }
    }

    if (isLocalStorageNameSupported()) {
      storage = win[localStorageName]
      store.set = function(key, val) {
        if (val === undefined) {
          return store.remove(key)
        }
        storage.setItem(key, store.serialize(val))
        return val
      }
      store.get = function(key) {
        return store.deserialize(storage.getItem(key))
      }
    } else if (doc.documentElement.addBehavior) {
      var storageOwner,
        storageContainer
      try {
        storageContainer = new ActiveXObject('htmlfile')
        storageContainer.open()
        storageContainer.write('<s' + 'cript>document.w=window</s' + 'cript><iframe src="/favicon.ico"></iframe>')
        storageContainer.close()
        storageOwner = storageContainer.w.frames[0].document
        storage = storageOwner.createElement('div')
      } catch (e) {
        storage = doc.createElement('div')
        storageOwner = doc.body
      }
      function withIEStorage(storeFunction) {
        return function() {
          var args = Array.prototype.slice.call(arguments, 0)
          args.unshift(storage)
          storageOwner.appendChild(storage)
          storage.addBehavior('#default#userData')
          storage.load(localStorageName)
          var result = storeFunction.apply(store, args)
          storageOwner.removeChild(storage)
          return result
        }
      }

      var forbiddenCharsRegex = new RegExp("[!\"#$%&'()*+,/\\\\:;<=>?@[\\]^`{|}~]", "g")

      function ieKeyFix(key) {
        return key.replace(forbiddenCharsRegex, '___')
      }

      store.set = withIEStorage(function(storage, key, val) {
        key = ieKeyFix(key)
        if (val === undefined) {
          return store.remove(key)
        }
        storage.setAttribute(key, store.serialize(val))
        storage.save(localStorageName)
        return val
      })
      store.get = withIEStorage(function(storage, key) {
        key = ieKeyFix(key)
        return store.deserialize(storage.getAttribute(key))
      })
    }

    try {
      store.set(namespace, namespace)
      if (store.get(namespace) != namespace) {
        store.disabled = true
      }
      store.remove(namespace)
    } catch (e) {
      store.disabled = true
    }
    global.storage = storage
  }(global, document)

  var config = {
    // Force debug when execute debug plugin
    debug: true,
    // Console panel status: true = show, false = hide
    console: true,
    // Load -debug file
    source: false,
    // Disable cache
    nocache: false,
    // Untie combo url
    combo: false,
    // Show seajs.log message: true = show, false = hide
    log: false,
    // Custom config, highest priority
    custom: ""
  }

  // Load local config and merge
  var _config = store.get("seajs-debug-config")

  if (_config) {
    for (var key in _config) {
      if (_config.hasOwnProperty(key)) {
        config[key] = _config[key]
      }
    }
  }

  // Setting seajs.config according config
  seajs.config({
    debug: config.debug
  })

  if (config.debug) {
    doc.title = "[Sea.js Debug Mode] - " + doc.title
    // Show console window
    if (config.console) {
      showConsole()
    }

    // Add debug file mapping
    if (config.source) {
      seajs.config({
        map: [
          [ '.js', '-debug.js' ],
          [ '.css', '-debug.css' ]
        ]
      })
    }

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
    if (config.combo) {
      seajs.config({
        comboExcludes: /.*/
      })
    }

    // load log plugin
    if (config.log) {
      seajs.config({
        preload: [seajs.data.base + "seajs/seajs-log/1.0.0/seajs-log.js"] // http://assets.spmjs.org/
      })
    }

    if (config.custom) {
      _config = {}
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


  // Helpers

  function showConsole() {
    // Insert CSS
    importStyle(
      "@font-face{font-family:fontello;src:url(./font/fontello.eot) format('embedded-opentype'),url(data:application/x-font-woff;base64,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) format('woff'),url(./font/fontello.ttf) format('truetype'),url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/Pgo8IURPQ1RZUEUgc3ZnIFBVQkxJQyAiLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU4iICJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGQiPgo8c3ZnIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxtZXRhZGF0YT5Db3B5cmlnaHQgKEMpIDIwMTIgYnkgb3JpZ2luYWwgYXV0aG9ycyBAIGZvbnRlbGxvLmNvbTwvbWV0YWRhdGE+CjxkZWZzPgo8Zm9udCBpZD0iZm9udGVsbG8iIGhvcml6LWFkdi14PSIxMDAwIiA+Cjxmb250LWZhY2UgZm9udC1mYW1pbHk9ImZvbnRlbGxvIiBmb250LXdlaWdodD0iNDAwIiBmb250LXN0cmV0Y2g9Im5vcm1hbCIgdW5pdHMtcGVyLWVtPSIxMDAwIiBhc2NlbnQ9Ijg1MCIgZGVzY2VudD0iLTE1MCIgLz4KPG1pc3NpbmctZ2x5cGggaG9yaXotYWR2LXg9IjEwMDAiIC8+CjxnbHlwaCBnbHlwaC1uYW1lPSJjbG9jayIgdW5pY29kZT0iJiN4ZTgwMDsiIGQ9Ik0wIDM1MHEwIDk1IDM3IDE4MnQxMDAgMTUwIDE1MCAxMDAgMTgyIDM3IDE4Mi0zNyAxNTAtMTAwIDEwMC0xNTAgMzctMTgyLTM3LTE4Mi0xMDAtMTUwLTE1MC0xMDAtMTgyLTM3LTE4MiAzNy0xNTAgMTAwLTEwMCAxNTAtMzcgMTgyeiBtMTE3IDBxMC05NiA0Ny0xNzZ0MTI4LTEyOCAxNzYtNDdxOTYgMCAxNzYgNDd0MTI4IDEyOCA0NyAxNzZxMCA5NS00NyAxNzZ0LTEyOCAxMjgtMTc2IDQ3cS03MSAwLTEzNi0yOHQtMTEyLTc1LTc1LTExMi0yOC0xMzZ6IG0yOTMgMGwwIDIyNHEwIDI0IDE3IDQxdDQxIDE3IDQxLTE3IDE3LTQxbDAtMjAwIDE0Mi0xNDJxMTctMTcgMTctNDF0LTE3LTQxLTQxLTE3cS0yNCAwLTQxIDE3bC0xNTkgMTU5cS0xIDEtNCA1dC0zIDRxLTEgMS0yIDRsLTEgM3QtMSAzcTAgMC0yIDUtMSA0LTEgNS0xIDYtMSAxMnoiIGhvcml6LWFkdi14PSI5MzcuNSIgLz4KPGdseXBoIGdseXBoLW5hbWU9ImhlbHAtY2lyY2xlZC1hbHQiIHVuaWNvZGU9IiYjeGU4MDQ7IiBkPSJNMCAzNTBxMCA5NiAzNyAxODJ0MTAwIDE0OSAxNDkgMTAwIDE4MiAzN3E5NSAwIDE4Mi0zN3QxNTAtMTAwIDEwMC0xNDkgMzctMTgycTAtOTUtMzctMTgydC0xMDAtMTUwLTE1MC0xMDAtMTgyLTM3cS05NiAwLTE4MiAzN3QtMTQ5IDEwMC0xMDAgMTUwLTM3IDE4MnogbTExNyAwcTAtNzEgMjgtMTM2dDc1LTExMiAxMTItNzUgMTM2LTI4IDEzNiAyOCAxMTIgNzUgNzUgMTEyIDI4IDEzNnEwIDk2LTQ3IDE3NnQtMTI4IDEyOC0xNzYgNDctMTc2LTQ3LTEyOC0xMjgtNDctMTc2eiBtMjE2IDE3N2wzMS0xMDJxNDUgMjkgOTMgMjkgNDkgMCA0OS0yMyAwLTQtMi03dC00LTYtNi01LTctNC04LTRsLTgtNC00MC0yMXEtMjEtMTItMjgtMjV0LTYtMzdsMC0zNyAxMTcgMCAwIDE2cTAgNyAwIDEwdDIgNiA2IDVxMSAwIDEwIDV0MTcgOCAxOSAxMCAxOSAxM3ExOSAxNyAyOSAzN3QxMCA1NXEwIDQ5LTQyIDgzdC0xMDYgMzRxLTgzIDAtMTQ4LTM3eiBtNDgtMzM0cTAtMzIgMjAtNDl0NTUtMTdxMzQgMCA1NCAxN3QyMCA0OS0yMCA0OS01NCAxOHEtMzUgMC01NS0xOHQtMjAtNDl6IiBob3Jpei1hZHYteD0iOTM3LjUiIC8+CjxnbHlwaCBnbHlwaC1uYW1lPSJhdHRlbnRpb24tYWx0IiB1bmljb2RlPSImI3hlODAzOyIgZD0iTTAgMzUwcTAgOTYgMzcgMTgydDEwMCAxNDkgMTQ5IDEwMCAxODIgMzdxOTUgMCAxODItMzd0MTUwLTEwMCAxMDAtMTQ5IDM3LTE4MnEwLTk1LTM3LTE4MnQtMTAwLTE1MC0xNTAtMTAwLTE4Mi0zN3EtOTYgMC0xODIgMzd0LTE0OSAxMDAtMTAwIDE1MC0zNyAxODJ6IG0xMTcgMHEwLTk2IDQ3LTE3NnQxMjgtMTI4IDE3Ni00N3E5NiAwIDE3NiA0N3QxMjggMTI4IDQ3IDE3NnEwIDk1LTQ3IDE3NnQtMTI4IDEyOC0xNzYgNDdxLTcxIDAtMTM2LTI4dC0xMTItNzUtNzUtMTEyLTI4LTEzNnogbTI3MCAxOTdxLTMgMzUgMTkgNjJ0NTggMzFxMzUgMyA2Mi0xOXQzMS01OHExLTkgMC0xN2wtMjctMjQ0cS0yLTI0LTIxLTM5dC00My0xM3EtMjEgMi0zNiAxN3QtMTcgMzV6IG0xMi00MTFxMCAzMSAyMiA1MiAyMCAyMCA1MSAyMHQ1MS0yMHEyMi0yMCAyMi01MnQtMjItNTJxLTIwLTIyLTUyLTIyLTMxIDAtNTEgMjItMjIgMjAtMjIgNTJ6IiBob3Jpei1hZHYteD0iOTM3LjUiIC8+CjxnbHlwaCBnbHlwaC1uYW1lPSJleWUiIHVuaWNvZGU9IiYjeGU4MDE7IiBkPSJNMCAzNTBxMCAzMCAxNSA2N3Q0MyA3NyA3MCA3OCA5MiA2OCAxMTUgNDggMTMyIDE4IDEzMi0xOCAxMTUtNDggOTItNjggNzAtNzggNDMtNzcgMTUtNjdxMC0yOS0xNS02N3QtNDMtNzctNzAtNzgtOTItNjgtMTE1LTQ4LTEzMi0xOC0xMzIgMTgtMTE1IDQ4LTkyIDY4LTcwIDc4LTQzIDc3LTE1IDY3eiBtMjM0IDBxMC02MyAzMS0xMTd0ODUtODUgMTE3LTMxIDExNyAzMSA4NSA4NSAzMSAxMTctMzEgMTE3LTg1IDg1LTExNyAzMS0xMTctMzEtODUtODUtMzEtMTE3eiBtMTM2IDBxMC00MSAyOS02OXQ2OS0yOSA2OSAyOSAyOSA2OXEwIDQxLTI5IDcwdC02OSAyOS02OS0yOS0yOS03MHoiIGhvcml6LWFkdi14PSI5MzcuNSIgLz4KPGdseXBoIGdseXBoLW5hbWU9Im5ld3NwYXBlciIgdW5pY29kZT0iJiN4ZTgwNTsiIGQ9Ik0wIDY0bDAgNTcxcTAgMzkgMjggNjd0NjcgMjhsNTU5IDBxMzkgMCA2Ny0yOHQyOC02N2wwLTY0IDk0IDBxMzkgMCA2Ny0yOHQyOC02N2wwLTQxM3EwLTM5LTI4LTY3dC02Ny0yOGwtNzQ4IDBxLTM5IDAtNjcgMjh0LTI4IDY3eiBtODcgNDNxMC0yMCAxNC0zNHQzNC0xNWw1MTggMHE2IDAgNyA2bDAgNTI4cTAgMjEtMTUgMzZ0LTM2IDE1bC00NzIgMHEtMjEgMC0zNi0xNHQtMTUtMzVsMC00ODZ6IG03NCA3MHEwIDE4IDEzIDMxdDMxIDEzbDEzMyAwcTE4IDAgMzEtMTN0MTMtMzEtMTMtMzEtMzEtMTNsLTEzMyAwcS0xOCAwLTMxIDEzdC0xMyAzMXogbTAgMTczcTAgMTggMTMgMzF0MzEgMTNsMzM4IDBxMTggMCAzMS0xM3QxMy0zMXEwLTE4LTEzLTMxdC0zMS0xM2wtMzM4IDBxLTE4IDAtMzEgMTN0LTEzIDMxeiBtMCAxNzNxMCAxOCAxMyAzMXQzMSAxM2wzMzggMHExOCAwIDMxLTEzdDEzLTMxcTAtMTgtMTMtMzF0LTMxLTEzbC0zMzggMHEtMTggMC0zMSAxM3QtMTMgMzF6IG01ODgtNDE2cTAtMjAgMTQtMzR0MzMtMTVsNSAwcTIwIDEgMzQgMTV0MTQgMzVsMCAzNjlxMCA3LTYgN2wtOTQgMCAwLTM3OHoiIGhvcml6LWFkdi14PSI5MzcuNSIgLz4KPGdseXBoIGdseXBoLW5hbWU9InNwcmVhZCIgdW5pY29kZT0iJiN4ZTgwMjsiIGQ9Ik0wIDQ5M3EwIDU4IDQxIDk4dDk4IDQxcTU4IDAgOTktNDF0NDEtOThxMC00MC0yMS03M2wyODItMjgxcTIwIDEyIDQwIDE3bDAgMzg5cS00NiAxMS03NiA0OXQtMzAgODZxMCA1OCA0MSA5OHQ5OSA0MXE1OCAwIDk4LTQxdDQxLTk4cTAtNDktMzAtODZ0LTc2LTQ5bDAtMzg5cTIwLTUgNDAtMTdsMjgyIDI4MXEtMjAgMzQtMjAgNzMgMCA1OCA0MSA5OXQ5OCA0MSA5OC00MSA0MS05OC00MS05OS05OC00MXEtMzcgMC03MiAyMWwtMjgyLTI4MnEyMS0zMyAyMS03MiAwLTU4LTQxLTk5dC05OC00MXEtNTggMC05OSA0MXQtNDEgOTlxMCAzOSAyMSA3MmwtMjgyIDI4MnEtMzYtMjEtNzItMjEtNTggMC05OCA0MXQtNDEgOTl6IiBob3Jpei1hZHYteD0iMTIyMi42NTYiIC8+CjwvZm9udD4KPC9kZWZzPgo8L3N2Zz4=) format('svg');font-weight:400;font-style:normal}#seajs-debug-console,#seajs-debug-console *{margin:0;padding:0;border:0}#seajs-debug-console{position:fixed;bottom:10px;width:520px;right:10px;bottom:10px;border:2px solid grey;z-index:999999999;background:#FAFAFA;color:#000}#seajs-debug-console{_position:absolute;_top:expression(documentElement.scrollTop+documentElement.clientHeight-this.clientHeight-5)}* html{_background:url(null) no-repeat fixed}#seajs-debug-console h3,#seajs-debug-console textarea{border:0;border-bottom:1px solid lightgrey;font-family:Arial;font-size:14px}#seajs-debug-console h3{margin:0;padding:5px 5px 5px 10px;height:20px;line-height:20px;font-weight:700;font-size:14px}#seajs-debug-console textarea{display:block;width:510px;height:100px;padding:5px;background:#FFF;resize:none}#seajs-debug-console button{cursor:pointer}#seajs-debug-console #seajs-debug-status{height:35px}#seajs-debug-console #seajs-debug-status button{display:inline-block;*display:inline;*zoom:1;width:35px;height:35px;line-height:35px;border:0;background-color:#f5f5f5;border-right:1px solid lightgrey;background-image:-webkit-gradient(linear,left top,left bottom,from(#fff),to(#f5f5f5));background-image:-webkit-linear-gradient(top,#fff,#f5f5f5);background-image:linear-gradient(top,#fff,#f5f5f5);background-image:-ms-linear-gradient(top,#fff,#f5f5f5);background-image:-moz-linear-gradient(top,#fff,#f5f5f5);background-image:-o-linear-gradient(top,#fff,#f5f5f5);font-family:fontello;font-size:14px;color:#666}#seajs-debug-console #seajs-debug-status button:hover,#seajs-debug-console #seajs-debug-status button.seajs-debug-status-on:hover{color:#000}#seajs-debug-console #seajs-debug-status button:active,#seajs-debug-console #seajs-debug-status button.seajs-debug-status-on{color:#999;background-image:none;-webkit-box-shadow:inset 0 2px 3px rgba(0,0,0,.1),0 1px 2px rgba(0,0,0,.05);-moz-box-shadow:inset 0 2px 3px rgba(0,0,0,.1),0 1px 2px rgba(0,0,0,.05);box-shadow:inset 0 2px 3px rgba(0,0,0,.1),0 1px 2px rgba(0,0,0,.05)}#seajs-debug-console #seajs-debug-buttons{position:absolute;right:4px;bottom:4px}#seajs-debug-console #seajs-debug-buttons button{padding:4px 10px;box-shadow:#ddd 0 1px 2px;font-size:14px;color:#666;border:1px solid #dcdcdc;border:1px solid rgba(0,0,0,.1);border-radius:2px;background-color:#f5f5f5;background-image:-webkit-gradient(linear,left top,left bottom,from(#f5f5f5),to(#f1f1f1));background-image:-webkit-linear-gradient(top,#f5f5f5,#f1f1f1);background-image:linear-gradient(top,#f5f5f5,#f1f1f1);background-image:-ms-linear-gradient(top,#f5f5f5,#f1f1f1);background-image:-moz-linear-gradient(top,#f5f5f5,#f1f1f1);background-image:-o-linear-gradient(top,#f5f5f5,#f1f1f1)}#seajs-debug-console #seajs-debug-buttons button:hover{-webkit-box-shadow:0 1px 1px rgba(0,0,0,.1);background-color:#f8f8f8;background-image:-webkit-gradient(linear,left top,left bottom,from(#f8f8f8),to(#f1f1f1));background-image:-webkit-linear-gradient(top,#f8f8f8,#f1f1f1);background-image:linear-gradient(top,#f8f8f8,#f1f1f1);background-image:-ms-linear-gradient(top,#f8f8f8,#f1f1f1);background-image:-moz-linear-gradient(top,#f8f8f8,#f1f1f1);background-image:-o-linear-gradient(top,#f8f8f8,#f1f1f1);border:1px solid #c6c6c6;box-shadow:0 1px 1px rgba(0,0,0,.1);color:#333}"
    )

    // Render HTML
    var statsButtonOn = "seajs-debug-status-on"
    var statusButtonInfo = [
      ["source", "Switch to min file", "Switch to source file", "&#xe801;"],
      ["combo", "Combo url", "Untie combo url", "&#xe802;"],
      ["nocache", "Enable cache", "Disable cache", "&#xe800;"],
      ["log", "Hide seajs log", "Show seajs log", "&#xe803;"]
    ]
    var buttonInfo = [
      ["Save", function() {
        config.custom = div.getElementsByTagName("textarea")[0].value
      }, false],
      ["Hide", function() {
        config.console = false
      }, false],
      ["Exit", function() {
        config.debug = false
      }, true]
    ]

    var statusButtonHTML = ""
    for (var i = 0; i < statusButtonInfo.length; i++) {
      var status = statusButtonInfo[i][0]
      statusButtonHTML += "<button "
        + (config[status] ? 'class="' + statsButtonOn + '"' : '')
        + ' title="'
        + statusButtonInfo[i][ config[status] ? 1 : 2]
        + '">'
        + statusButtonInfo[i][3]
        + "</button>"
    }

    var buttonHTML = ""
    for (var i = 0; i < buttonInfo.length; i++) {
      buttonHTML += "<button>" + buttonInfo[i][0] + "</button>"
    }
    var html = "<h3>Sea.js Debug Console</h3>"
      + "<textarea>" + config.custom + "</textarea>"
      + "<div id=\"seajs-debug-status\">"
      + statusButtonHTML
      + "</div>"
      + "<div id=\"seajs-debug-buttons\">"
      + buttonHTML
      + "</div>"

    var div = doc.createElement("div")
    div.id = "seajs-debug-console"
    div.innerHTML = html

    appendToBody(div, function() {
      // Bind event
      var buttons = doc.getElementById("seajs-debug-status").getElementsByTagName("button")
      for (var i = 0; i < buttons.length; i++) {
        (function(button, i) {
          button.onclick = function() {
            var newVal = !config[statusButtonInfo[i][0]]
            config[statusButtonInfo[i][0]] = newVal
            button.setAttribute("title", statusButtonInfo[i][ newVal ? 1 : 2])
            button.className = newVal ? statsButtonOn : ""
          }
        })(buttons[i], i);
      }

      buttons = doc.getElementById("seajs-debug-buttons").getElementsByTagName("button")
      for (var i = 0; i < buttons.length; i++) {
        (function(button, i) {
          button.onclick = function() {
            var cbk = buttonInfo[i][1]
            cbk && cbk()
            // Save config
            store.set("seajs-debug-config", config)

            buttonInfo[i][2] ? loc.replace(loc.href.replace("seajs-debug", "")) : loc.reload()
          }
        })(buttons[i], i);
      }
    })
  }

  function appendToBody(div, callback) {
    pollCount++

    if (doc.body) {
      doc.body.appendChild(div)
      callback && callback()
    }
    else if (pollCount < MAX_TRY) {
      setTimeout(function() {
        appendToBody(div, callback)
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
  define("seajs-debug", [], {})

})(seajs, this, document, location);
