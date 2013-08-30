// Debug Panel Object
define(function(require, exports, module) {
  var doc = document,
    loc = location,
    global = this

  var store = require('./seajs-debug-store')
  var config = require('./seajs-debug-config')

  var MAX_TRY = 100
  var pollCount = 0

  var PREFIX = 'seajs-debug-'
  var STATUS_BUTTON_ON_CLS = PREFIX + 'status-on'
  var MIN_CLS = PREFIX + 'mini'
  var HIT_CLS = PREFIX + 'hit'

  require('./seajs-debug-panel.css')

  function DebugPanel() {
    this.element = null

    this._rendered = false

    this.children = ['header', 'meta']
  }

  DebugPanel.prototype.render = function(children, cbk) {
    var that = this

    if (this._rendered) {
      cbk && cbk()
      return
    }
    this._rendered = true

    // Add all children
    for (var i = 0; i < children.length; i++) {
      if (indexOf(this.children, children[i]) === -1) {
        this.children.push(children[i])
      }
    }

    this.element = doc.createElement("div")
    this.element.id = PREFIX + "console"
    // Hide first
    this.element.style.display = "none"

    var tmpHTML = ''
    for (var i = 0; i < this.children.length; i++) {
      var item = this.children[i]
      var fn = this['_render' + item.charAt(0).toUpperCase() + item.substring(1)]

      fn && (tmpHTML += fn.call(that))
    }
    this.element.innerHTML = tmpHTML

    appendToBody(this.element, function() {
      for (var i = 0; i < that.children.length; i++) {
        var item = that.children[i]

        that[item + 'Element'] = doc.getElementById(PREFIX + item)

        var fn = that['_bind' + item.charAt(0).toUpperCase() + item.substring(1)]

        fn && fn.call(that)
      }

      // Max or Min debug panel
      that.element.style.display = 'block'

      that[config.show ? 'show' : 'hide']()

      cbk && cbk()
    })
  }

  // Header
  DebugPanel.prototype._renderHeader = function() {
    return '<h3 id="' + PREFIX + 'header" style="display: none;">Sea.js Debug Console</h3>'
  }

  // Mapping area
  DebugPanel.prototype._renderMap = function() {
    var tmpHTML = ''

    config.mapping.push(["", "", true])
    for (var i = 0; i < config.mapping.length; i++) {
      var item = config.mapping[i]
      tmpHTML += '<p>'
        + '<input type="text" placeholder="Input source URI" title="Source URI" value="' + item[0] + '" />'
        + '<button style="cursor: default;">&#xe80c;</button>'
        + '<input type="text" placeholder="Input target URI" title="Target URI" value="' + item[1] + '" />'
        + '<button data-name="add" ' + (item[2] ? '' : 'style="display: none;"') + '>&#xe804;</button>'
        + '<button data-name="red" ' + (item[2] ? 'style="display: none;"' : '') + '>&#xe805;</button>'
        + '</p>'
    }

    return '<div id="' + PREFIX + 'map" style="display: none;">'
      + tmpHTML
      + '</div>'
  }

  // Editor
  DebugPanel.prototype._renderEditor = function() {
    return '<textarea id="' + PREFIX + 'editor" style="display: none;">' + config.custom + '</textarea>'
  }

  // Status button bar
  DebugPanel.prototype._renderStatus = function() {

    this.statusInfo = [
      // [config 字段名, 开启时(true)的 title, 关闭时(false)的 title, icon, click fn callback]
      ["source", "Switch to min files", "Switch to source files", "&#xe80b;"],
      ["combo", "Enable combo", "Disable combo", "&#xe801;"],
      ["nocache", "Enable cache", "Disable cache", "&#xe806;"],
      ["log", "Hide seajs log", "Show seajs log", "&#xe809;"],
      ["mode", "Switch mapping mode", "Switch editor mode", "&#xe808;", function(status) {
        this.show()
      }],
      ["health", "Go back", "Show CMD modules' relations", "&#xe807;", function(status) {
        this.show()
        if (status) {
          require.async(seajs.data.base + 'seajs/seajs-health/0.1.0/seajs-health.js')
        }
      }]
    ]

    var tmpHTML = ''

    for (var i = 0; i < this.statusInfo.length; i++) {
      var item = this.statusInfo[i]

      var status = item[0]

      tmpHTML += "<button "
        + (config[status] ? 'class="' + STATUS_BUTTON_ON_CLS + '"' : '')
        + ' title="'
        + item[ config[status] ? 1 : 2]
        + '">'
        + item[3]
        + "</button>"
    }
    return '<div id="' + PREFIX + 'status" style="display: none;">'
      + tmpHTML
      + '<span></span>'
      + '</div>'
  }

  // Main button bar
  DebugPanel.prototype._renderAction = function() {

    this.actionInfo = [
      // [Button Text, click callback fn, remove ?seajs-debug or not]
      ["Save", function() {
        var mappingString = []
        var allInput = this.mapElement.getElementsByTagName('input')

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
          (new Function("return " + this.editorElement.value + ";"))()

          config.custom = trim(this.editorElement.value)

          return true
        } catch (e) {
          alert("invalid config")
          this.editorElement.focus()

          return false
        }
      }, false],
      ["Exit", function() {
        config.debug = false

        return true
      }, true]
    ]

    var tmpHTML = ''

    for (var i = 0; i < this.actionInfo.length; i++) {
      var item = this.actionInfo[i]
      tmpHTML += "<button>" + item[0] + "</button> "
    }
    return'<div id="' + PREFIX + 'action" style="display: none;">'
      + tmpHTML
      + '</div>'
  }

  // Meta button bar
  DebugPanel.prototype._renderMeta = function() {
    this.metaInfo = [
      // [show or hide, icon, title, click callback fn]
      [config.show, "&#xe80a;", "Go to help", function() {
        global.open('https://github.com/seajs/seajs-debug/issues/4', '_blank');
      }],
      [config.show, "&#xe802;", "Minimize console", function() {
        this.hide()
      }],
      [!config.show, "&#xe803;", "Maximize console", function() {
        this.show()
      }]
    ]

    var tmpHTML = ''

    for (var i = 0; i < this.metaInfo.length; i++) {
      var item = this.metaInfo[i]

      tmpHTML += '<button title="'
        + item[2] + '">' + item[1] + '</button>'
    }
    return '<div id="' + PREFIX + 'meta">'
      + tmpHTML
      + '</div>'
  }

  // Health DIV
  DebugPanel.prototype._renderHealth = function() {
    return '<div id="' + PREFIX + 'health" style="display: none;">'
      + '</div>'
  }

  // Bind mapping area
  DebugPanel.prototype._bindMap = function() {
    // Mapping area
    addEvent(this.mapElement, 'click', function(e) {
      var target = e.target || e.srcElement

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
  }

  // Bind status button bar
  DebugPanel.prototype._bindStatus = function() {
    this.statusTipElement = this.statusElement.getElementsByTagName("span")[0]

    var that = this
    var buttons = this.statusElement.getElementsByTagName("button")

    for (var i = 0; i < buttons.length; i++) {
      (function(button, i) {
        addEvent(button, 'click', function() {
          var item = that.statusInfo[i]
          var newVal = !config[item[0]]

          config[item[0]] = newVal
          that.save()

          button.setAttribute("title", item[ newVal ? 1 : 2])
          that.statusTipElement.innerHTML = item[ newVal ? 1 : 2]
          button.className = newVal ? STATUS_BUTTON_ON_CLS : ""

          item[4] && item[4].call(that, newVal)
        })

        addEvent(button, 'mouseover', function() {
          var item = that.statusInfo[i]

          that.statusTipElement.innerHTML = item[ config[item[0]] ? 1 : 2]
        })

        addEvent(button, 'mouseout', function() {
          that.statusTipElement.innerHTML = ''
        })
      })(buttons[i], i);
    }
  }

  // Main action bar
  DebugPanel.prototype._bindAction = function() {
    var that = this
    var buttons = this.actionElement.getElementsByTagName("button")

    for (var i = 0; i < buttons.length; i++) {
      (function(button, i) {
        addEvent(button, 'click', function() {
          var item = that.actionInfo[i]

          if (item[1].call(that)) {
            that.save()
            item[2] ? loc.replace(loc.href.replace("seajs-debug", "")) : loc.reload()
          }
        })
      })(buttons[i], i);
    }

  }

  // Meta meta bar
  DebugPanel.prototype._bindMeta = function() {
    var that = this
    var buttons = this.metaElement.getElementsByTagName("button")

    for (var i = 0; i < buttons.length; i++) {
      (function(button, i) {
        addEvent(button, 'click', function() {
          var item = that.metaInfo[i]

          item[3] && item[3].call(that)
          that.save()
        })
      })(buttons[i], i);
    }
  }

  // Bind health
  DebugPanel.prototype._bindHealth = function() {
  }

  // Max
  DebugPanel.prototype.show = function() {
    this.element.className = ''
    config.show = true

    for (var i = 0; i < this.children.length; i++) {
      var item = this.children[i]
      indexOf(['meta', 'health', 'editor', 'map'], item) === -1 && this[item + 'Element'] && (this[item + 'Element'].style.display = "block")
    }

    if (config.health) {
      this.switchTo('health')
    } else if (config.mode) {
      this.switchTo('editor')
      this.editorElement.focus();
    } else {
      this.switchTo('map')
    }

    var buttons = this.metaElement.getElementsByTagName("button")
    buttons[0].style.display = "inline-block"
    buttons[1].style.display = "inline-block"
    buttons[2].style.display = "none"
  }

  // Min
  DebugPanel.prototype.hide = function() {
    this.element.className = MIN_CLS
    config.show = false

    for (var i = 0; i < this.children.length; i++) {
      var item = this.children[i]
      item !== 'meta' && this[item + 'Element'] && (this[item + 'Element'].style.display = "none")
    }

    var buttons = this.metaElement.getElementsByTagName("button")
    buttons[0].style.display = "none"
    buttons[1].style.display = "none"
    buttons[2].style.display = "inline-block"
  }

  // Switch panels
  DebugPanel.prototype.switchTo = function(toPanel) {
    var allPanels = ['health', 'editor', 'map']
    for (var i = 0; i < 3; i++) {
      var item = allPanels[i]

      this[item + 'Element'] && (this[item + 'Element'].style.display = toPanel === item ? "block" : "none")
    }
  }

  // Save config
  DebugPanel.prototype.save = function() {
    store.set("seajs-debug-config", config)
  }

  // Set useful input in mappings
  DebugPanel.prototype.setHitInput = function(i, hit) {
    if (!this.mapElement) return

    var item = this.mapElement.getElementsByTagName('p')[i]
    item && hit && (item.className = HIT_CLS)
  }

  DebugPanel.prototype.destory = function(child) {
    var fn = this['_destory' + child.charAt(0).toUpperCase() + child.substring(1)]

    fn && fn.call(this)
  }

  var debugPanel = new DebugPanel()

  debugPanel.config = config

  module.exports = debugPanel

  // Helpers
  function validateURL(textval) {
    var urlregex = new RegExp(
      "^(http|https|ftp)\://([a-zA-Z0-9\.\-]+(\:[a-zA-Z0-9\.&amp;%\$\-]+)*@)*((25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9])\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9]|0)\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9]|0)\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[0-9])|([a-zA-Z0-9\-]+\.)*[a-zA-Z0-9\-]+\.(com|edu|gov|int|mil|net|org|biz|arpa|info|name|pro|aero|coop|museum|[a-zA-Z]{2}))(\:[0-9]+)*(/($|[a-zA-Z0-9\.\,\?\'\\\+&amp;%\$#\=~_\-]+))*$");
    return urlregex.test(textval);
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

  function indexOf(array, item) {
    if (array == null) return -1;
    var i = 0, length = array.length;
    var nativeIndexOf = Array.prototype.indexOf
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item);
    for (; i < length; i++) if (array[i] === item) return i;
    return -1;
  }
})