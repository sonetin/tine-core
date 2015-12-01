/**
 * @name tine-core
 * @namespace tine
 * @version 0.0.1
 * @author Arnaud Leymet
 * @copyright 2015 SONETIN SAS
 * @license MIT
 * @see https://github.com/sonetin/tine-core/blob/master/License.txt
 */


(function () {
  'use strict';

  var root = this;

  var settings = {
    focus: true,
    autoload: true,
    autosave: true,
    tips: false
  };

  /** @lends tine */
  var TINE = function (editor, options) {
    if (options === undefined) options = {};
    if (options.focus != undefined) settings.focus = options.focus;
    if (options.autoload != undefined) settings.autoload = options.autoload;
    if (options.autosave != undefined) settings.autosave = options.autosave;
    if (options.tips != undefined) settings.tips = options.tips;

    if (typeof editor == "string") {
      this.editor = document.querySelector(editor);
    } else { // Object
      this.editor = editor;
    }
    this.generateMarkup();
    if (typeof editor == "string") {
      this.editor = document.querySelector(editor);
    } else { // Object
      this.editor = editor;
    }

    // hooks
    var tineContext = this;
    TINE.initializers.map(function (initializer) {
      initializer.call(tineContext);
    });

    this.rendering = this.editor.parentNode.children.namedItem("tine-rendering");
    this.setSynchronizedScrolling();
    this.handleTab();
    if (settings.autoload) this.load();
    this.run();
    if (settings.focus) this.editor.focus();
    return this;
  };

  TINE.version = '0.0.1';

  TINE.prototype = {
    constructor : TINE,

    generateMarkup: function () {
      this.editor.setAttribute("autocorrect", "off");
      this.editor.setAttribute("autocorrect", "off");
      this.editor.setAttribute("autocapitalize", "off");
      this.editor.setAttribute("spellcheck", "off");
      this.editor.setAttribute("subtle-scrollbar", "");
      this.editor.className += " tine-editor";
      var container = document.createElement('div');
      container.className = "tine-container";
      if (settings.tips) container.className += " tine-show-tips";
      container.innerHTML = "<div id='tine-rendering' class='tine-rendering'></div>" + this.editor.outerHTML;
      this.editor.parentNode.replaceChild(container, this.editor);
    },

    setSynchronizedScrolling: function () {
      console.debug("tine:", "synchronizing scrolling");
      var editor = this.editor,
          rendering = this.rendering;
      function handler(event) {
        if (editor.selectionEnd == editor.value.length) { // is at end
          //editor.scrollTop = 99999999;
          //rendering.scrollTop = 99999999;
          rendering.scrollTop = editor.scrollTop;
        } else {
          rendering.scrollTop = editor.scrollTop;
        }
      }
      ['scroll', 'input'].forEach(function (event) {
        editor.addEventListener(event, handler, false);
      });
    },

    handleTab: function () {
      console.debug("tine:", "handling tab");
      var editor = this.editor;
      function handler(event) {
        var selStart = event.target.selectionStart,
            selEnd = event.target.selectionEnd;
        var text = event.target.value;
        if (event.keyCode === 9) {
          event.target.value = text.substring(0, selStart) + '\t' + text.substring(selEnd);
          // put caret at right position again
          event.target.selectionStart = event.target.selectionEnd = selStart + 1;
          event.preventDefault();
        }
      }
      editor.addEventListener('keydown', handler, false);
    },

    render: function (event) {
      var tineContext = this,
          rendering = this.rendering,
          text = this.editor.value;

      var detectType = function (block) {
        for (var d in TINE.typeDetectors) {
          var detector = TINE.typeDetectors[d];
          if (detector.expression.test(block)) {
            //console.debug("tine:", "detected", detector.type);
            return detector.type;
          }
        }

        // normative language detection
        var DEFINED_LANG = /(?:^#\s*(\w+)[^\w])|(?:^(\w+)>[\s\n])/;
        if (DEFINED_LANG.test(block)) {
          var detectedLang = block.match(DEFINED_LANG)[1] || block.match(DEFINED_LANG)[2];
          if (detectedLang) detectedLang = detectedLang.toLowerCase();
          if (Prism.languages[detectedLang]) return detectedLang;
        }
        return "text";
      };

      var process = function (block, type, options) {
        var lines = block.split(/\n/);
        for (var p in TINE.processors) {
          var processor = TINE.processors[p];
          if (processor.type == type) {
            return processor.process.call(tineContext, block, lines, options);
          }
        }

        // fallback
        return block.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      };

      var processOutsideCode = function (block, type, options) {
        var processed = "";
        var lines = block.split(/\n/);
        for (var p in TINE.outsideCodeProcessors) {
          var processor = TINE.outsideCodeProcessors[p];
          if (processor.type == type) {
            processed += processor.process.call(tineContext, block, lines, options);
          }
        }
        return processed;
      };

      if (event) {
        var selStart = event.target.selectionStart,
            selEnd = event.target.selectionEnd;

        if ((event.type == "keypress")) {
          var char = String.fromCharCode(event.which);
          text = text.slice(0, selStart) + char + text.slice(selStart);
        }
      }

      var blocks = text.split(/\n{2,}/g);
      var blocksLinebreaks = text.match(/\n{2,}/g);
      if (blocksLinebreaks == null) blocksLinebreaks = [];

      // hooks
      if (event) {
        TINE.onTextChange.map(function (processing) {
          processing.call(tineContext);
        });
      }
      TINE.beforePageProcessing.map(function (processing) {
        processing.call(tineContext);
      });

      // render the processed text
      rendering.innerHTML = blocks.map(function (block, index) {
        if (blocksLinebreaks.length < index) return "";
        var br = (blocksLinebreaks[index] || "").slice(0, -1).replace(/\n/g, "<br>");
        var type = detectType(block);
        // natural language detection
        var lang = "";
        if (type == "text") {
          lang = franc(block);
          if (lang == "und") lang = "";
        }
        return "<pre>" + processOutsideCode(block, type, { lang: lang }) + "<code lang='" + lang + "' type='" + type + "' class='language-" + type + "'>" + process(block, type, { lang: lang }) + "</code></pre><pre> " + br + "</pre>";
      }).join("\n");

      // reload syntax highlighting
      Prism.highlightAll();
    },

    run: function () {
      var tineContext = this;
      ['focus', 'input', 'keypress', 'keyup', 'click', 'cut', 'copy', 'paste', 'drop'].forEach(function (event) {
        tineContext.editor.addEventListener(event, function (event) {
          // render
          tineContext.render.call(tineContext, event);
          // save the text
          if (settings.autosave) tineContext.save();
        }, false);
      });

      this.render(); // render the first time
    },

    /*
     * Save the text
     */
    save: function () {
      var data = {
        text: this.editor.value,
        when: new Date().getTime()
      };
      localStorage.setItem("tine", JSON.stringify(data));
    },

    /*
     * Load the persisted text
     */
    load: function () {
      try {
        var data = JSON.parse(localStorage.getItem("tine"));
        this.editor.value = data.text;
        this.editor.render();
        this.editor.setSelectionRange(0, 0);
      } catch (e) {}
    }
  };

  /**
   * Features
   */
  TINE.features = [];
  TINE.initializers = [];
  TINE.beforePageProcessing = [];
  TINE.onTextChange = [];
  TINE.typeDetectors = [];
  TINE.processors = [];
  TINE.outsideCodeProcessors = [];
  TINE.addFeature = function (feature) {
    this.features.push(feature);
    if (feature.type == "detector") {
      var detectors = feature.detect;
      if (detectors) {
        if (!("map" in detectors)) detectors = [ detectors ];
        detectors.map(function (detector) {
          TINE.typeDetectors.push({ type: feature.label, expression: detector });
        });
      }
    }
    if (feature.init) TINE.initializers.push(feature.init);
    if (feature.beforePageProcessing) TINE.beforePageProcessing.push(feature.beforePageProcessing);
    if (feature.onTextChange) TINE.onTextChange.push(feature.onTextChange);
    if (feature.process) TINE.processors.push({ type: feature.label, process: feature.process });
    if (feature.processOutsideCode) TINE.outsideCodeProcessors.push({ type: feature.label, process: feature.processOutsideCode });
  }

  root.Tine = TINE;

}).call(this);
