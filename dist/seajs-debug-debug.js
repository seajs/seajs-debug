/**
 * The Sea.js plugin for debugging freely
 */
(function(seajs, global, doc, loc) {

  // Localstorage object
  var store = {};

  // Simple Store: https://github.com/marcuswestin/store.js/blob/master/store.js
  (function(win, doc) {
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

      // isObject
      var html = []
      for (var key in value) {
        var val = value[key]
        if (isString(val)) {
          val = val.replace(/'/g, '"').replace(/\n/g, '\\n').replace(/\r/g, '\\r')
          val = "'" + val + "'"
        }
        // isArray
        else if (val.hasOwnProperty("length")) {
          var tmp = []
          for (var i = 0; i < val.length; i++) {
            var f = trim(val[i][0])
            var t = trim(val[i][1])

            f.length && t.length && tmp.push('["' + f + '","' + t + '"]')
          }
          val = '[' + tmp.join(',') + ']'
        }
        html.push('' + key + ':' + val)
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
  })(global, document)

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
    // Mode: mapping(false), editor(true)
    mode: false,
    // Custom config, highest priority
    custom: "",
    // mapping items
    mapping: []
  }

  // Debug Panel Object
  var debugPanel

  var MAX_TRY = 100
  var pollCount = 0
  var STATUS_BUTTON_ON_CLS = "seajs-debug-status-on"
  var MIN_CLS = "seajs-debug-mini"
  var HIT_CLS = "seajs-debug-hit"

  function DebugPanel() {
    // Insert CSS
    importStyle(
      "@font-face{font-family:fontello;src:url(./font/fontello.eot) format('embedded-opentype'),url(data:application/x-font-woff;base64,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) format('woff'),url(./font/fontello.ttf) format('truetype'),url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/Pgo8IURPQ1RZUEUgc3ZnIFBVQkxJQyAiLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU4iICJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGQiPgo8c3ZnIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxtZXRhZGF0YT5Db3B5cmlnaHQgKEMpIDIwMTIgYnkgb3JpZ2luYWwgYXV0aG9ycyBAIGZvbnRlbGxvLmNvbTwvbWV0YWRhdGE+CjxkZWZzPgo8Zm9udCBpZD0iZm9udGVsbG8iIGhvcml6LWFkdi14PSIxMDAwIiA+Cjxmb250LWZhY2UgZm9udC1mYW1pbHk9ImZvbnRlbGxvIiBmb250LXdlaWdodD0iNDAwIiBmb250LXN0cmV0Y2g9Im5vcm1hbCIgdW5pdHMtcGVyLWVtPSIxMDAwIiBhc2NlbnQ9Ijg1MCIgZGVzY2VudD0iLTE1MCIgLz4KPG1pc3NpbmctZ2x5cGggaG9yaXotYWR2LXg9IjEwMDAiIC8+CjxnbHlwaCBnbHlwaC1uYW1lPSJwbHVzIiB1bmljb2RlPSImI3hlODA0OyIgZD0iTTU1MCA0MDBxMzAgMCAzMC01MHQtMzAtNTBsLTIxMCAwIDAtMjEwcTAtMzAtNTAtMzB0LTUwIDMwbDAgMjEwLTIxMCAwcS0zMCAwLTMwIDUwdDMwIDUwbDIxMCAwIDAgMjEwcTAgMzAgNTAgMzB0NTAtMzBsMC0yMTAgMjEwIDB6IiBob3Jpei1hZHYteD0iNTgwIiAvPgo8Z2x5cGggZ2x5cGgtbmFtZT0ibWludXMiIHVuaWNvZGU9IiYjeGU4MDU7IiBkPSJNNTUwIDQwMHEzMCAwIDMwLTUwdC0zMC01MGwtNTIwIDBxLTMwIDAtMzAgNTB0MzAgNTBsNTIwIDB6IiBob3Jpei1hZHYteD0iNTgwIiAvPgo8Z2x5cGggZ2x5cGgtbmFtZT0iZWRpdCIgdW5pY29kZT0iJiN4ZTgwODsiIGQ9Ik05NjYgNjcxcTI0LTI0IDI0LTU1dC0yNC01NWwtMTg1LTE4NSAwLTQ2OXEwLTIxLTE2LTM3dC0zNy0xNmwtNjc2IDBxLTIxIDAtMzcgMTZ0LTE2IDM3bDAgNjc2cTAgMjEgMTYgMzd0MzcgMTZsNDY5IDAgMTg1IDE4NXEyNCAyNCA1NSAyNHQ1NS0yNHogbS01MjQtNDg2bDMyOCAzMjgtMTEzIDExMy0zMjgtMzI4eiBtLTEzNCA2OWw0LTg2IDg5LTR6IG0zNjktMjk1bDAgMzEzLTE2Ni0xNjBxLTIwLTIwLTYzLTM0dC04MS0xNGwtMTU5IDAgMCAxNTlxMCA0MSAxMSA4M3QzMSA2MWwxNjUgMTY2LTMxMyAwIDAtNTc0IDU3NCAweiBtMTMwIDU5MGw2OCA2OC0xMTQgMTE0LTY4LTY4eiIgaG9yaXotYWR2LXg9Ijk5MCIgLz4KPGdseXBoIGdseXBoLW5hbWU9ImV5ZSIgdW5pY29kZT0iJiN4ZTgwYjsiIGQ9Ik05MjkgMzE0cS04NSAxMzItMjEzIDE5NyAzNC01OCAzNC0xMjYgMC0xMDMtNzMtMTc3dC0xNzctNzMtMTc3IDczLTczIDE3N3EwIDY4IDM0IDEyNi0xMjgtNjUtMjEzLTE5NyA3NC0xMTQgMTg2LTE4MnQyNDItNjggMjQyIDY4IDE4NiAxODJ6IG0tNDAyIDIxNHEwIDExLTggMTl0LTE5IDhxLTcwIDAtMTIwLTUwdC01MC0xMjBxMC0xMSA4LTE5dDE5LTggMTkgOCA4IDE5cTAgNDggMzQgODJ0ODIgMzRxMTEgMCAxOSA4dDggMTl6IG00NzMtMjE0cTAtMTktMTEtMzktNzgtMTI4LTIxMC0yMDZ0LTI3OS03Ny0yNzkgNzgtMjEwIDIwNXEtMTEgMjAtMTEgMzl0MTEgMzlxNzggMTI4IDIxMCAyMDV0Mjc5IDc4IDI3OS03OCAyMTAtMjA1cTExLTIwIDExLTM5eiIgaG9yaXotYWR2LXg9IjEwMDAiIC8+CjxnbHlwaCBnbHlwaC1uYW1lPSJzaGFyZSIgdW5pY29kZT0iJiN4ZTgwMTsiIGQ9Ik02NTAgMjAwcTYyIDAgMTA2LTQzdDQ0LTEwN3EwLTYyLTQ0LTEwNnQtMTA2LTQ0LTEwNiA0NC00NCAxMDZxMCA2IDEgMTR0MSAxMmwtMjYwIDE1NnEtNDItMzItOTItMzItNjIgMC0xMDYgNDR0LTQ0IDEwNiA0NCAxMDYgMTA2IDQ0cTU0IDAgOTItMzBsMjYwIDE1NnEwIDQtMSAxMnQtMSAxMnEwIDYyIDQ0IDEwNnQxMDYgNDQgMTA2LTQzIDQ0LTEwN3EwLTYyLTQ0LTEwNnQtMTA2LTQ0cS01MiAwLTkwIDMybC0yNjItMTU2cTItOCAyLTI2IDAtMTYtMi0yNGwyNjItMTU2cTM2IDMwIDkwIDMweiIgaG9yaXotYWR2LXg9IjgwMCIgLz4KPGdseXBoIGdseXBoLW5hbWU9InJlc2l6ZS1mdWxsIiB1bmljb2RlPSImI3hlODAzOyIgZD0iTTc4NCAxMTFsMTI3IDEyOCAwLTMzNS0zMzUgMCAxMjggMTI5LTEyOCAxMjcgNzkgNzl6IG0tNDMxIDY4NmwtMTI5LTEyNyAxMjgtMTI3LTgwLTgwLTEyNiAxMjgtMTI4LTEyOSAwIDMzNSAzMzUgMHogbTAtNjM3bC0xMjktMTI3IDEyOS0xMjktMzM1IDAgMCAzMzUgMTI4LTEyOCAxMjggMTI4eiBtNTU4IDYzN2wwLTMzNS0xMjcgMTI5LTEyOC0xMjgtNzkgODAgMTI3IDEyNy0xMjggMTI3IDMzNSAweiIgaG9yaXotYWR2LXg9IjkyOCIgLz4KPGdseXBoIGdseXBoLW5hbWU9InJlc2l6ZS1zbWFsbCIgdW5pY29kZT0iJiN4ZTgwMjsiIGQ9Ik03MDQgMzNsLTEyOC0xMjkgMCAzMzUgMzM1IDAtMTI3LTEyOCAxMjctMTI4LTc5LTc5eiBtLTY4NiA0MjlsMTI4IDEyOS0xMjcgMTI2IDc5IDc5IDEyNi0xMjYgMTI5IDEyNyAwLTMzNS0zMzUgMHogbTAtNDc5bDEyOCAxMjgtMTI4IDEyOCAzMzUgMCAwLTMzNS0xMjkgMTI5LTEyNy0xMjl6IG01NTggNDc5bDAgMzM1IDEyOC0xMjcgMTI4IDEyNiA3OC03OS0xMjYtMTI2IDEyNy0xMjktMzM1IDB6IiBob3Jpei1hZHYteD0iOTI4IiAvPgo8Z2x5cGggZ2x5cGgtbmFtZT0icmlnaHQtb3BlbiIgdW5pY29kZT0iJiN4ZTgwYzsiIGQ9Ik05OCA2MjZsMjI2LTIzNnExNi0xNiAxNi00MCAwLTIyLTE2LTM4bC0yMjYtMjM2cS0xNi0xNi00MC0xNnQtNDAgMTZxLTM2IDM2IDAgODBsMTg2IDE5NC0xODYgMTk2cS0zNiA0NCAwIDgwIDE2IDE2IDQxIDE2dDM5LTE2eiIgaG9yaXotYWR2LXg9IjM0MCIgLz4KPGdseXBoIGdseXBoLW5hbWU9InRlcm1pbmFsIiB1bmljb2RlPSImI3hlODA5OyIgZD0iTTMyNiAzMDFsLTI2MC0yNjBxLTYtNi0xMy02dC0xMyA2bC0yOCAyOHEtNiA2LTYgMTN0NiAxM2wyMTkgMjE5LTIxOSAyMTlxLTYgNi02IDEzdDYgMTNsMjggMjhxNiA2IDEzIDZ0MTMtNmwyNjAtMjYwcTYtNiA2LTEzdC02LTEzeiBtNjAyLTI1NWwwLTM2cTAtOC01LTEzdC0xMy01bC01MzYgMHEtOCAwLTEzIDV0LTUgMTNsMCAzNnEwIDggNSAxM3QxMyA1bDUzNiAwcTggMCAxMy01dDUtMTN6IiBob3Jpei1hZHYteD0iOTI4LjU3MSIgLz4KPGdseXBoIGdseXBoLW5hbWU9ImhlbHAiIHVuaWNvZGU9IiYjeGU4MGE7IiBkPSJNMzkzIDE0OWwwLTEzNHEwLTktNy0xNnQtMTYtN2wtMTM0IDBxLTkgMC0xNiA3dC03IDE2bDAgMTM0cTAgOSA3IDE2dDE2IDdsMTM0IDBxOSAwIDE2LTd0Ny0xNnogbTE3NiAzMzVxMC0zMC05LTU2dC0yMC00My0zMS0zMy0zMi0yNC0zNC0yMHEtMjMtMTMtMzgtMzZ0LTE1LTM3cTAtOS03LTE4dC0xNi05bC0xMzQgMHEtOCAwLTE0IDEwdC02IDIxbDAgMjVxMCA0NiAzNiA4N3Q4MCA2MXEzMyAxNSA0NyAzMXQxNCA0MnEwIDIzLTI2IDQxdC02MCAxOHEtMzYgMC02MC0xNi0yMC0xNC02MC02NC03LTktMTctOS03IDAtMTQgNGwtOTIgNzBxLTcgNi05IDE0dDMgMTZxODkgMTQ4IDI1OSAxNDggNDUgMCA5MC0xN3Q4MS00NiA1OS03MSAyMy04OHoiIGhvcml6LWFkdi14PSI1NzEuNDI5IiAvPgo8Z2x5cGggZ2x5cGgtbmFtZT0iYmxvY2siIHVuaWNvZGU9IiYjeGU4MDY7IiBkPSJNNDgwIDgzMHEyMDAgMCAzNDAtMTQwdDE0MC0zNDBxMC0xOTgtMTQwLTMzOXQtMzQwLTE0MXEtMTk4IDAtMzM5IDE0MXQtMTQxIDMzOXEwIDIwMCAxNDEgMzQwdDMzOSAxNDB6IG0yNTgtMjIweiBtLTYyMi0yNjBxMC0xMzIgODItMjMwbDUxNCA1MTRxLTEwMCA4Mi0yMzIgODItMTUyIDAtMjU4LTEwN3QtMTA2LTI1OXogbTEwNi0yNTh6IG0yNTgtMTA2cTE1MiAwIDI1OSAxMDd0MTA3IDI1N3EwIDEzMC04MiAyMzJsLTUxNC01MTRxOTgtODIgMjMwLTgyeiIgaG9yaXotYWR2LXg9Ijk2MCIgLz4KPC9mb250Pgo8L2RlZnM+Cjwvc3ZnPg==) format('svg');font-weight:400;font-style:normal}#seajs-debug-console #seajs-debug-status button,#seajs-debug-console #seajs-debug-meta button,#seajs-debug-console #seajs-debug-map button{font-family:fontello}#seajs-debug-console,#seajs-debug-console *{margin:0;padding:0;border:0;font:14px/1.2 Arial}#seajs-debug-console{position:fixed;bottom:10px;width:520px;right:10px;bottom:10px;border:2px solid #463265;z-index:2147483647;background:#fafafa}#seajs-debug-console{_position:absolute;_top:expression(documentElement.scrollTop+documentElement.clientHeight-this.clientHeight-5)}* html{_background:url(null) no-repeat fixed}#seajs-debug-console a,#seajs-debug-console a:hover,#seajs-debug-console a:active,#seajs-debug-console a:link{text-decoration:none}#seajs-debug-console button{border:0;background:transparent;cursor:pointer;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;-o-user-select:none;user-select:none}#seajs-debug-console h3,#seajs-debug-console textarea,#seajs-debug-console #seajs-debug-map{border:0;border-bottom:1px solid lightgrey}#seajs-debug-console h3{margin:0;padding:5px 5px 5px 10px;height:20px;line-height:20px;font-weight:700;font-size:16px;background:#563d7c;color:#cdbfe3}#seajs-debug-console textarea,#seajs-debug-console #seajs-debug-map{min-height:100px;_height:100px}#seajs-debug-console textarea,#seajs-debug-console #seajs-debug-map p input{font-family:Courier,monospace;color:#666}#seajs-debug-console textarea{display:block;width:510px;padding:5px;background:#FFF;resize:vertical}#seajs-debug-console #seajs-debug-map{padding:5px 0;background:#fff}#seajs-debug-console #seajs-debug-map p{height:30px;line-height:30px;overflow:hidden;padding-left:10px}#seajs-debug-console #seajs-debug-map p input{padding-left:6px;height:24px;border:1px solid #dcdcdc;width:200px}#seajs-debug-console #seajs-debug-map .seajs-debug-hit input{border-color:#cdbfe3;background-color:#F6F0FF}#seajs-debug-console #seajs-debug-map button{color:#999}#seajs-debug-console #seajs-debug-map button,#seajs-debug-console #seajs-debug-meta button{width:30px;height:30px;line-height:30px;text-align:center}#seajs-debug-console #seajs-debug-status{height:35px}#seajs-debug-console #seajs-debug-status span{padding-left:8px;color:#AAA}#seajs-debug-console #seajs-debug-status button{width:35px;height:35px;line-height:35px;color:#999;border:0;font-size:16px}#seajs-debug-console #seajs-debug-status button:hover,#seajs-debug-console #seajs-debug-status button.seajs-debug-status-on:hover{background-color:#f0f0f0;color:#000}#seajs-debug-console #seajs-debug-status button:active,#seajs-debug-console #seajs-debug-status button.seajs-debug-status-on{color:#563d7c;text-shadow:0 0 6px #cdbfe3;background-color:#f0f0f0}#seajs-debug-console #seajs-debug-buttons{position:absolute;right:4px;bottom:3px}#seajs-debug-console #seajs-debug-buttons button{width:60px;height:28px;line-height:28px;border-radius:2px;text-align:center;color:#333;background-color:#fff;border:1px solid #ccc;text-transform:uppercase}#seajs-debug-console #seajs-debug-buttons button:hover,#seajs-debug-console #seajs-debug-buttons button:focus,#seajs-debug-console #seajs-debug-buttons button:hover,#seajs-debug-console #seajs-debug-buttons button:active{background-color:#ebebeb;border-color:#adadad}#seajs-debug-console #seajs-debug-buttons button:active{position:relative;top:1px;-webkit-box-shadow:inset 0 3px 5px rgba(0,0,0,.125);-moz-box-shadow:inset 0 3px 5px rgba(0,0,0,.125);box-shadow:inset 0 3px 5px rgba(0,0,0,.125)}#seajs-debug-console #seajs-debug-meta{position:absolute;right:0;top:0}#seajs-debug-console #seajs-debug-meta button{background:#463265;color:#fff}#seajs-debug-console.seajs-debug-mini{width:30px;height:30px;border:0}#seajs-debug-console.seajs-debug-mini h3,#seajs-debug-console.seajs-debug-mini #seajs-debug-status,#seajs-debug-console.seajs-debug-mini #seajs-debug-buttons{display:none}"
    )

    this.rootElement = null
    this.mappingElement = null
    this.textareaElement = null
    this.statusButtonElement = null
    this.mainButtonElement = null
    this.metaButtonElement = null
    this.statusTipElement = null

    this.statusButtonInfo = [
      // [config 字段名, 开启时(true)的 title, 关闭时(false)的 title, icon, click fn callback]
      ["source", "Switch to min files", "Switch to source files", "&#xe80b;"],
      ["combo", "Enable combo", "Disable combo", "&#xe801;"],
      ["nocache", "Enable cache", "Disable cache", "&#xe806;"],
      ["log", "Hide seajs log", "Show seajs log", "&#xe809;"],
      ["mode", "Switch mapping mode", "Switch editor mode", "&#xe808;", function(status) {

        this.textareaElement.style.display = status ? "block" : "none";
        this.mappingElement.style.display = status ? "none" : "block";

        status && this.textareaElement.focus()
      }]
    ]
    this.mainButtonInfo = [
      // [Button Text, click callback fn, remove ?seajs-debug or not]
      ["Save", function() {
        var mappingString = []
        var allInput = this.mappingElement.getElementsByTagName('input')

        for (var i = 0; i < allInput.length;) {
          var from = trim(allInput[i].value)
          var to = trim(allInput[i + 1].value)

          if (from.length && to.length) {
            if (!validateURL(from)) {
              allInput[i].focus()
              allInput[i].select()
              alert("Invalid URL: " + from)

              return false
            }
            if (!validateURL(to)) {
              allInput[i + 1].focus()
              allInput[i + 1].select()
              alert("Invalid URL: " + to)

              return false
            }
            mappingString.push([from, to])
          }
          i += 2
        }
        config.mapping = mappingString

        try {
          (new Function("return " + this.textareaElement.value))()

          config.custom = trim(this.textareaElement.value)

          return true
        } catch (e) {
          alert("invalid config")
          this.textareaElement.focus()

          return false
        }
      }, false],
      ["Exit", function() {
        config.debug = false

        return true
      }, true]
    ]
    this.metaButtonInfo = [
      // [show or hide, icon, title, click callback fn]
      [config.show, "&#xe80a;", "Go to help", function() {
        global.open('https://github.com/seajs/seajs-debug/issues/4', '_blank');
      }],
      [config.show, "&#xe802;", "Minimize console", function() {
        var buttons = this.metaButtonElement.getElementsByTagName("button")

        this.rootElement.className = MIN_CLS
        config.mode ? (this.textareaElement.style.display = "none") : (this.mappingElement.style.display = "none")

        config.show = false

        buttons[0].style.display = "none"
        buttons[1].style.display = "none"
        buttons[2].style.display = "inline-block"
      }],
      [!config.show, "&#xe803;", "Maximize console", function() {
        var buttons = this.metaButtonElement.getElementsByTagName("button")

        this.rootElement.className = ""
        config.mode ? (this.textareaElement.style.display = "block") : (this.mappingElement.style.display = "block")

        config.show = true

        buttons[0].style.display = "inline-block"
        buttons[1].style.display = "inline-block"
        buttons[2].style.display = "none"
      }]
    ]

    this._render()
  }

  DebugPanel.prototype._render = function() {
    var that = this

    this.rootElement = doc.createElement("div")
    this.rootElement.id = "seajs-debug-console"
    this.rootElement.className = config.show ? "" : MIN_CLS
    this.rootElement.innerHTML = this._renderHTML()

    appendToBody(this.rootElement, function() {
      that.textareaElement = that.rootElement.getElementsByTagName("textarea")[0]

      that.mappingElement = doc.getElementById("seajs-debug-map")
      that.statusButtonElement = doc.getElementById("seajs-debug-status")
      that.mainButtonElement = doc.getElementById("seajs-debug-buttons")
      that.metaButtonElement = doc.getElementById("seajs-debug-meta")

      that.statusTipElement = that.statusButtonElement.getElementsByTagName("span")[0]

      config.mode && that.textareaElement.focus()
      that._bind()
    })
  }

  DebugPanel.prototype._renderHTML = function() {
    // Render HTML
    var html = '<h3>Sea.js Debug Console</h3>'
    var tmpHTML = ''
    var item

    // Mapping area
    config.mapping.push(["", "", true])
    for (var i = 0; i < config.mapping.length; i++) {
      item = config.mapping[i]
      tmpHTML += '<p>'
        + '<input type="text" placeholder="Input source URI" title="Source URI" value="' + item[0] + '" />'
        + '<button style="cursor: default;">&#xe80c;</button>'
        + '<input type="text" placeholder="Input target URI" title="Target URI" value="' + item[1] + '" />'
        + '<button data-name="add" ' + (item[2] ? '' : 'style="display: none;"') + '>&#xe804;</button>'
        + '<button data-name="red" ' + (item[2] ? 'style="display: none;"' : '') + '>&#xe805;</button>'
        + '</p>'
    }
    html += '<div id="seajs-debug-map"'
      + (config.mode || !config.show ? ' style="display: none;"' : '')
      + '>'
      + tmpHTML
      + '</div>'

    // Textarea
    html += '<textarea'
      + (config.mode && config.show ? '' : ' style="display: none;"')
      + '>' + config.custom + '</textarea>'

    // Status button bar
    tmpHTML = ''
    for (var i = 0; i < this.statusButtonInfo.length; i++) {
      item = this.statusButtonInfo[i]

      var status = item[0]

      tmpHTML += "<button "
        + (config[status] ? 'class="' + STATUS_BUTTON_ON_CLS + '"' : '')
        + ' title="'
        + item[ config[status] ? 1 : 2]
        + '">'
        + item[3]
        + "</button>"
    }
    html += '<div id="seajs-debug-status">'
      + tmpHTML
      + '<span></span>'
      + '</div>'

    // Main button bar
    tmpHTML = ''
    for (var i = 0; i < this.mainButtonInfo.length; i++) {
      tmpHTML += "<button>" + this.mainButtonInfo[i][0] + "</button> "
    }
    html += '<div id="seajs-debug-buttons">'
      + tmpHTML
      + '</div>'

    // Meta button bar
    tmpHTML = ''
    for (var i = 0; i < this.metaButtonInfo.length; i++) {
      item = this.metaButtonInfo[i]

      tmpHTML += '<button title="'
        + item[2] + '"'
        + (item[0] ? '' : 'style="display: none;"')
        + '>' + item[1] + '</button>'
    }
    html += '<div id="seajs-debug-meta">'
      + tmpHTML
      + '</div>'

    return html
  }

  DebugPanel.prototype._bind = function() {
    var that = this

    // Mapping area
    addEvent(this.mappingElement, 'click', function(e) {
      var target = e.target

      if (target.tagName.toLowerCase() === "button") {
        var p = target.parentNode
        var parent = p.parentNode

        if (target.getAttribute("data-name") === "add") {
          var newElem = doc.createElement("p")

          newElem.innerHTML = p.innerHTML
          parent.appendChild(newElem)
          newElem.getElementsByTagName("input")[0].focus()

          target.style.display = "none"
          target.nextSibling.style.display = "inline-block"
        } else if (target.getAttribute("data-name") === "red") {
          parent.removeChild(p)
        }
      }
    })

    // Status button bar
    var buttons = this.statusButtonElement.getElementsByTagName("button")
    for (var i = 0; i < buttons.length; i++) {
      (function(button, i) {
        addEvent(button, 'click', function() {
          var item = that.statusButtonInfo[i]
          var newVal = !config[item[0]]

          config[item[0]] = newVal
          that._save()

          button.setAttribute("title", item[ newVal ? 1 : 2])
          that.statusTipElement.innerHTML = item[ newVal ? 1 : 2]
          button.className = newVal ? STATUS_BUTTON_ON_CLS : ""

          item[4] && item[4].call(that, newVal)
        })

        addEvent(button, 'mouseover', function() {
          var item = that.statusButtonInfo[i]

          that.statusTipElement.innerHTML = item[ config[item[0]] ? 1 : 2]
        })

        addEvent(button, 'mouseout', function() {
          that.statusTipElement.innerHTML = ''
        })
      })(buttons[i], i);
    }

    // Main button bar
    buttons = this.mainButtonElement.getElementsByTagName("button")
    for (var i = 0; i < buttons.length; i++) {
      (function(button, i) {
        addEvent(button, 'click', function() {
          var item = that.mainButtonInfo[i]

          if (item[1].call(that)) {
            that._save()
            item[2] ? loc.replace(loc.href.replace("seajs-debug", "")) : loc.reload()
          }
        })
      })(buttons[i], i);
    }

    // Meta button bar
    buttons = this.metaButtonElement.getElementsByTagName("button")
    for (i = 0; i < buttons.length; i++) {
      (function(button, i) {
        addEvent(button, 'click', function() {
          var item = that.metaButtonInfo[i]

          item[3] && item[3].call(that)
          that._save()
        })
      })(buttons[i], i);
    }
  }
  // Save config
  DebugPanel.prototype._save = function() {
    store.set("seajs-debug-config", config)
  }

  DebugPanel.prototype.setHitInput = function(i, hit) {
    if (!this.mappingElement) return

    var item = this.mappingElement.getElementsByTagName('p')[i]
    item && hit && (item.className = HIT_CLS)
  }

  // Load local config and merge
  var _config = store.get("seajs-debug-config")

  for (var key in _config) {
    config[key] = _config[key]
  }

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
    debugPanel = new DebugPanel()

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
          if (config.source && !/\-debug\.(js|css)+/g.test(uri)) {
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

    // Execute custom config
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

  function addEvent(el, type, fn, capture) {
    if (!el) return;
    if (el.addEventListener) {
      el.addEventListener(type, fn, !!capture);
    } else if (el.attachEvent) {
      el.attachEvent('on' + type, fn);
    }
  }

  function removeEvent(el, type, fn, capture) {
    if (!el) return;
    if (el.removeEventListener) {
      el.removeEventListener(type, fn, !!capture);
    } else if (el.detachEvent) {
      el.detachEvent('on' + type, fn);
    }
  }

  function trim(str) {
    var whitespace = ' \n\r\t\f\x0b\xa0\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u200b\u2028\u2029\u3000'
    for (var i = 0, len = str.length; i < len; i++) {
      if (whitespace.indexOf(str.charAt(i)) === -1) {
        str = str.substring(i)
        break
      }
    }
    for (i = str.length - 1; i >= 0; i--) {
      if (whitespace.indexOf(str.charAt(i)) === -1) {
        str = str.substring(0, i + 1);
        break
      }
    }
    return whitespace.indexOf(str.charAt(0)) === -1 ? str : ''
  }

  function validateURL(textval) {
    var urlregex = new RegExp(
      "^(http|https|ftp)\://([a-zA-Z0-9\.\-]+(\:[a-zA-Z0-9\.&amp;%\$\-]+)*@)*((25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9])\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9]|0)\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9]|0)\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[0-9])|([a-zA-Z0-9\-]+\.)*[a-zA-Z0-9\-]+\.(com|edu|gov|int|mil|net|org|biz|arpa|info|name|pro|aero|coop|museum|[a-zA-Z]{2}))(\:[0-9]+)*(/($|[a-zA-Z0-9\.\,\?\'\\\+&amp;%\$#\=~_\-]+))*$");
    return urlregex.test(textval);
  }

  // Register as module
  define("seajs-debug-debug", [], {})

})(seajs, this, document, location);
